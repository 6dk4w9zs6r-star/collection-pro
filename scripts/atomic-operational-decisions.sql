-- Approval and its financial effect share the same database transaction.
alter table public.deferrals add column if not exists before_state jsonb;
alter table public.deferrals add column if not exists after_state jsonb;

create or replace function public.guard_writeoff_decision()
returns trigger language plpgsql security invoker set search_path=public as $$
declare c public.clients%rowtype; debt numeric; approver public.profiles%rowtype;
begin
  if tg_op='INSERT' then
    if new.status<>'pending' or new.approved_by is not null then raise exception 'Write-off must begin as an unapproved request'; end if;
    new.balance_before:=null;new.balance_after:=null;new.decided_at:=null;
    return new;
  end if;
  if new.client_id is distinct from old.client_id or new.amount is distinct from old.amount
     or new.requested_by is distinct from old.requested_by then raise exception 'Write-off request identity is immutable'; end if;
  if old.status<>'pending' then raise exception 'Write-off decision is final; no repeated application'; end if;
  if new.status='pending' then
    new.approved_by:=null;new.decided_at:=null;new.balance_before:=null;new.balance_after:=null;return new;
  end if;
  if new.status not in ('approved','rejected') then raise exception 'Invalid write-off decision'; end if;
  select * into strict c from public.clients where id=old.client_id for update;
  select * into approver from public.profiles where id=auth.uid() and is_active
    and (lower(role) in ('founder','cfmp','department_manager','dm')
      or (lower(role) in ('bm','branch_manager') and branch_code=c.branch_code));
  if not found then raise exception 'Management approval required'; end if;
  debt:=greatest(coalesce(c.outstanding_balance,0),coalesce(c.overdue_amount,0),coalesce(c.due_amount,0));
  new.approved_by:=auth.uid();new.decided_at:=now();new.balance_before:=debt;new.balance_after:=debt;
  if new.status='approved' then
    if new.amount is null or new.amount<=0 or new.amount>debt or new.amount::text in ('NaN','Infinity','-Infinity') then raise exception 'Write-off exceeds available debt or has an invalid amount'; end if;
    new.balance_after:=debt-new.amount;
    update public.clients set outstanding_balance=debt-new.amount,
      overdue_amount=greatest(coalesce(overdue_amount,0)-new.amount,0),
      due_amount=greatest(coalesce(due_amount,0)-new.amount,0),
      write_off_amount=coalesce(write_off_amount,0)+new.amount,write_off_status='approved'
    where id=c.id;
    if not found then raise exception 'Client update denied'; end if;
  end if;
  return new;
end $$;
revoke all on function public.guard_writeoff_decision() from public,anon,authenticated;
create trigger writeoff_atomic_decision before insert or update on public.write_offs
for each row execute function public.guard_writeoff_decision();

create or replace function public.guard_deferral_decision()
returns trigger language plpgsql security invoker set search_path=public as $$
declare c public.clients%rowtype; approver public.profiles%rowtype; shifted numeric; count_installments int;
begin
  if tg_op='INSERT' then
    if new.status<>'pending' or new.approved_by is not null then raise exception 'Deferral must begin as an unapproved request'; end if;
    new.before_state:=null;new.after_state:=null;new.decided_at:=null;return new;
  end if;
  if new.client_id is distinct from old.client_id or new.installment_count is distinct from old.installment_count
    or new.old_due_date is distinct from old.old_due_date or new.new_due_date is distinct from old.new_due_date
    or new.deferral_fee is distinct from old.deferral_fee or new.requested_by is distinct from old.requested_by
    then raise exception 'Deferral request identity is immutable'; end if;
  if old.status<>'pending' then raise exception 'Deferral decision is final; no repeated application'; end if;
  if new.status='pending' then new.approved_by:=null;new.decided_at:=null;new.before_state:=null;new.after_state:=null;return new;end if;
  if new.status not in ('approved','rejected') then raise exception 'Invalid deferral decision'; end if;
  select * into strict c from public.clients where id=old.client_id for update;
  select * into approver from public.profiles where id=auth.uid() and is_active
    and (lower(role) in ('founder','cfmp','department_manager','dm')
      or (lower(role) in ('bm','branch_manager') and branch_code=c.branch_code));
  if not found then raise exception 'Management approval required'; end if;
  new.approved_by:=auth.uid();new.decided_at:=now();
  new.before_state:=jsonb_build_object('overdue_amount',c.overdue_amount,'due_amount',c.due_amount,
    'outstanding_balance',c.outstanding_balance,'installments_due_count',c.installments_due_count,'due_date',old.old_due_date);
  new.after_state:=new.before_state;
  if new.status='approved' then
    count_installments:=coalesce(old.installment_count,1);
    if count_installments not between 1 and 2 or coalesce(c.installment_amount,0)<=0
      or old.new_due_date is null or old.old_due_date is null or old.new_due_date<=old.old_due_date then raise exception 'Valid installment and later due date required'; end if;
    shifted:=c.installment_amount*count_installments;
    update public.clients set overdue_amount=greatest(coalesce(overdue_amount,0)-shifted,0),
      due_amount=greatest(coalesce(due_amount,0)-shifted,0),
      installments_due_count=greatest(coalesce(installments_due_count,0)-count_installments,0)
    where id=c.id returning * into c;
    if not found then raise exception 'Client update denied'; end if;
    new.after_state:=jsonb_build_object('overdue_amount',c.overdue_amount,'due_amount',c.due_amount,
      'outstanding_balance',c.outstanding_balance,'installments_due_count',c.installments_due_count,'due_date',old.new_due_date);
  end if;
  return new;
end $$;
revoke all on function public.guard_deferral_decision() from public,anon,authenticated;
create trigger deferral_atomic_decision before insert or update on public.deferrals
for each row execute function public.guard_deferral_decision();

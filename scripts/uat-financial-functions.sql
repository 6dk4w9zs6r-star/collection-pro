-- Existing functions from read-only schema inspection, with narrow posting/permission changes.
CREATE OR REPLACE FUNCTION public.apply_successful_payment()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_before numeric(14,2);
  v_after numeric(14,2);
  v_overdue_before numeric(14,2);
  v_due_before numeric(14,2);
  v_type text;
  v_branch text;
  v_employee uuid;
  v_client public.clients%rowtype;
  v_payment_no integer;
begin
  if new.status <> 'successful' or new.client_id is null or new.posted_at is not null then
    return new;
  end if;

  v_type := lower(coalesce(new.payment_type,''));

  select greatest(coalesce(outstanding_balance,0),coalesce(overdue_amount,0),coalesce(due_amount,0)),
         overdue_amount, due_amount, branch_code, employee_id
    into v_before, v_overdue_before, v_due_before, v_branch, v_employee
  from public.clients
  where id = new.client_id
  for update;

  if not found then
    raise exception 'Client % not found for payment posting', new.client_id;
  end if;

  select * into strict v_client from public.clients where id=new.client_id;
  select count(*)+1 into v_payment_no from public.payments where client_id=new.client_id
    and status='successful' and posted_at is not null and payment_type<>'deferral_fee' and id<>new.id;
  if v_type = 'deferral_fee' then
    update public.payments
    set posted_at = now(),
        matched_at = coalesce(matched_at, now()),
        installment_units = 0,
        balance_before = coalesce(v_before,0),
        balance_after = coalesce(v_before,0),
        branch_code = v_branch,
        employee_id = v_employee,
        updated_at = now()
    where id = new.id;
    insert into mf_private.payment_effects(payment_id,client_id,outstanding_delta,overdue_delta,due_delta,paid_delta,installment_delta)
    values(new.id,new.client_id,0,0,0,0,0);
    return new;
  end if;

  if new.amount > coalesce(v_before,0) then
    raise exception 'Payment amount % exceeds collectible balance %', new.amount, v_before;
  end if;

  v_after := greatest(coalesce(v_before,0) - new.amount, 0);

  update public.clients
  set outstanding_balance = v_after,
      overdue_amount = greatest(coalesce(v_overdue_before,0) - new.amount, 0),
      due_amount = greatest(coalesce(v_due_before,0) - new.amount, 0),
      paid_amount = coalesce(paid_amount,0) + new.amount,
      last_payment_date = new.payment_date,
      installments_due_count = greatest(coalesce(installments_due_count,0) - coalesce(new.installment_units,0), 0)
  where id = new.client_id;

  insert into mf_private.payment_effects(payment_id,client_id,outstanding_delta,overdue_delta,due_delta,paid_delta,installment_delta)
  select new.id,new.client_id,coalesce(v_client.outstanding_balance,0)-coalesce(c.outstanding_balance,0),
    coalesce(v_client.overdue_amount,0)-coalesce(c.overdue_amount,0),
    coalesce(v_client.due_amount,0)-coalesce(c.due_amount,0),new.amount,
    coalesce(v_client.installments_due_count,0)-coalesce(c.installments_due_count,0)
  from public.clients c where c.id=new.client_id;

  update public.payments
  set payment_no=v_payment_no, posted_at = now(),
      matched_at = coalesce(matched_at, now()),
      balance_before = coalesce(v_before,0),
      balance_after = v_after,
      branch_code = v_branch,
      employee_id = v_employee,
      updated_at = now()
  where id = new.id;

  return new;
end;
$function$;
CREATE OR REPLACE FUNCTION public.link_successful_payment_to_promises()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_promise_id uuid;
  v_before jsonb;
begin
  if new.payment_type='deferral_fee' or new.status <> 'successful' or new.client_id is null or new.posted_at is null then
    return new;
  end if;

  if tg_op = 'UPDATE'
     and old.status = 'successful'
     and old.posted_at is not null then
    return new;
  end if;

  select p.id
    into v_promise_id
    from public.promises_to_pay p
   where p.client_id = new.client_id
     and p.status = 'pending'
     and new.payment_date <= p.promise_date
   order by p.promise_date asc, p.created_at asc, p.id asc
   for update skip locked
   limit 1;

  if v_promise_id is not null then
    select to_jsonb(p) into v_before from public.promises_to_pay p where id=v_promise_id;
    update public.promises_to_pay p
       set status = 'kept',
           payment_date = new.payment_date,
           paid_amount = new.amount,
           updated_by = coalesce(new.created_by,p.updated_by),
           updated_at = now()
     where p.id = v_promise_id
       and p.status = 'pending';
    insert into mf_private.payment_promise_effects(payment_id,promise_id,before_state,applied_state)
    select new.id,v_promise_id,v_before,to_jsonb(p) from public.promises_to_pay p where id=v_promise_id
    on conflict(payment_id,promise_id) do nothing;
  end if;

  return new;
end;
$function$;
CREATE OR REPLACE FUNCTION public.import_payment_batch(p_source text, p_rows jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare r jsonb; result jsonb:='[]'; c public.clients%rowtype;
  p public.profiles%rowtype; pid uuid; existing public.payments%rowtype;
  ref text; no text; amt numeric; dt date; typ text; stat text; units int;
begin
  if not public.can_import_payments() then raise exception 'Payment import permission required' using errcode='42501'; end if;
  select * into p from public.profiles where id=auth.uid() and is_active
    and lower(role) in ('founder','cfmp','bm','als','lo');
  if not found then raise exception 'Active operational account required'; end if;
  if p_source is null or length(trim(p_source)) not between 1 and 120
     or jsonb_typeof(p_rows) is distinct from 'array'
     or jsonb_array_length(p_rows)>200 then raise exception 'Invalid import batch'; end if;
  for r in select value from jsonb_array_elements(p_rows) loop
    ref:=trim(coalesce(r->>'reference','')); pid:=null;
    begin
      no:=trim(coalesce(r->>'client_number',''));
      amt:=(r->>'amount')::numeric; dt:=(r->>'payment_date')::date;
      if ref='' or length(ref)>200 or no='' or amt is null or amt<=0
         or amt::text in ('NaN','Infinity','-Infinity') or dt is null
         or amt<>round(amt,2) then raise exception 'Stable reference, client number, date and positive two-decimal amount required'; end if;
      select * into existing from public.payments where source=trim(p_source) and source_reference=ref;
      if found then
        if existing.client_number is distinct from no or existing.amount is distinct from amt
           or existing.payment_date is distinct from dt then
          raise exception 'Reference already exists with different payment details';
        end if;
        result:=result||jsonb_build_array(jsonb_build_object('reference',ref,'status','duplicate','id',existing.id));
        continue;
      end if;
      select * into c from public.clients where client_number=no
        and public.can_access_client(assigned_user_id,branch_code)
        and (select count(*) from public.clients cc where cc.client_number=no
          and public.can_access_client(cc.assigned_user_id,cc.branch_code))=1;
      if not found then
        stat:='not_matched'; typ:='import'; units:=0;
      else
        typ:=case when c.installment_amount>amt then 'unclassified' else 'import' end;
        stat:=case when typ='unclassified' then 'pending' else 'successful' end;
        units:=case when coalesce(c.installment_amount,0)>0 then floor(amt/c.installment_amount)::int else 0 end;
      end if;
      insert into public.payments(client_id,client_number,amount,payment_date,payment_type,status,
        installment_units,source,source_reference,source_payload,branch_code,created_by,notes)
      values(c.id,no,amt,dt,typ,stat,units,trim(p_source),ref,coalesce(r->'original',r),
        coalesce(c.branch_code,p.branch_code),auth.uid(),'Imported reference: '||ref)
      on conflict (source,source_reference) where source_reference is not null do nothing returning id into pid;
      result:=result||jsonb_build_array(jsonb_build_object('reference',ref,'status',case when pid is null then 'duplicate' else stat end,'id',pid));
    exception when others then
      result:=result||jsonb_build_array(jsonb_build_object('reference',ref,'status','error','error',sqlerrm));
    end;
  end loop;
  return result;
end $function$;
CREATE OR REPLACE FUNCTION public.match_unmatched_payments(p_limit integer DEFAULT 100)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare p public.payments%rowtype; c public.clients%rowtype; result jsonb:='[]'; n int;
begin
  if not public.can_import_payments() then raise exception 'Payment import permission required' using errcode='42501'; end if;
  if not exists(select 1 from public.profiles where id=auth.uid() and is_active
    and lower(role) in ('founder','cfmp','bm','als','lo')) then raise exception 'Active operational account required'; end if;
  for p in select pay.* from public.payments pay where pay.status='not_matched' and pay.client_id is null
    and exists(select 1 from public.clients cl where cl.client_number=pay.client_number
      and public.can_access_client(cl.assigned_user_id,cl.branch_code))
    order by pay.created_at,pay.id limit least(greatest(p_limit,1),200) for update of pay skip locked loop
    begin
      select * into strict c from public.clients where client_number=p.client_number
        and public.can_access_client(assigned_user_id,branch_code);
      update public.payments set client_id=c.id,matched_at=now(),
        payment_type=case when c.installment_amount>p.amount then 'unclassified' else 'import' end,
        status=case when c.installment_amount>p.amount then 'pending' else 'successful' end,
        installment_units=case when coalesce(c.installment_amount,0)>0 then floor(p.amount/c.installment_amount)::int else 0 end
      where id=p.id;
      get diagnostics n=row_count;
      if n<>1 then raise exception 'Matching was not authorized'; end if;
      result:=result||jsonb_build_array(jsonb_build_object('id',p.id,'status','matched'));
    exception when others then
      result:=result||jsonb_build_array(jsonb_build_object('id',p.id,'status','error','error',sqlerrm));
    end;
  end loop;
  return result;
end $function$;
revoke all on function public.apply_successful_payment(),public.link_successful_payment_to_promises() from public,anon,authenticated;
CREATE OR REPLACE FUNCTION public.protect_payment_financial_fields()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  v_branch text;
  v_employee uuid;
  v_collectible numeric(14,2);
begin
  if pg_trigger_depth() > 1 then
    return new;
  end if;

  if tg_op = 'UPDATE' then
    if new.created_by is distinct from old.created_by
       or new.source is distinct from old.source
       or new.source_reference is distinct from old.source_reference
       or new.payment_no is distinct from old.payment_no then
      raise exception 'Payment ownership/source identifiers are immutable';
    end if;

    if old.posted_at is not null then
      if new.client_id is distinct from old.client_id
         or new.amount is distinct from old.amount
         or new.payment_date is distinct from old.payment_date
         or new.payment_type is distinct from old.payment_type
         or new.installment_units is distinct from old.installment_units
         or new.posted_at is distinct from old.posted_at
         or new.matched_at is distinct from old.matched_at
         or new.balance_before is distinct from old.balance_before
         or new.balance_after is distinct from old.balance_after
         or new.branch_code is distinct from old.branch_code
         or new.employee_id is distinct from old.employee_id then
        raise exception 'Posted payment financial fields are immutable';
      end if;
      return new;
    end if;
  end if;

  -- Before posting these fields are database-managed.
  new.posted_at := null;
  new.balance_before := null;
  new.balance_after := null;

  if new.client_id is not null then
    select c.branch_code,
           c.employee_id,
           greatest(coalesce(c.outstanding_balance,0),coalesce(c.overdue_amount,0),coalesce(c.due_amount,0))
      into v_branch, v_employee, v_collectible
    from public.clients c
    where c.id = new.client_id;

    if not found then
      raise exception 'Client % not found for payment', new.client_id;
    end if;

    new.branch_code := v_branch;
    new.employee_id := v_employee;

    if new.status = 'successful'
       and lower(coalesce(new.payment_type,'')) <> 'deferral_fee'
       and new.amount > v_collectible then
      raise exception 'Payment amount % exceeds collectible balance %', new.amount, v_collectible;
    end if;
  end if;

  return new;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.limited_global_client_search(p_query text)
 RETURNS TABLE(id bigint,client_name text,client_number text,phone text,guarantor_name text,guarantor_phone text,branch_code text,assigned_employee text,in_scope boolean)
 LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
begin
 if not exists(select 1 from public.profiles p where p.id=auth.uid() and p.is_active and lower(p.role) in ('lo','als','bm','cfmp','founder','department_manager','dm')) then
  raise exception 'Not authorized' using errcode='42501';
 end if;
 if length(trim(coalesce(p_query,'')))<2 then return; end if;
 return query select c.id,c.client_name,c.client_number,c.phone,c.guarantor_name,c.guarantor_phone,c.branch_code,c.assigned_employee,true
 from public.clients c where public.can_access_client(c.assigned_user_id,c.branch_code) and (
  lower(coalesce(c.client_name,'')) like '%'||lower(trim(p_query))||'%'
  or lower(coalesce(c.client_number,'')) like '%'||lower(trim(p_query))||'%'
  or lower(coalesce(c.phone,'')) like '%'||lower(trim(p_query))||'%'
  or lower(coalesce(c.guarantor_name,'')) like '%'||lower(trim(p_query))||'%'
  or lower(coalesce(c.guarantor_phone,'')) like '%'||lower(trim(p_query))||'%'
  or lower(coalesce(c.reference_1_name,'')) like '%'||lower(trim(p_query))||'%'
  or lower(coalesce(c.reference_1_phone,'')) like '%'||lower(trim(p_query))||'%'
  or lower(coalesce(c.reference_2_name,'')) like '%'||lower(trim(p_query))||'%'
  or lower(coalesce(c.reference_2_phone,'')) like '%'||lower(trim(p_query))||'%')
 order by c.client_name nulls last,c.id limit 50;
end $$;
revoke all on function public.limited_global_client_search(text) from public,anon;
grant execute on function public.limited_global_client_search(text) to authenticated;
commit;

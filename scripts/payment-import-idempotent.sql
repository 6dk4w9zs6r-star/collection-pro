-- Additive production change. No existing payment or balance is rewritten.
alter table public.payments add column if not exists source_reference text;
alter table public.payments add column if not exists source_payload jsonb;
create unique index if not exists payments_source_reference_unique
  on public.payments(source, source_reference) where source_reference is not null;

create or replace function public.protect_payment_import_identity()
returns trigger language plpgsql set search_path=public as $$
begin
  if new.source_reference is distinct from old.source_reference
     or new.source_payload is distinct from old.source_payload then
    raise exception 'Original import reference and payload are immutable';
  end if;
  return new;
end $$;
revoke all on function public.protect_payment_import_identity() from public,anon,authenticated;
create trigger payments_import_identity_guard before update on public.payments
for each row execute function public.protect_payment_import_identity();

-- Unmatched records remain owned by their importer, with management access
-- restricted to the recorded branch. Both the old and new row are checked.
create policy payments_match_unmatched_by_scope on public.payments
for update to authenticated using (
  client_id is null and status='not_matched' and exists (
    select 1 from public.profiles p where p.id=auth.uid() and p.is_active
      and (payments.created_by=p.id or lower(p.role) in ('founder','cfmp')
        or (lower(p.role)='bm' and p.branch_code=payments.branch_code))
  )
) with check (
  client_id is not null and exists (
    select 1 from public.clients c where c.id=payments.client_id
      and public.can_access_client(c.assigned_user_id,c.branch_code)
  )
);

create or replace function public.import_payment_batch(p_source text,p_rows jsonb)
returns jsonb language plpgsql security invoker set search_path=public as $$
declare r jsonb; result jsonb:='[]'; c public.clients%rowtype;
  p public.profiles%rowtype; pid uuid; existing public.payments%rowtype;
  ref text; no text; amt numeric; dt date; typ text; stat text; units int;
begin
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
end $$;
revoke all on function public.import_payment_batch(text,jsonb) from public,anon;
grant execute on function public.import_payment_batch(text,jsonb) to authenticated;

create or replace function public.match_unmatched_payments(p_limit int default 100)
returns jsonb language plpgsql security invoker set search_path=public as $$
declare p public.payments%rowtype; c public.clients%rowtype; result jsonb:='[]'; n int;
begin
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
end $$;
revoke all on function public.match_unmatched_payments(int) from public,anon;
grant execute on function public.match_unmatched_payments(int) to authenticated;

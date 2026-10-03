-- Isolated UAT only. Preserve legacy unknown sequence as NULL; never infer it.
alter table public.clients add column if not exists loan_sequence integer check(loan_sequence>0);
alter table public.payments add column if not exists loan_sequence integer check(loan_sequence>0);
create index if not exists clients_number_sequence_idx on public.clients(client_number,loan_sequence);
CREATE OR REPLACE FUNCTION public.import_payment_batch(p_source text, p_rows jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare r jsonb; result jsonb:='[]'; c public.clients%rowtype;
  p public.profiles%rowtype; pid uuid; existing public.payments%rowtype;
  ref text; no text; seq integer; amt numeric; dt date; typ text; stat text; units int;
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
      seq:=nullif(trim(r->>'loan_sequence'),'')::integer;
      if seq is not null and seq<=0 then raise exception 'Positive loan sequence required'; end if;
      if coalesce((r->>'historical')::boolean,false) or coalesce((r->>'financial_posting_allowed')::boolean,true)=false then raise exception 'Historical snapshot rows require baseline reconciliation, not financial import'; end if;
      amt:=(r->>'amount')::numeric; dt:=(r->>'payment_date')::date;
      if ref='' or length(ref)>200 or no='' or amt is null or amt<=0
         or amt::text in ('NaN','Infinity','-Infinity') or dt is null
         or amt<>round(amt,2) then raise exception 'Stable reference, client number, date and positive two-decimal amount required'; end if;
      select * into existing from public.payments where source=trim(p_source) and source_reference=ref;
      if found then
        if existing.client_number is distinct from no or existing.loan_sequence is distinct from seq or existing.amount is distinct from amt
           or existing.payment_date is distinct from dt then
          raise exception 'Reference already exists with different payment details';
        end if;
        result:=result||jsonb_build_array(jsonb_build_object('reference',ref,'status','duplicate','id',existing.id));
        continue;
      end if;
      select * into c from public.clients where client_number=no and loan_sequence is not distinct from seq
        and public.can_access_client(assigned_user_id,branch_code)
        and (select count(*) from public.clients cc where cc.client_number=no and cc.loan_sequence is not distinct from seq
          and public.can_access_client(cc.assigned_user_id,cc.branch_code))=1;
      if not found then
        stat:='not_matched'; typ:='import'; units:=0;
      else
        typ:=case when c.installment_amount>amt then 'unclassified' else 'import' end;
        stat:=case when typ='unclassified' then 'pending' else 'successful' end;
        units:=case when coalesce(c.installment_amount,0)>0 then floor(amt/c.installment_amount)::int else 0 end;
      end if;
      insert into public.payments(client_id,client_number,loan_sequence,amount,payment_date,payment_type,status,
        installment_units,source,source_reference,source_payload,branch_code,created_by,notes)
      values(c.id,no,seq,amt,dt,typ,stat,units,trim(p_source),ref,coalesce(r->'original',r),
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
    and exists(select 1 from public.clients cl where cl.client_number=pay.client_number and cl.loan_sequence is not distinct from pay.loan_sequence
      and public.can_access_client(cl.assigned_user_id,cl.branch_code))
    order by pay.created_at,pay.id limit least(greatest(p_limit,1),200) for update of pay skip locked loop
    begin
      select * into strict c from public.clients where client_number=p.client_number and loan_sequence is not distinct from p.loan_sequence
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

create or replace function mf_private.guard_payment_loan_identity() returns trigger
language plpgsql set search_path=public,pg_temp as $$
begin
 if tg_op='INSERT' and new.client_id is not null and new.loan_sequence is null then
  select c.loan_sequence into new.loan_sequence from public.clients c where c.id=new.client_id;
 end if;
 if tg_op='UPDATE' and new.loan_sequence is distinct from old.loan_sequence then
  raise exception 'Payment loan identity is immutable';
 end if;
 if new.client_id is not null and not exists(select 1 from public.clients c where c.id=new.client_id and c.loan_sequence is not distinct from new.loan_sequence) then
  raise exception 'Payment loan identity does not match client account';
 end if;
 return new;
end $$;
revoke all on function mf_private.guard_payment_loan_identity() from public,anon,authenticated;
create trigger payment_loan_identity_guard before insert or update on public.payments
for each row execute function mf_private.guard_payment_loan_identity();


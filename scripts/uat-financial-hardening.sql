-- UAT review artifact. NOT applied to the shared MD-COLLECTION database.
-- Run in an isolated UAT clone only, after preflight and within this transaction.
begin;
do $$ begin
 if current_setting('mf.isolated_uat',true) is distinct from 'confirmed' then
  raise exception 'Isolated UAT database must be confirmed before applying';
 end if;
 if to_regprocedure('public.record_field_visit_atomic(bigint,text,text,numeric,numeric,numeric,text,text,text,numeric,text)') is null
 or to_regprocedure('public.apply_successful_payment()') is null
 or not exists(select 1 from information_schema.columns where table_schema='public' and table_name='payments' and column_name='posted_at' and data_type='timestamp with time zone')
 or not exists(select 1 from information_schema.columns where table_schema='public' and table_name='usage_consents' and column_name='policy_version' and data_type='text') then
  raise exception 'Unexpected schema: rerun read-only preflight and align deployment';
 end if;
 if pg_get_functiondef('public.accept_usage_policy(text)'::regprocedure) not like '%phase5-20260918%' then
  raise exception 'Align consent RPC to phase5-20260918 before this patch; preserve historical consent rows';
 end if;
end $$;

-- Explicit financial permission, independent from report SELECT permissions.
-- Conservative initial grant: active Founder only. No new grants to other roles.
create or replace function public.can_import_payments() returns boolean
language sql stable security invoker set search_path='' as $$
 select exists(select 1 from public.profiles where id=(select auth.uid()) and is_active and lower(role)='founder');
$$;
revoke all on function public.can_import_payments() from public,anon;
grant execute on function public.can_import_payments() to authenticated;

-- Restrictive policies intersect existing scope policies without changing read access.
create policy payments_import_permission_insert on public.payments as restrictive
for insert to authenticated with check (
 (source_reference is null and payment_type is distinct from 'import') or public.can_import_payments());
create policy payments_import_permission_update on public.payments as restrictive
for update to authenticated using (
 (source_reference is null and payment_type is distinct from 'import') or public.can_import_payments())
with check ((source_reference is null and payment_type is distinct from 'import') or public.can_import_payments());

create policy payments_preserve_posted_original on public.payments as restrictive
for delete to authenticated using(posted_at is null);

-- Preserve historical R-O rows and read policies; disable all manual table mutations.
create policy writeoffs_no_manual_insert on public.write_offs as restrictive
for insert to authenticated with check(false);
create policy writeoffs_no_manual_update on public.write_offs as restrictive
for update to authenticated using(false) with check(false);
create policy writeoffs_no_manual_delete on public.write_offs as restrictive
for delete to authenticated using(false);

create schema if not exists mf_private;
revoke all on schema mf_private from public,anon;
grant usage on schema mf_private to authenticated;
-- Exact component deltas, captured only for future postings. Never infer legacy deltas.
create table mf_private.payment_effects (
 payment_id uuid primary key references public.payments(id),
 client_id bigint not null references public.clients(id),
 outstanding_delta numeric not null, overdue_delta numeric not null, due_delta numeric not null,
 paid_delta numeric not null, installment_delta integer not null,
 captured_at timestamptz not null default now()
);
create table mf_private.payment_reversals (
 id uuid primary key default gen_random_uuid(),
 payment_id uuid not null unique references public.payments(id),
 client_id bigint not null references public.clients(id),
 amount numeric not null, reason text not null check(length(trim(reason))>0),
 reversed_by uuid not null, created_at timestamptz not null default now(),
 restored_components jsonb not null
);
create table mf_private.payment_promise_effects (
 payment_id uuid not null references public.payments(id),
 promise_id uuid not null references public.promises_to_pay(id),
 before_state jsonb not null, applied_state jsonb not null,
 primary key(payment_id,promise_id)
);
alter table mf_private.payment_effects enable row level security;
alter table mf_private.payment_reversals enable row level security;
alter table mf_private.payment_promise_effects enable row level security;
revoke all on mf_private.payment_effects,mf_private.payment_reversals,mf_private.payment_promise_effects from public,anon,authenticated;

-- Replace unsafe legacy reversal: restore only proven deltas, never amount to all balances.
create or replace function public.reverse_successful_payment() returns trigger
language plpgsql security definer set search_path='' as $$
declare e mf_private.payment_effects%rowtype; r mf_private.payment_reversals%rowtype;
 p record; current_promise jsonb; reason text;
begin
 if old.status<>'successful' or new.status<>'reversed' then return new; end if;
 if auth.uid() is null or not public.can_import_payments() then raise exception 'Founder financial permission required' using errcode='42501'; end if;
 reason:=nullif(trim(current_setting('mf.reversal_reason',true)),'');
 if reason is null then raise exception 'Use reverse_payment with a reason'; end if;
 select * into e from mf_private.payment_effects where payment_id=old.id;
 if not found or old.posted_at is null then raise exception 'Legacy payment lacks exact posting evidence; reconciliation required'; end if;
 perform 1 from public.clients where id=e.client_id for update;
 insert into mf_private.payment_reversals(payment_id,client_id,amount,reason,reversed_by,restored_components)
 values(old.id,e.client_id,old.amount,reason,auth.uid(),to_jsonb(e)) returning * into r;
 update public.clients set
  outstanding_balance=coalesce(outstanding_balance,0)+e.outstanding_delta,
  overdue_amount=coalesce(overdue_amount,0)+e.overdue_delta,
  due_amount=coalesce(due_amount,0)+e.due_delta,
  paid_amount=coalesce(paid_amount,0)-e.paid_delta,
  installments_due_count=coalesce(installments_due_count,0)+e.installment_delta,
  last_payment_date=(select max(payment_date) from public.payments where client_id=e.client_id and status='successful' and posted_at is not null and payment_type<>'deferral_fee')
 where id=e.client_id;
 -- Only undo a PTP state still identical to the state produced by this payment.
 -- A later manual decision is retained; never overwrite unrelated PTP history.
 for p in select * from mf_private.payment_promise_effects where payment_id=old.id loop
  select to_jsonb(x) into current_promise from public.promises_to_pay x where id=p.promise_id for update;
  if current_promise=p.applied_state then
   update public.promises_to_pay set status=p.before_state->>'status',
    payment_date=(p.before_state->>'payment_date')::date,
    paid_amount=(p.before_state->>'paid_amount')::numeric,
    updated_by=auth.uid(),updated_at=now() where id=p.promise_id;
  end if;
 end loop;
 insert into public.audit_log(actor_user_id,action,entity_type,entity_id,client_id,old_data,new_data,metadata)
 values(auth.uid(),'payment_reversed','payment',old.id::text,e.client_id,to_jsonb(old),to_jsonb(new),
 jsonb_build_object('reversal_id',r.id,'original_payment_id',old.id,'reason',reason,'restored_components',to_jsonb(e)));
 return new;
end $$;
revoke all on function public.reverse_successful_payment() from public,anon,authenticated;

-- Invoker entry point retains existing payment RLS, locks the original row,
-- and delegates to the existing atomic status trigger. Repeats return the same receipt.
create or replace function public.reverse_payment(p_payment_id uuid,p_reason text) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare p public.payments%rowtype;
begin
 if auth.uid() is null or not public.can_import_payments() then raise exception 'Founder financial permission required' using errcode='42501'; end if;
 if nullif(trim(p_reason),'') is null then raise exception 'Reversal reason required'; end if;
 select * into p from public.payments where id=p_payment_id for update;
 if not found then raise exception 'Payment not found or outside scope'; end if;
 if p.status='reversed' then return jsonb_build_object('payment_id',p.id,'status','reversed','duplicate',true); end if;
 if p.status<>'successful' or p.posted_at is null then raise exception 'Only posted successful payments may be reversed'; end if;
 perform set_config('mf.reversal_reason',p_reason,true);
 update public.payments set status='reversed',updated_at=now() where id=p.id;
 return jsonb_build_object('payment_id',p.id,'status','reversed','duplicate',false);
end $$;
revoke all on function public.reverse_payment(uuid,text) from public,anon;
grant execute on function public.reverse_payment(uuid,text) to authenticated;

-- Existing invoker atomic visit RPC continues to honor RLS. No definer conversion.
revoke all on function public.record_field_visit_atomic(bigint,text,text,numeric,numeric,numeric,text,text,text,numeric,text) from public,anon;
grant execute on function public.record_field_visit_atomic(bigint,text,text,numeric,numeric,numeric,text,text,text,numeric,text) to authenticated;

-- Remaining existing-function changes are generated from the inspected baseline
-- in uat-financial-functions.sql, included by the isolated deployment runner.
-- Do not commit until BOTH files have executed in the same transaction.

create table mf_uat_staging.payment_reviews(source_identity text primary key,classification text not null check(classification in('advance','partial','deferral_fee','needs_account')),reason text not null check(length(trim(reason)) between 1 and 1000),reviewed_by uuid not null,reviewed_at timestamptz not null default now());
alter table mf_uat_staging.payment_reviews enable row level security;
revoke all on mf_uat_staging.payment_reviews from public,anon,authenticated;
create or replace function public.review_source_payment(p_source_identity text,p_classification text,p_reason text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare old_review mf_uat_staging.payment_reviews%rowtype;
begin
 if not public.can_import_payments() then raise exception 'Independent payment review permission required' using errcode='42501';end if;
 if p_classification not in('advance','partial','deferral_fee','needs_account') or p_classification is null or p_reason is null or length(trim(p_reason)) not between 1 and 1000 then raise exception 'Classification and reason required';end if;
 if not exists(select 1 from jsonb_array_elements(public.get_source_payment_history()) r where r->>'source_identity'=p_source_identity and r->>'review_state'='account_not_in_reports') then raise exception 'Unmatched scoped source payment required';end if;
 perform 1 from mf_uat_staging.source_rows where dataset='payments' and source_key=p_source_identity for update;
 select * into old_review from mf_uat_staging.payment_reviews where source_identity=p_source_identity;
 if found then
  if old_review.classification<>p_classification or old_review.reason<>trim(p_reason) then raise exception 'Source review already recorded with different decision';end if;
  return jsonb_build_object('source_identity',p_source_identity,'duplicate',true,'financial_posted',false);
 end if;
 insert into mf_uat_staging.payment_reviews(source_identity,classification,reason,reviewed_by) values(p_source_identity,p_classification,trim(p_reason),auth.uid());
 insert into public.audit_log(actor_user_id,action,entity_type,entity_id,metadata) values(auth.uid(),'payment_source_reviewed','payment_source',p_source_identity,jsonb_build_object('classification',p_classification,'reason',trim(p_reason),'financial_posted',false));
 return jsonb_build_object('source_identity',p_source_identity,'duplicate',false,'financial_posted',false);
end $$;
revoke all on function public.review_source_payment(text,text,text) from public,anon;
grant execute on function public.review_source_payment(text,text,text) to authenticated;

-- Source evidence is read-only and never enters the financial posting table.
create or replace function public.get_source_payment_history() returns jsonb
language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 if auth.uid() is null or not exists(select 1 from public.profiles p where p.id=auth.uid() and p.is_active and lower(p.role) in('founder','cfmp','bm','als','lo')) then
  raise exception 'Active operational account required' using errcode='42501';
 end if;
 select coalesce(jsonb_agg(jsonb_build_object(
  'source_identity',s.source_key,'employee_code',s.payload->>'employee_code',
  'client_number',s.payload->>'client_number','loan_sequence',s.payload->>'loan_sequence',
  'payment_date',s.payload->>'payment_date','voucher_number',s.payload->>'voucher_number',
  'amount',(s.payload->>'amount')::numeric,'currency',s.payload->>'currency',
  'matching_client_id',m.client_id,'review_state',case when m.client_id is null then 'account_not_in_reports' else 'baseline_reconciliation_required' end,
  'financial_posted',false,'manual_classification',review.classification,'review_reason',review.reason) order by s.payload->>'payment_date',s.source_key),'[]'::jsonb)
 into result
 from mf_uat_staging.source_rows s
 join public.employees e on e.employee_number=s.payload->>'employee_code' and e.is_active
 join public.profiles ep on ep.id=e.auth_user_id and ep.is_active
 join mf_uat_staging.source_rows team on team.dataset='employees' and team.payload->>'employee_code'=e.employee_number and team.payload->>'role'='lo'
 left join mf_uat_staging.portfolio_links m on m.employee_code=e.employee_number and m.client_number=s.payload->>'client_number' and m.loan_sequence=(s.payload->>'loan_sequence')::integer and m.report_period_start='2026-10-01' and m.report_period_end='2026-10-31'
 left join mf_uat_staging.payment_reviews review on review.source_identity=s.source_key
 where s.dataset='payments' and public.can_access_client(e.auth_user_id,ep.branch_code);
 return result;
end $$;
revoke all on function public.get_source_payment_history() from public,anon;
grant execute on function public.get_source_payment_history() to authenticated;

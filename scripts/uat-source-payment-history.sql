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
  'financial_posted',false) order by s.payload->>'payment_date',s.source_key),'[]'::jsonb)
 into result
 from mf_uat_staging.source_rows s
 join public.employees e on e.employee_number=s.payload->>'employee_code' and e.is_active
 join public.profiles ep on ep.id=e.auth_user_id and ep.is_active
 join mf_uat_staging.source_rows team on team.dataset='employees' and team.payload->>'employee_code'=e.employee_number and team.payload->>'role'='lo'
 left join mf_uat_staging.portfolio_links m on m.employee_code=e.employee_number and m.client_number=s.payload->>'client_number' and m.loan_sequence=(s.payload->>'loan_sequence')::integer and m.report_period_start='2026-10-01' and m.report_period_end='2026-10-31'
 where s.dataset='payments' and public.can_access_client(e.auth_user_id,ep.branch_code);
 return result;
end $$;
revoke all on function public.get_source_payment_history() from public,anon;
grant execute on function public.get_source_payment_history() to authenticated;

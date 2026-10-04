-- Preserve eligibility stated by the imported Late source until an actual installment is paid.
alter table public.clients add column if not exists late_source_overdue_amount numeric;
update public.clients c set late_source_overdue_amount=(s.payload->>'late_amount')::numeric
from mf_uat_staging.portfolio_links m join mf_uat_staging.source_rows s
on s.dataset='late' and s.payload->>'employee_code'=m.employee_code and s.payload->>'client_number'=m.client_number
where c.id=m.client_id and c.late_source_overdue_amount is null;

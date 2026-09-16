create policy disbursements_start_pending on public.disbursements
as restrictive for insert to authenticated
with check (status='pending' and approved_by is null and decided_at is null);

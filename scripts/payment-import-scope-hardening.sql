create policy payments_require_active_profile on public.payments as restrictive for all to authenticated using (exists(select 1 from public.profiles where id=auth.uid() and is_active)) with check (exists(select 1 from public.profiles where id=auth.uid() and is_active));
alter policy payments_select_by_client_scope on public.payments using (
(client_id is not null and exists(select 1 from public.clients c where c.id=payments.client_id and public.can_access_client(c.assigned_user_id,c.branch_code)))
or (client_id is null and (created_by=auth.uid() or exists(select 1 from public.profiles p where p.id=auth.uid() and p.is_active and (lower(p.role) in ('founder','cfmp') or (lower(p.role)='bm' and p.branch_code=payments.branch_code))))));
create or replace function public.protect_payment_import_identity() returns trigger language plpgsql set search_path=public as $$
begin
if new.source_reference is distinct from old.source_reference or new.source_payload is distinct from old.source_payload
or (old.source_reference is not null and (new.amount is distinct from old.amount or new.payment_date is distinct from old.payment_date or new.client_number is distinct from old.client_number))
then raise exception 'Original imported financial identity is immutable'; end if;
return new;
end $$;

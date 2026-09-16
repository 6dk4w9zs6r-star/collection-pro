create table public.usage_consents (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null default auth.uid() references auth.users(id),
 policy_version text not null check(policy_version='2026-09-14'),
 accepted_text text not null default '',
 accepted_at timestamptz not null default now(),
 unique(user_id,policy_version)
);
alter table public.usage_consents enable row level security;
revoke all on public.usage_consents from public,anon,authenticated;
grant select,insert on public.usage_consents to authenticated;
grant all on public.usage_consents to service_role;
create policy usage_consents_read on public.usage_consents for select to authenticated
using ((user_id=(select auth.uid()) or public.is_founder()) and exists(select 1 from public.profiles where id=(select auth.uid()) and is_active));
create policy usage_consents_create on public.usage_consents for insert to authenticated
with check(user_id=(select auth.uid()) and exists(select 1 from public.profiles where id=(select auth.uid()) and is_active));
create function public.stamp_usage_consent() returns trigger language plpgsql set search_path='' as $$
begin
 new.accepted_at:=now();
 new.accepted_text:='أوافق على استخدام بيانات العمل ضمن الصلاحيات الممنوحة، وعلى حفظ سجل الإجراءات والرسائل والمحادثات والمكالمات الصوتية والمرئية والمرفقات لأغراض التشغيل والمتابعة والتدقيق. وأفهم أن الاطلاع الإداري على السجلات المحفوظة يتم فقط حسب السياسة والصلاحيات المعتمدة، وأن مشاركة بيانات العملاء خارج نطاق العمل غير مسموحة.';
 return new;
end $$;
revoke all on function public.stamp_usage_consent() from public,anon,authenticated;
create trigger usage_consent_server_values before insert on public.usage_consents for each row execute function public.stamp_usage_consent();
create trigger usage_consent_audit after insert on public.usage_consents for each row execute function public.audit_admin_module_change();
create function public.accept_usage_policy(p_version text) returns public.usage_consents language plpgsql security invoker set search_path='' as $$
declare r public.usage_consents;
begin
 if p_version is distinct from '2026-09-14' then raise exception 'Unsupported usage policy version';end if;
 insert into public.usage_consents(user_id,policy_version) values(auth.uid(),p_version) on conflict(user_id,policy_version) do nothing;
 select * into strict r from public.usage_consents where user_id=auth.uid() and policy_version=p_version;
 return r;
end $$;
revoke all on function public.accept_usage_policy(text) from public,anon;
grant execute on function public.accept_usage_policy(text) to authenticated;

-- This private, bounded export is an operational archive, not a disaster-recovery dump.
-- STABLE uses one statement snapshot for every SELECT in the helper.
create schema if not exists mf_private;
revoke all on schema mf_private from public,anon;
grant usage on schema mf_private to authenticated;
create function mf_private.operational_archive() returns jsonb language plpgsql stable security definer set search_path='' as $$
declare t text; rows jsonb; data jsonb:='{}'; counts jsonb:='{}'; total bigint:=0;
begin
 if auth.uid() is null or not public.is_founder() then raise exception 'Active Founder required' using errcode='42501';end if;
 foreach t in array array['activities','announcement_reads','announcements','approved_accounts','attachments','audit_log','branches','call_invitations','chat_messages','client_notes','clients','deferrals','disbursements','employees','escalated_cases','field_visits','follow_ups','late_due','legal_cases','loan_requests','locations','messages','notification_preferences','notifications','payments','portfolios','profiles','promises_to_pay','promotions','teams','usage_consents','write_offs'] loop
   execute format('select coalesce(jsonb_agg(to_jsonb(r)), ''[]''::jsonb) from public.%I r',t) into rows;
   total:=total+octet_length(rows::text);if total>20971520 then raise exception 'Operational archive exceeds 20 MiB; use managed database backup';end if;
   data:=data||jsonb_build_object(t,rows);counts:=counts||jsonb_build_object(t,jsonb_array_length(rows));
 end loop;
 return jsonb_build_object('product','NEXA-MF','schema','mf-nexa-operational-archive-v2','source','thfnitjiiwdsbwcunlbs','exported_at',statement_timestamp(),'exported_by',auth.uid(),'tables',data,'counts',counts,'excluded',jsonb_build_array('auth','storage_file_bytes','database_schema_functions_policies','collection_app_snapshot','edge_functions_secrets','external_configuration'),'disaster_recovery',false);
end $$;
revoke all on function mf_private.operational_archive() from public,anon;
grant execute on function mf_private.operational_archive() to authenticated;
create function public.export_operational_archive() returns jsonb language plpgsql security invoker set search_path='' as $$
declare result jsonb;
begin
 result:=mf_private.operational_archive();
 insert into public.audit_log(actor_user_id,action,entity_type,metadata) values(auth.uid(),'operational_archive_export','backup',jsonb_build_object('counts',result->'counts','exported_at',result->'exported_at'));
 return result;
end $$;
revoke all on function public.export_operational_archive() from public,anon;
grant execute on function public.export_operational_archive() to authenticated;

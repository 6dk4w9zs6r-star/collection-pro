create function public.can_signal_call(p_topic text) returns boolean language sql stable security invoker set search_path='' as $$
 select exists(select 1 from public.call_invitations c where p_topic='mf-call-'||c.id::text and c.status='accepted'
   and auth.uid() in(c.caller_id,c.callee_id) and exists(select 1 from public.profiles p where p.id=auth.uid() and p.is_active));
$$;
revoke all on function public.can_signal_call(text) from public,anon;
grant execute on function public.can_signal_call(text) to authenticated;
create policy mf_call_signal_read on realtime.messages for select to authenticated
using(extension='broadcast' and public.can_signal_call((select realtime.topic())));
create policy mf_call_signal_send on realtime.messages for insert to authenticated
with check(extension='broadcast' and public.can_signal_call((select realtime.topic())));

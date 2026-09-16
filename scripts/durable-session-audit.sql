-- Server stamps reserved session audit events; arbitrary client metadata is ignored.
create function public.stamp_session_audit() returns trigger language plpgsql set search_path='' as $$
declare sid text;
begin
 if new.action in('session_login','session_logout') then
   if auth.uid() is null then raise exception 'Authenticated account required' using errcode='42501';end if;
   sid:=auth.jwt()->>'session_id';
   if sid is null or sid !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then raise exception 'Authenticated session required';end if;
   if new.action='session_login' and not exists(select 1 from public.profiles where id=auth.uid() and is_active) then raise exception 'Active account required' using errcode='42501';end if;
   new.actor_user_id:=auth.uid();new.entity_type:='auth_session';new.entity_id:=sid;new.client_id:=null;new.old_data:=null;new.new_data:=null;
   new.metadata:=jsonb_build_object('session_id',sid);new.created_at:=now();
 end if;
 return new;
end $$;
revoke all on function public.stamp_session_audit() from public,anon,authenticated;
create trigger session_audit_server_values before insert on public.audit_log for each row execute function public.stamp_session_audit();
create unique index session_audit_once_idx on public.audit_log(actor_user_id,action,entity_id)
where action in('session_login','session_logout') and entity_type='auth_session';
create function public.record_session_event(p_action text) returns public.audit_log language plpgsql security invoker set search_path='' as $$
declare r public.audit_log; a text;
begin
 if p_action not in('login','logout') or p_action is null then raise exception 'Unsupported session action';end if;
 a:='session_'||p_action;
 insert into public.audit_log(actor_user_id,action,entity_type,entity_id) values(auth.uid(),a,'auth_session',auth.jwt()->>'session_id')
 on conflict(actor_user_id,action,entity_id) where action in('session_login','session_logout') and entity_type='auth_session' do nothing;
 select * into strict r from public.audit_log where actor_user_id=auth.uid() and action=a and entity_type='auth_session' and entity_id=auth.jwt()->>'session_id';
 return r;
end $$;
revoke all on function public.record_session_event(text) from public,anon;
grant execute on function public.record_session_event(text) to authenticated;

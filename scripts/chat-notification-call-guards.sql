create policy chat_active_account on public.chat_messages as restrictive for all to authenticated
using(exists(select 1 from public.profiles where id=(select auth.uid()) and is_active))
with check(exists(select 1 from public.profiles where id=(select auth.uid()) and is_active));
create policy chat_team_branch_scope on public.chat_messages as restrictive for select to authenticated
using(room_type<>'team' or public.is_founder() or exists(select 1 from public.profiles where id=(select auth.uid()) and is_active and team=chat_messages.team_key and branch_code=chat_messages.branch_code));
create policy calls_active_account on public.call_invitations as restrictive for all to authenticated
using(exists(select 1 from public.profiles where id=(select auth.uid()) and is_active))
with check(exists(select 1 from public.profiles where id=(select auth.uid()) and is_active));
create policy notifications_active_account on public.notifications as restrictive for all to authenticated
using(exists(select 1 from public.profiles where id=(select auth.uid()) and is_active))
with check(exists(select 1 from public.profiles where id=(select auth.uid()) and is_active));
create policy notification_preferences_active on public.notification_preferences as restrictive for all to authenticated
using(exists(select 1 from public.profiles where id=(select auth.uid()) and is_active))
with check(exists(select 1 from public.profiles where id=(select auth.uid()) and is_active));

create function public.validate_chat_room() returns trigger language plpgsql set search_path='' as $$
declare p public.profiles; expected text;
begin
 select * into strict p from public.profiles where id=auth.uid() and is_active;
 if new.sender_id is distinct from auth.uid() then raise exception 'Sender identity mismatch';end if;
 new.sender_name:=p.full_name;new.created_at:=now();new.branch_code:=p.branch_code;
 if length(trim(coalesce(new.message_text,''))) not between 1 and 10000 then raise exception 'Message text must be 1 to 10000 characters';end if;
 if new.attachment_url is not null and new.attachment_url not like auth.uid()::text||'/%' then raise exception 'Attachment must belong to sender';end if;
 if new.room_type='general' then
   expected:='general';if new.target_user_id is not null or new.team_key is not null then raise exception 'Unexpected general-room target';end if;
 elsif new.room_type='private' then
   if new.target_user_id is null or new.target_user_id=auth.uid() or not exists(select 1 from public.profiles where id=new.target_user_id and is_active) then raise exception 'Active private recipient required';end if;
   expected:='private:'||least(auth.uid()::text,new.target_user_id::text)||':'||greatest(auth.uid()::text,new.target_user_id::text);
   if new.team_key is not null then raise exception 'Unexpected private-room team';end if;
 elsif new.room_type='team' then
   if new.target_user_id is not null or new.team_key is null or (not public.is_founder() and p.team is distinct from new.team_key)
     or not exists(select 1 from public.teams t where t.is_active and t.branch_code=p.branch_code and (t.code=new.team_key or t.name=new.team_key)) then raise exception 'Registered team in your branch required';end if;
   expected:='team:'||new.team_key;
 else raise exception 'Unsupported room type';end if;
 if new.room_id is distinct from expected then raise exception 'Room identity does not match participants';end if;
 return new;
end $$;
revoke all on function public.validate_chat_room() from public,anon,authenticated;
create trigger validate_chat_room_before_insert before insert on public.chat_messages for each row execute function public.validate_chat_room();

create function public.send_chat_message(p_id uuid,p_room_id text,p_room_type text,p_target_id uuid,p_team_key text,p_text text,p_attachment_name text,p_attachment_url text)
returns public.chat_messages language plpgsql security invoker set search_path='' as $$
declare r public.chat_messages;
begin
 if p_id is null then raise exception 'Stable message id required';end if;
 insert into public.chat_messages(id,room_id,room_type,sender_id,target_user_id,team_key,message_text,attachment_name,attachment_url)
 values(p_id,p_room_id,p_room_type,auth.uid(),p_target_id,p_team_key,p_text,p_attachment_name,p_attachment_url) on conflict(id) do nothing;
 select * into strict r from public.chat_messages where id=p_id and sender_id=auth.uid();
 if r.room_id is distinct from p_room_id or r.room_type is distinct from p_room_type or r.target_user_id is distinct from p_target_id or r.team_key is distinct from p_team_key or r.message_text is distinct from p_text or r.attachment_url is distinct from p_attachment_url or r.attachment_name is distinct from p_attachment_name then raise exception 'Message id already used with different content';end if;
 return r;
end $$;
revoke all on function public.send_chat_message(uuid,text,text,uuid,text,text,text,text) from public,anon;
grant execute on function public.send_chat_message(uuid,text,text,uuid,text,text,text,text) to authenticated;

create function public.validate_call_transition() returns trigger language plpgsql set search_path='' as $$
declare expected text;
begin
 if tg_op='INSERT' then
   if new.caller_id is distinct from auth.uid() or new.callee_id=auth.uid() or not exists(select 1 from public.profiles where id=new.callee_id and is_active) then raise exception 'Active distinct call participants required';end if;
   expected:='private:'||least(new.caller_id::text,new.callee_id::text)||':'||greatest(new.caller_id::text,new.callee_id::text);
   if new.room_id is distinct from expected or new.status is distinct from 'ringing' or new.answered_at is not null or new.ended_at is not null then raise exception 'New call must start ringing in the participants room';end if;
   new.created_at:=now();return new;
 end if;
 new.created_at:=old.created_at;new.answered_at:=old.answered_at;new.ended_at:=old.ended_at;
 if new.status=old.status then return new;end if;
 if old.status='ringing' and new.status in('accepted','rejected') and auth.uid()=old.callee_id then new.answered_at:=now();
 elsif old.status='ringing' and new.status in('ended','missed') and auth.uid()=old.caller_id then new.ended_at:=now();
 elsif old.status='accepted' and new.status='ended' and auth.uid() in(old.caller_id,old.callee_id) then new.ended_at:=now();
 else raise exception 'Call transition not allowed for this participant';end if;
 return new;
end $$;
revoke all on function public.validate_call_transition() from public,anon,authenticated;
create trigger validate_call_transition_guard before insert or update on public.call_invitations for each row execute function public.validate_call_transition();

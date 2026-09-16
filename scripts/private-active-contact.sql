create function mf_private.active_contact(p_user_id uuid) returns boolean language sql stable security definer set search_path='' as $$ select exists(select 1 from public.profiles where id=auth.uid() and is_active) and exists(select 1 from public.profiles where id=p_user_id and is_active); $$;
revoke all on function mf_private.active_contact(uuid) from public,anon;
grant execute on function mf_private.active_contact(uuid) to authenticated;
create or replace function public.validate_chat_room() returns trigger language plpgsql set search_path='' as $$
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
   if new.target_user_id is null or new.target_user_id=auth.uid() or not mf_private.active_contact(new.target_user_id) then raise exception 'Active private recipient required';end if;
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
create or replace function public.validate_call_transition() returns trigger language plpgsql set search_path='' as $$
declare expected text;
begin
 if tg_op='INSERT' then
   if new.caller_id is distinct from auth.uid() or new.callee_id=auth.uid() or not mf_private.active_contact(new.callee_id) then raise exception 'Active distinct call participants required';end if;
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

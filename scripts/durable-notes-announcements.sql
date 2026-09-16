create table public.client_notes (
  id uuid primary key default gen_random_uuid(),
  client_id bigint not null references public.clients(id) on delete restrict,
  note_text text not null check (length(trim(note_text)) between 1 and 5000),
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now()
);
alter table public.client_notes enable row level security;
revoke all on public.client_notes from anon,authenticated;
grant select,insert on public.client_notes to authenticated;
grant all on public.client_notes to service_role;
create index client_notes_client_created_idx on public.client_notes(client_id,created_at desc);
create index client_notes_author_idx on public.client_notes(created_by);
create policy client_notes_read_scope on public.client_notes for select to authenticated
using (public.can_legal_access_client(client_id));
create policy client_notes_create_scope on public.client_notes for insert to authenticated
with check (created_by=(select auth.uid()) and exists(select 1 from public.clients c
  where c.id=client_notes.client_id and public.can_access_client(c.assigned_user_id,c.branch_code)));
create or replace function public.stamp_client_note() returns trigger language plpgsql
set search_path=public as $$ begin new.created_at:=now();return new;end $$;
revoke all on function public.stamp_client_note() from public,anon,authenticated;
create trigger client_note_server_timestamp before insert on public.client_notes for each row execute function public.stamp_client_note();
create trigger client_note_audit after insert on public.client_notes for each row execute function public.audit_admin_module_change();

create policy announcements_require_active_account on public.announcements as restrictive for all to authenticated
using (exists(select 1 from public.profiles where id=(select auth.uid()) and is_active))
with check (exists(select 1 from public.profiles where id=(select auth.uid()) and is_active));
create policy announcement_reads_active_account on public.announcement_reads as restrictive for all to authenticated
using (exists(select 1 from public.profiles where id=(select auth.uid()) and is_active))
with check (exists(select 1 from public.profiles where id=(select auth.uid()) and is_active));
create policy announcement_reads_visible_content on public.announcement_reads as restrictive for insert to authenticated
with check (exists(select 1 from public.announcements a where a.id=announcement_reads.announcement_id
  and a.is_published and (a.starts_at is null or a.starts_at<=now()) and (a.ends_at is null or a.ends_at>=now())));
revoke update,delete on public.announcement_reads from authenticated;
create index if not exists announcement_reads_user_idx on public.announcement_reads(user_id,announcement_id);

create or replace function public.stamp_announcement_publication() returns trigger language plpgsql
set search_path=public as $$
begin
  if new.starts_at is not null and new.ends_at is not null and new.ends_at<=new.starts_at then
    raise exception 'Publication end must follow start';
  end if;
  if tg_op='INSERT' then
    new.created_at:=now();new.published_at:=case when new.is_published then now() else null end;new.unpublished_at:=null;
  elsif new.is_published is distinct from old.is_published then
    if new.is_published then new.published_at:=now();new.unpublished_at:=null;
    else new.unpublished_at:=now();end if;
  else new.published_at:=old.published_at;new.unpublished_at:=old.unpublished_at;
  end if;
  return new;
end $$;
revoke all on function public.stamp_announcement_publication() from public,anon,authenticated;
create trigger announcement_publication_clock before insert or update on public.announcements
for each row execute function public.stamp_announcement_publication();
create or replace function public.stamp_announcement_read() returns trigger language plpgsql
set search_path=public as $$ begin new.read_at:=now();return new;end $$;
revoke all on function public.stamp_announcement_read() from public,anon,authenticated;
create trigger announcement_read_clock before insert on public.announcement_reads
for each row execute function public.stamp_announcement_read();

create or replace function public.acknowledge_announcement(p_announcement_id uuid)
returns public.announcement_reads language plpgsql security invoker set search_path=public as $$
declare r public.announcement_reads;
begin
  if not exists(select 1 from public.announcements where id=p_announcement_id and is_published
    and (starts_at is null or starts_at<=now()) and (ends_at is null or ends_at>=now())) then
    raise exception 'Published announcement unavailable in your scope';
  end if;
  insert into public.announcement_reads(announcement_id,user_id) values(p_announcement_id,auth.uid())
    on conflict(announcement_id,user_id) do nothing;
  select * into strict r from public.announcement_reads where announcement_id=p_announcement_id and user_id=auth.uid();
  return r;
end $$;
revoke all on function public.acknowledge_announcement(uuid) from public,anon;
grant execute on function public.acknowledge_announcement(uuid) to authenticated;

begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','f808b8d1-97ff-4302-adef-4bc8d5b9630b',true);
do $$
declare note_id uuid; a_id uuid; draft_id uuid; future_id uuid; expired_id uuid; other_id uuid; r public.announcement_reads; r2 public.announcement_reads; n integer;
begin
  insert into public.client_notes(client_id,note_text) values(2,'Rollback-only note') returning id into note_id;
  select count(*) into n from public.client_notes where id=note_id;if n<>1 then raise exception 'Own note not readable';end if;
  begin
    insert into public.client_notes(client_id,note_text) values(1,'Out of scope');raise exception 'Out-of-scope note accepted';
  exception when insufficient_privilege then null;end;
  begin
    insert into public.client_notes(client_id,note_text,created_by) values(2,'Forged author','6693ab34-0188-4a86-871d-b12554003894');raise exception 'Forged author accepted';
  exception when insufficient_privilege then null;end;
  begin
    update public.client_notes set note_text='rewritten' where id=note_id;raise exception 'Immutable note updated';
  exception when insufficient_privilege then null;end;
  perform set_config('request.jwt.claim.sub','6a1fae70-78f8-42eb-a743-507938cdefd1',true);
  select count(*) into n from public.client_notes where id=note_id;if n<>0 then raise exception 'Other officer read note';end if;
  perform set_config('request.jwt.claim.sub','c92479bb-d9c3-496c-80c9-4a0af8c6268b',true);
  select count(*) into n from public.client_notes where id=note_id;if n<>1 then raise exception 'Branch manager cannot read branch note';end if;
  insert into public.announcements(title,body,audience,branch_code,is_published) values('Rollback published','Test','branch','B1',true) returning id into a_id;
  insert into public.announcements(title,body,audience,branch_code,is_published) values('Rollback draft','Test','branch','B1',false) returning id into draft_id;
  insert into public.announcements(title,body,audience,branch_code,is_published,starts_at) values('Rollback future','Test','branch','B1',true,now()+interval '1 day') returning id into future_id;
  insert into public.announcements(title,body,audience,branch_code,is_published,ends_at) values('Rollback expired','Test','branch','B1',true,now()-interval '1 day') returning id into expired_id;
  begin
    insert into public.announcements(title,body,audience,is_published) values('Unauthorized all','Test','all',true);raise exception 'BM published globally';
  exception when insufficient_privilege then null;end;
  begin
    insert into public.announcements(title,body,audience,branch_code,starts_at,ends_at) values('Bad window','Test','branch','B1',now(),now()-interval '1 day');raise exception 'Bad window accepted';
  exception when raise_exception then if sqlerrm<>'Publication end must follow start' then raise;end if;end;
  if not exists(select 1 from public.announcements where id=a_id and published_at is not null) then raise exception 'Missing publication timestamp';end if;
  perform set_config('request.jwt.claim.sub','6693ab34-0188-4a86-871d-b12554003894',true);
  insert into public.announcements(title,body,audience,branch_code,is_published) values('Other branch','Test','branch','SCOPE-ROLLBACK',true) returning id into other_id;
  perform set_config('request.jwt.claim.sub','f808b8d1-97ff-4302-adef-4bc8d5b9630b',true);
  select count(*) into n from public.announcements where id in(a_id,draft_id,future_id,expired_id,other_id);if n<>1 then raise exception 'Announcement visibility incorrect: %',n;end if;
  select * into r from public.acknowledge_announcement(a_id);select * into r2 from public.acknowledge_announcement(a_id);
  if r.id<>r2.id then raise exception 'Duplicate receipt created';end if;
  select count(*) into n from public.announcement_reads where announcement_id=a_id and user_id=auth.uid();if n<>1 then raise exception 'Receipt not durable';end if;
  begin
    perform public.acknowledge_announcement(draft_id);raise exception 'Draft acknowledged';
  exception when raise_exception then if sqlerrm<>'Published announcement unavailable in your scope' then raise;end if;end;
  begin
    insert into public.announcement_reads(announcement_id) values(other_id);raise exception 'Out-of-scope receipt accepted';
  exception when insufficient_privilege then null;end;
  begin
    update public.announcement_reads set read_at=now() where id=r.id;raise exception 'Receipt rewritten';
  exception when insufficient_privilege then null;end;
  update public.announcements set is_published=false where id=a_id;
  get diagnostics n=row_count;if n<>0 then raise exception 'Officer changed publication';end if;
  perform set_config('request.jwt.claim.sub','c92479bb-d9c3-496c-80c9-4a0af8c6268b',true);
  update public.announcements set is_published=false where id=a_id;
  if not exists(select 1 from public.announcements where id=a_id and unpublished_at is not null) then raise exception 'Unpublish timestamp missing';end if;
  perform set_config('request.jwt.claim.sub','f808b8d1-97ff-4302-adef-4bc8d5b9630b',true);
  select count(*) into n from public.announcements where id=a_id;if n<>0 then raise exception 'Unpublished content still visible';end if;
  perform set_config('request.jwt.claim.sub','6693ab34-0188-4a86-871d-b12554003894',true);
  update public.announcements set is_published=true where id=a_id;
  update public.profiles set is_active=false where id='f808b8d1-97ff-4302-adef-4bc8d5b9630b';
  perform set_config('request.jwt.claim.sub','f808b8d1-97ff-4302-adef-4bc8d5b9630b',true);
  select count(*) into n from public.announcements where id=a_id;if n<>0 then raise exception 'Inactive user read announcement';end if;
  select count(*) into n from public.announcement_reads where id=r.id;if n<>0 then raise exception 'Inactive user read receipts';end if;
  select count(*) into n from public.client_notes where id=note_id;if n<>0 then raise exception 'Inactive user read note';end if;
end $$;
select 'PASS: scoped notes, immutable authors, branch management, publication windows, durable idempotent receipts, unauthorized writes rejected; all changes rolled back' as result;
rollback;

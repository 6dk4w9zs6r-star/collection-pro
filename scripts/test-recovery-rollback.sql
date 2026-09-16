begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','f808b8d1-97ff-4302-adef-4bc8d5b9630b',true);
do $$
declare r public.usage_consents; again public.usage_consents; archive jsonb; n integer;
begin
 select * into r from public.accept_usage_policy('2026-09-14');
 select * into again from public.accept_usage_policy('2026-09-14');
 if r.id<>again.id or length(r.accepted_text)<100 then raise exception 'Consent not idempotent or missing text';end if;
 select count(*) into n from public.audit_log where entity_type='usage_consents' and entity_id=r.id::text;
 if n<>1 then raise exception 'Consent audit missing or duplicated: %',n;end if;
 begin
   insert into public.usage_consents(user_id,policy_version) values('6693ab34-0188-4a86-871d-b12554003894','2026-09-14');raise exception 'Forged consent accepted';
 exception when insufficient_privilege then null;end;
 begin update public.usage_consents set accepted_at=now() where id=r.id;raise exception 'Immutable consent updated';exception when insufficient_privilege then null;end;
 begin perform public.accept_usage_policy('unknown');raise exception 'Unknown policy accepted';exception when raise_exception then if sqlerrm<>'Unsupported usage policy version' then raise;end if;end;
 begin perform public.export_operational_archive();raise exception 'LO exported entire project';exception when insufficient_privilege then null;end;
 perform set_config('request.jwt.claim.sub','c92479bb-d9c3-496c-80c9-4a0af8c6268b',true);
 select count(*) into n from public.usage_consents where id=r.id;if n<>0 then raise exception 'BM read another consent';end if;
 begin perform public.export_operational_archive();raise exception 'BM exported entire project';exception when insufficient_privilege then null;end;
 perform set_config('request.jwt.claim.sub','6693ab34-0188-4a86-871d-b12554003894',true);
 archive:=public.export_operational_archive();
 if archive->>'schema'<>'mf-nexa-operational-archive-v2' or (archive->>'disaster_recovery')::boolean then raise exception 'Wrong archive format';end if;
 select count(*) into n from jsonb_object_keys(archive->'tables');if n<>32 then raise exception 'Archive table list incomplete: %',n;end if;
 if (archive->'counts'->>'clients')::integer<>(select count(*) from public.clients) then raise exception 'Archive client count incorrect';end if;
 if (archive->'counts'->>'payments')::integer<>(select count(*) from public.payments) then raise exception 'Archive payment count incorrect';end if;
 if archive->'tables'?'collection_app_snapshot' or archive->'tables'?'auth' then raise exception 'Excluded cache/auth data included';end if;
 if not exists(select 1 from public.audit_log where action='operational_archive_export' and actor_user_id=auth.uid()) then raise exception 'Export not audited';end if;
 if not exists(select 1 from jsonb_array_elements(archive->'tables'->'usage_consents') v where v->>'id'=r.id::text) then raise exception 'Consent omitted from archive';end if;
 update public.profiles set is_active=false where id='f808b8d1-97ff-4302-adef-4bc8d5b9630b';
 perform set_config('request.jwt.claim.sub','f808b8d1-97ff-4302-adef-4bc8d5b9630b',true);
 select count(*) into n from public.usage_consents where id=r.id;if n<>0 then raise exception 'Inactive user read consent';end if;
 begin perform public.accept_usage_policy('2026-09-14');raise exception 'Inactive user consent accepted';exception when insufficient_privilege then null;end;
 perform set_config('request.jwt.claim.sub','6693ab34-0188-4a86-871d-b12554003894',true);
 update public.profiles set is_active=false where id=auth.uid();
 begin perform public.export_operational_archive();raise exception 'Inactive Founder exported project';exception when insufficient_privilege then null;end;
end $$;
select 'PASS: 32-table archive, Founder-only authorization, export audit, immutable versioned idempotent consent, active-account enforcement; rolled back' as result;
rollback;

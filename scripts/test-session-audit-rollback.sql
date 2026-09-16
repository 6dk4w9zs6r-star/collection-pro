begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','f808b8d1-97ff-4302-adef-4bc8d5b9630b',true);
select set_config('request.jwt.claims','{"sub":"f808b8d1-97ff-4302-adef-4bc8d5b9630b","session_id":"11111111-2222-4333-8444-555555555555"}',true);
do $$
declare first_event public.audit_log; repeated public.audit_log; out_event public.audit_log; n integer;
begin
 select * into first_event from public.record_session_event('login');
 select * into repeated from public.record_session_event('login');
 select * into out_event from public.record_session_event('logout');
 if first_event.id<>repeated.id or out_event.id=first_event.id then raise exception 'Session audit duplicate or action collision';end if;
 if first_event.actor_user_id<>auth.uid() or first_event.entity_id<>'11111111-2222-4333-8444-555555555555' then raise exception 'Wrong session attribution';end if;
 if first_event.metadata<>jsonb_build_object('session_id','11111111-2222-4333-8444-555555555555') then raise exception 'Unexpected session metadata';end if;
 begin perform public.record_session_event('delete');raise exception 'Unknown action accepted';exception when raise_exception then if sqlerrm<>'Unsupported session action' then raise;end if;end;
 perform set_config('request.jwt.claims','{"sub":"f808b8d1-97ff-4302-adef-4bc8d5b9630b"}',true);
 begin perform public.record_session_event('login');raise exception 'Missing session accepted';exception when raise_exception then if sqlerrm<>'Authenticated session required' then raise;end if;end;
 perform set_config('request.jwt.claim.sub','6a1fae70-78f8-42eb-a743-507938cdefd1',true);
 select count(*) into n from public.audit_log where id=first_event.id;if n<>0 then raise exception 'Other officer sees session audit';end if;
end $$;
select 'PASS: session identity from JWT, unique login/logout events, no token storage, own audit visibility; rolled back' as result;
rollback;

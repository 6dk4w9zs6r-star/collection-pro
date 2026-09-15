
begin;
-- Invoker permissions preserve the caller's existing client and promise RLS.
create or replace function public.record_promise_atomic(
  p_client_id bigint, p_promise_date date, p_promised_amount numeric, p_notes text default null
) returns public.promises_to_pay
language plpgsql security invoker set search_path = public, pg_temp
as $$
declare v_promise public.promises_to_pay; v_client_id bigint;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if p_promise_date is null or p_promised_amount is null or p_promised_amount <= 0 then
    raise exception 'A date and positive promise amount are required' using errcode='22023';
  end if;
  update public.clients set promise_date=p_promise_date, follow_up_status='وعد بالدفع'
    where id=p_client_id returning id into v_client_id;
  if v_client_id is null then raise exception 'Client unavailable or outside permitted scope' using errcode='42501'; end if;
  insert into public.promises_to_pay(client_id,promise_date,promised_amount,status,notes,created_by)
    values(p_client_id,p_promise_date,p_promised_amount,'pending',p_notes,auth.uid()) returning * into v_promise;
  return v_promise;
end;
$$;
revoke all on function public.record_promise_atomic(bigint,date,numeric,text) from public, anon;
grant execute on function public.record_promise_atomic(bigint,date,numeric,text) to authenticated;


create temp table test_results(test text, passed boolean) on commit drop;
grant all on test_results to authenticated;
set local role authenticated;
select set_config('request.jwt.claim.sub','f808b8d1-97ff-4302-adef-4bc8d5b9630b',true);
do $test$
declare f bigint; p uuid; n int; original_date date; v record;
begin
insert into follow_ups(client_id,follow_up_type,status,notes) values(2,'call','pending','rollback CRUD') returning id into f;
insert into test_results values('Rawan create/read follow-up',exists(select 1 from follow_ups where id=f));
update follow_ups set status='not_completed' where id=f; get diagnostics n=row_count;
insert into test_results values('Follow-up not_completed persists',n=1 and exists(select 1 from follow_ups where id=f and status='not_completed'));
update follow_ups set status='pending',next_follow_up_at=now()+interval '2 days',completed_at=null where id=f;
insert into test_results values('Follow-up reschedule persists',exists(select 1 from follow_ups where id=f and next_follow_up_at>now()));
begin
update follow_ups set client_id=1 where id=f;
insert into test_results values('Follow-up retarget denied',false);
exception when insufficient_privilege then insert into test_results values('Follow-up retarget denied',true); end;
begin
insert into follow_ups(client_id) values(1);
insert into test_results values('Follow-up outside insert denied',false);
exception when insufficient_privilege then insert into test_results values('Follow-up outside insert denied',true); end;
select id into p from record_promise_atomic(2,current_date+1,10,'rollback CRUD');
insert into test_results values('Atomic promise/client persistence',exists(select 1 from promises_to_pay where id=p) and exists(select 1 from clients where id=2 and promise_date=current_date+1));
update promises_to_pay set status='kept',payment_date=current_date,updated_by=auth.uid() where id=p; get diagnostics n=row_count;
insert into test_results values('Promise kept persists with date',n=1);
begin
update promises_to_pay set client_id=1 where id=p;
insert into test_results values('Promise retarget denied',false);
exception when insufficient_privilege then insert into test_results values('Promise retarget denied',true); end;
begin
perform record_promise_atomic(1,current_date+1,10,'out of scope');
insert into test_results values('Atomic promise outside insert denied',false);
exception when insufficient_privilege then insert into test_results values('Atomic promise outside insert denied',true); end;
select promise_date into original_date from clients where id=2;
begin
perform record_promise_atomic(2,current_date+3,-10,'invalid');
insert into test_results values('Invalid promise rejected',false);
exception when invalid_parameter_value then insert into test_results values('Invalid promise rejected',true); end;
insert into test_results values('Invalid promise leaves client unchanged',exists(select 1 from clients where id=2 and promise_date is not distinct from original_date));
perform set_config('request.jwt.claim.sub','6a1fae70-78f8-42eb-a743-507938cdefd1',true);
insert into test_results values('Mahmoud cannot read Rawan follow-up',not exists(select 1 from follow_ups where id=f));
insert into test_results values('Mahmoud cannot read Rawan promise',not exists(select 1 from promises_to_pay where id=p));
update follow_ups set status='completed' where id=f; get diagnostics n=row_count;
insert into test_results values('Outside follow-up update affects zero',n=0);
delete from follow_ups where id=f; get diagnostics n=row_count;
insert into test_results values('Outside follow-up delete affects zero',n=0);
update promises_to_pay set status='broken' where id=p; get diagnostics n=row_count;
insert into test_results values('Outside promise update affects zero',n=0);
delete from promises_to_pay where id=p; get diagnostics n=row_count;
insert into test_results values('Promise delete denied',n=0);
for v in select * from (values('c92479bb-d9c3-496c-80c9-4a0af8c6268b','BM'),('6693ab34-0188-4a86-871d-b12554003894','Founder')) roles(uid,label) loop
perform set_config('request.jwt.claim.sub',v.uid,true);
insert into test_results values(v.label||' reads scoped records',exists(select 1 from follow_ups where id=f) and exists(select 1 from promises_to_pay where id=p));
update follow_ups set status='completed' where id=f; get diagnostics n=row_count;
insert into test_results values(v.label||' updates follow-up',n=1);
update promises_to_pay set status='broken',updated_by=auth.uid() where id=p; get diagnostics n=row_count;
insert into test_results values(v.label||' updates promise',n=1);
perform record_promise_atomic(2,current_date+1,10,'management rollback');
insert into test_results values(v.label||' creates promise',true);
end loop;
perform set_config('request.jwt.claim.sub','f808b8d1-97ff-4302-adef-4bc8d5b9630b',true);
delete from follow_ups where id=f; get diagnostics n=row_count;
insert into test_results values('Own follow-up delete succeeds',n=1);
delete from promises_to_pay where id=p; get diagnostics n=row_count;
insert into test_results values('Own promise delete remains denied',n=0);
end $test$;
reset role;
select * from test_results;
rollback;


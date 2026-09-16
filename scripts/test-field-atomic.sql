begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','f808b8d1-97ff-4302-adef-4bc8d5b9630b',true);
do $test$
declare r jsonb; before_balance numeric; n_location int; n_visit int; n_payment int;
begin
select outstanding_balance into before_balance from clients where id=2;
r:=record_field_visit_atomic(2,'client','home',31.95,35.91,10,'صحيح','تمت الزيارة','rollback field test',10,null);
if not exists(select 1 from locations where id=(r->>'location_id')::uuid) then raise exception 'Missing location'; end if;
if not exists(select 1 from field_visits where id=(r->>'visit_id')::uuid) then raise exception 'Missing visit'; end if;
if not exists(select 1 from payments where id=(r->>'payment_id')::uuid and status='successful') then raise exception 'Missing payment'; end if;
if not exists(select 1 from clients where id=2 and outstanding_balance=before_balance-10) then raise exception 'Wrong posted balance'; end if;
select count(*) into n_location from locations;select count(*) into n_visit from field_visits;select count(*) into n_payment from payments;
begin
perform record_field_visit_atomic(2,'client','home',31.95,35.91,10,'صحيح','تمت الزيارة','rollback overpay failure',1000000,null);
raise exception 'Overpayment accepted unexpectedly';
exception when others then
if sqlerrm='Overpayment accepted unexpectedly' then raise; end if;
end;
if (select count(*) from locations)<>n_location or (select count(*) from field_visits)<>n_visit or (select count(*) from payments)<>n_payment then raise exception 'Partial records after failed payment'; end if;
begin
perform record_field_visit_atomic(1,'client','home',31.95,35.91,10,'صحيح','تمت الزيارة','rollback denied',0,null);
raise exception 'Outside scope accepted unexpectedly';
exception when others then if sqlerrm='Outside scope accepted unexpectedly' then raise; end if; end;
end $test$;
select 'PASS: own visit/location/payment, exact balance, overpayment rollback without partial rows, outside scope denied' as result;
rollback;

begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','f808b8d1-97ff-4302-adef-4bc8d5b9630b',true);
do $$
declare c clients%rowtype; payload jsonb; result jsonb; batch int; started timestamptz:=clock_timestamp();
begin
  select * into strict c from clients where id=2;
  for batch in 0..4 loop
    select jsonb_agg(jsonb_build_object('reference','volume-'||(batch*200+i),
      'client_number',c.client_number,'amount',0.01,'payment_date',current_date)) into payload from generate_series(1,200) i;
    result:=import_payment_batch('rollback-volume',payload);
    if exists(select 1 from jsonb_array_elements(result) x where x->>'status'<>'pending') then raise exception 'Volume import failure: %',result; end if;
    result:=import_payment_batch('rollback-volume',payload);
    if exists(select 1 from jsonb_array_elements(result) x where x->>'status'<>'duplicate') then raise exception 'Volume replay failure'; end if;
  end loop;
  if (select count(*) from payments where source='rollback-volume')<>1000 then raise exception 'Wrong volume count'; end if;
  if (select outstanding_balance from clients where id=2)<>c.outstanding_balance then raise exception 'Pending batch changed balance'; end if;
  raise notice '1000 inserts and 1000 replays: %',clock_timestamp()-started;
end $$;
select 'PASS: 1000 pending imports and 1000 replays, no balance change; synthetic rollback benchmark, not official-volume E2E' as result;
rollback;

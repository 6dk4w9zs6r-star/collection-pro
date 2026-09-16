begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','f808b8d1-97ff-4302-adef-4bc8d5b9630b',true);
do $$
declare c public.clients%rowtype; r jsonb; again jsonb; pid uuid; v numeric; payload jsonb;
begin
  select * into strict c from clients where id=2;
  payload:=jsonb_build_array(jsonb_build_object('reference','rollback-pending-1','client_number',c.client_number,'amount',0.01,'payment_date',current_date,'original',jsonb_build_object('receipt','original payload')));
  r:=import_payment_batch('rollback-test',payload);
  if r->0->>'status'<>'pending' then raise exception 'Expected pending classification: %',r; end if;
  pid:=(r->0->>'id')::uuid;
  select outstanding_balance into v from clients where id=c.id;
  if v<>c.outstanding_balance then raise exception 'Pending amount was deducted'; end if;
  again:=import_payment_batch('rollback-test',payload);
  if again->0->>'status'<>'duplicate' then raise exception 'Replay not deduplicated: %',again; end if;
  if (select count(*) from payments where source='rollback-test')<>1 then raise exception 'Duplicate payment created'; end if;
  update payments set payment_type='partial',status='successful',installment_units=0 where id=pid;
  if (select outstanding_balance from clients where id=c.id)<>c.outstanding_balance-0.01 then raise exception 'Classification not deducted exactly once'; end if;
  again:=import_payment_batch('rollback-test',payload);
  if (select outstanding_balance from clients where id=c.id)<>c.outstanding_balance-0.01 then raise exception 'Replay deducted balance'; end if;
  if not exists(select 1 from payments where id=pid and balance_before=c.outstanding_balance and balance_after=c.outstanding_balance-0.01 and source_payload->>'receipt'='original payload') then raise exception 'Missing before/after or original payload'; end if;
  r:=import_payment_batch('rollback-test',jsonb_build_array(jsonb_build_object('reference','rollback-unmatched','client_number','ROLLBACK-NOT-AN-OPERATIONAL-CLIENT','amount',5,'payment_date',current_date)));
  if r->0->>'status'<>'not_matched' then raise exception 'Unmatched not persisted: %',r; end if;
  if not exists(select 1 from payments where id=(r->0->>'id')::uuid and client_id is null and posted_at is null) then raise exception 'Unmatched posted or lost'; end if;
  r:=import_payment_batch('rollback-test',jsonb_build_array(jsonb_build_object('reference','rollback-pending-1','client_number',c.client_number,'amount',0.02,'payment_date',current_date)));
  if r->0->>'status'<>'error' then raise exception 'Conflicting reference accepted'; end if;
  begin
    update payments set source_reference='tampered' where id=pid;
    raise exception 'Mutation accepted';
  exception when others then if sqlerrm='Mutation accepted' then raise; end if; end;
  r:=import_payment_batch('rollback-test',jsonb_build_array(jsonb_build_object('reference','rollback-too-large','client_number',c.client_number,'amount',9999999,'payment_date',current_date)));
  if r->0->>'status'<>'error' then raise exception 'Overpayment accepted'; end if;
end $$;
-- A different LO must not see the importer's unmatched payment.
select set_config('request.jwt.claim.sub','99a00b27-15a5-4fea-9f93-e594e8de5fba',true);
do $$ begin
  if exists(select 1 from payments where source='rollback-test') then raise exception 'Import rows leaked to another LO'; end if;
end $$;
select 'PASS: pending preservation, stable-reference replay, single deduction, before/after, raw payload, unmatched persistence, conflict rejection, identity immutability, overpayment rollback, other-LO isolation' as result;
rollback;

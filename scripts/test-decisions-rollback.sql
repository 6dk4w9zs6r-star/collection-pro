begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','f808b8d1-97ff-4302-adef-4bc8d5b9630b',true);
do $$
declare c clients%rowtype; w uuid; d uuid; n int; payment_count int; after_writeoff numeric;
begin
  select * into strict c from clients where id=2;
  select count(*) into payment_count from payments;
  insert into write_offs(client_id,amount,reason,status,requested_by) values(c.id,10,'rollback atomic decision','pending',auth.uid()) returning id into w;
  insert into deferrals(client_id,old_due_date,new_due_date,reason,status,requested_by,installment_count,deferral_fee)
    values(c.id,current_date,current_date+30,'rollback atomic decision','pending',auth.uid(),1,5) returning id into d;
  update write_offs set status='approved' where id=w;get diagnostics n=row_count;
  if n<>0 then raise exception 'LO approved write-off'; end if;
  update deferrals set status='approved' where id=d;get diagnostics n=row_count;
  if n<>0 then raise exception 'LO approved deferral'; end if;
  begin
    insert into write_offs(client_id,amount,reason,status,requested_by) values(c.id,1,'rollback invalid approval','approved',auth.uid());
    raise exception 'Direct approved insert accepted';
  exception when others then if sqlerrm='Direct approved insert accepted' then raise;end if;end;
  perform set_config('request.jwt.claim.sub','c92479bb-d9c3-496c-80c9-4a0af8c6268b',true);
  update write_offs set status='approved' where id=w;
  after_writeoff:=greatest(c.outstanding_balance,c.overdue_amount,c.due_amount)-10;
  if (select outstanding_balance from clients where id=c.id)<>after_writeoff then raise exception 'Partial write-off did not subtract exactly the approved amount';end if;
  if not exists(select 1 from write_offs where id=w and balance_after=after_writeoff and balance_before=after_writeoff+10 and approved_by=auth.uid()) then raise exception 'Write-off evidence missing';end if;
  begin update write_offs set status='approved' where id=w;raise exception 'Repeated write-off accepted';exception when others then if sqlerrm='Repeated write-off accepted' then raise;end if;end;
  update deferrals set status='approved' where id=d;
  if (select outstanding_balance from clients where id=c.id)<>after_writeoff then raise exception 'Deferral reduced total principal';end if;
  if (select overdue_amount from clients where id=c.id)<>greatest(c.overdue_amount-10-c.installment_amount,0) then raise exception 'Deferral overdue adjustment incorrect';end if;
  if not exists(select 1 from deferrals where id=d and before_state is not null and after_state is not null) then raise exception 'Deferral evidence missing';end if;
  begin update deferrals set status='approved' where id=d;raise exception 'Repeated deferral accepted';exception when others then if sqlerrm='Repeated deferral accepted' then raise;end if;end;
  if (select count(*) from payments)<>payment_count then raise exception 'Approval generated a collection payment';end if;
end $$;
select 'PASS: LO cannot approve or insert approved request; BM partial write-off subtracts only its amount; deferral shifts arrears without reducing total debt or creating payment; before/after persisted; decisions cannot replay' result;
rollback;

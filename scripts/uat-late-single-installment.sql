-- Existing functions from read-only schema inspection, with narrow posting/permission changes.
CREATE OR REPLACE FUNCTION public.apply_successful_payment()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_before numeric(14,2);
  v_after numeric(14,2);
  v_overdue_before numeric(14,2);
  v_due_before numeric(14,2);
  v_type text;
  v_branch text;
  v_employee uuid;
  v_client public.clients%rowtype;
  v_payment_no integer;
begin
  if new.status <> 'successful' or new.client_id is null or new.posted_at is not null then
    return new;
  end if;

  v_type := lower(coalesce(new.payment_type,''));

  select greatest(coalesce(outstanding_balance,0),coalesce(overdue_amount,0),coalesce(due_amount,0)),
         overdue_amount, due_amount, branch_code, employee_id
    into v_before, v_overdue_before, v_due_before, v_branch, v_employee
  from public.clients
  where id = new.client_id
  for update;

  if not found then
    raise exception 'Client % not found for payment posting', new.client_id;
  end if;

  select * into strict v_client from public.clients where id=new.client_id;
  select count(*)+1 into v_payment_no from public.payments where client_id=new.client_id
    and status='successful' and posted_at is not null and payment_type<>'deferral_fee' and id<>new.id;
  if v_type = 'deferral_fee' then
    update public.payments
    set posted_at = now(),
        matched_at = coalesce(matched_at, now()),
        installment_units = 0,
        balance_before = coalesce(v_before,0),
        balance_after = coalesce(v_before,0),
        branch_code = v_branch,
        employee_id = v_employee,
        updated_at = now()
    where id = new.id;
    insert into mf_private.payment_effects(payment_id,client_id,outstanding_delta,overdue_delta,due_delta,paid_delta,installment_delta)
    values(new.id,new.client_id,0,0,0,0,0);
    return new;
  end if;

  if new.amount > coalesce(v_before,0) then
    raise exception 'Payment amount % exceeds collectible balance %', new.amount, v_before;
  end if;

  v_after := greatest(coalesce(v_before,0) - new.amount, 0);

  update public.clients
  set outstanding_balance = v_after,
      overdue_amount = greatest(coalesce(v_overdue_before,0) - new.amount, 0),
      due_amount = greatest(greatest(coalesce(v_due_before,0),coalesce(v_overdue_before,0)) - new.amount, 0),
      paid_amount = coalesce(paid_amount,0) + new.amount,
      last_payment_date = new.payment_date,
      installments_due_count = greatest(coalesce(installments_due_count,0) - coalesce(new.installment_units,0), 0)
  where id = new.client_id;

  insert into mf_private.payment_effects(payment_id,client_id,outstanding_delta,overdue_delta,due_delta,paid_delta,installment_delta)
  select new.id,new.client_id,coalesce(v_client.outstanding_balance,0)-coalesce(c.outstanding_balance,0),
    coalesce(v_client.overdue_amount,0)-coalesce(c.overdue_amount,0),
    coalesce(v_client.due_amount,0)-coalesce(c.due_amount,0),new.amount,
    coalesce(v_client.installments_due_count,0)-coalesce(c.installments_due_count,0)
  from public.clients c where c.id=new.client_id;

  update public.payments
  set payment_no=v_payment_no, posted_at = now(),
      matched_at = coalesce(matched_at, now()),
      balance_before = coalesce(v_before,0),
      balance_after = v_after,
      branch_code = v_branch,
      employee_id = v_employee,
      updated_at = now()
  where id = new.id;

  return new;
end;
$function$;

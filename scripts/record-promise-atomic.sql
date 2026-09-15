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

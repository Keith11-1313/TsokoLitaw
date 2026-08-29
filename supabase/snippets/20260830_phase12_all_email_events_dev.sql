begin;

alter table public.notification_deliveries
  add column if not exists refund_id uuid references public.refunds(id) on delete set null;

create index if not exists notification_deliveries_refund_idx
  on public.notification_deliveries (refund_id, event_type);

create or replace function public.enqueue_transactional_order_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  should_enqueue boolean := false;
  notification_event text;
begin
  if tg_op = 'INSERT' then
    should_enqueue := true;
  elsif tg_op = 'UPDATE' then
    should_enqueue := old.status is distinct from new.status
      or old.payment_status is distinct from new.payment_status;
  end if;
  if not should_enqueue then return new; end if;

  notification_event := case
    when new.status = 'CONFIRMED' and new.payment_status = 'PAID' then 'order.confirmed'
    when new.status = 'READY_FOR_PICKUP' and new.payment_status = 'PAID' then 'order.ready_for_pickup'
    when new.status = 'CANCELLED' then 'order.cancelled'
    else null
  end;
  if notification_event is null then return new; end if;

  insert into public.notification_deliveries (
    order_id, user_id, provider, event_type, recipient_email, idempotency_key, status
  ) values (
    new.id, new.user_id, 'resend', notification_event, new.customer_email,
    notification_event || ':' || new.id::text, 'PENDING'
  )
  on conflict (idempotency_key) do nothing;

  return new;
end;
$$;

create or replace function public.enqueue_transactional_refund_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_order public.orders%rowtype;
  notification_event text;
begin
  if tg_op <> 'UPDATE' or old.status is not distinct from new.status then
    return new;
  end if;

  notification_event := case new.status
    when 'PROCESSING' then 'refund.processing'
    when 'REFUNDED' then 'refund.completed'
    when 'FAILED' then 'refund.failed'
    else null
  end;
  if notification_event is null then return new; end if;

  select * into target_order from public.orders where id = new.order_id;
  if target_order.id is null then return new; end if;

  insert into public.notification_deliveries (
    order_id, refund_id, user_id, provider, event_type,
    recipient_email, idempotency_key, status
  ) values (
    target_order.id, new.id, target_order.user_id, 'resend', notification_event,
    target_order.customer_email, notification_event || ':' || new.id::text, 'PENDING'
  )
  on conflict (idempotency_key) do nothing;

  return new;
end;
$$;

drop trigger if exists orders_enqueue_transactional_email on public.orders;
create trigger orders_enqueue_transactional_email
after insert or update of status, payment_status on public.orders
for each row execute procedure public.enqueue_transactional_order_email();

drop trigger if exists refunds_enqueue_transactional_email on public.refunds;
create trigger refunds_enqueue_transactional_email
after update of status on public.refunds
for each row execute procedure public.enqueue_transactional_refund_email();

revoke all on function public.enqueue_transactional_order_email() from public, anon, authenticated;
revoke all on function public.enqueue_transactional_refund_email() from public, anon, authenticated;

commit;

select
  to_regprocedure('public.enqueue_transactional_order_email()') is not null as order_events_ready,
  to_regprocedure('public.enqueue_transactional_refund_email()') is not null as refund_events_ready;

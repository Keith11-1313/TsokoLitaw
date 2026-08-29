begin;

alter table public.notification_deliveries
  drop constraint if exists notification_deliveries_status_check;

update public.notification_deliveries
set status = 'SEND_FAILED'
where status = 'FAILED' and provider_message_id is null;

alter table public.notification_deliveries
  add column if not exists provider_event_at timestamptz,
  add column if not exists last_event_type text,
  add constraint notification_deliveries_status_check check (status in (
    'PENDING', 'PROCESSING', 'SEND_FAILED', 'SENT', 'DELAYED',
    'DELIVERED', 'BOUNCED', 'COMPLAINED', 'FAILED', 'SUPPRESSED'
  ));

alter table public.notification_deliveries
  add column if not exists refund_id uuid references public.refunds(id) on delete set null;

drop index if exists public.notification_deliveries_retry_idx;
create index notification_deliveries_retry_idx
  on public.notification_deliveries (next_attempt_at, created_at)
  where status in ('PENDING', 'SEND_FAILED');

create index if not exists notification_deliveries_refund_idx
  on public.notification_deliveries (refund_id, event_type);

create table if not exists public.notification_webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'resend',
  provider_event_id text not null unique,
  provider_message_id text not null,
  event_type text not null,
  event_created_at timestamptz not null,
  processed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notification_webhook_message_idx
  on public.notification_webhook_events (provider_message_id, event_created_at desc);

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

create or replace function public.process_resend_delivery_event(
  provider_event_id_value text,
  provider_message_id_value text,
  event_type_value text,
  event_created_at_value timestamptz
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  inserted_event_id uuid;
  delivery public.notification_deliveries%rowtype;
  next_status text;
begin
  if provider_event_id_value is null or length(provider_event_id_value) not between 1 and 255
    or provider_message_id_value is null or length(provider_message_id_value) not between 1 and 255
    or event_type_value not in (
      'email.sent', 'email.delivered', 'email.delivery_delayed', 'email.bounced',
      'email.complained', 'email.failed', 'email.suppressed'
    )
    or event_created_at_value is null
  then
    raise exception 'Resend delivery event is invalid';
  end if;

  insert into public.notification_webhook_events (
    provider, provider_event_id, provider_message_id, event_type, event_created_at
  ) values (
    'resend', provider_event_id_value, provider_message_id_value,
    event_type_value, event_created_at_value
  )
  on conflict (provider_event_id) do nothing
  returning id into inserted_event_id;
  if inserted_event_id is null then
    select id into inserted_event_id
    from public.notification_webhook_events
    where provider_event_id = provider_event_id_value
      and provider_message_id = provider_message_id_value
      and event_type = event_type_value
      and event_created_at = event_created_at_value
      and processed_at is null;
    if inserted_event_id is null then return true; end if;
  end if;

  select * into delivery from public.notification_deliveries
  where provider = 'resend' and provider_message_id = provider_message_id_value
  for update;

  if delivery.id is null then
    return false;
  end if;

  next_status := case event_type_value
    when 'email.sent' then 'SENT'
    when 'email.delivered' then 'DELIVERED'
    when 'email.delivery_delayed' then 'DELAYED'
    when 'email.bounced' then 'BOUNCED'
    when 'email.complained' then 'COMPLAINED'
    when 'email.failed' then 'FAILED'
    when 'email.suppressed' then 'SUPPRESSED'
  end;

  if delivery.provider_event_at is null or event_created_at_value > delivery.provider_event_at then
    update public.notification_deliveries
    set status = next_status,
        delivered_at = case when event_type_value = 'email.delivered' then event_created_at_value else delivered_at end,
        provider_event_at = event_created_at_value,
        last_event_type = event_type_value,
        last_error = case
          when event_type_value in ('email.bounced', 'email.complained', 'email.failed', 'email.suppressed')
            then 'Resend reported ' || event_type_value || '.'
          when event_type_value in ('email.sent', 'email.delivered') then null
          else last_error
        end,
        updated_at = now()
    where id = delivery.id;
  end if;

  update public.notification_webhook_events set processed_at = now() where id = inserted_event_id;
  return true;
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
revoke all on function public.process_resend_delivery_event(text, text, text, timestamptz) from public, anon, authenticated;
grant execute on function public.process_resend_delivery_event(text, text, text, timestamptz) to service_role;

alter table public.notification_webhook_events enable row level security;
revoke all on public.notification_webhook_events from anon, authenticated;
drop policy if exists notification_webhook_events_admin_read on public.notification_webhook_events;
create policy notification_webhook_events_admin_read
  on public.notification_webhook_events for select to authenticated using (public.is_admin());
grant select on public.notification_webhook_events to authenticated;

commit;

select
  to_regprocedure('public.enqueue_transactional_order_email()') is not null as order_events_ready,
  to_regprocedure('public.enqueue_transactional_refund_email()') is not null as refund_events_ready,
  to_regprocedure('public.process_resend_delivery_event(text,text,text,timestamp with time zone)') is not null
    as resend_delivery_tracking_ready;

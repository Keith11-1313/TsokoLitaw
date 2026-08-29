begin;

alter table public.notification_deliveries
  drop constraint if exists notification_deliveries_status_check;

alter table public.notification_deliveries
  alter column status set default 'PENDING',
  add column if not exists last_attempt_at timestamptz,
  add column if not exists next_attempt_at timestamptz not null default now(),
  add constraint notification_deliveries_status_check
    check (status in ('PENDING', 'PROCESSING', 'SENT', 'DELIVERED', 'FAILED'));

create index if not exists notification_deliveries_retry_idx
  on public.notification_deliveries (next_attempt_at, created_at)
  where status in ('PENDING', 'FAILED');

create or replace function public.enqueue_transactional_order_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  should_enqueue boolean := false;
begin
  if tg_op = 'INSERT' then
    should_enqueue := true;
  elsif tg_op = 'UPDATE' then
    should_enqueue := old.status is distinct from new.status
      or old.payment_status is distinct from new.payment_status;
  end if;

  if should_enqueue
    and new.status = 'CONFIRMED'
    and new.payment_status = 'PAID'
  then
    insert into public.notification_deliveries (
      order_id,
      user_id,
      provider,
      event_type,
      recipient_email,
      idempotency_key,
      status
    ) values (
      new.id,
      new.user_id,
      'resend',
      'order.confirmed',
      new.customer_email,
      'order.confirmed:' || new.id::text,
      'PENDING'
    )
    on conflict (idempotency_key) do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists orders_enqueue_transactional_email on public.orders;
create trigger orders_enqueue_transactional_email
after insert or update of status, payment_status on public.orders
for each row execute procedure public.enqueue_transactional_order_email();

revoke all on function public.enqueue_transactional_order_email() from public, anon, authenticated;

commit;

select
  to_regclass('public.notification_deliveries') is not null as notification_table_ready,
  to_regprocedure('public.enqueue_transactional_order_email()') is not null as confirmation_queue_ready;

-- Isolated local fixtures; every write rolls back. No provider/network calls.
begin;
create extension if not exists pgtap with schema extensions;
set local role postgres;
select set_config('search_path', (select quote_ident(n.nspname) || ',public' from pg_extension e join pg_namespace n on n.oid=e.extnamespace where e.extname='pgtap'), true);
select plan(97);

select ok(not has_function_privilege('authenticated', signature, 'execute'), signature || ': browser execution remains denied')
from (values
  ('public.cancel_unpaid_order(uuid,uuid,text)'),
  ('public.expire_paymongo_order(uuid,text)'),
  ('public.expire_pending_orders()'),
  ('public.replace_paymongo_checkout(uuid,text,text,text)'),
  ('public.process_paymongo_paid_event(text,uuid,text,text,text,numeric,jsonb)')
) functions(signature);
select ok(has_function_privilege('service_role', signature, 'execute'), signature || ': server execution remains granted')
from (values
  ('public.cancel_unpaid_order(uuid,uuid,text)'),
  ('public.expire_paymongo_order(uuid,text)'),
  ('public.expire_pending_orders()'),
  ('public.replace_paymongo_checkout(uuid,text,text,text)'),
  ('public.process_paymongo_paid_event(text,uuid,text,text,text,numeric,jsonb)')
) functions(signature);
select ok(
  position('perform 1 from public.orders' in pg_get_functiondef(signature::regprocedure)) > 0 and
  position('perform 1 from public.orders' in pg_get_functiondef(signature::regprocedure)) <
    position('select * into target_payment' in pg_get_functiondef(signature::regprocedure)),
  signature || ': order locks precede payment locks'
)
from (values
  ('public.expire_paymongo_order(uuid,text)'),
  ('public.replace_paymongo_checkout(uuid,text,text,text)'),
  ('public.process_paymongo_paid_event(text,uuid,text,text,text,numeric,jsonb)')
) functions(signature);

insert into auth.users(id,instance_id,aud,role,email,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
values ('a1800000-0000-4000-8000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','release-owner@example.test','{"provider":"google","providers":["google"]}','{"name":"Release Owner"}',now(),now());
insert into public.pickup_locations(id,name) values ('a2800000-0000-4000-8000-000000000001','Release regression');

create function pg_temp.check_releases() returns setof text language plpgsql as $$
declare
  path text;
  scenario text;
  order_id_value uuid;
  payment_id_value uuid;
  date_id uuid;
  window_id uuid;
  inventory_id uuid;
  today date := (now() at time zone 'Asia/Manila')::date;
  pickup_day date;
  placed_at timestamptz;
  mode public.pickup_availability_mode;
  expected_reserved integer;
  releases_stock boolean;
  applied boolean;
  expired integer;
  label text;
begin
  foreach path in array array['customer','provider','direct'] loop
    foreach scenario in array array['rollover','advance','ready','made_to_order','snapshot','inconsistent','missing_inventory'] loop
      order_id_value := gen_random_uuid();
      payment_id_value := gen_random_uuid();
      date_id := gen_random_uuid();
      window_id := gen_random_uuid();
      inventory_id := gen_random_uuid();
      -- Same-day order placed just before Manila midnight; processed later.
      pickup_day := case when scenario = 'advance' then today else today - 1 end;
      placed_at := ((today - 1)::text || ' 23:59:00 Asia/Manila')::timestamptz;
      mode := case when scenario = 'ready' then 'READY_STOCK' when scenario = 'made_to_order' then 'MADE_TO_ORDER' else 'HYBRID' end;
      releases_stock := scenario not in ('advance','made_to_order');
      expected_reserved := case when releases_stock then 4 else 8 end;
      label := path || ': ' || scenario;
      -- Reuse one row per date; no prior pending fixtures survive a successful case.
      select id into date_id from public.pickup_dates where pickup_date = pickup_day;
      if date_id is null then
        insert into public.pickup_dates(pickup_date,availability_mode) values(pickup_day,mode) returning id into date_id;
      else
        update public.pickup_dates set availability_mode = mode where id = date_id;
      end if;
      insert into public.pickup_windows(id,pickup_date_id,start_time,end_time) values(window_id,date_id,'09:00','10:00')
      on conflict(pickup_date_id,start_time,end_time) do update set start_time=excluded.start_time returning id into window_id;
      insert into public.orders(id,order_number,user_id,customer_name,customer_email,pickup_date,pickup_window_id,pickup_location_id,pickup_window_snapshot,pickup_location_snapshot,subtotal,total,terms_version,terms_accepted_at,created_at,payment_expires_at)
      values(order_id_value,'TL-RELEASE-' || order_id_value,'a1800000-0000-4000-8000-000000000001','Owner','release-owner@example.test',pickup_day,window_id,'a2800000-0000-4000-8000-000000000001','9–10 AM','Release regression',40,40,'test',now(),placed_at,now()-interval '1 minute');
      insert into public.payments(id,order_id,provider,provider_checkout_id,amount)
      values(payment_id_value,order_id_value,case when path='provider' then 'paymongo' else 'manual_gcash' end,case when path='provider' then 'cs_' || replace(order_id_value::text,'-','') end,40);
      insert into public.order_items(order_id,product_id,variant_id,product_name_snapshot,variant_name_snapshot,piece_count_snapshot,unit_price_snapshot,quantity,line_subtotal)
      values(order_id_value,'10000000-0000-4000-8000-000000000001','11000000-0000-4000-8000-000000000004','Test','Saved four-piece box',4,40,1,40);
      if scenario='snapshot' then
        update public.product_variants set piece_count=5 where id='11000000-0000-4000-8000-000000000004';
      end if;
      -- Four pieces belong to this order, four belong to other commitments.
      insert into public.daily_inventory(id,product_id,pickup_date,stock_total,stock_reserved)
      values(inventory_id,'10000000-0000-4000-8000-000000000001',pickup_day,100,case when scenario='inconsistent' then 3 else 8 end)
      on conflict(product_id,pickup_date) do update set stock_reserved=excluded.stock_reserved returning id into inventory_id;
      if scenario='missing_inventory' then
        delete from public.daily_inventory where id=inventory_id;
      end if;
      if scenario in ('inconsistent','missing_inventory') then
        begin
          if path='customer' then
            perform public.cancel_unpaid_order(order_id_value,'a1800000-0000-4000-8000-000000000001',null);
          elsif path='provider' then
            perform public.expire_paymongo_order(payment_id_value,'cs_' || replace(order_id_value::text,'-',''));
          else
            perform public.expire_pending_orders();
          end if;
          return next ok(false,label || ': inconsistent reservation must fail');
        exception when raise_exception then
          return next is(sqlerrm,'Reserved inventory is inconsistent',label || ': rejects inconsistent reservation');
        end;
        return next is((select status::text from public.orders where id=order_id_value),'PENDING_PAYMENT',label || ': order rollback');
        return next is((select status::text from public.payments where id=payment_id_value),'PENDING',label || ': payment rollback');
        return next is(coalesce((select stock_reserved from public.daily_inventory where id=inventory_id),-1),
          case when scenario='missing_inventory' then -1 else 3 end,label || ': stock unchanged');
        -- Prevent the intentional corrupt fixture poisoning the following cases.
        update public.orders set payment_expires_at=now()+interval '1 day' where id=order_id_value;
      else
        if path='customer' then
          applied := public.cancel_unpaid_order(order_id_value,'a1800000-0000-4000-8000-000000000001',null);
        elsif path='provider' then
          applied := public.expire_paymongo_order(payment_id_value,'cs_' || replace(order_id_value::text,'-',''));
        else
          expired := public.expire_pending_orders();
          applied := expired = 1;
        end if;
        return next ok(applied,label || ': transition succeeds');
        return next is((select stock_reserved from public.daily_inventory where id=inventory_id),expected_reserved,label || ': exact snapshot release preserves other stock');
        if path='customer' then
          applied := public.cancel_unpaid_order(order_id_value,'a1800000-0000-4000-8000-000000000001',null);
        elsif path='provider' then
          applied := public.expire_paymongo_order(payment_id_value,'cs_' || replace(order_id_value::text,'-',''));
        else
          applied := public.expire_pending_orders() <> 0;
        end if;
        return next ok(not applied,label || ': retry does not release twice');
        return next is((select status::text from public.payments where id=payment_id_value),'FAILED',label || ': payment and order consistent');
      end if;
      update public.product_variants set piece_count=4 where id='11000000-0000-4000-8000-000000000004';
    end loop;
  end loop;
end;
$$;
select * from pg_temp.check_releases();
select * from finish();
rollback;

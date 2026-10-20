-- Admin manages; Staff alone operates customer transactions. No data reset.
create function public.is_staff() returns boolean
language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.profiles where id=(select auth.uid()) and role='staff' and is_active);
$$;
revoke all on function public.is_staff() from public;
grant execute on function public.is_staff() to authenticated, service_role;

-- Hold the actor's role stable until the transaction finishes. Role assignment
-- takes an exclusive lock on the same row, so demotion cannot race a writer.
create function public.require_staff_actor(actor_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
 perform 1 from public.profiles where id=actor_id and role='staff' and is_active for share;
 if not found then raise exception 'Active staff access is required'; end if;
end;
$$;
revoke all on function public.require_staff_actor(uuid) from public, anon, authenticated;
grant execute on function public.require_staff_actor(uuid) to service_role;

-- Change only authorization in existing atomic writers. Preserve their exact
-- provider, stock, reward, state-transition, deduplication and audit behavior.
do $repair$
declare operation regprocedure; definition text; rewritten text;
begin
 foreach operation in array array[
  'public.transition_order_status(uuid,uuid,public.order_status,public.order_status)'::regprocedure,
  'public.record_counter_payment(uuid,uuid)'::regprocedure,
  'public.review_manual_payment(uuid,uuid,boolean,text)'::regprocedure,
  'public.prepare_admin_order_cancellation(uuid,uuid,public.order_status)'::regprocedure
 ] loop
  definition:=pg_get_functiondef(operation);
  if position('role = ''admin''' in definition)=0 then raise exception 'Unexpected writer definition: %',operation; end if;
  rewritten:=replace(definition,'role = ''admin''','role = ''staff''');
  rewritten:=replace(rewritten,'Active administrator access is required','Active staff access is required');
  rewritten:=regexp_replace(rewritten,'[[:space:]]begin[[:space:]]',E'\nbegin\n  perform public.require_staff_actor(target_admin_id);\n');
  if position('perform public.require_staff_actor(target_admin_id)' in rewritten)=0 then raise exception 'Actor lock injection failed'; end if;
  execute rewritten;
 end loop;
end $repair$;

-- Staff cannot use the customer self-deletion endpoint either.
do $repair$
declare definition text;
begin
 select pg_get_functiondef('public.request_account_deletion()'::regprocedure) into definition;
 if position('role = ''admin''' in definition)=0 then raise exception 'Unexpected deletion-request guard'; end if;
 execute replace(replace(definition,'role = ''admin''','role <> ''customer'''),
 'Admin accounts require controlled removal','Business accounts require controlled removal');
end $repair$;

-- Direct receipt access: active owner or Staff, not Admin. Staff may inspect
-- operational order details, but do not inherit the customer directory or reports.
alter policy manual_submission_read on public.manual_payment_submissions
 using (public.is_staff() or exists(select 1 from public.orders o where o.id=order_id and o.user_id=(select auth.uid()) and public.is_active_customer()));
create policy orders_staff_read on public.orders for select to authenticated using(public.is_staff());
create policy payments_staff_read on public.payments for select to authenticated using(public.is_staff());
create policy order_items_staff_read on public.order_items for select to authenticated using(public.is_staff());
create policy order_item_coatings_staff_read on public.order_item_coatings for select to authenticated using(public.is_staff());
create policy order_item_addons_staff_read on public.order_item_addons for select to authenticated using(public.is_staff());

-- Only Customers are eligible for automatic customer deactivation.
do $repair$
declare definition text;
begin
 select pg_get_functiondef('public.deactivate_due_account(uuid)'::regprocedure) into definition;
 if position('target_role = ''admin''' in definition)=0 then raise exception 'Unexpected deactivation guard'; end if;
 execute replace(definition,'target_role = ''admin''','target_role <> ''customer''');
end $repair$;

-- Bootstrap promotions and UI assignments share the same ten-Admin mutex.
create or replace function public.enforce_admin_limit() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
 if new.role='admin' then
  perform pg_advisory_xact_lock(hashtext('tsokolitaw-role-assignment'));
  if tg_op='INSERT' then
   if (select count(*) from public.profiles where role='admin')>=10 then raise exception 'TsokoLitaw supports at most ten administrators'; end if;
  elsif old.role is distinct from 'admin' and (select count(*) from public.profiles where role='admin')>=10 then
   raise exception 'TsokoLitaw supports at most ten administrators';
  end if;
 end if;
 return new;
end;
$$;

create function public.assign_account_role(target_admin_id uuid, target_user_id uuid,
 expected_role public.profile_role, next_role public.profile_role) returns boolean
language plpgsql security definer set search_path = '' as $$
declare actor public.profiles%rowtype; target public.profiles%rowtype;
begin
 -- Serialize role changes and the existing ten-Admin trigger with one lock.
 perform pg_advisory_xact_lock(hashtext('tsokolitaw-role-assignment'));
 -- Lock all profiles in a fixed order: checkout locks profiles before orders.
 perform 1 from public.profiles where id in(target_admin_id,target_user_id) order by id for update;
 select * into actor from public.profiles where id=target_admin_id;
 select * into target from public.profiles where id=target_user_id;
 if actor.id is null or actor.role<>'admin' or not actor.is_active then raise exception 'Active administrator access is required'; end if;
 if target_admin_id=target_user_id then raise exception 'You cannot change your own role'; end if;
 if target.id is null or not target.is_active or target.deletion_scheduled_for is not null then raise exception 'Active account without pending deletion is required'; end if;
 if target.role is distinct from expected_role then raise exception 'Account role changed; refresh first'; end if;
 if next_role is null then raise exception 'Choose a role'; end if;
 if target.role=next_role then return false; end if;
 if target.role='admin' and next_role<>'admin' and (select count(*) from public.profiles where role='admin' and is_active)<=1 then raise exception 'The last active Admin cannot be demoted'; end if;
 if next_role='admin' and (select count(*) from public.profiles where role='admin')>=10 then raise exception 'At most ten Admin accounts are allowed'; end if;
 if exists(select 1 from public.orders where user_id=target_user_id and status not in('COMPLETED','CANCELLED','EXPIRED')) then raise exception 'Resolve personal orders before changing roles'; end if;
 update public.profiles set role=next_role, updated_at=now() where id=target_user_id;
 insert into public.admin_audit_logs(admin_id,action,entity_type,entity_id,metadata)
 values(target_admin_id,'account.role_changed','profile',target_user_id::text,jsonb_build_object('previous_role',target.role,'next_role',next_role));
 return true;
end;
$$;
revoke all on function public.assign_account_role(uuid,uuid,public.profile_role,public.profile_role) from public, anon, authenticated;
grant execute on function public.assign_account_role(uuid,uuid,public.profile_role,public.profile_role) to service_role;

-- Read-only Staff schedule/stock projection: no customer directory or revenue.
create function public.get_staff_pickup_overview(actor_id uuid)
returns table(pickup_date date,availability_mode public.pickup_availability_mode,
 prepared integer,reserved integer,sold integer,windows jsonb)
language plpgsql security definer set search_path = '' as $$
begin
 perform public.require_staff_actor(actor_id);
 return query select d.pickup_date,d.availability_mode,
 coalesce(i.prepared,0)::integer,coalesce(i.reserved,0)::integer,coalesce(i.sold,0)::integer,
 coalesce((select jsonb_agg(jsonb_build_object('start',w.start_time,'end',w.end_time,'locations',
   (select string_agg(l.name,', ' order by l.name) from public.pickup_window_locations wl join public.pickup_locations l on l.id=wl.pickup_location_id where wl.pickup_window_id=w.id and wl.is_open and l.is_active)) order by w.start_time)
 from public.pickup_windows w where w.pickup_date_id=d.id and w.is_open),'[]'::jsonb)
 from public.pickup_dates d left join lateral(select sum(di.stock_total) prepared,sum(di.stock_reserved) reserved,sum(di.stock_sold) sold from public.daily_inventory di where di.pickup_date=d.pickup_date)i on true
 where d.is_open and d.pickup_date >= (now() at time zone 'Asia/Manila')::date
 order by d.pickup_date limit 14;
end;
$$;
revoke all on function public.get_staff_pickup_overview(uuid) from public, anon, authenticated;
grant execute on function public.get_staff_pickup_overview(uuid) to service_role;

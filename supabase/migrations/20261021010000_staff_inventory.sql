-- Staff owns prepared-stock operations; Admin retains read-only inventory.
-- Preserve existing atomic stock bounds, row locks, audit and service-only ACLs.
do $migration$
declare operation regprocedure; definition text; rewritten text;
begin
 foreach operation in array array[
  'public.upsert_daily_inventory(uuid,date,uuid,integer,text)'::regprocedure,
  'public.record_inventory_consumption(uuid,uuid,integer,text,text)'::regprocedure
 ] loop
  definition := pg_get_functiondef(operation);
  if position('role = ''admin''' in definition)=0 then
   raise exception 'Unexpected inventory writer definition: %', operation;
  end if;
  rewritten := replace(definition,'role = ''admin''','role = ''staff''');
  rewritten := replace(rewritten,'Active administrator access is required','Active staff access is required');
  rewritten := regexp_replace(rewritten,'[[:space:]]begin[[:space:]]',E'\nbegin\n  perform public.require_staff_actor(target_admin_id);\n');
  if position('perform public.require_staff_actor(target_admin_id)' in rewritten)=0 then
   raise exception 'Staff actor lock injection failed';
  end if;
  execute rewritten;
 end loop;
end $migration$;

create policy daily_inventory_staff_read on public.daily_inventory
 for select to authenticated using(public.is_staff());
create policy inventory_adjustments_staff_read on public.inventory_adjustments
 for select to authenticated using(public.is_staff());
-- Stock can exist on closed schedules; Staff must see them without being allowed
-- to publish, close, edit or create schedules.
create policy pickup_dates_staff_read on public.pickup_dates
 for select to authenticated using(public.is_staff());
create policy products_staff_read on public.products
 for select to authenticated using(public.is_staff());

-- Deploy with the matching Pickup settings application change. No data reset.
begin;

drop function public.update_pickup_settings(uuid, integer, time, integer, time, time);
drop function public.get_public_pickup_settings();

create function public.get_public_pickup_settings()
returns table (minimum_lead_days integer, daily_cutoff_time time,
  operating_start time, operating_end time)
language sql stable security definer set search_path = '' as $$
  select
    coalesce((select (value #>> '{}')::integer from public.business_settings where key = 'minimum_lead_days'), 1),
    coalesce((select (value #>> '{}')::time from public.business_settings where key = 'daily_cutoff_time'), '17:00'::time),
    coalesce((select (value ->> 'start')::time from public.business_settings where key = 'pickup_operating_hours'), '07:00'::time),
    coalesce((select (value ->> 'end')::time from public.business_settings where key = 'pickup_operating_hours'), '19:00'::time);
$$;
alter function public.get_public_pickup_settings() owner to postgres;
revoke all on function public.get_public_pickup_settings() from public;
grant execute on function public.get_public_pickup_settings() to anon, authenticated, service_role;
comment on function public.get_public_pickup_settings() is 'Customer-safe lead-time, cutoff and operating-hour settings.';

create function public.update_pickup_settings(target_admin_id uuid,
  minimum_lead_days_value integer, daily_cutoff_time_value time,
  operating_start_value time, operating_end_value time)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.profiles
    where id = target_admin_id and role = 'admin' and is_active) then
    raise exception 'Active administrator access is required';
  end if;
  if minimum_lead_days_value is null or minimum_lead_days_value < 0 or minimum_lead_days_value > 30
    or daily_cutoff_time_value is null or operating_start_value is null
    or operating_end_value is null or operating_end_value <= operating_start_value then
    raise exception 'Pickup rules are invalid';
  end if;
  if exists (
    select 1 from public.pickup_windows
    join public.pickup_dates on pickup_dates.id = pickup_windows.pickup_date_id
    where pickup_dates.pickup_date >= (current_timestamp at time zone 'Asia/Manila')::date
      and pickup_dates.is_open and pickup_windows.is_open
      and (pickup_windows.start_time < operating_start_value or pickup_windows.end_time > operating_end_value)
  ) then
    raise exception 'Open pickup windows must fit inside the new operating hours';
  end if;
  insert into public.business_settings (key, value) values
    ('minimum_lead_days', to_jsonb(minimum_lead_days_value)),
    ('daily_cutoff_time', to_jsonb(daily_cutoff_time_value::text)),
    ('pickup_operating_hours', jsonb_build_object('start', operating_start_value::text, 'end', operating_end_value::text))
  on conflict (key) do update set value = excluded.value, updated_at = now();
  insert into public.admin_audit_logs (admin_id, action, entity_type, entity_id, metadata)
  values (target_admin_id, 'pickup.settings_updated', 'business_settings', 'pickup',
    jsonb_build_object('minimum_lead_days', minimum_lead_days_value,
      'daily_cutoff_time', daily_cutoff_time_value,
      'operating_start', operating_start_value, 'operating_end', operating_end_value));
  return true;
end;
$$;
alter function public.update_pickup_settings(uuid, integer, time, time, time) owner to postgres;
revoke all on function public.update_pickup_settings(uuid, integer, time, time, time) from public, anon, authenticated;
grant execute on function public.update_pickup_settings(uuid, integer, time, time, time) to service_role;
comment on function public.update_pickup_settings(uuid, integer, time, time, time) is 'Service-role-only Pickup rules writer for lead time, cutoff and operating hours.';

delete from public.business_settings where key = 'pickup_grace_minutes';
notify pgrst, 'reload schema';
commit;

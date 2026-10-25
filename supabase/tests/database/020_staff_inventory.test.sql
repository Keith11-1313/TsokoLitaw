begin;
create temporary sequence fixture_ids start 10000000000;
create function pg_temp.fixture_id(legacy text) returns bigint language sql immutable as 'select (''x''||left(legacy,8))::bit(32)::bigint*1000000+right(legacy,12)::bigint';
create extension if not exists pgtap with schema extensions;
set local search_path=extensions,public;
select no_plan();
insert into auth.users(id,instance_id,aud,role,email,raw_user_meta_data)
select ('bc210000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','inventory-rbac-'||n||'@example.test','{"name":"Inventory RBAC"}'
from generate_series(1,3)n;
update public.profiles set role='admin' where id=(select id from public.profiles where auth_user_id='bc210000-0000-4000-8000-000000000001');
update public.profiles set role='staff' where id=(select id from public.profiles where auth_user_id='bc210000-0000-4000-8000-000000000002');
insert into public.pickup_dates(id,pickup_date,availability_mode,is_open)
values('3156279296000004','2099-11-01','READY_STOCK',false);
select throws_ok($$select public.upsert_daily_inventory((select id from public.profiles where auth_user_id='bc210000-0000-4000-8000-000000000001'),'2099-11-01','1',10,'')$$,'P0001','Active staff access is required','Admin cannot publish stock');
select throws_ok($$select public.record_inventory_consumption((select id from public.profiles where auth_user_id='bc210000-0000-4000-8000-000000000001'),nextval('fixture_ids'),1,'WASTE','')$$,'P0001','Active staff access is required','Admin cannot consume stock');
select lives_ok($$select public.upsert_daily_inventory((select id from public.profiles where auth_user_id='bc210000-0000-4000-8000-000000000002'),'2099-11-01','1',10,'Morning batch')$$,'Staff publishes prepared pieces');
select lives_ok($$select public.record_inventory_consumption((select id from public.profiles where auth_user_id='bc210000-0000-4000-8000-000000000002'),(select id from public.daily_inventory where pickup_date='2099-11-01'),2,'WASTE','Damaged')$$,'Staff records waste');
select is((select stock_total-stock_sold-stock_reserved from public.daily_inventory where pickup_date='2099-11-01'),8,'atomic remaining stock is correct');
select throws_ok($$select public.record_inventory_consumption((select id from public.profiles where auth_user_id='bc210000-0000-4000-8000-000000000002'),(select id from public.daily_inventory where pickup_date='2099-11-01'),9,'WASTE','')$$,'P0001','Not enough uncommitted pieces remain','Staff cannot overconsume');
select set_config('request.jwt.claim.sub','bc210000-0000-4000-8000-000000000002',true);
set local role authenticated;
select is((select count(*) from public.daily_inventory where pickup_date='2099-11-01'),1::bigint,'Staff reads inventory');
select is((select count(*) from public.inventory_adjustments where notes='Damaged'),1::bigint,'Staff reads history notes');
select is((select count(*) from public.pickup_dates where pickup_date='2099-11-01'),1::bigint,'Staff reads closed stock dates');
reset role;
select set_config('request.jwt.claim.sub','bc210000-0000-4000-8000-000000000001',true);
set local role authenticated;
select is((select count(*) from public.daily_inventory where pickup_date='2099-11-01'),1::bigint,'Admin keeps inventory read access');
reset role;
select set_config('request.jwt.claim.sub','bc210000-0000-4000-8000-000000000003',true);
set local role authenticated;
select is((select count(*) from public.inventory_adjustments),0::bigint,'Customer cannot inspect stock notes');
reset role;
update public.profiles set is_active=false,deactivated_at=now() where id=(select id from public.profiles where auth_user_id='bc210000-0000-4000-8000-000000000002');
select throws_ok($$select public.upsert_daily_inventory((select id from public.profiles where auth_user_id='bc210000-0000-4000-8000-000000000002'),'2099-11-01','1',11,'')$$,'P0001','Active staff access is required','inactive Staff cannot mutate stock');
select * from finish();
rollback;

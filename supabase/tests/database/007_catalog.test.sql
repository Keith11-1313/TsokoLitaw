begin;

create extension if not exists pgtap with schema extensions;
set local role postgres;
do $$
declare pgtap_schema text;
begin
  select pg_namespace.nspname into pgtap_schema from pg_extension join pg_namespace on pg_namespace.oid = pg_extension.extnamespace where pg_extension.extname = 'pgtap';
  execute format('grant usage on schema %I to %I', pgtap_schema, session_user);
end;
$$;
select set_config('search_path', (select quote_ident(pg_namespace.nspname) || ',public' from pg_extension join pg_namespace on pg_namespace.oid = pg_extension.extnamespace where pg_extension.extname = 'pgtap'), true);
select plan(12);

insert into auth.users (id, instance_id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) values
  ('e2000000-0000-4000-8000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','catalog-admin@example.test','{"provider":"google","providers":["google"]}','{"name":"Catalog Admin"}',now(),now()),
  ('e2000000-0000-4000-8000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','catalog-customer@example.test','{"provider":"google","providers":["google"]}','{"name":"Catalog Customer"}',now(),now());
update public.profiles set role = 'admin' where id = 'e2000000-0000-4000-8000-000000000001';

select ok(not has_function_privilege('authenticated','public.update_catalog_product(uuid,uuid,text,numeric,boolean)','EXECUTE'),'customers cannot call product writer');
select ok(has_function_privilege('service_role','public.update_catalog_product(uuid,uuid,text,numeric,boolean)','EXECUTE'),'service role can call product writer');
select throws_ok($$select public.update_catalog_product('e2000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001','A valid customer-blocked description.',12,true)$$,'P0001','Active administrator access is required','customer cannot update product');
select lives_ok($$select public.update_catalog_product('e2000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','Updated chocolate-filled product description.',12,true)$$,'admin updates product');
select is((select price_per_piece from public.products where id='10000000-0000-4000-8000-000000000001'),12.00::numeric,'product price persisted');
select lives_ok($$select public.update_catalog_variant('e2000000-0000-4000-8000-000000000001','11000000-0000-4000-8000-000000000006',false)$$,'admin hides approved variant');
select is((select is_active from public.product_variants where id='11000000-0000-4000-8000-000000000006'),false,'variant availability persisted');
select lives_ok($$select public.upsert_catalog_coating('e2000000-0000-4000-8000-000000000001',null,'Toasted Coconut','A toasted coconut coating for the filled base.','https://example.test/coating.jpeg',7,true,true,'Contains coconut.')$$,'admin creates coating');
select is((select additional_type_price from public.coatings where name='Toasted Coconut'),7.00::numeric,'coating price persisted');
select lives_ok($$select public.update_catalog_addon('e2000000-0000-4000-8000-000000000001','13000000-0000-4000-8000-000000000001',20,true)$$,'admin updates add-on');
select is((select count(*)::integer from public.admin_audit_logs where action like 'catalog.%'),4,'catalog mutations are audited');
select ok((select public and file_size_limit=3145728 from storage.buckets where id='catalog-media'),'catalog media bucket is public and size-limited');

select * from finish();
rollback;

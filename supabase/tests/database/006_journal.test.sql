begin;

create extension if not exists pgtap with schema extensions;
set local role postgres;
do $$
declare pgtap_schema text;
begin
  select pg_namespace.nspname into pgtap_schema
  from pg_extension join pg_namespace on pg_namespace.oid = pg_extension.extnamespace
  where pg_extension.extname = 'pgtap';
  execute format('grant usage on schema %I to %I', pgtap_schema, session_user);
end;
$$;
select set_config(
  'search_path',
  (select quote_ident(pg_namespace.nspname) || ',public'
   from pg_extension join pg_namespace on pg_namespace.oid = pg_extension.extnamespace
   where pg_extension.extname = 'pgtap'),
  true
);
select plan(12);

insert into auth.users (
  id, instance_id, aud, role, email, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at
) values
  ('e1000000-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'journal-admin@example.test', '{"provider":"google","providers":["google"]}', '{"name":"Journal Admin"}', now(), now()),
  ('e1000000-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'journal-customer@example.test', '{"provider":"google","providers":["google"]}', '{"name":"Journal Customer"}', now(), now());

update public.profiles set role = 'admin'
where id = 'e1000000-0000-4000-8000-000000000001';

create temporary table journal_test_post (id uuid not null);

select ok(
  not has_function_privilege('authenticated', 'public.upsert_journal_post(uuid,uuid,text,text,text,text,text,date,text,text,journal_status)', 'EXECUTE'),
  'customers cannot call the Journal writer directly'
);
select ok(
  has_function_privilege('service_role', 'public.upsert_journal_post(uuid,uuid,text,text,text,text,text,date,text,text,journal_status)', 'EXECUTE'),
  'service role can invoke the Journal writer'
);
select throws_ok(
  $$select public.upsert_journal_post('e1000000-0000-4000-8000-000000000002',null,'Customer post','Summary','Customers cannot publish Journal content.','story','sparkles','2099-06-01','','','draft')$$,
  'P0001', 'Active administrator access is required', 'customers cannot create Journal posts'
);

select lives_ok(
  $$insert into journal_test_post select public.upsert_journal_post('e1000000-0000-4000-8000-000000000001',null,'Campus update','Pickup schedule','Campus pickup is available during the announced schedule.','announcement','megaphone','2099-06-02','','','draft')$$,
  'admin can create a Journal draft'
);
select is((select title from public.journal_posts where id = (select id from journal_test_post)), 'Campus update', 'Journal content is persisted');
select is((select icon_key from public.journal_posts where id = (select id from journal_test_post)), 'megaphone', 'selected Journal icon is persisted');
select ok((select published_at is null from public.journal_posts where id = (select id from journal_test_post)), 'draft is not publicly dated as published');

select lives_ok(
  $$select public.upsert_journal_post('e1000000-0000-4000-8000-000000000001',(select id from journal_test_post),'Campus update published','Updated schedule','The final campus pickup schedule is now available.','announcement','sparkles','2099-06-03','https://example.test/cover.webp','','published')$$,
  'admin can edit and publish a Journal post'
);
select ok((select status = 'published' and published_at is not null from public.journal_posts where id = (select id from journal_test_post)), 'publication state and timestamp are persisted');
select is((select count(*)::integer from public.admin_audit_logs where action in ('journal.created', 'journal.updated')), 2, 'Journal creates and updates are audited');
select throws_ok(
  $$select public.upsert_journal_post('e1000000-0000-4000-8000-000000000001',(select id from journal_test_post),'Invalid icon','Summary','This update uses an invalid icon value.','story','invalid','2099-06-03','','','draft')$$,
  'P0001', 'Journal icon is invalid', 'unsupported Journal icons are rejected'
);
select ok((select public and file_size_limit = 3145728 from storage.buckets where id = 'journal-media'), 'Journal media bucket has the approved public-read and size configuration');

select * from finish();
rollback;

-- In-place conversion: application entities become bigint identities; Auth stays UUID.
-- Preserve a private old/new map for recovery and retain stored file/provider evidence.
-- Coordinate this migration with matching application code. Never apply to Production
-- as part of the separately approved Dev migration.
begin;
set local lock_timeout='10s';
set local statement_timeout='120s';
set local check_function_bodies=off;

create schema if not exists migration_support;
revoke all on schema migration_support from public,anon,authenticated;
create table migration_support.application_id_map (
 table_name text not null,
 old_id uuid not null,
 new_id bigint not null check(new_id between 1 and 9007199254740991),
 primary key(table_name,old_id),unique(table_name,new_id)
);
revoke all on migration_support.application_id_map from public,anon,authenticated;

create temporary table id_tables on commit drop as
 select c.relname::text table_name from pg_class c join pg_namespace n on n.oid=c.relnamespace
 join pg_attribute a on a.attrelid=c.oid and a.attname='id' and a.atttypid='uuid'::regtype
 where n.nspname='public' and c.relkind='r';
create temporary table id_foreign_keys on commit drop as
 select k.conname,c.relname::text table_name,rc.relname::text parent_table,
 a.attname::text column_name,a.atttypid::regtype::text column_type,pg_get_constraintdef(k.oid) definition
 from pg_constraint k join pg_class c on c.oid=k.conrelid
 join pg_namespace n on n.oid=c.relnamespace
 join pg_class rc on rc.oid=k.confrelid
 join pg_attribute a on a.attrelid=c.oid and a.attnum=k.conkey[1]
 where n.nspname='public' and k.contype='f';
create temporary table id_policies on commit drop as select * from pg_policies where schemaname='public';
create temporary table id_triggers on commit drop as
 select t.tgname,n.nspname,c.relname,pg_get_triggerdef(t.oid) definition
 from pg_trigger t join pg_proc p on p.oid=t.tgfoid join pg_namespace pn on pn.oid=p.pronamespace
 join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace
 where pn.nspname='public' and not t.tgisinternal;
create temporary table id_functions on commit drop as
 select p.oid,p.proname,pg_get_function_identity_arguments(p.oid) arguments,
 pg_get_functiondef(p.oid) definition,p.proacl
 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where n.nspname='public' and p.prokind='f';
create temporary table id_function_grants on commit drop as
 select f.proname,f.arguments,x.grantee,x.privilege_type,x.is_grantable
 from id_functions f cross join lateral aclexplode(coalesce(f.proacl,acldefault('f','postgres'::regrole))) x;
create temporary table id_before_counts(table_name text primary key,row_count bigint) on commit drop;
create temporary table id_business_hashes(table_name text primary key,excluded_columns text[],digest text) on commit drop;

do $$ declare r record; amount bigint; begin
 if (select count(*) from id_tables)<>25 then
  raise exception 'Unexpected application schema: expected 25 UUID entity tables';
 end if;
 if exists(select 1 from pg_constraint k join pg_class c on c.oid=k.conrelid
  join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='public' and k.contype='f' and cardinality(k.conkey)<>1) then
  raise exception 'Unexpected composite foreign key: review conversion before proceeding';
 end if;
 if exists(select 1 from public.orders where status not in('COMPLETED','CANCELLED','EXPIRED')) then
  raise exception 'Resolve active orders before migrating identifiers';
 end if;
 if exists(select 1 from public.manual_payment_submissions where status='UNDER_REVIEW') then
  raise exception 'Resolve receipt reviews before migrating identifiers';
 end if;
 for r in select table_name from id_tables order by table_name loop
  execute format('lock table public.%I in access exclusive mode',r.table_name);
  execute format('insert into migration_support.application_id_map select %L,id,row_number() over(order by id) from public.%I',r.table_name,r.table_name);
  execute format('select count(*) from public.%I',r.table_name) into amount;
  insert into id_before_counts values(r.table_name,amount);
 end loop;
 -- Compare every non-key business value before/after, including snapshots,
 -- receipt paths, provider references, timestamps, audit metadata and balances.
 for r in select tablename from pg_tables where schemaname='public' loop
  insert into id_business_hashes(table_name,excluded_columns)
   select r.tablename,array['id','auth_user_id','upload_token']||
    coalesce(array_agg(column_name) filter(where column_type='uuid'),'{}'::text[])||
    case when r.tablename='admin_audit_logs' then array['entity_id'] else '{}'::text[] end
   from id_foreign_keys where table_name=r.tablename;
  execute format('update id_business_hashes set digest=(select md5(coalesce(jsonb_agg(to_jsonb(t)-$1 order by (to_jsonb(t)-$1)::text),''[]''::jsonb)::text) from public.%I t) where table_name=$2',r.tablename)
   using (select excluded_columns from id_business_hashes where table_name=r.tablename),r.tablename;
 end loop;
 for r in select * from id_policies loop execute format('drop policy %I on %I.%I',r.policyname,r.schemaname,r.tablename); end loop;
 for r in select * from id_triggers loop execute format('drop trigger %I on %I.%I',r.tgname,r.nspname,r.relname); end loop;
 execute (select 'drop function '||string_agg(format('public.%I(%s)',proname,arguments),', ') from id_functions);
 for r in select * from id_foreign_keys loop execute format('alter table public.%I drop constraint %I',r.table_name,r.conname); end loop;
end $$;

create function migration_support.map_id(relation_name text,legacy uuid) returns bigint
 language plpgsql stable strict set search_path='' as $$
declare result bigint; begin
 select new_id into strict result from migration_support.application_id_map where table_name=relation_name and old_id=legacy;
 return result;
end $$;
revoke all on function migration_support.map_id(text,uuid) from public,anon,authenticated;
alter table public.profiles add column auth_user_id uuid;
update public.profiles set auth_user_id=id;
alter table public.profiles alter column auth_user_id set not null;
alter table public.profiles add constraint profiles_auth_user_id_key unique(auth_user_id);
alter table public.manual_payment_submissions add column upload_token uuid;
update public.manual_payment_submissions set upload_token=id;
alter table public.manual_payment_submissions alter column upload_token set not null;
alter table public.manual_payment_submissions alter column upload_token set default gen_random_uuid();
alter table public.manual_payment_submissions add constraint manual_payment_submissions_upload_token_key unique(upload_token);

do $$ declare r record; begin
 -- Convert all referenced columns before the primary keys. Values come from a
 -- one-to-one map, never from truncation, hashing or a lossy UUID cast.
 for r in select * from id_foreign_keys where column_type='uuid' and not(table_name='profiles' and column_name='id') loop
  execute format('alter table public.%I alter column %I type bigint using migration_support.map_id(%L,%I)',r.table_name,r.column_name,r.parent_table,r.column_name);
 end loop;
 for r in select * from id_tables order by table_name loop
  execute format('alter table public.%I alter column id drop default',r.table_name);
  execute format('alter table public.%I alter column id type bigint using migration_support.map_id(%L,id)',r.table_name,r.table_name);
  execute format('alter table public.%I alter column id add generated by default as identity (sequence name public.%I maxvalue 9007199254740991)',r.table_name,r.table_name||'_id_seq');
  perform setval(format('public.%I',r.table_name||'_id_seq')::regclass,
   coalesce((select max(new_id) from migration_support.application_id_map where table_name=r.table_name),1),
   exists(select 1 from migration_support.application_id_map where table_name=r.table_name));
  execute format('alter table public.%I add constraint %I check(id between 1 and 9007199254740991)',r.table_name,r.table_name||'_id_safe_integer');
  execute format('revoke all on sequence public.%I from public,anon,authenticated',r.table_name||'_id_seq');
  execute format('grant usage,select on sequence public.%I to service_role',r.table_name||'_id_seq');
 end loop;
 for r in select * from id_foreign_keys where not(table_name='profiles' and column_name='id') loop
  execute format('alter table public.%I add constraint %I %s',r.table_name,r.conname,r.definition);
 end loop;
end $$;
alter table public.profiles add constraint profiles_auth_user_id_fkey foreign key(auth_user_id) references auth.users(id) on delete restrict;

create function public.current_profile_id() returns bigint language sql stable security definer set search_path='' as $$
 select id from public.profiles where auth_user_id=(select auth.uid());
$$;
revoke all on function public.current_profile_id() from public,anon;
grant execute on function public.current_profile_id() to authenticated,service_role;

do $$ declare r record; definition text; sequence_table text; arguments text; begin
 for r in select * from id_functions order by proname loop
  definition:=regexp_replace(r.definition,'\muuid\M','bigint','g');
  definition:=replace(definition,'auth.uid()','public.current_profile_id()');
  sequence_table:=case r.proname when 'create_checkout_order' then 'orders'
   when 'upsert_catalog_addon' then 'addons' when 'upsert_catalog_coating' then 'coatings'
   when 'upsert_daily_inventory' then 'daily_inventory' when 'upsert_journal_post' then 'journal_posts'
   when 'upsert_pickup_location' then 'pickup_locations' when 'upsert_pickup_schedule' then 'pickup_dates' end;
  if sequence_table is not null then
   definition:=replace(definition,'gen_random_uuid()',format('nextval(''public.%I_id_seq'')',sequence_table));
  end if;
  if r.proname='create_checkout_order' then definition:=replace(definition,'checkout_key bigint','checkout_key uuid'); end if;
  if r.proname='submit_manual_payment' then
   definition:=replace(definition,'submission_id bigint','submission_id uuid');
   definition:=replace(definition,'where id = submission_id and order_id','where upload_token = submission_id and order_id');
   definition:=replace(definition,'manual_payment_submissions(id, order_id','manual_payment_submissions(upload_token, order_id');
  end if;
  if r.proname='handle_new_user' then
   definition:=$new_user$create function public.handle_new_user() returns trigger language plpgsql security definer set search_path='' as $body$
declare application_profile_id bigint;
begin
 insert into public.profiles(auth_user_id,full_name,email,role)
 values(new.id,coalesce(new.raw_user_meta_data->>'full_name',new.raw_user_meta_data->>'name',''),coalesce(new.email,''),'customer')
 on conflict(auth_user_id) do update set full_name=excluded.full_name,email=excluded.email,updated_at=now()
 returning id into application_profile_id;
 insert into public.loyalty_accounts(user_id) values(application_profile_id) on conflict(user_id) do nothing;
 return new;
end;
$body$;$new_user$;
  end if;
  execute definition;
 end loop;
 -- Preserve the existing function execution ACLs on the new signatures.
 for r in select * from id_functions loop
  arguments:=regexp_replace(r.arguments,'\muuid\M','bigint','g');
  if r.proname='create_checkout_order' then arguments:=replace(arguments,'checkout_key bigint','checkout_key uuid'); end if;
  if r.proname='submit_manual_payment' then arguments:=replace(arguments,'submission_id bigint','submission_id uuid'); end if;
  execute format('revoke all on function public.%I(%s) from public,anon,authenticated,service_role',r.proname,arguments);
 end loop;
 for r in select * from id_function_grants loop
  arguments:=regexp_replace(r.arguments,'\muuid\M','bigint','g');
  if r.proname='create_checkout_order' then arguments:=replace(arguments,'checkout_key bigint','checkout_key uuid'); end if;
  if r.proname='submit_manual_payment' then arguments:=replace(arguments,'submission_id bigint','submission_id uuid'); end if;
  execute format('grant %s on function public.%I(%s) to %s%s',r.privilege_type,r.proname,arguments,
   case when r.grantee=0 then 'public' else quote_ident(pg_get_userbyid(r.grantee)) end,
   case when r.is_grantable then ' with grant option' else '' end);
 end loop;
 for r in select * from id_triggers loop execute r.definition; end loop;
 for r in select * from id_policies loop
  execute format('create policy %I on %I.%I as %s for %s to %s%s%s',r.policyname,r.schemaname,r.tablename,r.permissive,r.cmd,
   (select string_agg(quote_ident(v),',') from unnest(r.roles) v),
   case when r.qual is null then '' else ' using ('||replace(r.qual,'auth.uid()','public.current_profile_id()')||')' end,
   case when r.with_check is null then '' else ' with check ('||replace(r.with_check,'auth.uid()','public.current_profile_id()')||')' end);
 end loop;
end $$;

-- Known polymorphic targets get their new reference. Metadata is historical
-- evidence and remains unchanged; the private map retains its old identifiers.
update public.admin_audit_logs a set entity_id=m.new_id::text
 from migration_support.application_id_map m
 where a.entity_id=m.old_id::text and
 m.table_name=case a.entity_type when 'order' then 'orders' when 'profile' then 'profiles'
 when 'daily_inventory' then 'daily_inventory' when 'pickup_date' then 'pickup_dates'
 when 'pickup_location' then 'pickup_locations' when 'journal_post' then 'journal_posts'
 when 'coating' then 'coatings' when 'addon' then 'addons' when 'product' then 'products'
 when 'product_variant' then 'product_variants' when 'review' then 'reviews' end;

do $$ declare r record; amount bigint; digest_after text; begin
 for r in select * from id_before_counts loop
  execute format('select count(*) from public.%I',r.table_name) into amount;
  if amount<>r.row_count then raise exception 'Row preservation failed: %',r.table_name; end if;
 end loop;
 for r in select * from id_business_hashes loop
  execute format('select md5(coalesce(jsonb_agg(to_jsonb(t)-$1 order by (to_jsonb(t)-$1)::text),''[]''::jsonb)::text) from public.%I t',r.table_name)
   into digest_after using r.excluded_columns;
  if digest_after<>r.digest then raise exception 'Business data changed during ID mapping: %',r.table_name; end if;
 end loop;
 if exists(select 1 from public.profiles p left join auth.users u on u.id=p.auth_user_id where u.id is null) then
  raise exception 'Auth identity mapping failed';
 end if;
end $$;
notify pgrst,'reload schema';
commit;

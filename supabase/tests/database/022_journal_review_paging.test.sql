begin;
create extension if not exists pgtap with schema extensions;
set local search_path=extensions,public;
select no_plan();
insert into auth.users(id,instance_id,aud,role,email,raw_user_meta_data)
values('ce210000-0000-4000-8000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','review-pages@example.test','{"name":"Review Reader"}');
insert into public.pickup_locations(id,name) values('ce210000-0000-4000-8000-000000000002','Test pickup');
insert into public.pickup_dates(id,pickup_date) values('ce210000-0000-4000-8000-000000000003','2099-12-01');
insert into public.pickup_windows(id,pickup_date_id,start_time,end_time)
values('ce210000-0000-4000-8000-000000000004','ce210000-0000-4000-8000-000000000003','10:00','11:00');
insert into public.orders(id,order_number,user_id,status,payment_status,customer_name,customer_email,pickup_date,pickup_window_id,pickup_location_id,pickup_window_snapshot,pickup_location_snapshot,subtotal,total,terms_version,terms_accepted_at)
select ('ce220000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'REVIEW-PAGE-'||n,'ce210000-0000-4000-8000-000000000001','COMPLETED','PAID','Review Reader','review-pages@example.test','2099-12-01','ce210000-0000-4000-8000-000000000004','ce210000-0000-4000-8000-000000000002','10–11','Test pickup',40,40,'test',now() from generate_series(1,14)n;
insert into public.reviews(id,user_id,order_id,display_name_snapshot,rating,comment,is_visible,is_featured,created_at)
select ('ce230000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'ce210000-0000-4000-8000-000000000001',('ce220000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'Review Reader',5,'Good',n<=13,n<=13,'2026-10-21T00:00:00Z' from generate_series(1,14)n;
set local role anon;
select is((select count(*) from public.get_public_featured_reviews(null)),13::bigint,'published reviews are not capped at six or twelve');
select is((select count(*) from public.get_public_featured_reviews(6)),6::bigint,'legacy explicit requests remain compatible');
select is((select count(*) from (select * from public.get_public_featured_reviews(null) limit 12 offset 12)p),1::bigint,'a later page remains reachable');
select is((select review_id from public.get_public_featured_reviews(null) limit 1),'ce230000-0000-4000-8000-000000000013'::uuid,'equal timestamps have a stable ID tie-breaker');
select is((select customer_name from public.get_public_featured_reviews(null) limit 1),'Re**** Re****','unlimited paging still masks names');
reset role;
select * from finish();
rollback;

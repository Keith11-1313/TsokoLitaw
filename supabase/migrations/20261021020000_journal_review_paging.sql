-- NULL requests the complete safe projection so PostgREST can page it without
-- a six/twelve-review total ceiling. Explicit legacy limits retain their contract.
-- Preserve masked names, published+featured moderation, snapshots and private paths.
do $migration$
declare definition text;
begin
 select pg_get_functiondef('public.get_public_featured_reviews(integer)'::regprocedure) into definition;
 if position('limit greatest(1, least(coalesce(result_limit, 6), 12))' in definition)=0 then
  raise exception 'Unexpected public review reader definition';
 end if;
 definition:=replace(definition,
  'limit greatest(1, least(coalesce(result_limit, 6), 12))',
  'limit case when result_limit is null then null else greatest(1, least(result_limit, 12)) end');
 definition:=replace(definition,'order by reviews.created_at desc','order by reviews.created_at desc, reviews.id desc');
 execute definition;
end $migration$;

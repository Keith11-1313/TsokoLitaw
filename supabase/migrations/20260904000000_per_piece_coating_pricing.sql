alter table public.coatings
  add column if not exists price_per_piece numeric(10,2),
  add column if not exists is_default boolean not null default false;

update public.coatings
set price_per_piece = additional_type_price
where price_per_piece is null;

alter table public.coatings
  alter column price_per_piece set default 5,
  alter column price_per_piece set not null;

alter table public.coatings
  add constraint coatings_price_per_piece_nonnegative
    check (price_per_piece >= 0),
  add constraint coatings_default_must_be_active
    check (not is_default or is_active);

update public.product_variants
set name = case piece_count
  when 4 then 'TsokoMini (4 pcs)'
  when 6 then 'TsokoMore (6 pcs)'
  when 8 then 'TsokoMuch (8 pcs)'
  else name
end,
updated_at = now()
where piece_count in (4, 6, 8);

update public.coatings set is_default = false where is_default;

update public.coatings
set is_default = true, updated_at = now()
where id = coalesce(
  (select id from public.coatings where slug = 'cocoa' and is_active order by sort_order limit 1),
  (select id from public.coatings where is_active order by sort_order limit 1)
);

create unique index coatings_one_default_idx
  on public.coatings ((is_default))
  where is_default;

create or replace function public.upsert_catalog_coating(
  target_admin_id uuid,
  target_coating_id uuid,
  name_value text,
  description_value text,
  image_url_value text,
  price_per_piece_value numeric,
  active_value boolean,
  default_value boolean
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  saved_id uuid := coalesce(target_coating_id, gen_random_uuid());
  target_coating public.coatings%rowtype;
  normalized_name text := trim(name_value);
  normalized_description text := trim(description_value);
  normalized_image text := trim(image_url_value);
  generated_slug text;
  next_sort integer;
  audit_action text;
begin
  if not exists (select 1 from public.profiles where id = target_admin_id and role = 'admin' and is_active) then
    raise exception 'Active administrator access is required';
  end if;
  if length(normalized_name) < 2 or length(normalized_name) > 80 then raise exception 'Coating name must contain between 2 and 80 characters'; end if;
  if length(normalized_description) < 10 or length(normalized_description) > 300 then raise exception 'Coating description must contain between 10 and 300 characters'; end if;
  if normalized_image = '' or length(normalized_image) > 1000 then raise exception 'Coating image is required'; end if;
  if price_per_piece_value is null or price_per_piece_value < 0 or price_per_piece_value > 10000 then raise exception 'Coating price is invalid'; end if;
  if default_value and not active_value then raise exception 'The default coating must be available to customers'; end if;

  if target_coating_id is null then
    generated_slug := trim(both '-' from regexp_replace(lower(normalized_name), '[^a-z0-9]+', '-', 'g')) || '-' || left(saved_id::text, 8);
    select coalesce(max(sort_order), 0) + 1 into next_sort from public.coatings;
  else
    select * into target_coating from public.coatings where id = target_coating_id for update;
    if target_coating.id is null then raise exception 'Coating was not found'; end if;
    if target_coating.is_default and (not active_value or not default_value) then
      raise exception 'Choose another default coating before changing this one';
    end if;
  end if;

  if default_value then
    update public.coatings set is_default = false, updated_at = now() where is_default and id <> saved_id;
  end if;

  if target_coating_id is null then
    insert into public.coatings (
      id, name, slug, description, image_url,
      price_per_piece, is_active, is_default, sort_order
    ) values (
      saved_id, normalized_name, generated_slug, normalized_description, normalized_image,
      price_per_piece_value, active_value, default_value, next_sort
    );
    audit_action := 'catalog.coating_created';
  else
    update public.coatings set
      name = normalized_name,
      description = normalized_description,
      image_url = normalized_image,
      price_per_piece = price_per_piece_value,
      is_active = active_value,
      is_default = default_value,
      updated_at = now()
    where id = target_coating_id;
    audit_action := 'catalog.coating_updated';
  end if;

  insert into public.admin_audit_logs (admin_id, action, entity_type, entity_id, metadata)
  values (target_admin_id, audit_action, 'coating', saved_id::text,
    jsonb_build_object('name', normalized_name, 'price_per_piece', price_per_piece_value, 'active', active_value, 'default', default_value));
  return saved_id;
end;
$$;

revoke all on function public.upsert_catalog_coating(uuid,uuid,text,text,text,numeric,boolean,boolean) from public, anon, authenticated;
grant execute on function public.upsert_catalog_coating(uuid,uuid,text,text,text,numeric,boolean,boolean) to service_role;

drop function public.upsert_catalog_coating(uuid,uuid,text,text,text,numeric,boolean,boolean,text);

alter table public.coatings
  drop column additional_type_price,
  drop column is_allergen,
  drop column allergen_note;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('brand-fonts', 'brand-fonts', true, 262144, array['font/woff2'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

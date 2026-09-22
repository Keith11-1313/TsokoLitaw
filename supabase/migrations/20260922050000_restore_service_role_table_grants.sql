-- Restore the server-only privileges expected by Supabase service-role clients.
-- Client roles remain governed by their existing grants and RLS policies.
grant select, insert, update, delete
on all tables in schema public
to service_role;

grant usage, select, update
on all sequences in schema public
to service_role;

alter default privileges for role postgres in schema public
grant select, insert, update, delete on tables to service_role;

alter default privileges for role postgres in schema public
grant usage, select, update on sequences to service_role;

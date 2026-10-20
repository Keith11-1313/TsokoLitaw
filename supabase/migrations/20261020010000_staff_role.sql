-- Commit the enum addition before any function/policy uses the new value.
ALTER TYPE public.profile_role ADD VALUE IF NOT EXISTS 'staff';

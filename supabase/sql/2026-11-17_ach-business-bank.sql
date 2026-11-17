-- BANK (ACH) PAYMENTS FOR HIRES. Run BEFORE merging the feat/ach-payments PR (additive only).
--
-- Organizers pay by bank only when: an admin switched it on (ach_enabled), they linked a BUSINESS
-- account that was verified (ach_bank_status = 'verified'), the hire is under the cap, and they
-- have one paid hire already. All of these columns are private: no grants to anon/authenticated,
-- so only server routes (service role) write them, and the owner reads them through my_profile.

alter table public.profiles
  add column if not exists ach_enabled boolean not null default false,
  add column if not exists ach_bank_status text
    check (ach_bank_status in ('verified', 'needs_review', 'rejected')),
  add column if not exists ach_bank_payment_method_id text,
  add column if not exists ach_bank_mandate_id text,
  add column if not exists ach_bank_name text,
  add column if not exists ach_bank_last4 text,
  add column if not exists ach_bank_holder_type text,
  add column if not exists ach_bank_owner_names text,
  add column if not exists ach_bank_linked_at timestamptz,
  add column if not exists ach_terms_accepted_at timestamptz;

-- my_profile was created with `select *`, which Postgres expands once at creation, so re-create it to
-- include the new columns. Same definition, same grants (create or replace keeps them).
create or replace view public.my_profile as
  select * from public.profiles where id = auth.uid();

-- Applications gain two funding states: 'processing' (bank payment clearing) and 'failed'.
-- If the query below returns a CHECK constraint that limits funding_status, send it over before
-- deploying; it needs 'processing' and 'failed' added.
-- select conname, pg_get_constraintdef(oid) from pg_constraint
-- where conrelid = 'public.applications'::regclass and contype = 'c';

-- Verify: expect 10 rows
-- select column_name from information_schema.columns
-- where table_schema = 'public' and table_name = 'my_profile' and column_name like 'ach\_%';

-- Verify the columns are NOT readable by other users (expect 0 rows):
-- select grantee, column_name from information_schema.column_privileges
-- where table_schema = 'public' and table_name = 'profiles' and column_name like 'ach\_%'
--   and grantee in ('anon', 'authenticated');

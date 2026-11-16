-- AGE CONFIRMATION — PART 1 of 2 (additive). Run BEFORE merging the chore/legal-wording-age-check PR.
-- Users must confirm they're 18+ during profile setup; the time they confirmed is stored here.

alter table public.profiles add column if not exists age_confirmed_at timestamptz;

-- Owner may set it (private column, like accepted_tos_at: not in the public column grants)
grant insert (age_confirmed_at), update (age_confirmed_at) on public.profiles to authenticated;

-- my_profile was created with `select *`, which Postgres expands once at creation, so re-create it to
-- include the new column. Same definition, same grants (create or replace keeps them).
create or replace view public.my_profile as
  select * from public.profiles where id = auth.uid();

-- Verify: expect one row
-- select column_name from information_schema.columns
-- where table_schema = 'public' and table_name = 'my_profile' and column_name = 'age_confirmed_at';

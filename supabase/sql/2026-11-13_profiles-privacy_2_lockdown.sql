-- PROFILES PRIVACY — PART 2 of 2 (lockdown)
-- Run this only AFTER part 1 has run AND the fix/profiles-privacy code is deployed.
-- Server routes use the service role key and are unaffected.

begin;

-- 1. READ: anyone may read public columns only.
--    Private (owner via my_profile / server only): email, phone, accepted_tos_at,
--    stripe_account_id, stripe_customer_id, stripe_subscription_id, referral_code, referred_by.
revoke select on public.profiles from anon, authenticated;
grant select (
  id, role, full_name, company_name, company_website, location, city, state, bio, skills, keywords,
  hourly_rate, years_experience, certifications, will_travel, portfolio_urls, avatar_url,
  is_location_verified, rating, review_count, typical_availability, account_type, plan_tier,
  payouts_enabled, is_private, status, created_at, updated_at
) on public.profiles to anon, authenticated;

-- 2. WRITE: users may only write the fields the profile/setup/terms pages send.
--    Server-only: email, plan_tier, stripe_*, payouts_enabled, rating, review_count,
--    is_location_verified, status, created_at.
revoke insert, update, delete on public.profiles from anon, authenticated;
grant insert (
  id, role, full_name, company_name, company_website, location, city, state, bio, skills, keywords,
  hourly_rate, years_experience, certifications, will_travel, portfolio_urls, avatar_url,
  typical_availability, account_type, phone, accepted_tos_at, is_private, referral_code, referred_by, updated_at
) on public.profiles to authenticated;
grant update (
  id, role, full_name, company_name, company_website, location, city, state, bio, skills, keywords,
  hourly_rate, years_experience, certifications, will_travel, portfolio_urls, avatar_url,
  typical_availability, account_type, phone, accepted_tos_at, is_private, referral_code, referred_by, updated_at
) on public.profiles to authenticated;

-- 3. Policy cleanup: remove duplicates, keep one of each.
drop policy if exists "AuthorizationP" on public.profiles;
drop policy if exists "Public profiles are viewable by everyone." on public.profiles;
drop policy if exists "Public profiles are viewable by everyone" on public.profiles;
-- kept: "Profiles are viewable by everyone" (rows are public; columns are now restricted above)

drop policy if exists "Users can update own profile." on public.profiles;
drop policy if exists "Users can update their own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile" on public.profiles
  for update to authenticated
  using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "Users can insert own profile" on public.profiles;
drop policy if exists "Users can insert their own profile" on public.profiles;
create policy "Users can insert own profile" on public.profiles
  for insert to authenticated
  with check (auth.uid() = id);

commit;

-- ROLLBACK (only if something breaks after running this):
--   grant select, insert, update on public.profiles to anon, authenticated;

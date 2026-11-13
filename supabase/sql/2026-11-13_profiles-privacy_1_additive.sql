-- PROFILES PRIVACY — PART 1 of 2 (additive, safe to run any time)
-- Run this BEFORE deploying the fix/profiles-privacy code. Nothing existing changes.

-- 1. The signed-in user's own full profile row (including private columns).
--    Views run with the owner's privileges by default, so this bypasses the column
--    restrictions added in part 2 — but only ever returns the caller's own row.
create or replace view public.my_profile as
  select * from public.profiles where id = auth.uid();

-- Read-only: without this, Supabase's default grants would let users UPDATE through
-- the view and bypass the column restrictions (e.g. set their own plan_tier).
revoke all on public.my_profile from public, anon, authenticated;
grant select on public.my_profile to authenticated;

-- 2. Invite-code lookup for setup-profile (referral_code is private).
create or replace function public.lookup_referrer(code text)
returns uuid
language sql stable security definer set search_path = public
as $$
  select id from public.profiles where referral_code = code limit 1
$$;
revoke all on function public.lookup_referrer(text) from public, anon;
grant execute on function public.lookup_referrer(text) to authenticated;

-- 3. Email/phone of contractors the calling organizer has HIRED (used by the roster page).
create or replace function public.hired_contractor_contacts()
returns table (id uuid, email text, phone text)
language sql stable security definer set search_path = public
as $$
  select distinct p.id, p.email, p.phone
  from public.profiles p
  join public.applications a on a.applicant_id = p.id
  join public.jobs j on j.id = a.job_id
  where j.organizer_id = auth.uid()
    and a.status = 'approved'
$$;
revoke all on function public.hired_contractor_contacts() from public, anon;
grant execute on function public.hired_contractor_contacts() to authenticated;

-- RLS / grant hardening for every public table (audit of 2026-11-15).
-- Safe to run before the chore/schema-ci-ledger PR is merged: it only removes access the app
-- doesn't use. The notifications INSERT lockdown is in a separate file to run AFTER the merge.
-- Server routes use the service role, which bypasses all of this.

begin;

-- ===================================================================
-- 0. Logged-out visitors never write. Nobody needs TRUNCATE/TRIGGER/REFERENCES.
-- ===================================================================
revoke insert, update, delete, truncate, references, trigger on all tables in schema public from anon;
revoke truncate, references, trigger on all tables in schema public from authenticated;

-- ===================================================================
-- 1. reviews: anyone could rewrite any review ("Users can flag reviews" = true/true)
-- ===================================================================
revoke update, delete on public.reviews from authenticated;
grant update (status, report_reason) on public.reviews to authenticated;

drop policy if exists "Users can flag reviews" on public.reviews;
create policy "Users can flag reviews" on public.reviews
  for update to authenticated
  using (true)
  with check (status = 'flagged');           -- flagging only; 'removed' etc. is admin-only

-- Reviews only between the two parties of a hire (organizer <-> approved contractor on that job)
drop policy if exists "Users can write reviews" on public.reviews;
create policy "Users can write reviews" on public.reviews
  for insert to authenticated
  with check (
    auth.uid() = reviewer_id
    and reviewer_id <> reviewee_id
    and exists (
      select 1 from public.applications a
      join public.jobs j on j.id = a.job_id
      where a.job_id = reviews.job_id
        and a.status = 'approved'
        and (
          (a.applicant_id = auth.uid() and j.organizer_id = reviews.reviewee_id)
          or (j.organizer_id = auth.uid() and a.applicant_id = reviews.reviewee_id)
        )
    )
  );

do $$ begin
  alter table public.reviews add constraint reviews_rating_range check (rating between 1 and 5) not valid;
exception when duplicate_object then null; end $$;

-- ===================================================================
-- 2. jobs: any logged-in user could update any job; legacy client/employer policies
-- ===================================================================
drop policy if exists "Workers can apply to jobs" on public.jobs;
drop policy if exists "Clients can manage their own jobs" on public.jobs;
drop policy if exists "Clients can update own jobs" on public.jobs;
drop policy if exists "Users can create jobs" on public.jobs;
drop policy if exists "Users can insert own jobs" on public.jobs;
drop policy if exists "Users can update own jobs" on public.jobs;
drop policy if exists "Users can delete own jobs" on public.jobs;
-- duplicate read policies (keep "Jobs are viewable by everyone")
drop policy if exists "Anyone can view jobs" on public.jobs;
drop policy if exists "Everyone can see jobs" on public.jobs;
drop policy if exists "Public can view open jobs" on public.jobs;
drop policy if exists "Public read access" on public.jobs;
drop policy if exists "jobs are viewable by authenticated users" on public.jobs;

drop policy if exists "Organizers can update own jobs" on public.jobs;
create policy "Organizers can update own jobs" on public.jobs
  for update to authenticated
  using (auth.uid() = organizer_id)
  with check (auth.uid() = organizer_id);   -- can't hand a job to someone else

-- Organizers can only create jobs on their own events, as themselves
drop policy if exists "Organizers can create jobs" on public.jobs;
create policy "Organizers can create jobs" on public.jobs
  for insert to authenticated
  with check (
    auth.uid() = organizer_id
    and exists (select 1 from public.events e where e.id = jobs.event_id and e.organizer_id = auth.uid())
  );

-- ===================================================================
-- 3. applications: contractors could insert as hired/funded; organizers could edit funding fields
--    Funding/payment columns are written only by the server (webhook / payout routes).
-- ===================================================================
revoke insert, update, delete on public.applications from authenticated;
grant insert (job_id, applicant_id, status) on public.applications to authenticated;
grant update (status, actual_hours) on public.applications to authenticated;

drop policy if exists "Users can apply" on public.applications;
drop policy if exists "Contractors can apply" on public.applications;
create policy "Contractors can apply" on public.applications
  for insert to authenticated
  with check (
    auth.uid() = applicant_id
    and status = 'pending'
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('contractor', 'worker')
    )
  );

drop policy if exists "Organizers can update status" on public.applications;
create policy "Organizers can update status" on public.applications
  for update to authenticated
  using (exists (select 1 from public.jobs j where j.id = applications.job_id and j.organizer_id = auth.uid()))
  with check (exists (select 1 from public.jobs j where j.id = applications.job_id and j.organizer_id = auth.uid()));

-- ===================================================================
-- 4. messages: anyone could post into any conversation; participants could edit others' messages
-- ===================================================================
drop policy if exists "Users can send messages" on public.messages;   -- keep "Users can post to conversation"
drop policy if exists "Users can view messages" on public.messages;    -- duplicate of "Users can read conversation messages"
revoke update, delete on public.messages from authenticated;
grant update (is_read) on public.messages to authenticated;

-- ===================================================================
-- 5. conversations / event_invitations / notifications: limit what can be edited
-- ===================================================================
revoke update, delete on public.conversations from authenticated;

revoke update, delete on public.event_invitations from authenticated;
grant update (status) on public.event_invitations to authenticated;
drop policy if exists "Talent can see their own invites" on public.event_invitations;  -- duplicate

revoke update, delete on public.notifications from authenticated;
grant update (is_read) on public.notifications to authenticated;
drop policy if exists "Users can mark as read" on public.notifications;
create policy "Users can mark as read" on public.notifications
  for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ===================================================================
-- 6. events: duplicate catch-all policies (one let contractors create events)
-- ===================================================================
drop policy if exists "Owners can see their own events" on public.events;
drop policy if exists "Users can manage their own events" on public.events;
drop policy if exists "Anyone can view events" on public.events;       -- covered by "Public can view events"
drop policy if exists "Public events are viewable" on public.events;   -- covered by "Public can view events"

drop policy if exists "Organizers can update own events" on public.events;
create policy "Organizers can update own events" on public.events
  for update to authenticated
  using (auth.uid() = organizer_id) with check (auth.uid() = organizer_id);

-- ===================================================================
-- 7. profiles: leftovers the 2026-11-13 lockdown meant to drop
-- ===================================================================
drop policy if exists "AuthorizationP" on public.profiles;
drop policy if exists "Public profiles are viewable by everyone" on public.profiles;
drop policy if exists "Public profiles are viewable by everyone." on public.profiles;
drop policy if exists "Users can update own profile." on public.profiles;
drop policy if exists "Users can update their own profile" on public.profiles;
drop policy if exists "Users can insert their own profile" on public.profiles;
drop policy if exists "profiles_select_deny" on public.profiles;
drop policy if exists "profiles_insert_deny" on public.profiles;
drop policy if exists "profiles_update_deny" on public.profiles;
drop policy if exists "profiles_delete_deny" on public.profiles;
drop policy if exists "profiles_select_own_rows" on public.profiles;
drop policy if exists "profiles_insert_own_rows" on public.profiles;
drop policy if exists "profiles_update_own_rows" on public.profiles;
drop policy if exists "profiles_delete_own_rows" on public.profiles;

-- ===================================================================
-- 8. payouts_ledger: unused by the app; server only
-- ===================================================================
revoke all on public.payouts_ledger from anon, authenticated;

commit;

-- Verify (expect 0 rows): any table where anon can still write
-- select table_name, privilege_type from information_schema.role_table_grants
-- where table_schema = 'public' and grantee = 'anon' and privilege_type <> 'SELECT';

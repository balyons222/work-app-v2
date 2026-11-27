-- COMPLETED JOBS COUNT on contractor profiles
-- Run this BEFORE deploying the feat/completed-jobs code: the app selects profiles.completed_jobs,
-- and that select fails until the column exists. Safe to run more than once.
--
-- "Completed" = an application whose payment was released (applications.payment_status = 'paid',
-- set by /api/stripe/payout). Hired-but-cancelled jobs never count.
--
-- Why a stored column: applications RLS only lets users read rows they're party to, so an organizer
-- can't count another contractor's jobs from the browser. The trigger keeps this column in sync.

begin;

-- 1. The column. Public to read (like rating/review_count); no user write grant, so only the
--    trigger and the service role can change it.
alter table public.profiles add column if not exists completed_jobs integer not null default 0;
grant select (completed_jobs) on public.profiles to anon, authenticated;

-- 2. Recount for the affected contractor whenever an application is paid, un-paid, moved or removed.
--    Recounting (instead of +1) keeps the number right through refunds, edits and deletes.
create or replace function public.sync_completed_jobs()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  ids uuid[];
  uid uuid;
begin
  if tg_op = 'INSERT' then
    ids := array[new.applicant_id];
  elsif tg_op = 'DELETE' then
    ids := array[old.applicant_id];
  else
    ids := array[old.applicant_id, new.applicant_id];
  end if;

  foreach uid in array ids loop
    if uid is not null then
      update public.profiles p
         set completed_jobs = (
           select count(*) from public.applications a
            where a.applicant_id = uid and lower(a.payment_status) = 'paid'
         )
       where p.id = uid;
    end if;
  end loop;

  return null;
end;
$$;

revoke all on function public.sync_completed_jobs() from public, anon, authenticated;

drop trigger if exists applications_sync_completed_jobs on public.applications;
create trigger applications_sync_completed_jobs
  after insert or delete or update of payment_status, applicant_id on public.applications
  for each row execute function public.sync_completed_jobs();

-- 3. One-time backfill from the jobs already paid.
update public.profiles p
   set completed_jobs = c.n
  from (
    select applicant_id, count(*)::int as n
      from public.applications
     where lower(payment_status) = 'paid'
     group by applicant_id
  ) c
 where p.id = c.applicant_id;

commit;

-- VERIFY (run separately): contractors with completed jobs, highest first.
-- select id, full_name, completed_jobs from public.profiles where completed_jobs > 0 order by completed_jobs desc;

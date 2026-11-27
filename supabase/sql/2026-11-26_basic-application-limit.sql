-- BASIC PLAN APPLICATION LIMIT, enforced in the database
-- Run this BEFORE deploying the feat/plan-benefits code: the app no longer checks the limit in the
-- browser, so until this runs there is no limit at all. Safe to run more than once.
--
-- Rule (matches the Pricing page): Basic contractors can send 3 applications per calendar month (UTC).
-- Applications to jobs they were invited to don't count, either to the role or to the whole event.
-- Contractor Pro (plan_tier = 'contractor') is unlimited.
-- Keep the 3 in sync with BASIC_MONTHLY_APPLICATIONS in src/config/subscriptions.ts.

begin;

create or replace function public.enforce_basic_application_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  monthly_limit constant int := 3;
  tier text;
  used int;
begin
  -- Server-side inserts (service role) are never limited
  if coalesce(auth.jwt() ->> 'role', '') = 'service_role' then
    return new;
  end if;

  select plan_tier into tier from public.profiles where id = new.applicant_id;
  if tier = 'contractor' then
    return new;
  end if;

  -- Invited to this role, or to the whole event: doesn't count
  if exists (
    select 1
      from public.event_invitations i
      join public.jobs j on j.id = new.job_id
     where i.invitee_id = new.applicant_id
       and (i.job_id = new.job_id or (i.job_id is null and i.event_id = j.event_id))
  ) then
    return new;
  end if;

  select count(*) into used
    from public.applications a
    join public.jobs j on j.id = a.job_id
   where a.applicant_id = new.applicant_id
     and a.created_at >= date_trunc('month', now())
     and not exists (
       select 1 from public.event_invitations i
        where i.invitee_id = a.applicant_id
          and (i.job_id = a.job_id or (i.job_id is null and i.event_id = j.event_id))
     );

  if used >= monthly_limit then
    raise exception 'MONTHLY_APPLICATION_LIMIT: Basic accounts can send % applications a month', monthly_limit;
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_basic_application_limit() from public, anon, authenticated;

drop trigger if exists applications_basic_limit on public.applications;
create trigger applications_basic_limit
  before insert on public.applications
  for each row execute function public.enforce_basic_application_limit();

commit;

-- VERIFY (run separately): the trigger exists.
-- select tgname from pg_trigger where tgrelid = 'public.applications'::regclass and tgname = 'applications_basic_limit';

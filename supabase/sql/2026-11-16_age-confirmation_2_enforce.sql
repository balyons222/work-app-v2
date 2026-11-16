-- AGE CONFIRMATION — PART 2 of 2. Run AFTER the chore/legal-wording-age-check PR is merged and deployed.
-- (Before that, the live setup page doesn't send age_confirmed_at, so new sign-ups would be blocked.)
--
-- A user can't choose an account type (contractor/organizer) until they've confirmed they're 18+,
-- and can't clear the confirmation afterwards. Existing users keep working; the setup page asks
-- them to confirm the next time they edit their profile. Server routes (service role) and the SQL
-- editor are exempt, as with the role lock.

create or replace function public.require_age_confirmation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if coalesce(auth.role(), '') not in ('authenticated', 'anon') then
    return new;
  end if;

  if tg_op = 'UPDATE' and old.age_confirmed_at is not null and new.age_confirmed_at is null then
    raise exception 'Age confirmation cannot be removed.' using errcode = '42501';
  end if;

  if nullif(new.role, '') is not null
     and (tg_op = 'INSERT' or nullif(old.role, '') is null)
     and new.age_confirmed_at is null then
    raise exception 'You must confirm you are 18 or older to use FxD Events.' using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_require_age on public.profiles;
create trigger profiles_require_age
  before insert or update of role, age_confirmed_at on public.profiles
  for each row execute function public.require_age_confirmation();

-- Verify: expect one row
-- select tgname from pg_trigger where tgrelid = 'public.profiles'::regclass and tgname = 'profiles_require_age';

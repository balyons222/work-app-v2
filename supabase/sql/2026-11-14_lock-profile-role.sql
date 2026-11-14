-- Lock profiles.role once it's set. Users choose their account type during setup;
-- after that only the server (service role) or the SQL editor can change it.
--
-- auth.role() is the request's JWT role: 'authenticated'/'anon' from the browser,
-- 'service_role' from server routes, NULL in the SQL editor.

create or replace function public.prevent_profile_role_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if nullif(old.role, '') is not null
     and new.role is distinct from old.role
     and coalesce(auth.role(), '') in ('authenticated', 'anon') then
    raise exception 'Account type cannot be changed. Please contact support.'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_lock_role on public.profiles;
create trigger profiles_lock_role
  before update of role on public.profiles
  for each row execute function public.prevent_profile_role_change();

-- Support: change someone's account type from the SQL editor (allowed, since auth.role() is NULL here).
-- Check first that they have no open jobs, funded escrow, or active subscription.
--   update public.profiles set role = 'contractor' where id = '<user id>';

-- Verify: expect one row
-- select tgname from pg_trigger where tgrelid = 'public.profiles'::regclass and tgname = 'profiles_lock_role';

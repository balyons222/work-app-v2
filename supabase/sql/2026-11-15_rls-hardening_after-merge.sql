-- Run AFTER the chore/schema-ci-ledger PR is merged and deployed.
-- Before that PR, the browser inserts notifications directly; after it, only /api/notify
-- (service role) does. This removes "anyone can insert a notification for anyone".

begin;
drop policy if exists "System can insert notifications" on public.notifications;
drop policy if exists "Users can insert notifications for others" on public.notifications;
revoke insert on public.notifications from anon, authenticated;
commit;

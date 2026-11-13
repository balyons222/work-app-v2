-- Payout ledger: one row per released escrow, written by /api/stripe/payout (service role).
-- The route has been inserting here since escrow release was added, but the table never existed,
-- so no ledger rows were recorded. Stripe transfers/charges remain the source of truth for money moved.
--
-- Foreign keys use ON DELETE SET NULL so the financial record survives (and never blocks)
-- deleting a user, job, or application.

create table if not exists public.payouts (
  id                       uuid primary key default gen_random_uuid(),
  application_id           uuid unique references public.applications(id) on delete set null,
  job_id                   uuid references public.jobs(id)     on delete set null,
  contractor_id            uuid references public.profiles(id) on delete set null,
  organizer_id             uuid references public.profiles(id) on delete set null,
  stripe_payment_intent_id text,
  stripe_transfer_id       text unique,
  gross_amount             numeric(12,2) not null,  -- labor paid out + platform fee retained
  platform_fee             numeric(12,2) not null,  -- fee kept on labor actually paid
  net_amount               numeric(12,2) not null,  -- received by contractor
  status                   text not null default 'completed',
  created_at               timestamptz not null default now()
);

create index if not exists payouts_contractor_id_idx on public.payouts (contractor_id);
create index if not exists payouts_organizer_id_idx  on public.payouts (organizer_id);

-- Only the server (service role, which bypasses RLS) writes. Users may read rows they're party to.
alter table public.payouts enable row level security;
revoke all on public.payouts from anon, authenticated;
grant select on public.payouts to authenticated;

drop policy if exists "Parties can view their payouts" on public.payouts;
create policy "Parties can view their payouts" on public.payouts
  for select to authenticated
  using (auth.uid() = contractor_id or auth.uid() = organizer_id);

-- Verify: expect one row, rls_enabled = true
-- select relname, relrowsecurity as rls_enabled from pg_class where oid = 'public.payouts'::regclass;

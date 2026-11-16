-- Switching Stripe from test to live mode: Stripe IDs saved while the site used test keys point
-- to test-mode objects, and live keys fail with "No such customer ... exists in test mode".
--
-- Live activity has already happened, so nothing here resets rows in bulk. Clear only the IDs
-- you've confirmed are test-mode: search the ID in the Stripe dashboard with Test mode OFF.
-- Not found in live (but found with Test mode ON) = test-mode, safe to clear.
--
-- Contractor payout accounts (stripe_account_id) need nothing: the onboarding route replaces a
-- test-mode account automatically the next time the contractor clicks "Set up payouts".

-- ---------------------------------------------------------------
-- Step 1 (look first)
-- ---------------------------------------------------------------
-- select email, role, plan_tier, stripe_customer_id, stripe_subscription_id, stripe_account_id
-- from public.profiles
-- where stripe_customer_id is not null or stripe_subscription_id is not null
--    or stripe_account_id is not null
-- order by email;
--
-- select a.id, j.title, a.funding_status, a.payment_status, a.funded_amount_cents,
--        a.stripe_payment_intent_id
-- from public.applications a join public.jobs j on j.id = a.job_id
-- where a.funding_status = 'funded' and coalesce(a.payment_status, '') <> 'paid';

-- ---------------------------------------------------------------
-- Step 2: clear confirmed test-mode IDs only (fill in the lists)
-- ---------------------------------------------------------------
begin;

-- Test-mode subscriptions: back to the free tier so the user can subscribe for real.
update public.profiles
set plan_tier = 'basic', stripe_customer_id = null, stripe_subscription_id = null
where stripe_customer_id in ('cus_TESTMODE_ID_HERE');

-- Escrow funded with a test card (payment intent not found in live mode): back to unfunded.
update public.applications
set funding_status = null, funded_amount_cents = null, funded_labor_cents = null,
    stripe_payment_intent_id = null, stripe_charge_id = null, payment_method = null
where stripe_payment_intent_id in ('pi_TESTMODE_ID_HERE')
  and coalesce(payment_status, '') <> 'paid';

commit;

// Single source of truth: which Stripe price grants which plan_tier.
// The server (subscribe route + webhook) decides the tier from the PRICE, never from
// anything the browser sends. Add new prices here when you create them in Stripe.

// Prices offered on the Pricing page today.
export const CONTRACTOR_PRO_PRICE_ID = 'price_1UaJTTPzkSWzkzs9RpK2s3OB' // $19/month
export const ORGANIZER_HUB_PRICE_ID = 'price_1UdEYEPzkSWzkzs9wwWjiWJ3' // $149/month

export const PRICE_TO_TIER: Record<string, 'contractor' | 'organizer'> = {
  [CONTRACTOR_PRO_PRICE_ID]: 'contractor',
  [ORGANIZER_HUB_PRICE_ID]: 'organizer',
  // Legacy $49/month Organizer Hub price. No longer offered, but existing subscribers stay on it,
  // so their renewals must keep mapping to the organizer tier.
  price_1UaJTbPzkSWzkzs9cSeQjR0R: 'organizer',
}

export function tierForPrice(priceId: string | null | undefined) {
  return priceId ? PRICE_TO_TIER[priceId] ?? null : null
}

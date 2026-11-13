// Single source of truth: which Stripe price grants which plan_tier.
// The server (subscribe route + webhook) decides the tier from the PRICE, never from
// anything the browser sends. Add new prices here when you create them in Stripe.
export const PRICE_TO_TIER: Record<string, 'contractor' | 'organizer'> = {
  price_1UaJTTPzkSWzkzs9RpK2s3OB: 'contractor',
  price_1UaJTbPzkSWzkzs9cSeQjR0R: 'organizer',
}

export function tierForPrice(priceId: string | null | undefined) {
  return priceId ? PRICE_TO_TIER[priceId] ?? null : null
}

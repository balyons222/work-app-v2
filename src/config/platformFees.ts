// Platform fee charged to the ORGANIZER on top of labor when funding escrow.
// The contractor always receives 100% of the labor amount.
export const BASIC_FEE_RATE = 0.15   // Basic organizers
export const PRO_HUB_FEE_RATE = 0.10 // Pro Hub organizers

const PRO_HUB_TIERS = ['organizer', 'organizer_pro']

export function platformFeeRate(planTier: string | null | undefined): number {
  return planTier && PRO_HUB_TIERS.includes(planTier) ? PRO_HUB_FEE_RATE : BASIC_FEE_RATE
}

export function feePercentLabel(planTier: string | null | undefined): string {
  return `${Math.round(platformFeeRate(planTier) * 100)}%`
}

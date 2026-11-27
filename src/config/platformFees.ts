import { isOrganizerHub } from '@/src/config/subscriptions'

// Platform fee charged to the ORGANIZER on top of labor when funding escrow.
// The contractor always receives 100% of the labor amount.
// Changing a rate affects only hires funded after the change; funded hires keep the fee they were charged.
export const BASIC_FEE_RATE = 0.18   // Basic organizers
export const PRO_HUB_FEE_RATE = 0.12 // Organizer Hub organizers


export function platformFeeRate(planTier: string | null | undefined): number {
  return isOrganizerHub(planTier) ? PRO_HUB_FEE_RATE : BASIC_FEE_RATE
}

export function feePercentLabel(planTier: string | null | undefined): string {
  return `${Math.round(platformFeeRate(planTier) * 100)}%`
}

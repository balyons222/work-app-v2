export const PLAN_LIMITS = {
  // --- REAL DATABASE TIERS ---
  basic: {
    maxImages: 3,
    canSeeAnalytics: false,
    canHeadhunt: false,
    jobPostsPerMonth: 1
  },
  contractor: { // This is your Pro Contractor tier!
    maxImages: 10,
    canSeeAnalytics: true,
    canHeadhunt: false,
    jobPostsPerMonth: 0
  },
  organizer: { // Organizer Hub — the tier name the pricing page/webhook actually store
    maxImages: 10,
    canSeeAnalytics: true,
    canHeadhunt: true,
    jobPostsPerMonth: 999 // Unlimited
  },
  organizer_pro: { // Same as 'organizer'; kept for any older rows using this name
    maxImages: 10,
    canSeeAnalytics: true,
    canHeadhunt: true,
    jobPostsPerMonth: 999 // Unlimited
  },

  // --- LEGACY/FALLBACK TIERS ---
  free: {
    maxImages: 3,
    canSeeAnalytics: false,
    canHeadhunt: false,
    jobPostsPerMonth: 1
  },
  pro: {
    maxImages: 10,
    canSeeAnalytics: true,
    canHeadhunt: false,
    jobPostsPerMonth: 5
  },
  premium: {
    maxImages: 20,
    canSeeAnalytics: true,
    canHeadhunt: true,
    jobPostsPerMonth: 999 
  }
}

// Define the valid keys based on the object above
export type PlanTier = keyof typeof PLAN_LIMITS;

// Utility function to use throughout your app
export function getPlanLimits(userPlanTier: string | null | undefined) {
  // Check if the provided tier exists in our config; if not, default to 'basic'
  const tier = userPlanTier && userPlanTier in PLAN_LIMITS 
    ? (userPlanTier as PlanTier) 
    : 'basic';
    
  return PLAN_LIMITS[tier];
}

// Basic (free) contractors can send this many applications per calendar month.
// Applications to jobs they were invited to don't count. Contractor Pro is unlimited.
// Used by the apply flow, the Pricing page and the help guide.
export const BASIC_MONTHLY_APPLICATIONS = 3

// Monthly plan prices in USD, as shown to users. The amount actually charged comes from
// the Stripe price (see stripePrices.ts); keep these in sync when prices change.
export const CONTRACTOR_PRO_MONTHLY_USD = 19
export const ORGANIZER_HUB_MONTHLY_USD = 49

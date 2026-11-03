export const PLAN_LIMITS = {
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
    jobPostsPerMonth: 999 // Representing unlimited
  }
}

// Define the valid keys based on the object above ('free' | 'pro' | 'premium')
export type PlanTier = keyof typeof PLAN_LIMITS;

// Utility function to use throughout your app
export function getPlanLimits(userPlanTier: string | null | undefined) {
  // Check if the provided tier exists in our config; if not, default to 'free'
  const tier = userPlanTier && userPlanTier in PLAN_LIMITS 
    ? (userPlanTier as PlanTier) 
    : 'free';
    
  return PLAN_LIMITS[tier];
}
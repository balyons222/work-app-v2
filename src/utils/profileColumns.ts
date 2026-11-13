// Columns of `profiles` that any visitor may read (see supabase/sql/*profiles-privacy*.sql).
// Private columns (email, phone, accepted_tos_at, stripe_*, referral_code, referred_by) are only
// readable by the owner through the `my_profile` view, or server-side with the service role key.
// Single string literal (not concatenated) so supabase-js can infer row types from it
export const PUBLIC_PROFILE_COLUMNS = 'id, role, full_name, company_name, company_website, location, city, state, bio, skills, keywords, hourly_rate, years_experience, certifications, will_travel, portfolio_urls, avatar_url, is_location_verified, rating, review_count, typical_availability, account_type, plan_tier, payouts_enabled, is_private, status, created_at, updated_at' as const

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      applications: {
        Row: {
          actual_hours: number | null
          applicant_id: string
          created_at: string
          funded_amount_cents: number | null
          funded_labor_cents: number | null
          funding_status: string | null
          id: string
          job_id: string
          payment_method: string | null
          payment_status: string | null
          status: string | null
          stripe_charge_id: string | null
          stripe_payment_intent_id: string | null
          stripe_transfer_id: string | null
        }
        Insert: {
          actual_hours?: number | null
          applicant_id: string
          created_at?: string
          funded_amount_cents?: number | null
          funded_labor_cents?: number | null
          funding_status?: string | null
          id?: string
          job_id: string
          payment_method?: string | null
          payment_status?: string | null
          status?: string | null
          stripe_charge_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_transfer_id?: string | null
        }
        Update: {
          actual_hours?: number | null
          applicant_id?: string
          created_at?: string
          funded_amount_cents?: number | null
          funded_labor_cents?: number | null
          funding_status?: string | null
          id?: string
          job_id?: string
          payment_method?: string | null
          payment_status?: string | null
          status?: string | null
          stripe_charge_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_transfer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "applications_applicant_id_fkey"
            columns: ["applicant_id"]
            isOneToOne: false
            referencedRelation: "my_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_applicant_id_fkey"
            columns: ["applicant_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          application_id: string | null
          created_at: string
          id: string
          job_id: string | null
          organizer_id: string | null
          updated_at: string
          worker_id: string | null
        }
        Insert: {
          application_id?: string | null
          created_at?: string
          id?: string
          job_id?: string | null
          organizer_id?: string | null
          updated_at?: string
          worker_id?: string | null
        }
        Update: {
          application_id?: string | null
          created_at?: string
          id?: string
          job_id?: string | null
          organizer_id?: string | null
          updated_at?: string
          worker_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversations_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: true
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "my_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "my_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      event_invitations: {
        Row: {
          created_at: string | null
          event_id: string | null
          id: string
          invitee_id: string | null
          job_id: string | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          event_id?: string | null
          id?: string
          invitee_id?: string | null
          job_id?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          event_id?: string | null
          id?: string
          invitee_id?: string | null
          job_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_invitations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_invitations_invitee_id_fkey"
            columns: ["invitee_id"]
            isOneToOne: false
            referencedRelation: "my_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_invitations_invitee_id_fkey"
            columns: ["invitee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_invitations_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          budget: number | null
          created_at: string | null
          description: string | null
          event_date: string
          id: string
          invite_only: boolean | null
          location: string
          organizer_id: string
          poc_name: string | null
          poc_phone: string | null
          title: string
          visibility: string | null
          website: string | null
        }
        Insert: {
          budget?: number | null
          created_at?: string | null
          description?: string | null
          event_date: string
          id?: string
          invite_only?: boolean | null
          location: string
          organizer_id: string
          poc_name?: string | null
          poc_phone?: string | null
          title: string
          visibility?: string | null
          website?: string | null
        }
        Update: {
          budget?: number | null
          created_at?: string | null
          description?: string | null
          event_date?: string
          id?: string
          invite_only?: boolean | null
          location?: string
          organizer_id?: string
          poc_name?: string | null
          poc_phone?: string | null
          title?: string
          visibility?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "my_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          agreement_status: string | null
          agreement_text: string | null
          applicants: string[] | null
          budget: number | null
          client_id: string | null
          created_at: string
          description: string | null
          dispute_opened_by: string | null
          dispute_reason: string | null
          employer_id: string | null
          end_date: string | null
          end_time: string | null
          estimated_hours: number | null
          event_id: string | null
          id: string
          job_role: string | null
          location: string | null
          mediation_report: string | null
          organizer_id: string | null
          payment_status: string | null
          price: number | null
          rate: number | null
          rate_type: string | null
          signed_by_client: boolean | null
          signed_by_worker: boolean | null
          start_date: string | null
          start_time: string | null
          status: string | null
          title: string
          user_id: string | null
          worker_id: string | null
        }
        Insert: {
          agreement_status?: string | null
          agreement_text?: string | null
          applicants?: string[] | null
          budget?: number | null
          client_id?: string | null
          created_at?: string
          description?: string | null
          dispute_opened_by?: string | null
          dispute_reason?: string | null
          employer_id?: string | null
          end_date?: string | null
          end_time?: string | null
          estimated_hours?: number | null
          event_id?: string | null
          id?: string
          job_role?: string | null
          location?: string | null
          mediation_report?: string | null
          organizer_id?: string | null
          payment_status?: string | null
          price?: number | null
          rate?: number | null
          rate_type?: string | null
          signed_by_client?: boolean | null
          signed_by_worker?: boolean | null
          start_date?: string | null
          start_time?: string | null
          status?: string | null
          title: string
          user_id?: string | null
          worker_id?: string | null
        }
        Update: {
          agreement_status?: string | null
          agreement_text?: string | null
          applicants?: string[] | null
          budget?: number | null
          client_id?: string | null
          created_at?: string
          description?: string | null
          dispute_opened_by?: string | null
          dispute_reason?: string | null
          employer_id?: string | null
          end_date?: string | null
          end_time?: string | null
          estimated_hours?: number | null
          event_id?: string | null
          id?: string
          job_role?: string | null
          location?: string | null
          mediation_report?: string | null
          organizer_id?: string | null
          payment_status?: string | null
          price?: number | null
          rate?: number | null
          rate_type?: string | null
          signed_by_client?: boolean | null
          signed_by_worker?: boolean | null
          start_date?: string | null
          start_time?: string | null
          status?: string | null
          title?: string
          user_id?: string | null
          worker_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "jobs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "my_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_dispute_opened_by_fkey"
            columns: ["dispute_opened_by"]
            isOneToOne: false
            referencedRelation: "my_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_dispute_opened_by_fkey"
            columns: ["dispute_opened_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "my_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "my_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          conversation_id: string | null
          created_at: string
          id: string
          is_read: boolean | null
          sender_id: string | null
        }
        Insert: {
          content: string
          conversation_id?: string | null
          created_at?: string
          id?: string
          is_read?: boolean | null
          sender_id?: string | null
        }
        Update: {
          content?: string
          conversation_id?: string | null
          created_at?: string
          id?: string
          is_read?: boolean | null
          sender_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "my_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          is_read: boolean | null
          link: string | null
          message: string | null
          title: string
          type: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          link?: string | null
          message?: string | null
          title: string
          type?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          link?: string | null
          message?: string | null
          title?: string
          type?: string | null
          user_id?: string
        }
        Relationships: []
      }
      payouts: {
        Row: {
          id: string
          application_id: string | null
          job_id: string | null
          contractor_id: string | null
          organizer_id: string | null
          stripe_payment_intent_id: string | null
          stripe_transfer_id: string | null
          gross_amount: number
          platform_fee: number
          net_amount: number
          status: string
          created_at: string
        }
        Insert: {
          id?: string
          application_id?: string | null
          job_id?: string | null
          contractor_id?: string | null
          organizer_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_transfer_id?: string | null
          gross_amount: number
          platform_fee: number
          net_amount: number
          status?: string
          created_at?: string
        }
        Update: {
          id?: string
          application_id?: string | null
          job_id?: string | null
          contractor_id?: string | null
          organizer_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_transfer_id?: string | null
          gross_amount?: number
          platform_fee?: number
          net_amount?: number
          status?: string
          created_at?: string
        }
        Relationships: []
      }
      payouts_ledger: {
        Row: {
          account_id: string
          amount: number
          balance_after: number
          created_at: string
          currency: string
          direction: string
          id: number
          metadata: Json
          payout_id: string
          reference_id: string | null
          reference_type: string | null
        }
        Insert: {
          account_id: string
          amount: number
          balance_after: number
          created_at?: string
          currency: string
          direction: string
          id?: number
          metadata?: Json
          payout_id: string
          reference_id?: string | null
          reference_type?: string | null
        }
        Update: {
          account_id?: string
          amount?: number
          balance_after?: number
          created_at?: string
          currency?: string
          direction?: string
          id?: number
          metadata?: Json
          payout_id?: string
          reference_id?: string | null
          reference_type?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          accepted_tos_at: string | null
          account_type: string | null
          avatar_url: string | null
          bio: string | null
          certifications: string | null
          city: string | null
          company_name: string | null
          company_website: string | null
          created_at: string
          email: string
          full_name: string | null
          hourly_rate: number | null
          id: string
          is_location_verified: boolean | null
          is_private: boolean | null
          keywords: string | null
          location: string | null
          payouts_enabled: boolean | null
          phone: string | null
          plan_tier: string | null
          portfolio_urls: string[] | null
          rating: number | null
          referral_code: string | null
          referred_by: string | null
          review_count: number | null
          role: string | null
          skills: string[] | null
          state: string | null
          status: string | null
          stripe_account_id: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          typical_availability: string | null
          updated_at: string
          will_travel: boolean | null
          years_experience: number | null
        }
        Insert: {
          accepted_tos_at?: string | null
          account_type?: string | null
          avatar_url?: string | null
          bio?: string | null
          certifications?: string | null
          city?: string | null
          company_name?: string | null
          company_website?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          hourly_rate?: number | null
          id: string
          is_location_verified?: boolean | null
          is_private?: boolean | null
          keywords?: string | null
          location?: string | null
          payouts_enabled?: boolean | null
          phone?: string | null
          plan_tier?: string | null
          portfolio_urls?: string[] | null
          rating?: number | null
          referral_code?: string | null
          referred_by?: string | null
          review_count?: number | null
          role?: string | null
          skills?: string[] | null
          state?: string | null
          status?: string | null
          stripe_account_id?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          typical_availability?: string | null
          updated_at?: string
          will_travel?: boolean | null
          years_experience?: number | null
        }
        Update: {
          accepted_tos_at?: string | null
          account_type?: string | null
          avatar_url?: string | null
          bio?: string | null
          certifications?: string | null
          city?: string | null
          company_name?: string | null
          company_website?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          hourly_rate?: number | null
          id?: string
          is_location_verified?: boolean | null
          is_private?: boolean | null
          keywords?: string | null
          location?: string | null
          payouts_enabled?: boolean | null
          phone?: string | null
          plan_tier?: string | null
          portfolio_urls?: string[] | null
          rating?: number | null
          referral_code?: string | null
          referred_by?: string | null
          review_count?: number | null
          role?: string | null
          skills?: string[] | null
          state?: string | null
          status?: string | null
          stripe_account_id?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          typical_availability?: string | null
          updated_at?: string
          will_travel?: boolean | null
          years_experience?: number | null
        }
        Relationships: []
      }
      reviews: {
        Row: {
          comment: string | null
          created_at: string | null
          id: string
          job_id: string
          rating: number
          report_reason: string | null
          reviewee_id: string
          reviewer_id: string
          status: string | null
        }
        Insert: {
          comment?: string | null
          created_at?: string | null
          id?: string
          job_id: string
          rating: number
          report_reason?: string | null
          reviewee_id: string
          reviewer_id: string
          status?: string | null
        }
        Update: {
          comment?: string | null
          created_at?: string | null
          id?: string
          job_id?: string
          rating?: number
          report_reason?: string | null
          reviewee_id?: string
          reviewer_id?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_reviewee_id_fkey"
            columns: ["reviewee_id"]
            isOneToOne: false
            referencedRelation: "my_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_reviewee_id_fkey"
            columns: ["reviewee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "my_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      my_profile: {
        Row: {
          accepted_tos_at: string | null
          account_type: string | null
          avatar_url: string | null
          bio: string | null
          certifications: string | null
          city: string | null
          company_name: string | null
          company_website: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          hourly_rate: number | null
          id: string | null
          is_location_verified: boolean | null
          is_private: boolean | null
          keywords: string | null
          location: string | null
          payouts_enabled: boolean | null
          phone: string | null
          plan_tier: string | null
          portfolio_urls: string[] | null
          rating: number | null
          referral_code: string | null
          referred_by: string | null
          review_count: number | null
          role: string | null
          skills: string[] | null
          state: string | null
          status: string | null
          stripe_account_id: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          typical_availability: string | null
          updated_at: string | null
          will_travel: boolean | null
          years_experience: number | null
        }
        Insert: {
          accepted_tos_at?: string | null
          account_type?: string | null
          avatar_url?: string | null
          bio?: string | null
          certifications?: string | null
          city?: string | null
          company_name?: string | null
          company_website?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          hourly_rate?: number | null
          id?: string | null
          is_location_verified?: boolean | null
          is_private?: boolean | null
          keywords?: string | null
          location?: string | null
          payouts_enabled?: boolean | null
          phone?: string | null
          plan_tier?: string | null
          portfolio_urls?: string[] | null
          rating?: number | null
          referral_code?: string | null
          referred_by?: string | null
          review_count?: number | null
          role?: string | null
          skills?: string[] | null
          state?: string | null
          status?: string | null
          stripe_account_id?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          typical_availability?: string | null
          updated_at?: string | null
          will_travel?: boolean | null
          years_experience?: number | null
        }
        Update: {
          accepted_tos_at?: string | null
          account_type?: string | null
          avatar_url?: string | null
          bio?: string | null
          certifications?: string | null
          city?: string | null
          company_name?: string | null
          company_website?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          hourly_rate?: number | null
          id?: string | null
          is_location_verified?: boolean | null
          is_private?: boolean | null
          keywords?: string | null
          location?: string | null
          payouts_enabled?: boolean | null
          phone?: string | null
          plan_tier?: string | null
          portfolio_urls?: string[] | null
          rating?: number | null
          referral_code?: string | null
          referred_by?: string | null
          review_count?: number | null
          role?: string | null
          skills?: string[] | null
          state?: string | null
          status?: string | null
          stripe_account_id?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          typical_availability?: string | null
          updated_at?: string | null
          will_travel?: boolean | null
          years_experience?: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      hired_contractor_contacts: {
        Args: never
        Returns: {
          email: string
          id: string
          phone: string
        }[]
      }
      lookup_referrer: { Args: { code: string }; Returns: string }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const

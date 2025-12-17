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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      admin_users: {
        Row: {
          id: string
          user_id: string
          is_admin: boolean
          created_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          is_admin?: boolean
          created_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          is_admin?: boolean
          created_at?: string | null
        }
        Relationships: []
      }
      funnels: {
        Row: {
          created_at: string | null
          edges: Json
          id: string
          logo_url: string | null
          name: string
          nodes: Json
          traffic_sources: Json
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          edges?: Json
          id?: string
          logo_url?: string | null
          name: string
          nodes?: Json
          traffic_sources?: Json
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          edges?: Json
          id?: string
          logo_url?: string | null
          name?: string
          nodes?: Json
          traffic_sources?: Json
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      password_reset_tokens: {
        Row: {
          created_at: string | null
          expires_at: string
          id: string
          token: string
          used: boolean | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          expires_at: string
          id?: string
          token: string
          used?: boolean | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string
          id?: string
          token?: string
          used?: boolean | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      subscription_tiers: {
        Row: {
          id: string
          name: string
          stripe_product_id: string | null
          stripe_price_id_monthly: string | null
          stripe_price_id_yearly: string | null
          stripe_price_id_lifetime: string | null
          price_monthly: number
          price_yearly: number
          price_lifetime: number
          max_funnels: number
          features: Json
          sort_order: number
          is_active: boolean
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          name: string
          stripe_product_id?: string | null
          stripe_price_id_monthly?: string | null
          stripe_price_id_yearly?: string | null
          stripe_price_id_lifetime?: string | null
          price_monthly?: number
          price_yearly?: number
          price_lifetime?: number
          max_funnels?: number
          features?: Json
          sort_order?: number
          is_active?: boolean
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          stripe_product_id?: string | null
          stripe_price_id_monthly?: string | null
          stripe_price_id_yearly?: string | null
          stripe_price_id_lifetime?: string | null
          price_monthly?: number
          price_yearly?: number
          price_lifetime?: number
          max_funnels?: number
          features?: Json
          sort_order?: number
          is_active?: boolean
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      user_subscriptions: {
        Row: {
          id: string
          user_id: string
          tier_id: string
          stripe_subscription_id: string | null
          stripe_customer_id: string | null
          status: string
          current_period_start: string | null
          current_period_end: string | null
          cancel_at_period_end: boolean
          is_lifetime: boolean
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          tier_id: string
          stripe_subscription_id?: string | null
          stripe_customer_id?: string | null
          status?: string
          current_period_start?: string | null
          current_period_end?: string | null
          cancel_at_period_end?: boolean
          is_lifetime?: boolean
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          tier_id?: string
          stripe_subscription_id?: string | null
          stripe_customer_id?: string | null
          status?: string
          current_period_start?: string | null
          current_period_end?: string | null
          cancel_at_period_end?: boolean
          is_lifetime?: boolean
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_subscriptions_tier_id_fkey"
            columns: ["tier_id"]
            isOneToOne: false
            referencedRelation: "subscription_tiers"
            referencedColumns: ["id"]
          }
        ]
      }
      whitelabel_config: {
        Row: {
          id: string
          brand_name: string
          tagline: string | null
          primary_color: string | null
          logo_light_url: string | null
          logo_dark_url: string | null
          favicon_url: string | null
          hero_headline: string | null
          hero_subheadline: string | null
          hero_badge_text: string | null
          cta_button_text: string | null
          features: Json | null
          testimonials: Json | null
          faq: Json | null
          footer_text: string | null
          email_sender_name: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          brand_name?: string
          tagline?: string | null
          primary_color?: string | null
          logo_light_url?: string | null
          logo_dark_url?: string | null
          favicon_url?: string | null
          hero_headline?: string | null
          hero_subheadline?: string | null
          hero_badge_text?: string | null
          cta_button_text?: string | null
          features?: Json | null
          testimonials?: Json | null
          faq?: Json | null
          footer_text?: string | null
          email_sender_name?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          brand_name?: string
          tagline?: string | null
          primary_color?: string | null
          logo_light_url?: string | null
          logo_dark_url?: string | null
          favicon_url?: string | null
          hero_headline?: string | null
          hero_subheadline?: string | null
          hero_badge_text?: string | null
          cta_button_text?: string | null
          features?: Json | null
          testimonials?: Json | null
          faq?: Json | null
          footer_text?: string | null
          email_sender_name?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin: {
        Args: {
          check_user_id: string
        }
        Returns: boolean
      }
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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

// Convenience type exports for cleaner imports
export type SubscriptionTier = Tables<'subscription_tiers'>
export type SubscriptionTierInsert = TablesInsert<'subscription_tiers'>
export type SubscriptionTierUpdate = TablesUpdate<'subscription_tiers'>

export type UserSubscription = Tables<'user_subscriptions'>
export type UserSubscriptionInsert = TablesInsert<'user_subscriptions'>
export type UserSubscriptionUpdate = TablesUpdate<'user_subscriptions'>

export type WhitelabelConfig = Tables<'whitelabel_config'>
export type WhitelabelConfigInsert = TablesInsert<'whitelabel_config'>
export type WhitelabelConfigUpdate = TablesUpdate<'whitelabel_config'>

export type AdminUser = Tables<'admin_users'>
export type AdminUserInsert = TablesInsert<'admin_users'>
export type AdminUserUpdate = TablesUpdate<'admin_users'>

// Feature type for subscription tier features
export interface SubscriptionFeature {
  title: string
  description: string
  icon?: string
}

// Whitelabel feature type
export interface WhitelabelFeature {
  title: string
  description: string
  icon?: string
}

// Testimonial type for whitelabel
export interface WhitelabelTestimonial {
  quote: string
  author: string
  role?: string
  image?: string | null
}

// FAQ type for whitelabel
export interface WhitelabelFAQ {
  question: string
  answer: string
}

// Subscription status enum-like type
export type SubscriptionStatus = 'active' | 'canceled' | 'past_due' | 'refunded' | 'trialing'

// Billing interval type for checkout
export type BillingInterval = 'monthly' | 'yearly' | 'lifetime'

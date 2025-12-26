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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      contact_submissions: {
        Row: {
          created_at: string
          email: string
          id: string
          message: string
          name: string
          status: string
          subject: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          message: string
          name: string
          status?: string
          subject?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
          status?: string
          subject?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      enrichment_jobs: {
        Row: {
          attributes: Json
          created_at: string
          current_index: number
          error: string | null
          failed_count: number
          id: string
          products: Json
          results: Json
          run_id: string | null
          status: string
          success_count: number
          total_count: number
          updated_at: string
          user_id: string
        }
        Insert: {
          attributes?: Json
          created_at?: string
          current_index?: number
          error?: string | null
          failed_count?: number
          id?: string
          products?: Json
          results?: Json
          run_id?: string | null
          status?: string
          success_count?: number
          total_count?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          attributes?: Json
          created_at?: string
          current_index?: number
          error?: string | null
          failed_count?: number
          id?: string
          products?: Json
          results?: Json
          run_id?: string | null
          status?: string
          success_count?: number
          total_count?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrichment_jobs_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "user_enrichment_data"
            referencedColumns: ["id"]
          },
        ]
      }
      enrichment_run_items: {
        Row: {
          category: string | null
          created_at: string
          data: Json | null
          error: string | null
          id: string
          mfr: string | null
          mpn: string | null
          product_id: string
          run_id: string
          status: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          data?: Json | null
          error?: string | null
          id?: string
          mfr?: string | null
          mpn?: string | null
          product_id: string
          run_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          data?: Json | null
          error?: string | null
          id?: string
          mfr?: string | null
          mpn?: string | null
          product_id?: string
          run_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrichment_run_items_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "user_enrichment_data"
            referencedColumns: ["id"]
          },
        ]
      }
      manufacturer_trainings: {
        Row: {
          created_at: string
          id: string
          manufacturer: string
          selectors: Json
          test_url: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          manufacturer: string
          selectors?: Json
          test_url: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          manufacturer?: string
          selectors?: Json
          test_url?: string
          updated_at?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          currency: string
          id: string
          plan_tier: Database["public"]["Enums"]["plan_tier"]
          razorpay_order_id: string | null
          razorpay_payment_id: string | null
          razorpay_signature: string | null
          status: string
          subscription_id: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          id?: string
          plan_tier: Database["public"]["Enums"]["plan_tier"]
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          razorpay_signature?: string | null
          status?: string
          subscription_id?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          plan_tier?: Database["public"]["Enums"]["plan_tier"]
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          razorpay_signature?: string | null
          status?: string
          subscription_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "user_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      subscription_plans: {
        Row: {
          created_at: string
          credits_display_text: string | null
          display_order: number | null
          features: Json | null
          id: string
          is_active: boolean
          main_feature_text: string | null
          max_devices: number
          monthly_credits: number
          name: string
          per_mpn_cost: string | null
          price_monthly: number
          price_yearly: number
          subtitle: string | null
          tier: Database["public"]["Enums"]["plan_tier"]
        }
        Insert: {
          created_at?: string
          credits_display_text?: string | null
          display_order?: number | null
          features?: Json | null
          id?: string
          is_active?: boolean
          main_feature_text?: string | null
          max_devices?: number
          monthly_credits: number
          name: string
          per_mpn_cost?: string | null
          price_monthly?: number
          price_yearly?: number
          subtitle?: string | null
          tier: Database["public"]["Enums"]["plan_tier"]
        }
        Update: {
          created_at?: string
          credits_display_text?: string | null
          display_order?: number | null
          features?: Json | null
          id?: string
          is_active?: boolean
          main_feature_text?: string | null
          max_devices?: number
          monthly_credits?: number
          name?: string
          per_mpn_cost?: string | null
          price_monthly?: number
          price_yearly?: number
          subtitle?: string | null
          tier?: Database["public"]["Enums"]["plan_tier"]
        }
        Relationships: []
      }
      trial_usage: {
        Row: {
          first_request_at: string
          id: string
          ip_address: string
          last_request_at: string
          max_requests: number
          requests_used: number
        }
        Insert: {
          first_request_at?: string
          id?: string
          ip_address: string
          last_request_at?: string
          max_requests?: number
          requests_used?: number
        }
        Update: {
          first_request_at?: string
          id?: string
          ip_address?: string
          last_request_at?: string
          max_requests?: number
          requests_used?: number
        }
        Relationships: []
      }
      usage_logs: {
        Row: {
          created_at: string
          credits_used: number
          feature: string
          id: string
          ip_address: string | null
          request_data: Json | null
          response_summary: Json | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          credits_used?: number
          feature: string
          id?: string
          ip_address?: string | null
          request_data?: Json | null
          response_summary?: Json | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          credits_used?: number
          feature?: string
          id?: string
          ip_address?: string | null
          request_data?: Json | null
          response_summary?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_devices: {
        Row: {
          browser: string | null
          created_at: string
          device_fingerprint: string
          device_name: string | null
          id: string
          ip_address: string | null
          is_active: boolean
          last_used_at: string
          os: string | null
          revoked_at: string | null
          user_id: string
        }
        Insert: {
          browser?: string | null
          created_at?: string
          device_fingerprint: string
          device_name?: string | null
          id?: string
          ip_address?: string | null
          is_active?: boolean
          last_used_at?: string
          os?: string | null
          revoked_at?: string | null
          user_id: string
        }
        Update: {
          browser?: string | null
          created_at?: string
          device_fingerprint?: string
          device_name?: string | null
          id?: string
          ip_address?: string | null
          is_active?: boolean
          last_used_at?: string
          os?: string | null
          revoked_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_enrichment_data: {
        Row: {
          attributes: Json
          completed_at: string | null
          created_at: string
          current_index: number
          failed_count: number
          file_name: string
          id: string
          products_count: number
          results: Json
          started_at: string
          status: string
          success_count: number
          total_count: number
          updated_at: string
          user_id: string
        }
        Insert: {
          attributes?: Json
          completed_at?: string | null
          created_at?: string
          current_index?: number
          failed_count?: number
          file_name: string
          id?: string
          products_count?: number
          results?: Json
          started_at?: string
          status?: string
          success_count?: number
          total_count?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          attributes?: Json
          completed_at?: string | null
          created_at?: string
          current_index?: number
          failed_count?: number
          file_name?: string
          id?: string
          products_count?: number
          results?: Json
          started_at?: string
          status?: string
          success_count?: number
          total_count?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_subscriptions: {
        Row: {
          billing_cycle: string
          created_at: string
          credits_remaining: number
          credits_used: number
          current_period_end: string
          current_period_start: string
          id: string
          max_devices_override: number | null
          plan_id: string
          razorpay_customer_id: string | null
          razorpay_subscription_id: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          billing_cycle?: string
          created_at?: string
          credits_remaining?: number
          credits_used?: number
          current_period_end?: string
          current_period_start?: string
          id?: string
          max_devices_override?: number | null
          plan_id: string
          razorpay_customer_id?: string | null
          razorpay_subscription_id?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          billing_cycle?: string
          created_at?: string
          credits_remaining?: number
          credits_used?: number
          current_period_end?: string
          current_period_start?: string
          id?: string
          max_devices_override?: number | null
          plan_id?: string
          razorpay_customer_id?: string | null
          razorpay_subscription_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      consume_credit: {
        Args: {
          p_credits_to_consume?: number
          p_feature: string
          p_request_data?: Json
          p_user_id: string
        }
        Returns: Json
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
      plan_tier: "trial" | "basic" | "pro" | "enterprise"
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
    Enums: {
      app_role: ["admin", "user"],
      plan_tier: ["trial", "basic", "pro", "enterprise"],
    },
  },
} as const

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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          kind: string
          link: string | null
          metadata: Json
          read: boolean
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          kind: string
          link?: string | null
          metadata?: Json
          read?: boolean
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          kind?: string
          link?: string | null
          metadata?: Json
          read?: boolean
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          buyer_id: string
          buyer_location: string
          buyer_phone: string
          created_at: string
          currency: string
          id: string
          notes: string | null
          product_id: string
          quantity: number
          seller_id: string
          status: string
          total_ugx: number
          total_usd: number
        }
        Insert: {
          buyer_id: string
          buyer_location: string
          buyer_phone: string
          created_at?: string
          currency?: string
          id?: string
          notes?: string | null
          product_id: string
          quantity?: number
          seller_id: string
          status?: string
          total_ugx?: number
          total_usd?: number
        }
        Update: {
          buyer_id?: string
          buyer_location?: string
          buyer_phone?: string
          created_at?: string
          currency?: string
          id?: string
          notes?: string | null
          product_id?: string
          quantity?: number
          seller_id?: string
          status?: string
          total_ugx?: number
          total_usd?: number
        }
        Relationships: [
          {
            foreignKeyName: "orders_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          availability_timeline: string
          available: boolean
          category: string | null
          created_at: string
          delivery_available: boolean
          description: string | null
          district: string | null
          grade: string | null
          harvest_season: string | null
          id: string
          image_url: string | null
          location: string
          moderation_notes: string | null
          moderation_status: string
          moisture_content: string | null
          negotiable: boolean
          organic_status: string
          parish: string | null
          pickup_available: boolean
          price_ugx: number
          price_usd: number
          quantity_available: number
          ready_date: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          seller_id: string
          storage_method: string | null
          title: string
          transport_assistance: boolean
          unit: string
          updated_at: string
          variety: string | null
          village: string | null
        }
        Insert: {
          availability_timeline?: string
          available?: boolean
          category?: string | null
          created_at?: string
          delivery_available?: boolean
          description?: string | null
          district?: string | null
          grade?: string | null
          harvest_season?: string | null
          id?: string
          image_url?: string | null
          location: string
          moderation_notes?: string | null
          moderation_status?: string
          moisture_content?: string | null
          negotiable?: boolean
          organic_status?: string
          parish?: string | null
          pickup_available?: boolean
          price_ugx?: number
          price_usd?: number
          quantity_available?: number
          ready_date?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          seller_id: string
          storage_method?: string | null
          title: string
          transport_assistance?: boolean
          unit?: string
          updated_at?: string
          variety?: string | null
          village?: string | null
        }
        Update: {
          availability_timeline?: string
          available?: boolean
          category?: string | null
          created_at?: string
          delivery_available?: boolean
          description?: string | null
          district?: string | null
          grade?: string | null
          harvest_season?: string | null
          id?: string
          image_url?: string | null
          location?: string
          moderation_notes?: string | null
          moderation_status?: string
          moisture_content?: string | null
          negotiable?: boolean
          organic_status?: string
          parish?: string | null
          pickup_available?: boolean
          price_ugx?: number
          price_usd?: number
          quantity_available?: number
          ready_date?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          seller_id?: string
          storage_method?: string | null
          title?: string
          transport_assistance?: boolean
          unit?: string
          updated_at?: string
          variety?: string | null
          village?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          account_type: string
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          location: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          account_type?: string
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          location?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          account_type?: string
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          location?: string | null
          phone?: string | null
          updated_at?: string
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
          role: Database["public"]["Enums"]["app_role"]
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
      verification_audit: {
        Row: {
          action: string
          created_at: string
          id: string
          new_status: string
          notes: string | null
          previous_status: string | null
          reviewer_id: string
          verification_id: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          new_status: string
          notes?: string | null
          previous_status?: string | null
          reviewer_id: string
          verification_id: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          new_status?: string
          notes?: string | null
          previous_status?: string | null
          reviewer_id?: string
          verification_id?: string
        }
        Relationships: []
      }
      verifications: {
        Row: {
          acres: number | null
          admin_notes: string | null
          availability_timeline: string
          bags_available: number | null
          contact_number: string
          created_at: string
          crop_photos: string[]
          crops: string
          custom_availability_date: string | null
          district: string
          email: string | null
          expected_harvest_date: string | null
          farm_photos: string[]
          full_legal_name: string
          id: string
          momo_name: string | null
          momo_network: string
          momo_number: string
          parish: string
          reviewed_at: string | null
          reviewed_by: string | null
          season_production_estimate: string | null
          status: string
          updated_at: string
          user_id: string
          village: string
        }
        Insert: {
          acres?: number | null
          admin_notes?: string | null
          availability_timeline?: string
          bags_available?: number | null
          contact_number: string
          created_at?: string
          crop_photos?: string[]
          crops: string
          custom_availability_date?: string | null
          district: string
          email?: string | null
          expected_harvest_date?: string | null
          farm_photos?: string[]
          full_legal_name: string
          id?: string
          momo_name?: string | null
          momo_network?: string
          momo_number: string
          parish: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          season_production_estimate?: string | null
          status?: string
          updated_at?: string
          user_id: string
          village: string
        }
        Update: {
          acres?: number | null
          admin_notes?: string | null
          availability_timeline?: string
          bags_available?: number | null
          contact_number?: string
          created_at?: string
          crop_photos?: string[]
          crops?: string
          custom_availability_date?: string | null
          district?: string
          email?: string | null
          expected_harvest_date?: string | null
          farm_photos?: string[]
          full_legal_name?: string
          id?: string
          momo_name?: string | null
          momo_network?: string
          momo_number?: string
          parish?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          season_production_estimate?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          village?: string
        }
        Relationships: []
      }
    }
    Views: {
      seller_orders: {
        Row: {
          created_at: string | null
          currency: string | null
          id: string | null
          notes: string | null
          product_id: string | null
          product_title: string | null
          quantity: number | null
          seller_id: string | null
          status: string | null
          total_ugx: number | null
          total_usd: number | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      create_notification: {
        Args: {
          _body?: string
          _kind: string
          _link?: string
          _metadata?: Json
          _title: string
          _user_id: string
        }
        Returns: undefined
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      notify_admins: {
        Args: {
          _body?: string
          _kind: string
          _link?: string
          _metadata?: Json
          _title: string
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "seller" | "buyer"
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
      app_role: ["admin", "seller", "buyer"],
    },
  },
} as const

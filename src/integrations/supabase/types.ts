export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      addresses: {
        Row: {
          address_name: string
          city: string
          country: string
          created_at: string
          id: string
          is_default: boolean | null
          phone_number: string | null
          postal_code: string | null
          recipient_name: string
          state: string | null
          street_address: string
          updated_at: string
          user_id: string
        }
        Insert: {
          address_name: string
          city: string
          country: string
          created_at?: string
          id?: string
          is_default?: boolean | null
          phone_number?: string | null
          postal_code?: string | null
          recipient_name: string
          state?: string | null
          street_address: string
          updated_at?: string
          user_id: string
        }
        Update: {
          address_name?: string
          city?: string
          country?: string
          created_at?: string
          id?: string
          is_default?: boolean | null
          phone_number?: string | null
          postal_code?: string | null
          recipient_name?: string
          state?: string | null
          street_address?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      announcements: {
        Row: {
          category: string
          content: string
          created_at: string
          created_by: string
          expiry_date: string | null
          id: string
          is_active: boolean
          title: string
          updated_at: string
        }
        Insert: {
          category: string
          content: string
          created_at?: string
          created_by: string
          expiry_date?: string | null
          id?: string
          is_active?: boolean
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          content?: string
          created_at?: string
          created_by?: string
          expiry_date?: string | null
          id?: string
          is_active?: boolean
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: string | null
          user_id?: string
        }
        Relationships: []
      }
      collection_schedules: {
        Row: {
          areas: string[]
          created_at: string
          id: string
          pickup_date: string
          route: string
          updated_at: string
        }
        Insert: {
          areas?: string[]
          created_at?: string
          id?: string
          pickup_date: string
          route: string
          updated_at?: string
        }
        Update: {
          areas?: string[]
          created_at?: string
          id?: string
          pickup_date?: string
          route?: string
          updated_at?: string
        }
        Relationships: []
      }
      custom_quotes: {
        Row: {
          admin_notes: string | null
          category: string | null
          created_at: string
          description: string
          id: string
          image_urls: string[]
          phone_number: string
          quoted_amount: number | null
          recipient_details: Json | null
          sender_details: Json | null
          shipment_id: string | null
          specific_item: string | null
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          admin_notes?: string | null
          category?: string | null
          created_at?: string
          description: string
          id?: string
          image_urls?: string[]
          phone_number: string
          quoted_amount?: number | null
          recipient_details?: Json | null
          sender_details?: Json | null
          shipment_id?: string | null
          specific_item?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          admin_notes?: string | null
          category?: string | null
          created_at?: string
          description?: string
          id?: string
          image_urls?: string[]
          phone_number?: string
          quoted_amount?: number | null
          recipient_details?: Json | null
          sender_details?: Json | null
          shipment_id?: string | null
          specific_item?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "custom_quote_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custom_quotes_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
        ]
      }
      gallery: {
        Row: {
          alt: string
          caption: string
          category: string
          created_at: string
          id: string
          src: string
          updated_at: string
        }
        Insert: {
          alt: string
          caption: string
          category: string
          created_at?: string
          id?: string
          src: string
          updated_at?: string
        }
        Update: {
          alt?: string
          caption?: string
          category?: string
          created_at?: string
          id?: string
          src?: string
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          related_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          related_id?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          related_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          currency: string
          id: string
          payment_method: string
          payment_status: string
          receipt_url: string | null
          shipment_id: string | null
          transaction_id: string | null
          user_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          id?: string
          payment_method: string
          payment_status: string
          receipt_url?: string | null
          shipment_id?: string | null
          transaction_id?: string | null
          user_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          payment_method?: string
          payment_status?: string
          receipt_url?: string | null
          shipment_id?: string | null
          transaction_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          communication_preferences: Json | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          is_admin: boolean | null
          mfa_backup_codes: string[] | null
          mfa_enabled: boolean | null
          mfa_secret: string | null
          role: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          communication_preferences?: Json | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          is_admin?: boolean | null
          mfa_backup_codes?: string[] | null
          mfa_enabled?: boolean | null
          mfa_secret?: string | null
          role?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          communication_preferences?: Json | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          is_admin?: boolean | null
          mfa_backup_codes?: string[] | null
          mfa_enabled?: boolean | null
          mfa_secret?: string | null
          role?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      receipts: {
        Row: {
          amount: number
          created_at: string
          currency: string
          id: string
          payment_id: string
          payment_method: string
          receipt_number: string
          recipient_details: Json
          sender_details: Json
          shipment_details: Json
          shipment_id: string
          status: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          id?: string
          payment_id: string
          payment_method: string
          receipt_number: string
          recipient_details: Json
          sender_details: Json
          shipment_details: Json
          shipment_id: string
          status?: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          payment_id?: string
          payment_method?: string
          receipt_number?: string
          recipient_details?: Json
          sender_details?: Json
          shipment_details?: Json
          shipment_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "receipts_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipts_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
        ]
      }
      response_templates: {
        Row: {
          content: string
          created_at: string
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          rating: number
          shipment_id: string | null
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          rating: number
          shipment_id?: string | null
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          rating?: number
          shipment_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_reviews_user_id"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
        ]
      }
      shipments: {
        Row: {
          can_cancel: boolean | null
          can_modify: boolean | null
          carrier: string | null
          created_at: string
          destination: string
          dimensions: string | null
          estimated_delivery: string | null
          id: string
          metadata: Json | null
          origin: string
          status: string
          tracking_number: string
          updated_at: string
          user_id: string | null
          weight: number | null
        }
        Insert: {
          can_cancel?: boolean | null
          can_modify?: boolean | null
          carrier?: string | null
          created_at?: string
          destination: string
          dimensions?: string | null
          estimated_delivery?: string | null
          id?: string
          metadata?: Json | null
          origin: string
          status: string
          tracking_number: string
          updated_at?: string
          user_id?: string | null
          weight?: number | null
        }
        Update: {
          can_cancel?: boolean | null
          can_modify?: boolean | null
          carrier?: string | null
          created_at?: string
          destination?: string
          dimensions?: string | null
          estimated_delivery?: string | null
          id?: string
          metadata?: Json | null
          origin?: string
          status?: string
          tracking_number?: string
          updated_at?: string
          user_id?: string | null
          weight?: number | null
        }
        Relationships: []
      }
      support_tickets: {
        Row: {
          assigned_to: string | null
          created_at: string
          id: string
          message: string
          priority: string
          status: string
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          id?: string
          message: string
          priority?: string
          status?: string
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          id?: string
          message?: string
          priority?: string
          status?: string
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_support_tickets_assigned_to"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_support_tickets_user_id"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      system_settings: {
        Row: {
          created_at: string
          id: string
          key: string
          updated_at: string
          value: Json | null
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          updated_at?: string
          value?: Json | null
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          updated_at?: string
          value?: Json | null
        }
        Relationships: []
      }
      user_role_assignments: {
        Row: {
          assigned_by: string | null
          created_at: string
          id: string
          role_id: string
          user_id: string
        }
        Insert: {
          assigned_by?: string | null
          created_at?: string
          id?: string
          role_id: string
          user_id: string
        }
        Update: {
          assigned_by?: string | null
          created_at?: string
          id?: string
          role_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_role_assignments_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "user_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          permissions: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          permissions?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          permissions?: Json
          updated_at?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          id: string
          is_admin: boolean | null
          username: string
        }
        Insert: {
          id: string
          is_admin?: boolean | null
          username: string
        }
        Update: {
          id?: string
          is_admin?: boolean | null
          username?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_and_log_failed_auth_attempt: {
        Args: { ip_address: string }
        Returns: boolean
      }
      create_announcement: {
        Args:
          | {
              p_title: string
              p_content: string
              p_category: string
              p_is_active: boolean
              p_created_by: string
              p_expiry_date: string
            }
          | {
              p_title: string
              p_content: string
              p_category: string
              p_is_active: boolean
              p_created_by: string
              p_expiry_date: string
            }
        Returns: Json
      }
      delete_announcement: {
        Args: { p_id: string }
        Returns: boolean
      }
      delete_gallery_image: {
        Args: { p_id: string }
        Returns: boolean
      }
      elevate_to_admin: {
        Args: { admin_password: string }
        Returns: boolean
      }
      get_active_announcements: {
        Args: Record<PropertyKey, never>
        Returns: Json[]
      }
      get_announcements: {
        Args: Record<PropertyKey, never>
        Returns: Json[]
      }
      get_gallery_images: {
        Args: Record<PropertyKey, never>
        Returns: Json[]
      }
      insert_gallery_image: {
        Args: {
          p_src: string
          p_alt: string
          p_caption: string
          p_category: string
        }
        Returns: Json
      }
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_user_admin: {
        Args: { user_id: string }
        Returns: boolean
      }
      make_admin: {
        Args: { user_email: string }
        Returns: boolean
      }
      update_admin_password: {
        Args: { current_password: string; new_password: string }
        Returns: boolean
      }
      verify_mfa_login: {
        Args: { user_id: string; token: string }
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

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const

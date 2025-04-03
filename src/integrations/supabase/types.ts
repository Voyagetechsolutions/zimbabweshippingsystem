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
          user_id: string
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
          user_id: string
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
          user_id?: string
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
          user_id: string
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
          user_id: string
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
          user_id?: string
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
        Relationships: []
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
      ticket_responses: {
        Row: {
          created_at: string
          id: string
          is_staff_response: boolean
          message: string
          ticket_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_staff_response?: boolean
          message: string
          ticket_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_staff_response?: boolean
          message?: string
          ticket_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_responses_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_user_admin: {
        Args: {
          user_id: string
        }
        Returns: boolean
      }
      make_admin: {
        Args: {
          user_email: string
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

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

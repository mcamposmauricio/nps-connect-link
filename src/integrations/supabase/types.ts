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
      brand_settings: {
        Row: {
          accent_color: string | null
          brand_name: string
          company_name: string | null
          created_at: string
          id: string
          logo_url: string | null
          primary_color: string | null
          secondary_color: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          accent_color?: string | null
          brand_name?: string
          company_name?: string | null
          created_at?: string
          id?: string
          logo_url?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          accent_color?: string | null
          brand_name?: string
          company_name?: string | null
          created_at?: string
          id?: string
          logo_url?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      campaign_contacts: {
        Row: {
          campaign_id: string
          company_contact_id: string | null
          contact_id: string
          created_at: string
          email_sent: boolean | null
          email_sent_at: string | null
          id: string
          link_token: string
        }
        Insert: {
          campaign_id: string
          company_contact_id?: string | null
          contact_id: string
          created_at?: string
          email_sent?: boolean | null
          email_sent_at?: string | null
          id?: string
          link_token?: string
        }
        Update: {
          campaign_id?: string
          company_contact_id?: string | null
          contact_id?: string
          created_at?: string
          email_sent?: boolean | null
          email_sent_at?: string | null
          id?: string
          link_token?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_contacts_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_contacts_company_contact_id_fkey"
            columns: ["company_contact_id"]
            isOneToOne: false
            referencedRelation: "company_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_contacts_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_sends: {
        Row: {
          attempt: number
          campaign_id: string
          contact_id: string
          created_at: string
          id: string
          response_at: string | null
          sent_at: string | null
          status: string
        }
        Insert: {
          attempt: number
          campaign_id: string
          contact_id: string
          created_at?: string
          id?: string
          response_at?: string | null
          sent_at?: string | null
          status?: string
        }
        Update: {
          attempt?: number
          campaign_id?: string
          contact_id?: string
          created_at?: string
          id?: string
          response_at?: string | null
          sent_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_sends_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_sends_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          attempt_current: number | null
          attempts_total: number | null
          brand_settings_id: string | null
          campaign_type: string
          created_at: string | null
          cycle_type: string | null
          id: string
          message: string
          name: string
          next_send: string | null
          sent_at: string | null
          start_date: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          attempt_current?: number | null
          attempts_total?: number | null
          brand_settings_id?: string | null
          campaign_type?: string
          created_at?: string | null
          cycle_type?: string | null
          id?: string
          message: string
          name: string
          next_send?: string | null
          sent_at?: string | null
          start_date?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          attempt_current?: number | null
          attempts_total?: number | null
          brand_settings_id?: string | null
          campaign_type?: string
          created_at?: string | null
          cycle_type?: string | null
          id?: string
          message?: string
          name?: string
          next_send?: string | null
          sent_at?: string | null
          start_date?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_brand_settings_id_fkey"
            columns: ["brand_settings_id"]
            isOneToOne: false
            referencedRelation: "brand_settings"
            referencedColumns: ["id"]
          },
        ]
      }
      company_contacts: {
        Row: {
          company_id: string
          created_at: string | null
          custom_fields: Json | null
          department: string | null
          email: string
          id: string
          is_primary: boolean | null
          name: string
          phone: string | null
          role: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string | null
          custom_fields?: Json | null
          department?: string | null
          email: string
          id?: string
          is_primary?: boolean | null
          name: string
          phone?: string | null
          role?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string | null
          custom_fields?: Json | null
          department?: string | null
          email?: string
          id?: string
          is_primary?: boolean | null
          name?: string
          phone?: string | null
          role?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_contacts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          city: string | null
          company_document: string | null
          company_sector: string | null
          complement: string | null
          contract_value: number | null
          country: string | null
          created_at: string | null
          cs_status: string | null
          csm_id: string | null
          custom_fields: Json | null
          email: string
          health_score: number | null
          id: string
          is_company: boolean
          last_nps_date: string | null
          last_nps_score: number | null
          mrr: number | null
          name: string
          neighborhood: string | null
          phone: string | null
          renewal_date: string | null
          state: string | null
          street: string | null
          street_number: string | null
          trade_name: string | null
          updated_at: string | null
          user_id: string
          zip_code: string | null
        }
        Insert: {
          city?: string | null
          company_document?: string | null
          company_sector?: string | null
          complement?: string | null
          contract_value?: number | null
          country?: string | null
          created_at?: string | null
          cs_status?: string | null
          csm_id?: string | null
          custom_fields?: Json | null
          email: string
          health_score?: number | null
          id?: string
          is_company?: boolean
          last_nps_date?: string | null
          last_nps_score?: number | null
          mrr?: number | null
          name: string
          neighborhood?: string | null
          phone?: string | null
          renewal_date?: string | null
          state?: string | null
          street?: string | null
          street_number?: string | null
          trade_name?: string | null
          updated_at?: string | null
          user_id: string
          zip_code?: string | null
        }
        Update: {
          city?: string | null
          company_document?: string | null
          company_sector?: string | null
          complement?: string | null
          contract_value?: number | null
          country?: string | null
          created_at?: string | null
          cs_status?: string | null
          csm_id?: string | null
          custom_fields?: Json | null
          email?: string
          health_score?: number | null
          id?: string
          is_company?: boolean
          last_nps_date?: string | null
          last_nps_score?: number | null
          mrr?: number | null
          name?: string
          neighborhood?: string | null
          phone?: string | null
          renewal_date?: string | null
          state?: string | null
          street?: string | null
          street_number?: string | null
          trade_name?: string | null
          updated_at?: string | null
          user_id?: string
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contacts_csm_id_fkey"
            columns: ["csm_id"]
            isOneToOne: false
            referencedRelation: "csms"
            referencedColumns: ["id"]
          },
        ]
      }
      csms: {
        Row: {
          created_at: string | null
          department: string | null
          email: string
          hire_date: string | null
          id: string
          is_active: boolean | null
          name: string
          phone: string | null
          specialty: string[] | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          department?: string | null
          email: string
          hire_date?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          phone?: string | null
          specialty?: string[] | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          department?: string | null
          email?: string
          hire_date?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          phone?: string | null
          specialty?: string[] | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      responses: {
        Row: {
          campaign_id: string
          comment: string | null
          contact_id: string
          created_at: string | null
          id: string
          responded_at: string | null
          score: number
          token: string
        }
        Insert: {
          campaign_id: string
          comment?: string | null
          contact_id: string
          created_at?: string | null
          id?: string
          responded_at?: string | null
          score: number
          token: string
        }
        Update: {
          campaign_id?: string
          comment?: string | null
          contact_id?: string
          created_at?: string | null
          id?: string
          responded_at?: string | null
          score?: number
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "responses_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "responses_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      timeline_events: {
        Row: {
          contact_id: string
          created_at: string | null
          date: string
          description: string | null
          id: string
          metadata: Json | null
          title: string
          type: Database["public"]["Enums"]["timeline_event_type"]
          updated_at: string | null
          user_id: string
          user_name: string
        }
        Insert: {
          contact_id: string
          created_at?: string | null
          date: string
          description?: string | null
          id?: string
          metadata?: Json | null
          title: string
          type: Database["public"]["Enums"]["timeline_event_type"]
          updated_at?: string | null
          user_id: string
          user_name: string
        }
        Update: {
          contact_id?: string
          created_at?: string | null
          date?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          title?: string
          type?: Database["public"]["Enums"]["timeline_event_type"]
          updated_at?: string | null
          user_id?: string
          user_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "timeline_events_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      trail_activity_logs: {
        Row: {
          completed_at: string | null
          completed_by: string | null
          contact_id: string
          created_at: string | null
          id: string
          notes: string | null
          trail_id: string
          trail_template_activity_id: string
        }
        Insert: {
          completed_at?: string | null
          completed_by?: string | null
          contact_id: string
          created_at?: string | null
          id?: string
          notes?: string | null
          trail_id: string
          trail_template_activity_id: string
        }
        Update: {
          completed_at?: string | null
          completed_by?: string | null
          contact_id?: string
          created_at?: string | null
          id?: string
          notes?: string | null
          trail_id?: string
          trail_template_activity_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trail_activity_logs_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trail_activity_logs_trail_id_fkey"
            columns: ["trail_id"]
            isOneToOne: false
            referencedRelation: "trails"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trail_activity_logs_trail_template_activity_id_fkey"
            columns: ["trail_template_activity_id"]
            isOneToOne: false
            referencedRelation: "trail_template_activities"
            referencedColumns: ["id"]
          },
        ]
      }
      trail_template_activities: {
        Row: {
          created_at: string | null
          description: string | null
          estimated_days: number | null
          id: string
          is_required: boolean | null
          name: string
          order_index: number | null
          trail_template_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          estimated_days?: number | null
          id?: string
          is_required?: boolean | null
          name: string
          order_index?: number | null
          trail_template_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          estimated_days?: number | null
          id?: string
          is_required?: boolean | null
          name?: string
          order_index?: number | null
          trail_template_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trail_template_activities_trail_template_id_fkey"
            columns: ["trail_template_id"]
            isOneToOne: false
            referencedRelation: "trail_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      trail_templates: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          type: Database["public"]["Enums"]["trail_type"] | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          type?: Database["public"]["Enums"]["trail_type"] | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          type?: Database["public"]["Enums"]["trail_type"] | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      trails: {
        Row: {
          completed_at: string | null
          contact_id: string
          created_at: string | null
          id: string
          name: string
          progress_percentage: number | null
          started_at: string | null
          status: string | null
          trail_template_id: string | null
          type: Database["public"]["Enums"]["trail_type"] | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          contact_id: string
          created_at?: string | null
          id?: string
          name: string
          progress_percentage?: number | null
          started_at?: string | null
          status?: string | null
          trail_template_id?: string | null
          type?: Database["public"]["Enums"]["trail_type"] | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          contact_id?: string
          created_at?: string | null
          id?: string
          name?: string
          progress_percentage?: number | null
          started_at?: string | null
          status?: string | null
          trail_template_id?: string | null
          type?: Database["public"]["Enums"]["trail_type"] | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trails_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trails_trail_template_id_fkey"
            columns: ["trail_template_id"]
            isOneToOne: false
            referencedRelation: "trail_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      user_email_settings: {
        Row: {
          created_at: string | null
          gmail_client_id: string | null
          gmail_client_secret: string | null
          gmail_refresh_token: string | null
          id: string
          is_verified: boolean | null
          provider: string
          smtp_from_email: string | null
          smtp_from_name: string | null
          smtp_host: string | null
          smtp_password: string | null
          smtp_port: number | null
          smtp_secure: boolean | null
          smtp_user: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          gmail_client_id?: string | null
          gmail_client_secret?: string | null
          gmail_refresh_token?: string | null
          id?: string
          is_verified?: boolean | null
          provider?: string
          smtp_from_email?: string | null
          smtp_from_name?: string | null
          smtp_host?: string | null
          smtp_password?: string | null
          smtp_port?: number | null
          smtp_secure?: boolean | null
          smtp_user?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          gmail_client_id?: string | null
          gmail_client_secret?: string | null
          gmail_refresh_token?: string | null
          id?: string
          is_verified?: boolean | null
          provider?: string
          smtp_from_email?: string | null
          smtp_from_name?: string | null
          smtp_host?: string | null
          smtp_password?: string | null
          smtp_port?: number | null
          smtp_secure?: boolean | null
          smtp_user?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_notification_settings: {
        Row: {
          created_at: string | null
          id: string
          notify_detractors: boolean | null
          notify_email: string | null
          notify_neutrals: boolean | null
          notify_on_response: boolean | null
          notify_promoters: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          notify_detractors?: boolean | null
          notify_email?: string | null
          notify_neutrals?: boolean | null
          notify_on_response?: boolean | null
          notify_promoters?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          notify_detractors?: boolean | null
          notify_email?: string | null
          notify_neutrals?: boolean | null
          notify_on_response?: boolean | null
          notify_promoters?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      timeline_event_type:
        | "meeting"
        | "email"
        | "call"
        | "contract"
        | "payment"
        | "activity"
        | "nps_response"
      trail_type: "default" | "overdue" | "attention"
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
      timeline_event_type: [
        "meeting",
        "email",
        "call",
        "contract",
        "payment",
        "activity",
        "nps_response",
      ],
      trail_type: ["default", "overdue", "attention"],
    },
  },
} as const

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
      api_keys: {
        Row: {
          created_at: string | null
          encrypted_key: string | null
          id: string
          is_active: boolean | null
          key_hash: string
          key_prefix: string
          last_used_at: string | null
          name: string
          tenant_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          encrypted_key?: string | null
          id?: string
          is_active?: boolean | null
          key_hash: string
          key_prefix: string
          last_used_at?: string | null
          name: string
          tenant_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          encrypted_key?: string | null
          id?: string
          is_active?: boolean | null
          key_hash?: string
          key_prefix?: string
          last_used_at?: string | null
          name?: string
          tenant_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_keys_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      attendant_profiles: {
        Row: {
          active_conversations: number | null
          avatar_url: string | null
          created_at: string | null
          csm_id: string
          display_name: string
          id: string
          max_conversations: number | null
          status: string | null
          tenant_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          active_conversations?: number | null
          avatar_url?: string | null
          created_at?: string | null
          csm_id: string
          display_name: string
          id?: string
          max_conversations?: number | null
          status?: string | null
          tenant_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          active_conversations?: number | null
          avatar_url?: string | null
          created_at?: string | null
          csm_id?: string
          display_name?: string
          id?: string
          max_conversations?: number | null
          status?: string | null
          tenant_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendant_profiles_csm_id_fkey"
            columns: ["csm_id"]
            isOneToOne: false
            referencedRelation: "csms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendant_profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
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
          tenant_id: string | null
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
          tenant_id?: string | null
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
          tenant_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "brand_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_contacts: {
        Row: {
          campaign_id: string
          company_contact_id: string | null
          contact_id: string
          created_at: string
          email_sent: boolean | null
          email_sent_at: string | null
          embedded_viewed: boolean | null
          embedded_viewed_at: string | null
          id: string
          link_token: string
          response_channel: string | null
        }
        Insert: {
          campaign_id: string
          company_contact_id?: string | null
          contact_id: string
          created_at?: string
          email_sent?: boolean | null
          email_sent_at?: string | null
          embedded_viewed?: boolean | null
          embedded_viewed_at?: string | null
          id?: string
          link_token?: string
          response_channel?: string | null
        }
        Update: {
          campaign_id?: string
          company_contact_id?: string | null
          contact_id?: string
          created_at?: string
          email_sent?: boolean | null
          email_sent_at?: string | null
          embedded_viewed?: boolean | null
          embedded_viewed_at?: string | null
          id?: string
          link_token?: string
          response_channel?: string | null
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
          send_channels: string[] | null
          sent_at: string | null
          start_date: string | null
          status: string | null
          tenant_id: string | null
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
          send_channels?: string[] | null
          sent_at?: string | null
          start_date?: string | null
          status?: string | null
          tenant_id?: string | null
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
          send_channels?: string[] | null
          sent_at?: string | null
          start_date?: string | null
          status?: string | null
          tenant_id?: string | null
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
          {
            foreignKeyName: "campaigns_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_auto_rules: {
        Row: {
          created_at: string | null
          id: string
          is_enabled: boolean | null
          message_content: string | null
          rule_type: string
          tenant_id: string | null
          trigger_minutes: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_enabled?: boolean | null
          message_content?: string | null
          rule_type: string
          tenant_id?: string | null
          trigger_minutes?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_enabled?: boolean | null
          message_content?: string | null
          rule_type?: string
          tenant_id?: string | null
          trigger_minutes?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_auto_rules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_business_hours: {
        Row: {
          created_at: string | null
          day_of_week: number
          end_time: string | null
          id: string
          is_active: boolean | null
          start_time: string | null
          tenant_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          day_of_week: number
          end_time?: string | null
          id?: string
          is_active?: boolean | null
          start_time?: string | null
          tenant_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          day_of_week?: number
          end_time?: string | null
          id?: string
          is_active?: boolean | null
          start_time?: string | null
          tenant_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_business_hours_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_custom_fields: {
        Row: {
          created_at: string | null
          field_type: string | null
          id: string
          is_required: boolean | null
          label: string
          name: string
          placeholder: string | null
          sort_order: number | null
          tenant_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          field_type?: string | null
          id?: string
          is_required?: boolean | null
          label: string
          name: string
          placeholder?: string | null
          sort_order?: number | null
          tenant_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          field_type?: string | null
          id?: string
          is_required?: boolean | null
          label?: string
          name?: string
          placeholder?: string | null
          sort_order?: number | null
          tenant_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_custom_fields_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_macros: {
        Row: {
          category: string | null
          content: string
          created_at: string | null
          id: string
          shortcut: string | null
          tenant_id: string | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          category?: string | null
          content: string
          created_at?: string | null
          id?: string
          shortcut?: string | null
          tenant_id?: string | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          category?: string | null
          content?: string
          created_at?: string | null
          id?: string
          shortcut?: string | null
          tenant_id?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_macros_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          content: string
          created_at: string | null
          id: string
          is_internal: boolean | null
          message_type: string | null
          metadata: Json | null
          room_id: string
          sender_id: string | null
          sender_name: string | null
          sender_type: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          is_internal?: boolean | null
          message_type?: string | null
          metadata?: Json | null
          room_id: string
          sender_id?: string | null
          sender_name?: string | null
          sender_type: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          is_internal?: boolean | null
          message_type?: string | null
          metadata?: Json | null
          room_id?: string
          sender_id?: string | null
          sender_name?: string | null
          sender_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "chat_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_room_tags: {
        Row: {
          room_id: string
          tag_id: string
        }
        Insert: {
          room_id: string
          tag_id: string
        }
        Update: {
          room_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_room_tags_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "chat_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_room_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "chat_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_rooms: {
        Row: {
          assigned_at: string | null
          attendant_id: string | null
          closed_at: string | null
          company_contact_id: string | null
          contact_id: string | null
          created_at: string | null
          csat_comment: string | null
          csat_score: number | null
          id: string
          metadata: Json | null
          owner_user_id: string
          priority: string | null
          resolution_status: string | null
          started_at: string | null
          status: string | null
          tenant_id: string | null
          updated_at: string | null
          visitor_id: string
        }
        Insert: {
          assigned_at?: string | null
          attendant_id?: string | null
          closed_at?: string | null
          company_contact_id?: string | null
          contact_id?: string | null
          created_at?: string | null
          csat_comment?: string | null
          csat_score?: number | null
          id?: string
          metadata?: Json | null
          owner_user_id: string
          priority?: string | null
          resolution_status?: string | null
          started_at?: string | null
          status?: string | null
          tenant_id?: string | null
          updated_at?: string | null
          visitor_id: string
        }
        Update: {
          assigned_at?: string | null
          attendant_id?: string | null
          closed_at?: string | null
          company_contact_id?: string | null
          contact_id?: string | null
          created_at?: string | null
          csat_comment?: string | null
          csat_score?: number | null
          id?: string
          metadata?: Json | null
          owner_user_id?: string
          priority?: string | null
          resolution_status?: string | null
          started_at?: string | null
          status?: string | null
          tenant_id?: string | null
          updated_at?: string | null
          visitor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_rooms_attendant_id_fkey"
            columns: ["attendant_id"]
            isOneToOne: false
            referencedRelation: "attendant_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_rooms_company_contact_id_fkey"
            columns: ["company_contact_id"]
            isOneToOne: false
            referencedRelation: "company_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_rooms_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_rooms_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_rooms_visitor_id_fkey"
            columns: ["visitor_id"]
            isOneToOne: false
            referencedRelation: "chat_visitors"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_settings: {
        Row: {
          auto_assignment: boolean | null
          business_hours: Json | null
          created_at: string | null
          id: string
          max_queue_size: number | null
          offline_message: string | null
          require_approval: boolean | null
          tenant_id: string | null
          updated_at: string | null
          user_id: string
          welcome_message: string | null
        }
        Insert: {
          auto_assignment?: boolean | null
          business_hours?: Json | null
          created_at?: string | null
          id?: string
          max_queue_size?: number | null
          offline_message?: string | null
          require_approval?: boolean | null
          tenant_id?: string | null
          updated_at?: string | null
          user_id: string
          welcome_message?: string | null
        }
        Update: {
          auto_assignment?: boolean | null
          business_hours?: Json | null
          created_at?: string | null
          id?: string
          max_queue_size?: number | null
          offline_message?: string | null
          require_approval?: boolean | null
          tenant_id?: string | null
          updated_at?: string | null
          user_id?: string
          welcome_message?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_tags: {
        Row: {
          color: string | null
          created_at: string | null
          id: string
          name: string
          tenant_id: string | null
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          id?: string
          name: string
          tenant_id?: string | null
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string | null
          id?: string
          name?: string
          tenant_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_tags_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_visitors: {
        Row: {
          company_contact_id: string | null
          contact_id: string | null
          created_at: string | null
          department: string | null
          email: string | null
          id: string
          metadata: Json | null
          name: string
          owner_user_id: string
          phone: string | null
          role: string | null
          tenant_id: string | null
          visitor_token: string | null
        }
        Insert: {
          company_contact_id?: string | null
          contact_id?: string | null
          created_at?: string | null
          department?: string | null
          email?: string | null
          id?: string
          metadata?: Json | null
          name: string
          owner_user_id: string
          phone?: string | null
          role?: string | null
          tenant_id?: string | null
          visitor_token?: string | null
        }
        Update: {
          company_contact_id?: string | null
          contact_id?: string | null
          created_at?: string | null
          department?: string | null
          email?: string | null
          id?: string
          metadata?: Json | null
          name?: string
          owner_user_id?: string
          phone?: string | null
          role?: string | null
          tenant_id?: string | null
          visitor_token?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_visitors_company_contact_id_fkey"
            columns: ["company_contact_id"]
            isOneToOne: false
            referencedRelation: "company_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_visitors_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_visitors_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      company_contacts: {
        Row: {
          chat_avg_csat: number | null
          chat_last_at: string | null
          chat_total: number | null
          chat_visitor_id: string | null
          company_id: string
          created_at: string | null
          custom_fields: Json | null
          department: string | null
          email: string
          external_id: string | null
          id: string
          is_primary: boolean | null
          name: string
          phone: string | null
          public_token: string | null
          role: string | null
          tenant_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          chat_avg_csat?: number | null
          chat_last_at?: string | null
          chat_total?: number | null
          chat_visitor_id?: string | null
          company_id: string
          created_at?: string | null
          custom_fields?: Json | null
          department?: string | null
          email: string
          external_id?: string | null
          id?: string
          is_primary?: boolean | null
          name: string
          phone?: string | null
          public_token?: string | null
          role?: string | null
          tenant_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          chat_avg_csat?: number | null
          chat_last_at?: string | null
          chat_total?: number | null
          chat_visitor_id?: string | null
          company_id?: string
          created_at?: string | null
          custom_fields?: Json | null
          department?: string | null
          email?: string
          external_id?: string | null
          id?: string
          is_primary?: boolean | null
          name?: string
          phone?: string | null
          public_token?: string | null
          role?: string | null
          tenant_id?: string | null
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
          {
            foreignKeyName: "company_contacts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
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
          tenant_id: string | null
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
          tenant_id?: string | null
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
          tenant_id?: string | null
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
          {
            foreignKeyName: "contacts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      csms: {
        Row: {
          chat_max_conversations: number | null
          created_at: string | null
          department: string | null
          email: string
          hire_date: string | null
          id: string
          is_active: boolean | null
          is_chat_enabled: boolean | null
          name: string
          phone: string | null
          specialty: string[] | null
          tenant_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          chat_max_conversations?: number | null
          created_at?: string | null
          department?: string | null
          email: string
          hire_date?: string | null
          id?: string
          is_active?: boolean | null
          is_chat_enabled?: boolean | null
          name: string
          phone?: string | null
          specialty?: string[] | null
          tenant_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          chat_max_conversations?: number | null
          created_at?: string | null
          department?: string | null
          email?: string
          hire_date?: string | null
          id?: string
          is_active?: boolean | null
          is_chat_enabled?: boolean | null
          name?: string
          phone?: string | null
          specialty?: string[] | null
          tenant_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "csms_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
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
      tenants: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          logo_url: string | null
          name: string
          slug: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name: string
          slug?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name?: string
          slug?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      timeline_events: {
        Row: {
          contact_id: string
          created_at: string | null
          date: string
          description: string | null
          id: string
          metadata: Json | null
          tenant_id: string | null
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
          tenant_id?: string | null
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
          tenant_id?: string | null
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
          {
            foreignKeyName: "timeline_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
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
          tenant_id: string | null
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
          tenant_id?: string | null
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
          tenant_id?: string | null
          type?: Database["public"]["Enums"]["trail_type"] | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trail_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      trails: {
        Row: {
          campaign_id: string | null
          completed_at: string | null
          contact_id: string
          created_at: string | null
          id: string
          metadata: Json | null
          name: string
          progress_percentage: number | null
          started_at: string | null
          status: string | null
          tenant_id: string | null
          trail_template_id: string | null
          type: Database["public"]["Enums"]["trail_type"] | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          campaign_id?: string | null
          completed_at?: string | null
          contact_id: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          name: string
          progress_percentage?: number | null
          started_at?: string | null
          status?: string | null
          tenant_id?: string | null
          trail_template_id?: string | null
          type?: Database["public"]["Enums"]["trail_type"] | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          campaign_id?: string | null
          completed_at?: string | null
          contact_id?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          name?: string
          progress_percentage?: number | null
          started_at?: string | null
          status?: string | null
          tenant_id?: string | null
          trail_template_id?: string | null
          type?: Database["public"]["Enums"]["trail_type"] | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trails_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trails_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trails_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
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
          tenant_id: string | null
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
          tenant_id?: string | null
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
          tenant_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_email_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
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
          tenant_id: string | null
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
          tenant_id?: string | null
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
          tenant_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_notification_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      user_permissions: {
        Row: {
          can_delete: boolean | null
          can_edit: boolean | null
          can_manage: boolean | null
          can_view: boolean | null
          created_at: string | null
          granted_by: string | null
          id: string
          module: string
          tenant_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          can_delete?: boolean | null
          can_edit?: boolean | null
          can_manage?: boolean | null
          can_view?: boolean | null
          created_at?: string | null
          granted_by?: string | null
          id?: string
          module: string
          tenant_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          can_delete?: boolean | null
          can_edit?: boolean | null
          can_manage?: boolean | null
          can_view?: boolean | null
          created_at?: string | null
          granted_by?: string | null
          id?: string
          module?: string
          tenant_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_permissions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          department: string | null
          display_name: string | null
          email: string
          id: string
          invite_status: string | null
          invite_token: string | null
          invited_by: string | null
          is_active: boolean | null
          last_sign_in_at: string | null
          phone: string | null
          specialty: string[] | null
          tenant_id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          department?: string | null
          display_name?: string | null
          email: string
          id?: string
          invite_status?: string | null
          invite_token?: string | null
          invited_by?: string | null
          is_active?: boolean | null
          last_sign_in_at?: string | null
          phone?: string | null
          specialty?: string[] | null
          tenant_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          department?: string | null
          display_name?: string | null
          email?: string
          id?: string
          invite_status?: string | null
          invite_token?: string | null
          invited_by?: string | null
          is_active?: boolean | null
          last_sign_in_at?: string | null
          phone?: string | null
          specialty?: string[] | null
          tenant_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_tenant_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "attendant"
      timeline_event_type:
        | "meeting"
        | "email"
        | "call"
        | "contract"
        | "payment"
        | "activity"
        | "nps_response"
        | "chat_opened"
        | "chat_closed"
      trail_type: "default" | "overdue" | "attention" | "nps"
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
      app_role: ["admin", "attendant"],
      timeline_event_type: [
        "meeting",
        "email",
        "call",
        "contract",
        "payment",
        "activity",
        "nps_response",
        "chat_opened",
        "chat_closed",
      ],
      trail_type: ["default", "overdue", "attention", "nps"],
    },
  },
} as const

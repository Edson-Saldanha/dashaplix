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
      aform_conditional_rules: {
        Row: {
          action_type: string
          condition_value: string
          created_at: string
          form_id: string
          id: string
          source_question_id: string
          status_to_set: string | null
          tag_to_add: string | null
          target_question_id: string | null
          temperature_to_set: string | null
        }
        Insert: {
          action_type: string
          condition_value: string
          created_at?: string
          form_id: string
          id?: string
          source_question_id: string
          status_to_set?: string | null
          tag_to_add?: string | null
          target_question_id?: string | null
          temperature_to_set?: string | null
        }
        Update: {
          action_type?: string
          condition_value?: string
          created_at?: string
          form_id?: string
          id?: string
          source_question_id?: string
          status_to_set?: string | null
          tag_to_add?: string | null
          target_question_id?: string | null
          temperature_to_set?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "aform_conditional_rules_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "aform_forms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aform_conditional_rules_source_question_id_fkey"
            columns: ["source_question_id"]
            isOneToOne: false
            referencedRelation: "aform_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aform_conditional_rules_target_question_id_fkey"
            columns: ["target_question_id"]
            isOneToOne: false
            referencedRelation: "aform_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      aform_form_collaborators: {
        Row: {
          added_by: string | null
          created_at: string
          form_id: string
          user_id: string
        }
        Insert: {
          added_by?: string | null
          created_at?: string
          form_id: string
          user_id: string
        }
        Update: {
          added_by?: string | null
          created_at?: string
          form_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "aform_form_collaborators_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "aform_forms"
            referencedColumns: ["id"]
          },
        ]
      }
      aform_forms: {
        Row: {
          button_text: string
          created_at: string
          description: string | null
          final_message: string | null
          id: string
          initial_message: string | null
          logo_url: string | null
          name: string
          owner_id: string
          primary_color: string
          public_slug: string
          secondary_color: string
          status: string
          updated_at: string
        }
        Insert: {
          button_text?: string
          created_at?: string
          description?: string | null
          final_message?: string | null
          id?: string
          initial_message?: string | null
          logo_url?: string | null
          name: string
          owner_id: string
          primary_color?: string
          public_slug?: string
          secondary_color?: string
          status?: string
          updated_at?: string
        }
        Update: {
          button_text?: string
          created_at?: string
          description?: string | null
          final_message?: string | null
          id?: string
          initial_message?: string | null
          logo_url?: string | null
          name?: string
          owner_id?: string
          primary_color?: string
          public_slug?: string
          secondary_color?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      aform_lead_answers: {
        Row: {
          answer_value: string | null
          created_at: string
          id: string
          lead_id: string
          question_id: string
        }
        Insert: {
          answer_value?: string | null
          created_at?: string
          id?: string
          lead_id: string
          question_id: string
        }
        Update: {
          answer_value?: string | null
          created_at?: string
          id?: string
          lead_id?: string
          question_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "aform_lead_answers_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "aform_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aform_lead_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "aform_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      aform_lead_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          lead_id: string
          new_value: string | null
          old_value: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          lead_id: string
          new_value?: string | null
          old_value?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          lead_id?: string
          new_value?: string | null
          old_value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "aform_lead_events_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "aform_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      aform_lead_notes: {
        Row: {
          created_at: string
          id: string
          lead_id: string
          note: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          lead_id: string
          note: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          lead_id?: string
          note?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "aform_lead_notes_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "aform_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      aform_lead_tags: {
        Row: {
          created_at: string
          id: string
          lead_id: string
          tag_name: string
        }
        Insert: {
          created_at?: string
          id?: string
          lead_id: string
          tag_name: string
        }
        Update: {
          created_at?: string
          id?: string
          lead_id?: string
          tag_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "aform_lead_tags_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "aform_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      aform_leads: {
        Row: {
          created_at: string
          email: string | null
          form_id: string
          id: string
          name: string | null
          owner_id: string
          phone: string | null
          responsible_user_id: string | null
          status: string
          summary: string | null
          temperature: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          form_id: string
          id?: string
          name?: string | null
          owner_id: string
          phone?: string | null
          responsible_user_id?: string | null
          status?: string
          summary?: string | null
          temperature?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          form_id?: string
          id?: string
          name?: string | null
          owner_id?: string
          phone?: string | null
          responsible_user_id?: string | null
          status?: string
          summary?: string | null
          temperature?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "aform_leads_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "aform_forms"
            referencedColumns: ["id"]
          },
        ]
      }
      aform_question_options: {
        Row: {
          id: string
          option_text: string
          order_index: number
          question_id: string
        }
        Insert: {
          id?: string
          option_text: string
          order_index?: number
          question_id: string
        }
        Update: {
          id?: string
          option_text?: string
          order_index?: number
          question_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "aform_question_options_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "aform_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      aform_questions: {
        Row: {
          created_at: string
          field_type: string
          form_id: string
          id: string
          is_required: boolean
          order_index: number
          question_description: string | null
          question_text: string
          settings: Json
        }
        Insert: {
          created_at?: string
          field_type: string
          form_id: string
          id?: string
          is_required?: boolean
          order_index?: number
          question_description?: string | null
          question_text: string
          settings?: Json
        }
        Update: {
          created_at?: string
          field_type?: string
          form_id?: string
          id?: string
          is_required?: boolean
          order_index?: number
          question_description?: string | null
          question_text?: string
          settings?: Json
        }
        Relationships: [
          {
            foreignKeyName: "aform_questions_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "aform_forms"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_documents: {
        Row: {
          accounts_count: number | null
          ads_count: number | null
          cancel_fee_pct: number
          channels: Json
          contacts: Json
          contract_number: string
          contract_type: string
          contratada_address: string
          contratada_city: string
          contratada_doc: string
          contratada_name: string
          contratante_address: string | null
          contratante_city: string | null
          contratante_doc: string | null
          contratante_email: string | null
          contratante_name: string
          contratante_phone: string | null
          contratante_rep: string | null
          contratante_state: string | null
          contratante_zip: string | null
          created_at: string
          created_by: string | null
          due_date: string | null
          duration: string | null
          excluded_services: Json
          id: string
          included_services: Json
          installments: number | null
          internal_notes: string | null
          loyalty_period: string | null
          monthly_value: number | null
          notice_days: number
          optional_clauses: Json
          payment_method: string | null
          payment_notes: string | null
          per_account_billing: boolean | null
          platform: string | null
          proportional_adjust: boolean | null
          service_description: string | null
          service_hours: string | null
          single_account: boolean | null
          start_date: string
          status: Database["public"]["Enums"]["contract_doc_status"]
          total_value: number
          updated_at: string
        }
        Insert: {
          accounts_count?: number | null
          ads_count?: number | null
          cancel_fee_pct?: number
          channels?: Json
          contacts?: Json
          contract_number: string
          contract_type: string
          contratada_address?: string
          contratada_city?: string
          contratada_doc?: string
          contratada_name?: string
          contratante_address?: string | null
          contratante_city?: string | null
          contratante_doc?: string | null
          contratante_email?: string | null
          contratante_name: string
          contratante_phone?: string | null
          contratante_rep?: string | null
          contratante_state?: string | null
          contratante_zip?: string | null
          created_at?: string
          created_by?: string | null
          due_date?: string | null
          duration?: string | null
          excluded_services?: Json
          id?: string
          included_services?: Json
          installments?: number | null
          internal_notes?: string | null
          loyalty_period?: string | null
          monthly_value?: number | null
          notice_days?: number
          optional_clauses?: Json
          payment_method?: string | null
          payment_notes?: string | null
          per_account_billing?: boolean | null
          platform?: string | null
          proportional_adjust?: boolean | null
          service_description?: string | null
          service_hours?: string | null
          single_account?: boolean | null
          start_date?: string
          status?: Database["public"]["Enums"]["contract_doc_status"]
          total_value?: number
          updated_at?: string
        }
        Update: {
          accounts_count?: number | null
          ads_count?: number | null
          cancel_fee_pct?: number
          channels?: Json
          contacts?: Json
          contract_number?: string
          contract_type?: string
          contratada_address?: string
          contratada_city?: string
          contratada_doc?: string
          contratada_name?: string
          contratante_address?: string | null
          contratante_city?: string | null
          contratante_doc?: string | null
          contratante_email?: string | null
          contratante_name?: string
          contratante_phone?: string | null
          contratante_rep?: string | null
          contratante_state?: string | null
          contratante_zip?: string | null
          created_at?: string
          created_by?: string | null
          due_date?: string | null
          duration?: string | null
          excluded_services?: Json
          id?: string
          included_services?: Json
          installments?: number | null
          internal_notes?: string | null
          loyalty_period?: string | null
          monthly_value?: number | null
          notice_days?: number
          optional_clauses?: Json
          payment_method?: string | null
          payment_notes?: string | null
          per_account_billing?: boolean | null
          platform?: string | null
          proportional_adjust?: boolean | null
          service_description?: string | null
          service_hours?: string | null
          single_account?: boolean | null
          start_date?: string
          status?: Database["public"]["Enums"]["contract_doc_status"]
          total_value?: number
          updated_at?: string
        }
        Relationships: []
      }
      contracts: {
        Row: {
          closed_date: string
          contract_link: string | null
          contract_value: number
          created_at: string
          created_by: string | null
          customer_name: string
          id: string
          notes: string | null
          payment_method: string | null
          responsible: string | null
          service: string
          status: Database["public"]["Enums"]["contract_status"]
          updated_at: string
        }
        Insert: {
          closed_date?: string
          contract_link?: string | null
          contract_value: number
          created_at?: string
          created_by?: string | null
          customer_name: string
          id?: string
          notes?: string | null
          payment_method?: string | null
          responsible?: string | null
          service: string
          status?: Database["public"]["Enums"]["contract_status"]
          updated_at?: string
        }
        Update: {
          closed_date?: string
          contract_link?: string | null
          contract_value?: number
          created_at?: string
          created_by?: string | null
          customer_name?: string
          id?: string
          notes?: string | null
          payment_method?: string | null
          responsible?: string | null
          service?: string
          status?: Database["public"]["Enums"]["contract_status"]
          updated_at?: string
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          category: string
          created_at: string
          created_by: string | null
          description: string
          expense_date: string
          id: string
          is_recurring: boolean
          notes: string | null
          payment_method: string | null
          platform: string | null
          responsible: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          category: string
          created_at?: string
          created_by?: string | null
          description: string
          expense_date?: string
          id?: string
          is_recurring?: boolean
          notes?: string | null
          payment_method?: string | null
          platform?: string | null
          responsible?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string
          expense_date?: string
          id?: string
          is_recurring?: boolean
          notes?: string | null
          payment_method?: string | null
          platform?: string | null
          responsible?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      field_mappings: {
        Row: {
          created_at: string
          id: string
          integration_id: string
          source_field: string
          target_field: string
        }
        Insert: {
          created_at?: string
          id?: string
          integration_id: string
          source_field: string
          target_field: string
        }
        Update: {
          created_at?: string
          id?: string
          integration_id?: string
          source_field?: string
          target_field?: string
        }
        Relationships: [
          {
            foreignKeyName: "field_mappings_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "integrations"
            referencedColumns: ["id"]
          },
        ]
      }
      integrations: {
        Row: {
          created_at: string
          created_by: string | null
          events_count: number
          id: string
          is_active: boolean
          last_received_at: string | null
          platform_name: string
          security_token: string
          updated_at: string
          webhook_slug: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          events_count?: number
          id?: string
          is_active?: boolean
          last_received_at?: string | null
          platform_name: string
          security_token: string
          updated_at?: string
          webhook_slug: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          events_count?: number
          id?: string
          is_active?: boolean
          last_received_at?: string | null
          platform_name?: string
          security_token?: string
          updated_at?: string
          webhook_slug?: string
        }
        Relationships: []
      }
      leads: {
        Row: {
          company: string | null
          created_at: string
          created_by: string | null
          current_revenue: string | null
          email: string | null
          id: string
          main_difficulty: string | null
          name: string
          notes: string | null
          phone: string | null
          product_interest: string | null
          responsible: string | null
          source: string | null
          status: Database["public"]["Enums"]["lead_status"]
          updated_at: string
        }
        Insert: {
          company?: string | null
          created_at?: string
          created_by?: string | null
          current_revenue?: string | null
          email?: string | null
          id?: string
          main_difficulty?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          product_interest?: string | null
          responsible?: string | null
          source?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          updated_at?: string
        }
        Update: {
          company?: string | null
          created_at?: string
          created_by?: string | null
          current_revenue?: string | null
          email?: string | null
          id?: string
          main_difficulty?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          product_interest?: string | null
          responsible?: string | null
          source?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          updated_at?: string
        }
        Relationships: []
      }
      mentorados: {
        Row: {
          added_to_course: boolean
          added_to_group: boolean
          checklist_done: boolean
          created_at: string
          created_by: string | null
          email: string | null
          expiration_date: string | null
          id: string
          individual_meetings: string | null
          kit_brinde: boolean
          meeting_1_date: string | null
          meeting_2_date: string | null
          name: string
          notes: string | null
          onboarding_done: boolean
          payment_method: string | null
          phone: string | null
          plan: string | null
          plaquinha: boolean
          product: string | null
          purchase_date: string | null
          renewed: boolean
          responsible: string | null
          start_date: string | null
          status: Database["public"]["Enums"]["mentorado_status"]
          updated_at: string
        }
        Insert: {
          added_to_course?: boolean
          added_to_group?: boolean
          checklist_done?: boolean
          created_at?: string
          created_by?: string | null
          email?: string | null
          expiration_date?: string | null
          id?: string
          individual_meetings?: string | null
          kit_brinde?: boolean
          meeting_1_date?: string | null
          meeting_2_date?: string | null
          name: string
          notes?: string | null
          onboarding_done?: boolean
          payment_method?: string | null
          phone?: string | null
          plan?: string | null
          plaquinha?: boolean
          product?: string | null
          purchase_date?: string | null
          renewed?: boolean
          responsible?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["mentorado_status"]
          updated_at?: string
        }
        Update: {
          added_to_course?: boolean
          added_to_group?: boolean
          checklist_done?: boolean
          created_at?: string
          created_by?: string | null
          email?: string | null
          expiration_date?: string | null
          id?: string
          individual_meetings?: string | null
          kit_brinde?: boolean
          meeting_1_date?: string | null
          meeting_2_date?: string | null
          name?: string
          notes?: string | null
          onboarding_done?: boolean
          payment_method?: string | null
          phone?: string | null
          plan?: string | null
          plaquinha?: boolean
          product?: string | null
          purchase_date?: string | null
          renewed?: boolean
          responsible?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["mentorado_status"]
          updated_at?: string
        }
        Relationships: []
      }
      meta_ads_config: {
        Row: {
          account_name: string | null
          ad_account_id: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          last_sync_error: string | null
          last_synced_at: string | null
          updated_at: string
        }
        Insert: {
          account_name?: string | null
          ad_account_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          last_sync_error?: string | null
          last_synced_at?: string | null
          updated_at?: string
        }
        Update: {
          account_name?: string | null
          ad_account_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          last_sync_error?: string | null
          last_synced_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      meta_ads_spend: {
        Row: {
          ad_account_id: string
          clicks: number
          created_at: string
          currency: string | null
          id: string
          impressions: number
          reach: number
          spend: number
          spend_date: string
          synced_at: string
          updated_at: string
        }
        Insert: {
          ad_account_id: string
          clicks?: number
          created_at?: string
          currency?: string | null
          id?: string
          impressions?: number
          reach?: number
          spend?: number
          spend_date: string
          synced_at?: string
          updated_at?: string
        }
        Update: {
          ad_account_id?: string
          clicks?: number
          created_at?: string
          currency?: string | null
          id?: string
          impressions?: number
          reach?: number
          spend?: number
          spend_date?: string
          synced_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      sales: {
        Row: {
          created_at: string
          customer_email: string | null
          customer_name: string
          customer_phone: string | null
          gross_amount: number
          id: string
          installments_count: number
          net_amount: number
          paid_amount: number
          payment_method: string | null
          platform: string
          platform_fee: number
          product_name: string
          raw_payload: Json | null
          sale_date: string
          status: Database["public"]["Enums"]["sale_status"]
          traffic_source: string
          transaction_code: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_email?: string | null
          customer_name: string
          customer_phone?: string | null
          gross_amount?: number
          id?: string
          installments_count?: number
          net_amount?: number
          paid_amount?: number
          payment_method?: string | null
          platform: string
          platform_fee?: number
          product_name: string
          raw_payload?: Json | null
          sale_date?: string
          status?: Database["public"]["Enums"]["sale_status"]
          traffic_source?: string
          transaction_code?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_email?: string | null
          customer_name?: string
          customer_phone?: string | null
          gross_amount?: number
          id?: string
          installments_count?: number
          net_amount?: number
          paid_amount?: number
          payment_method?: string | null
          platform?: string
          platform_fee?: number
          product_name?: string
          raw_payload?: Json | null
          sale_date?: string
          status?: Database["public"]["Enums"]["sale_status"]
          traffic_source?: string
          transaction_code?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_page_access: {
        Row: {
          created_at: string
          page: string
          user_id: string
        }
        Insert: {
          created_at?: string
          page: string
          user_id: string
        }
        Update: {
          created_at?: string
          page?: string
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
      webhook_events: {
        Row: {
          event_type: string | null
          id: string
          integration_id: string | null
          payload: Json
          platform: string
          processed: boolean
          processing_error: string | null
          received_at: string
          sale_id: string | null
        }
        Insert: {
          event_type?: string | null
          id?: string
          integration_id?: string | null
          payload: Json
          platform: string
          processed?: boolean
          processing_error?: string | null
          received_at?: string
          sale_id?: string | null
        }
        Update: {
          event_type?: string | null
          id?: string
          integration_id?: string | null
          payload?: Json
          platform?: string
          processed?: boolean
          processing_error?: string | null
          received_at?: string
          sale_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "webhook_events_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "integrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "webhook_events_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      aform_is_collaborator: {
        Args: { _form_id: string; _user_id: string }
        Returns: boolean
      }
      aform_is_owner: {
        Args: { _form_id: string; _user_id: string }
        Returns: boolean
      }
      has_any_role: {
        Args: {
          _roles: Database["public"]["Enums"]["app_role"][]
          _user_id: string
        }
        Returns: boolean
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
      app_role: "admin" | "financeiro" | "comercial" | "operacional"
      contract_doc_status:
        | "rascunho"
        | "gerado"
        | "enviado"
        | "assinado"
        | "cancelado"
      contract_status: "ativo" | "pendente" | "concluido" | "cancelado"
      lead_status:
        | "novo"
        | "em_atendimento"
        | "qualificado"
        | "reuniao_marcada"
        | "proposta_enviada"
        | "contrato_fechado"
        | "perdido"
        | "sem_resposta"
      mentorado_status:
        | "ativo"
        | "reembolso"
        | "pendente"
        | "encerrado"
        | "cancelado"
      sale_status:
        | "aprovada"
        | "pendente"
        | "recusada"
        | "reembolsada"
        | "chargeback"
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
      app_role: ["admin", "financeiro", "comercial", "operacional"],
      contract_doc_status: [
        "rascunho",
        "gerado",
        "enviado",
        "assinado",
        "cancelado",
      ],
      contract_status: ["ativo", "pendente", "concluido", "cancelado"],
      lead_status: [
        "novo",
        "em_atendimento",
        "qualificado",
        "reuniao_marcada",
        "proposta_enviada",
        "contrato_fechado",
        "perdido",
        "sem_resposta",
      ],
      mentorado_status: [
        "ativo",
        "reembolso",
        "pendente",
        "encerrado",
        "cancelado",
      ],
      sale_status: [
        "aprovada",
        "pendente",
        "recusada",
        "reembolsada",
        "chargeback",
      ],
    },
  },
} as const

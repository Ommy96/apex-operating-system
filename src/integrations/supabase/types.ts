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
      academic_history: {
        Row: {
          academic_year: string
          child_id: string
          created_at: string
          created_by: string | null
          id: string
          new_academic_level: string | null
          new_grade: string
          notes: string | null
          previous_academic_level: string | null
          previous_grade: string | null
          progression_date: string
        }
        Insert: {
          academic_year: string
          child_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          new_academic_level?: string | null
          new_grade: string
          notes?: string | null
          previous_academic_level?: string | null
          previous_grade?: string | null
          progression_date?: string
        }
        Update: {
          academic_year?: string
          child_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          new_academic_level?: string | null
          new_grade?: string
          notes?: string | null
          previous_academic_level?: string | null
          previous_grade?: string | null
          progression_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "academic_history_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_history_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children_safe_view"
            referencedColumns: ["id"]
          },
        ]
      }
      academic_performance: {
        Row: {
          academic_year: string
          child_id: string
          created_at: string
          grade: string | null
          id: string
          organization_id: string
          recorded_by: string | null
          remarks: string | null
          score: number | null
          subject: string | null
          term: string
          updated_at: string
        }
        Insert: {
          academic_year: string
          child_id: string
          created_at?: string
          grade?: string | null
          id?: string
          organization_id: string
          recorded_by?: string | null
          remarks?: string | null
          score?: number | null
          subject?: string | null
          term: string
          updated_at?: string
        }
        Update: {
          academic_year?: string
          child_id?: string
          created_at?: string
          grade?: string | null
          id?: string
          organization_id?: string
          recorded_by?: string | null
          remarks?: string | null
          score?: number | null
          subject?: string | null
          term?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "academic_performance_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_performance_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children_safe_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_performance_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_performance_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations_public_view"
            referencedColumns: ["id"]
          },
        ]
      }
      activities: {
        Row: {
          completed_at: string | null
          county: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          facilitator_name: string | null
          facilitator_user_id: string | null
          id: string
          location: string | null
          name: string
          notes: string | null
          organization_id: string
          program_id: string | null
          project_id: string
          scheduled_at: string | null
          status: Database["public"]["Enums"]["activity_status"]
          sub_county: string | null
          type: Database["public"]["Enums"]["activity_type"]
          updated_at: string | null
        }
        Insert: {
          completed_at?: string | null
          county?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          facilitator_name?: string | null
          facilitator_user_id?: string | null
          id?: string
          location?: string | null
          name: string
          notes?: string | null
          organization_id: string
          program_id?: string | null
          project_id: string
          scheduled_at?: string | null
          status?: Database["public"]["Enums"]["activity_status"]
          sub_county?: string | null
          type: Database["public"]["Enums"]["activity_type"]
          updated_at?: string | null
        }
        Update: {
          completed_at?: string | null
          county?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          facilitator_name?: string | null
          facilitator_user_id?: string | null
          id?: string
          location?: string | null
          name?: string
          notes?: string | null
          organization_id?: string
          program_id?: string | null
          project_id?: string
          scheduled_at?: string | null
          status?: Database["public"]["Enums"]["activity_status"]
          sub_county?: string | null
          type?: Database["public"]["Enums"]["activity_type"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activities_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations_public_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "v_program_funding_summary"
            referencedColumns: ["program_id"]
          },
          {
            foreignKeyName: "activities_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_funding_summary"
            referencedColumns: ["project_id"]
          },
        ]
      }
      activity_disbursements: {
        Row: {
          activity_id: string
          beneficiary_id: string
          created_at: string | null
          created_by: string | null
          currency: string | null
          id: string
          kind: Database["public"]["Enums"]["disbursement_kind"]
          monetary_value: number | null
          notes: string | null
          organization_id: string
          quantity: number | null
          receipt_url: string | null
          received_at: string | null
          reference_no: string | null
          unit: string | null
        }
        Insert: {
          activity_id: string
          beneficiary_id: string
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          id?: string
          kind: Database["public"]["Enums"]["disbursement_kind"]
          monetary_value?: number | null
          notes?: string | null
          organization_id: string
          quantity?: number | null
          receipt_url?: string | null
          received_at?: string | null
          reference_no?: string | null
          unit?: string | null
        }
        Update: {
          activity_id?: string
          beneficiary_id?: string
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["disbursement_kind"]
          monetary_value?: number | null
          notes?: string | null
          organization_id?: string
          quantity?: number | null
          receipt_url?: string | null
          received_at?: string | null
          reference_no?: string | null
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_disbursements_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_disbursements_beneficiary_id_fkey"
            columns: ["beneficiary_id"]
            isOneToOne: false
            referencedRelation: "beneficiaries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_disbursements_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_disbursements_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations_public_view"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_participants: {
        Row: {
          activity_id: string
          arrival_at: string | null
          attended: boolean
          beneficiary_id: string
          created_at: string | null
          id: string
          notes: string | null
          organization_id: string
        }
        Insert: {
          activity_id: string
          arrival_at?: string | null
          attended?: boolean
          beneficiary_id: string
          created_at?: string | null
          id?: string
          notes?: string | null
          organization_id: string
        }
        Update: {
          activity_id?: string
          arrival_at?: string | null
          attended?: boolean
          beneficiary_id?: string
          created_at?: string | null
          id?: string
          notes?: string | null
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_participants_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_participants_beneficiary_id_fkey"
            columns: ["beneficiary_id"]
            isOneToOne: false
            referencedRelation: "beneficiaries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_participants_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_participants_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations_public_view"
            referencedColumns: ["id"]
          },
        ]
      }
      adult_dependants: {
        Row: {
          adult_id: string
          created_at: string
          id: string
          student_id: string
        }
        Insert: {
          adult_id: string
          created_at?: string
          id?: string
          student_id: string
        }
        Update: {
          adult_id?: string
          created_at?: string
          id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "adult_dependants_adult_id_fkey"
            columns: ["adult_id"]
            isOneToOne: false
            referencedRelation: "beneficiaries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "adult_dependants_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "beneficiaries"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_document_drafts: {
        Row: {
          content: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          document_type: string
          grant_id: string | null
          id: string
          model: string | null
          opportunity_id: string | null
          organization_id: string
          program_id: string | null
          project_id: string | null
          status: string | null
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          content?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          document_type: string
          grant_id?: string | null
          id?: string
          model?: string | null
          opportunity_id?: string | null
          organization_id: string
          program_id?: string | null
          project_id?: string | null
          status?: string | null
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          document_type?: string
          grant_id?: string | null
          id?: string
          model?: string | null
          opportunity_id?: string | null
          organization_id?: string
          program_id?: string | null
          project_id?: string | null
          status?: string | null
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_document_drafts_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "grant_opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      alert_instances: {
        Row: {
          alert_rule_id: string | null
          category: string | null
          created_at: string
          id: string
          is_read: boolean | null
          is_resolved: boolean | null
          message: string
          metadata: Json | null
          organization_id: string
          related_entity_id: string | null
          related_entity_type: string | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          title: string
        }
        Insert: {
          alert_rule_id?: string | null
          category?: string | null
          created_at?: string
          id?: string
          is_read?: boolean | null
          is_resolved?: boolean | null
          message: string
          metadata?: Json | null
          organization_id: string
          related_entity_id?: string | null
          related_entity_type?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          title: string
        }
        Update: {
          alert_rule_id?: string | null
          category?: string | null
          created_at?: string
          id?: string
          is_read?: boolean | null
          is_resolved?: boolean | null
          message?: string
          metadata?: Json | null
          organization_id?: string
          related_entity_id?: string | null
          related_entity_type?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "alert_instances_alert_rule_id_fkey"
            columns: ["alert_rule_id"]
            isOneToOne: false
            referencedRelation: "alert_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alert_instances_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alert_instances_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations_public_view"
            referencedColumns: ["id"]
          },
        ]
      }
      alert_rules: {
        Row: {
          category: string
          condition_config: Json | null
          condition_type: string
          cooldown_hours: number | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          last_triggered_at: string | null
          name: string
          notification_channels: string[] | null
          organization_id: string
          severity: string
          updated_at: string
        }
        Insert: {
          category?: string
          condition_config?: Json | null
          condition_type: string
          cooldown_hours?: number | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          last_triggered_at?: string | null
          name: string
          notification_channels?: string[] | null
          organization_id: string
          severity?: string
          updated_at?: string
        }
        Update: {
          category?: string
          condition_config?: Json | null
          condition_type?: string
          cooldown_hours?: number | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          last_triggered_at?: string | null
          name?: string
          notification_channels?: string[] | null
          organization_id?: string
          severity?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "alert_rules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alert_rules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations_public_view"
            referencedColumns: ["id"]
          },
        ]
      }
      analytics_report_runs: {
        Row: {
          error_message: string | null
          id: string
          organization_id: string
          recipients_count: number
          sent_at: string
          status: string
          subscription_id: string
        }
        Insert: {
          error_message?: string | null
          id?: string
          organization_id: string
          recipients_count?: number
          sent_at?: string
          status?: string
          subscription_id: string
        }
        Update: {
          error_message?: string | null
          id?: string
          organization_id?: string
          recipients_count?: number
          sent_at?: string
          status?: string
          subscription_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "analytics_report_runs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analytics_report_runs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations_public_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analytics_report_runs_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "analytics_report_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      analytics_report_subscriptions: {
        Row: {
          created_at: string
          created_by: string | null
          frequency: string
          id: string
          is_active: boolean
          last_sent_at: string | null
          name: string
          next_send_at: string | null
          organization_id: string
          recipients: string[]
          tab: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          frequency?: string
          id?: string
          is_active?: boolean
          last_sent_at?: string | null
          name: string
          next_send_at?: string | null
          organization_id: string
          recipients?: string[]
          tab?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          frequency?: string
          id?: string
          is_active?: boolean
          last_sent_at?: string | null
          name?: string
          next_send_at?: string | null
          organization_id?: string
          recipients?: string[]
          tab?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "analytics_report_subscriptions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analytics_report_subscriptions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations_public_view"
            referencedColumns: ["id"]
          },
        ]
      }
      analytics_saved_views: {
        Row: {
          created_at: string
          id: string
          name: string
          organization_id: string
          params: Json
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          organization_id: string
          params: Json
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          organization_id?: string
          params?: Json
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "analytics_saved_views_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analytics_saved_views_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations_public_view"
            referencedColumns: ["id"]
          },
        ]
      }
      api_usage_logs: {
        Row: {
          created_at: string
          endpoint: string
          id: string
          ip_address: string | null
          method: string
          organization_id: string | null
          request_size_bytes: number | null
          response_size_bytes: number | null
          response_time_ms: number | null
          status_code: number | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          endpoint: string
          id?: string
          ip_address?: string | null
          method: string
          organization_id?: string | null
          request_size_bytes?: number | null
          response_size_bytes?: number | null
          response_time_ms?: number | null
          status_code?: number | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          endpoint?: string
          id?: string
          ip_address?: string | null
          method?: string
          organization_id?: string | null
          request_size_bytes?: number | null
          response_size_bytes?: number | null
          response_time_ms?: number | null
          status_code?: number | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "api_usage_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "api_usage_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations_public_view"
            referencedColumns: ["id"]
          },
        ]
      }
      approval_requests: {
        Row: {
          approved_at: string | null
          approver_id: string | null
          created_at: string
          current_values: Json
          expires_at: string
          id: string
          priority: string
          reason: string | null
          rejected_at: string | null
          request_type: string
          requested_changes: Json
          requester_id: string
          reviewer_comments: string | null
          status: string
          target_entity_id: string
          target_entity_type: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approver_id?: string | null
          created_at?: string
          current_values?: Json
          expires_at?: string
          id?: string
          priority?: string
          reason?: string | null
          rejected_at?: string | null
          request_type: string
          requested_changes?: Json
          requester_id: string
          reviewer_comments?: string | null
          status?: string
          target_entity_id: string
          target_entity_type: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approver_id?: string | null
          created_at?: string
          current_values?: Json
          expires_at?: string
          id?: string
          priority?: string
          reason?: string | null
          rejected_at?: string | null
          request_type?: string
          requested_changes?: Json
          requester_id?: string
          reviewer_comments?: string | null
          status?: string
          target_entity_id?: string
          target_entity_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          created_at: string
          entity_id: string | null
          entity_type: string
          event_type: string
          id: string
          ip_address: string | null
          metadata: Json | null
          new_values: Json | null
          old_values: Json | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          entity_id?: string | null
          entity_type: string
          event_type: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          new_values?: Json | null
          old_values?: Json | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          event_type?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          new_values?: Json | null
          old_values?: Json | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      automation_logs: {
        Row: {
          actions_executed: Json | null
          error_message: string | null
          executed_at: string
          id: string
          organization_id: string
          rule_id: string | null
          rule_name: string | null
          status: string
          trigger_data: Json | null
          trigger_event: string
        }
        Insert: {
          actions_executed?: Json | null
          error_message?: string | null
          executed_at?: string
          id?: string
          organization_id: string
          rule_id?: string | null
          rule_name?: string | null
          status?: string
          trigger_data?: Json | null
          trigger_event: string
        }
        Update: {
          actions_executed?: Json | null
          error_message?: string | null
          executed_at?: string
          id?: string
          organization_id?: string
          rule_id?: string | null
          rule_name?: string | null
          status?: string
          trigger_data?: Json | null
          trigger_event?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations_public_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_logs_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "automation_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_rules: {
        Row: {
          actions: Json | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          last_triggered_at: string | null
          name: string
          organization_id: string
          trigger_conditions: Json | null
          trigger_count: number | null
          trigger_event: string
          updated_at: string
        }
        Insert: {
          actions?: Json | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          last_triggered_at?: string | null
          name: string
          organization_id: string
          trigger_conditions?: Json | null
          trigger_count?: number | null
          trigger_event: string
          updated_at?: string
        }
        Update: {
          actions?: Json | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          last_triggered_at?: string | null
          name?: string
          organization_id?: string
          trigger_conditions?: Json | null
          trigger_count?: number | null
          trigger_event?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_rules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_rules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations_public_view"
            referencedColumns: ["id"]
          },
        ]
      }
      beneficiaries: {
        Row: {
          academic_level:
            | Database["public"]["Enums"]["academic_level_type"]
            | null
          address: string | null
          amount_given: number | null
          background_image_url: string | null
          background_narrative: string | null
          beneficiary_category: string | null
          beneficiary_type: Database["public"]["Enums"]["beneficiary_type"]
          branch_id: string | null
          care_arrangement: Database["public"]["Enums"]["care_arrangement_type"]
          care_arrangement_set_at: string | null
          care_arrangement_set_by: string | null
          case_worker_name: string | null
          consent_date: string | null
          consent_given: boolean | null
          country: string | null
          county: string | null
          course_name: string | null
          created_at: string
          created_by: string | null
          date_of_birth: string | null
          deleted_at: string | null
          disability_status: string | null
          display_name: string
          email: string | null
          estate_village: string | null
          exit_reason: string | null
          family_status: string | null
          first_name: string | null
          funding_required: number | null
          future_ambition: string | null
          gender: Database["public"]["Enums"]["gender_type"] | null
          grade: string | null
          group_activities: string[] | null
          group_name: string | null
          group_schedule: string | null
          has_special_needs: boolean | null
          hiv_positive_since: number | null
          hiv_status: Database["public"]["Enums"]["hiv_status_type"] | null
          hobbies: string | null
          home_county: string | null
          household_id: string | null
          household_size: number | null
          id: string
          inactive_date: string | null
          inactive_reason: string | null
          income_level: string | null
          institution_contact_person: string | null
          institution_contact_phone: string | null
          institution_name: string | null
          institution_placement_date: string | null
          institution_type: string | null
          is_active: boolean | null
          last_name: string | null
          latitude: number | null
          leader_name: string | null
          leader_phone: string | null
          legacy_child_id: string | null
          location: string | null
          longitude: number | null
          marital_status: string | null
          member_count: number | null
          middle_name: string | null
          occupation: string | null
          organization_id: string
          other_medical_conditions: string | null
          phone: string | null
          photo_url: string | null
          primary_need: string | null
          registration_source: string | null
          religion: string | null
          source_of_income: string | null
          special_needs_details: string | null
          status: string
          student_id_number: string | null
          sub_county: string | null
          unique_id: string | null
          updated_at: string
          updated_by: string | null
          vulnerability_level: string | null
          vulnerability_tags: string[] | null
          year_enrolled: number | null
        }
        Insert: {
          academic_level?:
            | Database["public"]["Enums"]["academic_level_type"]
            | null
          address?: string | null
          amount_given?: number | null
          background_image_url?: string | null
          background_narrative?: string | null
          beneficiary_category?: string | null
          beneficiary_type: Database["public"]["Enums"]["beneficiary_type"]
          branch_id?: string | null
          care_arrangement?: Database["public"]["Enums"]["care_arrangement_type"]
          care_arrangement_set_at?: string | null
          care_arrangement_set_by?: string | null
          case_worker_name?: string | null
          consent_date?: string | null
          consent_given?: boolean | null
          country?: string | null
          county?: string | null
          course_name?: string | null
          created_at?: string
          created_by?: string | null
          date_of_birth?: string | null
          deleted_at?: string | null
          disability_status?: string | null
          display_name: string
          email?: string | null
          estate_village?: string | null
          exit_reason?: string | null
          family_status?: string | null
          first_name?: string | null
          funding_required?: number | null
          future_ambition?: string | null
          gender?: Database["public"]["Enums"]["gender_type"] | null
          grade?: string | null
          group_activities?: string[] | null
          group_name?: string | null
          group_schedule?: string | null
          has_special_needs?: boolean | null
          hiv_positive_since?: number | null
          hiv_status?: Database["public"]["Enums"]["hiv_status_type"] | null
          hobbies?: string | null
          home_county?: string | null
          household_id?: string | null
          household_size?: number | null
          id?: string
          inactive_date?: string | null
          inactive_reason?: string | null
          income_level?: string | null
          institution_contact_person?: string | null
          institution_contact_phone?: string | null
          institution_name?: string | null
          institution_placement_date?: string | null
          institution_type?: string | null
          is_active?: boolean | null
          last_name?: string | null
          latitude?: number | null
          leader_name?: string | null
          leader_phone?: string | null
          legacy_child_id?: string | null
          location?: string | null
          longitude?: number | null
          marital_status?: string | null
          member_count?: number | null
          middle_name?: string | null
          occupation?: string | null
          organization_id: string
          other_medical_conditions?: string | null
          phone?: string | null
          photo_url?: string | null
          primary_need?: string | null
          registration_source?: string | null
          religion?: string | null
          source_of_income?: string | null
          special_needs_details?: string | null
          status?: string
          student_id_number?: string | null
          sub_county?: string | null
          unique_id?: string | null
          updated_at?: string
          updated_by?: string | null
          vulnerability_level?: string | null
          vulnerability_tags?: string[] | null
          year_enrolled?: number | null
        }
        Update: {
          academic_level?:
            | Database["public"]["Enums"]["academic_level_type"]
            | null
          address?: string | null
          amount_given?: number | null
          background_image_url?: string | null
          background_narrative?: string | null
          beneficiary_category?: string | null
          beneficiary_type?: Database["public"]["Enums"]["beneficiary_type"]
          branch_id?: string | null
          care_arrangement?: Database["public"]["Enums"]["care_arrangement_type"]
          care_arrangement_set_at?: string | null
          care_arrangement_set_by?: string | null
          case_worker_name?: string | null
          consent_date?: string | null
          consent_given?: boolean | null
          country?: string | null
          county?: string | null
          course_name?: string | null
          created_at?: string
          created_by?: string | null
          date_of_birth?: string | null
          deleted_at?: string | null
          disability_status?: string | null
          display_name?: string
          email?: string | null
          estate_village?: string | null
          exit_reason?: string | null
          family_status?: string | null
          first_name?: string | null
          funding_required?: number | null
          future_ambition?: string | null
          gender?: Database["public"]["Enums"]["gender_type"] | null
          grade?: string | null
          group_activities?: string[] | null
          group_name?: string | null
          group_schedule?: string | null
          has_special_needs?: boolean | null
          hiv_positive_since?: number | null
          hiv_status?: Database["public"]["Enums"]["hiv_status_type"] | null
          hobbies?: string | null
          home_county?: string | null
          household_id?: string | null
          household_size?: number | null
          id?: string
          inactive_date?: string | null
          inactive_reason?: string | null
          income_level?: string | null
          institution_contact_person?: string | null
          institution_contact_phone?: string | null
          institution_name?: string | null
          institution_placement_date?: string | null
          institution_type?: string | null
          is_active?: boolean | null
          last_name?: string | null
          latitude?: number | null
          leader_name?: string | null
          leader_phone?: string | null
          legacy_child_id?: string | null
          location?: string | null
          longitude?: number | null
          marital_status?: string | null
          member_count?: number | null
          middle_name?: string | null
          occupation?: string | null
          organization_id?: string
          other_medical_conditions?: string | null
          phone?: string | null
          photo_url?: string | null
          primary_need?: string | null
          registration_source?: string | null
          religion?: string | null
          source_of_income?: string | null
          special_needs_details?: string | null
          status?: string
          student_id_number?: string | null
          sub_county?: string | null
          unique_id?: string | null
          updated_at?: string
          updated_by?: string | null
          vulnerability_level?: string | null
          vulnerability_tags?: string[] | null
          year_enrolled?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "beneficiaries_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "beneficiaries_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "beneficiaries_legacy_child_id_fkey"
            columns: ["legacy_child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "beneficiaries_legacy_child_id_fkey"
            columns: ["legacy_child_id"]
            isOneToOne: false
            referencedRelation: "children_safe_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "beneficiaries_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "beneficiaries_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations_public_view"
            referencedColumns: ["id"]
          },
        ]
      }
      beneficiary_academics: {
        Row: {
          academic_year: number
          beneficiary_id: string
          created_at: string
          created_by: string | null
          id: string
          organization_id: string
          out_of: number | null
          overall_grade: string | null
          position: number | null
          remarks: string | null
          term: string
          total_marks: number | null
          updated_at: string
        }
        Insert: {
          academic_year: number
          beneficiary_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          organization_id: string
          out_of?: number | null
          overall_grade?: string | null
          position?: number | null
          remarks?: string | null
          term: string
          total_marks?: number | null
          updated_at?: string
        }
        Update: {
          academic_year?: number
          beneficiary_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          organization_id?: string
          out_of?: number | null
          overall_grade?: string | null
          position?: number | null
          remarks?: string | null
          term?: string
          total_marks?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "beneficiary_academics_beneficiary_id_fkey"
            columns: ["beneficiary_id"]
            isOneToOne: false
            referencedRelation: "beneficiaries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "beneficiary_academics_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "beneficiary_academics_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations_public_view"
            referencedColumns: ["id"]
          },
        ]
      }
      beneficiary_baselines: {
        Row: {
          beneficiary_id: string
          captured_at: string
          captured_by: string | null
          enrollment_id: string | null
          id: string
          indicator_key: string
          indicator_label: string
          organization_id: string
          project_id: string
          unit: string | null
          value_numeric: number | null
          value_text: string | null
        }
        Insert: {
          beneficiary_id: string
          captured_at?: string
          captured_by?: string | null
          enrollment_id?: string | null
          id?: string
          indicator_key: string
          indicator_label: string
          organization_id: string
          project_id: string
          unit?: string | null
          value_numeric?: number | null
          value_text?: string | null
        }
        Update: {
          beneficiary_id?: string
          captured_at?: string
          captured_by?: string | null
          enrollment_id?: string | null
          id?: string
          indicator_key?: string
          indicator_label?: string
          organization_id?: string
          project_id?: string
          unit?: string | null
          value_numeric?: number | null
          value_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "beneficiary_baselines_beneficiary_id_fkey"
            columns: ["beneficiary_id"]
            isOneToOne: false
            referencedRelation: "beneficiaries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "beneficiary_baselines_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "beneficiary_services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "beneficiary_baselines_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "beneficiary_baselines_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations_public_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "beneficiary_baselines_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "beneficiary_baselines_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_funding_summary"
            referencedColumns: ["project_id"]
          },
        ]
      }
      beneficiary_cases: {
        Row: {
          assigned_to: string | null
          beneficiary_id: string
          case_number: string | null
          case_status: string
          case_type: string
          closed_date: string | null
          closure_reason: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          opened_date: string
          organization_id: string
          priority: string
          program_id: string | null
          summary: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          assigned_to?: string | null
          beneficiary_id: string
          case_number?: string | null
          case_status?: string
          case_type: string
          closed_date?: string | null
          closure_reason?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          opened_date?: string
          organization_id: string
          priority?: string
          program_id?: string | null
          summary?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          assigned_to?: string | null
          beneficiary_id?: string
          case_number?: string | null
          case_status?: string
          case_type?: string
          closed_date?: string | null
          closure_reason?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          opened_date?: string
          organization_id?: string
          priority?: string
          program_id?: string | null
          summary?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "beneficiary_cases_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "beneficiary_cases_beneficiary_id_fkey"
            columns: ["beneficiary_id"]
            isOneToOne: false
            referencedRelation: "beneficiaries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "beneficiary_cases_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "beneficiary_cases_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "beneficiary_cases_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations_public_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "beneficiary_cases_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "beneficiary_cases_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "v_program_funding_summary"
            referencedColumns: ["program_id"]
          },
          {
            foreignKeyName: "beneficiary_cases_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      beneficiary_donors: {
        Row: {
          amount_received: number | null
          beneficiary_id: string
          created_at: string
          created_by: string | null
          donation_date: string | null
          donor_name: string
          id: string
          notes: string | null
          organization_id: string
          program_id: string | null
          updated_at: string
        }
        Insert: {
          amount_received?: number | null
          beneficiary_id: string
          created_at?: string
          created_by?: string | null
          donation_date?: string | null
          donor_name: string
          id?: string
          notes?: string | null
          organization_id: string
          program_id?: string | null
          updated_at?: string
        }
        Update: {
          amount_received?: number | null
          beneficiary_id?: string
          created_at?: string
          created_by?: string | null
          donation_date?: string | null
          donor_name?: string
          id?: string
          notes?: string | null
          organization_id?: string
          program_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "beneficiary_donors_beneficiary_id_fkey"
            columns: ["beneficiary_id"]
            isOneToOne: false
            referencedRelation: "beneficiaries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "beneficiary_donors_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "beneficiary_donors_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations_public_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "beneficiary_donors_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "beneficiary_donors_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "v_program_funding_summary"
            referencedColumns: ["program_id"]
          },
        ]
      }
      beneficiary_field_values: {
        Row: {
          beneficiary_id: string
          created_at: string
          field_config_id: string
          id: string
          organization_id: string
          updated_at: string
          value: string | null
        }
        Insert: {
          beneficiary_id: string
          created_at?: string
          field_config_id: string
          id?: string
          organization_id: string
          updated_at?: string
          value?: string | null
        }
        Update: {
          beneficiary_id?: string
          created_at?: string
          field_config_id?: string
          id?: string
          organization_id?: string
          updated_at?: string
          value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "beneficiary_field_values_beneficiary_id_fkey"
            columns: ["beneficiary_id"]
            isOneToOne: false
            referencedRelation: "beneficiaries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "beneficiary_field_values_field_config_id_fkey"
            columns: ["field_config_id"]
            isOneToOne: false
            referencedRelation: "programme_field_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "beneficiary_field_values_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "beneficiary_field_values_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations_public_view"
            referencedColumns: ["id"]
          },
        ]
      }
      beneficiary_guardians: {
        Row: {
          beneficiary_id: string
          created_at: string
          guardian_id: string
          id: string
          is_primary: boolean | null
          relationship: string
        }
        Insert: {
          beneficiary_id: string
          created_at?: string
          guardian_id: string
          id?: string
          is_primary?: boolean | null
          relationship: string
        }
        Update: {
          beneficiary_id?: string
          created_at?: string
          guardian_id?: string
          id?: string
          is_primary?: boolean | null
          relationship?: string
        }
        Relationships: [
          {
            foreignKeyName: "beneficiary_guardians_beneficiary_id_fkey"
            columns: ["beneficiary_id"]
            isOneToOne: false
            referencedRelation: "beneficiaries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "beneficiary_guardians_guardian_id_fkey"
            columns: ["guardian_id"]
            isOneToOne: false
            referencedRelation: "guardians"
            referencedColumns: ["id"]
          },
        ]
      }
      beneficiary_out_of_system_contacts: {
        Row: {
          beneficiary_id: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          full_name: string
          id: string
          notes: string | null
          organization_id: string
          phone: string | null
          relationship_type: string | null
          updated_at: string
        }
        Insert: {
          beneficiary_id: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          full_name: string
          id?: string
          notes?: string | null
          organization_id: string
          phone?: string | null
          relationship_type?: string | null
          updated_at?: string
        }
        Update: {
          beneficiary_id?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          full_name?: string
          id?: string
          notes?: string | null
          organization_id?: string
          phone?: string | null
          relationship_type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "beneficiary_out_of_system_contacts_beneficiary_id_fkey"
            columns: ["beneficiary_id"]
            isOneToOne: false
            referencedRelation: "beneficiaries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "beneficiary_out_of_system_contacts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "beneficiary_out_of_system_contacts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations_public_view"
            referencedColumns: ["id"]
          },
        ]
      }
      beneficiary_progress_logs: {
        Row: {
          beneficiary_id: string
          category: string
          created_at: string
          description: string | null
          id: string
          log_date: string
          logged_by: string | null
          organization_id: string
          previous_value: number | null
          progress_value: number | null
          title: string
        }
        Insert: {
          beneficiary_id: string
          category: string
          created_at?: string
          description?: string | null
          id?: string
          log_date?: string
          logged_by?: string | null
          organization_id: string
          previous_value?: number | null
          progress_value?: number | null
          title: string
        }
        Update: {
          beneficiary_id?: string
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          log_date?: string
          logged_by?: string | null
          organization_id?: string
          previous_value?: number | null
          progress_value?: number | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "beneficiary_progress_logs_beneficiary_id_fkey"
            columns: ["beneficiary_id"]
            isOneToOne: false
            referencedRelation: "beneficiaries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "beneficiary_progress_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "beneficiary_progress_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations_public_view"
            referencedColumns: ["id"]
          },
        ]
      }
      beneficiary_progression_history: {
        Row: {
          academic_year: number
          beneficiary_id: string
          created_at: string
          created_by: string | null
          id: string
          is_repeating: boolean
          new_academic_level: string | null
          new_grade: string | null
          notes: string | null
          organization_id: string
          previous_academic_level: string | null
          previous_grade: string | null
          progression_date: string
          progression_type: string
        }
        Insert: {
          academic_year: number
          beneficiary_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_repeating?: boolean
          new_academic_level?: string | null
          new_grade?: string | null
          notes?: string | null
          organization_id: string
          previous_academic_level?: string | null
          previous_grade?: string | null
          progression_date?: string
          progression_type?: string
        }
        Update: {
          academic_year?: number
          beneficiary_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_repeating?: boolean
          new_academic_level?: string | null
          new_grade?: string | null
          notes?: string | null
          organization_id?: string
          previous_academic_level?: string | null
          previous_grade?: string | null
          progression_date?: string
          progression_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "beneficiary_progression_history_beneficiary_id_fkey"
            columns: ["beneficiary_id"]
            isOneToOne: false
            referencedRelation: "beneficiaries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "beneficiary_progression_history_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "beneficiary_progression_history_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations_public_view"
            referencedColumns: ["id"]
          },
        ]
      }
      beneficiary_relationships: {
        Row: {
          beneficiary_a_id: string
          beneficiary_b_id: string
          created_at: string | null
          created_by: string | null
          household_id: string | null
          id: string
          is_primary_household_link: boolean | null
          organization_id: string
          relationship_label: string | null
          relationship_type: string
        }
        Insert: {
          beneficiary_a_id: string
          beneficiary_b_id: string
          created_at?: string | null
          created_by?: string | null
          household_id?: string | null
          id?: string
          is_primary_household_link?: boolean | null
          organization_id: string
          relationship_label?: string | null
          relationship_type: string
        }
        Update: {
          beneficiary_a_id?: string
          beneficiary_b_id?: string
          created_at?: string | null
          created_by?: string | null
          household_id?: string | null
          id?: string
          is_primary_household_link?: boolean | null
          organization_id?: string
          relationship_label?: string | null
          relationship_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "beneficiary_relationships_beneficiary_a_id_fkey"
            columns: ["beneficiary_a_id"]
            isOneToOne: false
            referencedRelation: "beneficiaries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "beneficiary_relationships_beneficiary_b_id_fkey"
            columns: ["beneficiary_b_id"]
            isOneToOne: false
            referencedRelation: "beneficiaries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "beneficiary_relationships_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "beneficiary_relationships_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "beneficiary_relationships_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations_public_view"
            referencedColumns: ["id"]
          },
        ]
      }
      beneficiary_risk_scores: {
        Row: {
          academic_trend_score: number | null
          assessed_by: string | null
          assessment_date: string
          beneficiary_id: string
          created_at: string
          dropout_risk_score: number | null
          engagement_score: number | null
          followup_compliance_score: number | null
          id: string
          notes: string | null
          organization_id: string
          overall_risk_level: string | null
          risk_flags: Json | null
          updated_at: string
          vulnerability_index: number | null
        }
        Insert: {
          academic_trend_score?: number | null
          assessed_by?: string | null
          assessment_date?: string
          beneficiary_id: string
          created_at?: string
          dropout_risk_score?: number | null
          engagement_score?: number | null
          followup_compliance_score?: number | null
          id?: string
          notes?: string | null
          organization_id: string
          overall_risk_level?: string | null
          risk_flags?: Json | null
          updated_at?: string
          vulnerability_index?: number | null
        }
        Update: {
          academic_trend_score?: number | null
          assessed_by?: string | null
          assessment_date?: string
          beneficiary_id?: string
          created_at?: string
          dropout_risk_score?: number | null
          engagement_score?: number | null
          followup_compliance_score?: number | null
          id?: string
          notes?: string | null
          organization_id?: string
          overall_risk_level?: string | null
          risk_flags?: Json | null
          updated_at?: string
          vulnerability_index?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "beneficiary_risk_scores_beneficiary_id_fkey"
            columns: ["beneficiary_id"]
            isOneToOne: false
            referencedRelation: "beneficiaries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "beneficiary_risk_scores_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "beneficiary_risk_scores_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations_public_view"
            referencedColumns: ["id"]
          },
        ]
      }
      beneficiary_services: {
        Row: {
          activity_id: string | null
          beneficiary_id: string
          created_at: string
          created_by: string | null
          enrolled_date: string | null
          exit_date: string | null
          id: string
          notes: string | null
          organization_id: string
          program_id: string | null
          project_id: string | null
          project_name: string | null
          sponsor_donor_id: string | null
          sponsor_name: string | null
          sponsorship_amount: number | null
          sponsorship_currency: string | null
          sponsorship_end_date: string | null
          sponsorship_notes: string | null
          sponsorship_start_date: string | null
          sponsorship_status: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          activity_id?: string | null
          beneficiary_id: string
          created_at?: string
          created_by?: string | null
          enrolled_date?: string | null
          exit_date?: string | null
          id?: string
          notes?: string | null
          organization_id: string
          program_id?: string | null
          project_id?: string | null
          project_name?: string | null
          sponsor_donor_id?: string | null
          sponsor_name?: string | null
          sponsorship_amount?: number | null
          sponsorship_currency?: string | null
          sponsorship_end_date?: string | null
          sponsorship_notes?: string | null
          sponsorship_start_date?: string | null
          sponsorship_status?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          activity_id?: string | null
          beneficiary_id?: string
          created_at?: string
          created_by?: string | null
          enrolled_date?: string | null
          exit_date?: string | null
          id?: string
          notes?: string | null
          organization_id?: string
          program_id?: string | null
          project_id?: string | null
          project_name?: string | null
          sponsor_donor_id?: string | null
          sponsor_name?: string | null
          sponsorship_amount?: number | null
          sponsorship_currency?: string | null
          sponsorship_end_date?: string | null
          sponsorship_notes?: string | null
          sponsorship_start_date?: string | null
          sponsorship_status?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "beneficiary_services_beneficiary_id_fkey"
            columns: ["beneficiary_id"]
            isOneToOne: false
            referencedRelation: "beneficiaries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "beneficiary_services_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "beneficiary_services_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations_public_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "beneficiary_services_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "beneficiary_services_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "v_program_funding_summary"
            referencedColumns: ["program_id"]
          },
          {
            foreignKeyName: "beneficiary_services_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "beneficiary_services_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_funding_summary"
            referencedColumns: ["project_id"]
          },
        ]
      }
      beneficiary_siblings: {
        Row: {
          beneficiary_id: string
          created_at: string
          id: string
          relationship: string
          sibling_id: string
        }
        Insert: {
          beneficiary_id: string
          created_at?: string
          id?: string
          relationship: string
          sibling_id: string
        }
        Update: {
          beneficiary_id?: string
          created_at?: string
          id?: string
          relationship?: string
          sibling_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "beneficiary_siblings_beneficiary_id_fkey"
            columns: ["beneficiary_id"]
            isOneToOne: false
            referencedRelation: "beneficiaries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "beneficiary_siblings_sibling_id_fkey"
            columns: ["sibling_id"]
            isOneToOne: false
            referencedRelation: "beneficiaries"
            referencedColumns: ["id"]
          },
        ]
      }
      beneficiary_uploads: {
        Row: {
          beneficiary_id: string
          created_at: string
          description: string | null
          document_name: string
          document_type: string | null
          file_size: number | null
          file_url: string
          id: string
          organization_id: string
          uploaded_by: string | null
        }
        Insert: {
          beneficiary_id: string
          created_at?: string
          description?: string | null
          document_name: string
          document_type?: string | null
          file_size?: number | null
          file_url: string
          id?: string
          organization_id: string
          uploaded_by?: string | null
        }
        Update: {
          beneficiary_id?: string
          created_at?: string
          description?: string | null
          document_name?: string
          document_type?: string | null
          file_size?: number | null
          file_url?: string
          id?: string
          organization_id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "beneficiary_uploads_beneficiary_id_fkey"
            columns: ["beneficiary_id"]
            isOneToOne: false
            referencedRelation: "beneficiaries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "beneficiary_uploads_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "beneficiary_uploads_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations_public_view"
            referencedColumns: ["id"]
          },
        ]
      }
      beneficiary_visitations: {
        Row: {
          beneficiary_id: string
          challenges_identified: string | null
          created_at: string
          created_by: string | null
          follow_up_date: string | null
          follow_up_required: boolean | null
          id: string
          location: string | null
          observation_findings: string | null
          organization_id: string
          reason_for_visit: string | null
          recommendations: string | null
          staff_name: string | null
          updated_at: string
          visit_date: string
          visit_type: string
        }
        Insert: {
          beneficiary_id: string
          challenges_identified?: string | null
          created_at?: string
          created_by?: string | null
          follow_up_date?: string | null
          follow_up_required?: boolean | null
          id?: string
          location?: string | null
          observation_findings?: string | null
          organization_id: string
          reason_for_visit?: string | null
          recommendations?: string | null
          staff_name?: string | null
          updated_at?: string
          visit_date: string
          visit_type: string
        }
        Update: {
          beneficiary_id?: string
          challenges_identified?: string | null
          created_at?: string
          created_by?: string | null
          follow_up_date?: string | null
          follow_up_required?: boolean | null
          id?: string
          location?: string | null
          observation_findings?: string | null
          organization_id?: string
          reason_for_visit?: string | null
          recommendations?: string | null
          staff_name?: string | null
          updated_at?: string
          visit_date?: string
          visit_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "beneficiary_visitations_beneficiary_id_fkey"
            columns: ["beneficiary_id"]
            isOneToOne: false
            referencedRelation: "beneficiaries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "beneficiary_visitations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "beneficiary_visitations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations_public_view"
            referencedColumns: ["id"]
          },
        ]
      }
      board_action_items: {
        Row: {
          assigned_member_id: string | null
          assigned_to: string | null
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          due_date: string | null
          id: string
          organization_id: string
          priority: string | null
          report_id: string
          status: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          assigned_member_id?: string | null
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          organization_id: string
          priority?: string | null
          report_id: string
          status?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          assigned_member_id?: string | null
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          organization_id?: string
          priority?: string | null
          report_id?: string
          status?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "board_action_items_assigned_member_id_fkey"
            columns: ["assigned_member_id"]
            isOneToOne: false
            referencedRelation: "board_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "board_action_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "board_action_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations_public_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "board_action_items_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "board_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      board_members: {
        Row: {
          access_token: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          invited_at: string | null
          is_active: boolean | null
          last_access_at: string | null
          organization_id: string
          role: string
          title: string | null
          token_expires_at: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          access_token?: string | null
          created_at?: string
          email: string
          full_name: string
          id?: string
          invited_at?: string | null
          is_active?: boolean | null
          last_access_at?: string | null
          organization_id: string
          role?: string
          title?: string | null
          token_expires_at?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          access_token?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          invited_at?: string | null
          is_active?: boolean | null
          last_access_at?: string | null
          organization_id?: string
          role?: string
          title?: string | null
          token_expires_at?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "board_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "board_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations_public_view"
            referencedColumns: ["id"]
          },
        ]
      }
      board_report_approvals: {
        Row: {
          board_member_id: string
          comments: string | null
          decision: string
          id: string
          organization_id: string
          report_id: string
          voted_at: string | null
        }
        Insert: {
          board_member_id: string
          comments?: string | null
          decision: string
          id?: string
          organization_id: string
          report_id: string
          voted_at?: string | null
        }
        Update: {
          board_member_id?: string
          comments?: string | null
          decision?: string
          id?: string
          organization_id?: string
          report_id?: string
          voted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "board_report_approvals_board_member_id_fkey"
            columns: ["board_member_id"]
            isOneToOne: false
            referencedRelation: "board_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "board_report_approvals_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "board_report_approvals_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations_public_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "board_report_approvals_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "board_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      board_report_comments: {
        Row: {
          author_email: string
          author_name: string
          board_member_id: string | null
          content: string
          created_at: string | null
          id: string
          is_resolved: boolean | null
          organization_id: string
          parent_comment_id: string | null
          report_id: string
          resolved_at: string | null
          resolved_by: string | null
          section_id: string | null
          updated_at: string | null
        }
        Insert: {
          author_email: string
          author_name: string
          board_member_id?: string | null
          content: string
          created_at?: string | null
          id?: string
          is_resolved?: boolean | null
          organization_id: string
          parent_comment_id?: string | null
          report_id: string
          resolved_at?: string | null
          resolved_by?: string | null
          section_id?: string | null
          updated_at?: string | null
        }
        Update: {
          author_email?: string
          author_name?: string
          board_member_id?: string | null
          content?: string
          created_at?: string | null
          id?: string
          is_resolved?: boolean | null
          organization_id?: string
          parent_comment_id?: string | null
          report_id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          section_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "board_report_comments_board_member_id_fkey"
            columns: ["board_member_id"]
            isOneToOne: false
            referencedRelation: "board_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "board_report_comments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "board_report_comments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations_public_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "board_report_comments_parent_comment_id_fkey"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "board_report_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "board_report_comments_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "board_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "board_report_comments_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "board_report_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      board_report_sections: {
        Row: {
          content: Json | null
          created_at: string
          id: string
          is_visible: boolean | null
          narrative: string | null
          organization_id: string
          report_id: string
          section_type: string
          sort_order: number | null
          title: string
          updated_at: string
        }
        Insert: {
          content?: Json | null
          created_at?: string
          id?: string
          is_visible?: boolean | null
          narrative?: string | null
          organization_id: string
          report_id: string
          section_type: string
          sort_order?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          content?: Json | null
          created_at?: string
          id?: string
          is_visible?: boolean | null
          narrative?: string | null
          organization_id?: string
          report_id?: string
          section_type?: string
          sort_order?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "board_report_sections_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "board_report_sections_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations_public_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "board_report_sections_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "board_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      board_report_versions: {
        Row: {
          content: Json
          created_at: string | null
          created_by: string | null
          id: string
          report_id: string
          version_number: number
        }
        Insert: {
          content?: Json
          created_at?: string | null
          created_by?: string | null
          id?: string
          report_id: string
          version_number?: number
        }
        Update: {
          content?: Json
          created_at?: string | null
          created_by?: string | null
          id?: string
          report_id?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "board_report_versions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "board_report_versions_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "board_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      board_reports: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          created_by: string | null
          description: string | null
          executive_summary: string | null
          id: string
          meeting_agenda: string | null
          meeting_date: string | null
          metadata: Json | null
          organization_id: string
          published_at: string | null
          report_period_end: string
          report_period_start: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          executive_summary?: string | null
          id?: string
          meeting_agenda?: string | null
          meeting_date?: string | null
          metadata?: Json | null
          organization_id: string
          published_at?: string | null
          report_period_end: string
          report_period_start: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          executive_summary?: string | null
          id?: string
          meeting_agenda?: string | null
          meeting_date?: string | null
          metadata?: Json | null
          organization_id?: string
          published_at?: string | null
          report_period_end?: string
          report_period_start?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "board_reports_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "board_reports_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations_public_view"
            referencedColumns: ["id"]
          },
        ]
      }
      branch_staff: {
        Row: {
          assigned_at: string | null
          branch_id: string
          created_at: string
          id: string
          is_primary: boolean | null
          organization_id: string
          role: string | null
          user_id: string
        }
        Insert: {
          assigned_at?: string | null
          branch_id: string
          created_at?: string
          id?: string
          is_primary?: boolean | null
          organization_id: string
          role?: string | null
          user_id: string
        }
        Update: {
          assigned_at?: string | null
          branch_id?: string
          created_at?: string
          id?: string
          is_primary?: boolean | null
          organization_id?: string
          role?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "branch_staff_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branch_staff_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branch_staff_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations_public_view"
            referencedColumns: ["id"]
          },
        ]
      }
      branches: {
        Row: {
          address: string | null
          code: string | null
          created_at: string
          email: string | null
          id: string
          is_active: boolean | null
          manager_name: string | null
          manager_user_id: string | null
          metadata: Json | null
          name: string
          organization_id: string
          phone: string | null
          region_id: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          code?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean | null
          manager_name?: string | null
          manager_user_id?: string | null
          metadata?: Json | null
          name: string
          organization_id: string
          phone?: string | null
          region_id?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          code?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean | null
          manager_name?: string | null
          manager_user_id?: string | null
          metadata?: Json | null
          name?: string
          organization_id?: string
          phone?: string | null
          region_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "branches_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branches_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations_public_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branches_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          organization_id: string
          parent_category_id: string | null
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          organization_id: string
          parent_category_id?: string | null
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          organization_id?: string
          parent_category_id?: string | null
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "budget_categories_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_categories_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations_public_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_categories_parent_category_id_fkey"
            columns: ["parent_category_id"]
            isOneToOne: false
            referencedRelation: "budget_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_line_items: {
        Row: {
          actual_spent: number | null
          budget_id: string
          category_id: string | null
          created_at: string
          description: string
          id: string
          notes: string | null
          quantity: number | null
          sort_order: number | null
          total_amount: number | null
          unit_cost: number
          updated_at: string
        }
        Insert: {
          actual_spent?: number | null
          budget_id: string
          category_id?: string | null
          created_at?: string
          description: string
          id?: string
          notes?: string | null
          quantity?: number | null
          sort_order?: number | null
          total_amount?: number | null
          unit_cost?: number
          updated_at?: string
        }
        Update: {
          actual_spent?: number | null
          budget_id?: string
          category_id?: string | null
          created_at?: string
          description?: string
          id?: string
          notes?: string | null
          quantity?: number | null
          sort_order?: number | null
          total_amount?: number | null
          unit_cost?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "budget_line_items_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "budgets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_line_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "budget_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      budgets: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          created_by: string | null
          currency: string
          description: string | null
          fiscal_year: number
          id: string
          name: string
          notes: string | null
          organization_id: string
          program_id: string | null
          project_id: string | null
          revision_number: number | null
          status: string
          total_amount: number
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string | null
          fiscal_year: number
          id?: string
          name: string
          notes?: string | null
          organization_id: string
          program_id?: string | null
          project_id?: string | null
          revision_number?: number | null
          status?: string
          total_amount?: number
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string | null
          fiscal_year?: number
          id?: string
          name?: string
          notes?: string | null
          organization_id?: string
          program_id?: string | null
          project_id?: string | null
          revision_number?: number | null
          status?: string
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "budgets_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budgets_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations_public_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budgets_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budgets_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "v_program_funding_summary"
            referencedColumns: ["program_id"]
          },
          {
            foreignKeyName: "budgets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budgets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_funding_summary"
            referencedColumns: ["project_id"]
          },
        ]
      }
      campaign_recipients: {
        Row: {
          campaign_id: string
          channel: string
          created_at: string
          delivered_at: string | null
          error_message: string | null
          id: string
          metadata: Json | null
          organization_id: string
          recipient_email: string | null
          recipient_name: string
          recipient_phone: string | null
          sent_at: string | null
          status: string
        }
        Insert: {
          campaign_id: string
          channel: string
          created_at?: string
          delivered_at?: string | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          organization_id: string
          recipient_email?: string | null
          recipient_name: string
          recipient_phone?: string | null
          sent_at?: string | null
          status?: string
        }
        Update: {
          campaign_id?: string
          channel?: string
          created_at?: string
          delivered_at?: string | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          organization_id?: string
          recipient_email?: string | null
          recipient_name?: string
          recipient_phone?: string | null
          sent_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_recipients_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_recipients_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_recipients_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations_public_view"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          body: string
          channel: string
          created_at: string
          created_by: string
          delivered_count: number | null
          description: string | null
          failed_count: number | null
          id: string
          metadata: Json | null
          name: string
          organization_id: string
          scheduled_at: string | null
          sent_at: string | null
          sent_count: number | null
          status: string
          subject: string | null
          target_audience: string
          target_filters: Json | null
          total_recipients: number | null
          updated_at: string
        }
        Insert: {
          body: string
          channel: string
          created_at?: string
          created_by: string
          delivered_count?: number | null
          description?: string | null
          failed_count?: number | null
          id?: string
          metadata?: Json | null
          name: string
          organization_id: string
          scheduled_at?: string | null
          sent_at?: string | null
          sent_count?: number | null
          status?: string
          subject?: string | null
          target_audience?: string
          target_filters?: Json | null
          total_recipients?: number | null
          updated_at?: string
        }
        Update: {
          body?: string
          channel?: string
          created_at?: string
          created_by?: string
          delivered_count?: number | null
          description?: string | null
          failed_count?: number | null
          id?: string
          metadata?: Json | null
          name?: string
          organization_id?: string
          scheduled_at?: string | null
          sent_at?: string | null
          sent_count?: number | null
          status?: string
          subject?: string | null
          target_audience?: string
          target_filters?: Json | null
          total_recipients?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations_public_view"
            referencedColumns: ["id"]
          },
        ]
      }
      case_entries: {
        Row: {
          action_required: string | null
          beneficiary_id: string
          case_id: string
          concern_level: string | null
          created_at: string
          deleted_at: string | null
          documents: string[]
          entered_by: string
          entry_date: string
          entry_type: string
          follow_up_completed: boolean
          follow_up_completed_date: string | null
          follow_up_date: string | null
          id: string
          latitude: number | null
          linked_activity_id: string | null
          linked_form_submission_id: string | null
          location_county: string | null
          location_sub_county: string | null
          longitude: number | null
          organization_id: string
          photos: string[]
          referral_date: string | null
          referral_organisation: string | null
          referral_outcome: string | null
          referral_to: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          structured_data: Json
          summary: string
          updated_at: string
          updated_by: string | null
          visit_type: string | null
        }
        Insert: {
          action_required?: string | null
          beneficiary_id: string
          case_id: string
          concern_level?: string | null
          created_at?: string
          deleted_at?: string | null
          documents?: string[]
          entered_by: string
          entry_date?: string
          entry_type: string
          follow_up_completed?: boolean
          follow_up_completed_date?: string | null
          follow_up_date?: string | null
          id?: string
          latitude?: number | null
          linked_activity_id?: string | null
          linked_form_submission_id?: string | null
          location_county?: string | null
          location_sub_county?: string | null
          longitude?: number | null
          organization_id: string
          photos?: string[]
          referral_date?: string | null
          referral_organisation?: string | null
          referral_outcome?: string | null
          referral_to?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          structured_data?: Json
          summary: string
          updated_at?: string
          updated_by?: string | null
          visit_type?: string | null
        }
        Update: {
          action_required?: string | null
          beneficiary_id?: string
          case_id?: string
          concern_level?: string | null
          created_at?: string
          deleted_at?: string | null
          documents?: string[]
          entered_by?: string
          entry_date?: string
          entry_type?: string
          follow_up_completed?: boolean
          follow_up_completed_date?: string | null
          follow_up_date?: string | null
          id?: string
          latitude?: number | null
          linked_activity_id?: string | null
          linked_form_submission_id?: string | null
          location_county?: string | null
          location_sub_county?: string | null
          longitude?: number | null
          organization_id?: string
          photos?: string[]
          referral_date?: string | null
          referral_organisation?: string | null
          referral_outcome?: string | null
          referral_to?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          structured_data?: Json
          summary?: string
          updated_at?: string
          updated_by?: string | null
          visit_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "case_entries_beneficiary_id_fkey"
            columns: ["beneficiary_id"]
            isOneToOne: false
            referencedRelation: "beneficiaries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_entries_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "beneficiary_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_entries_entered_by_fkey"
            columns: ["entered_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "case_entries_linked_form_submission_id_fkey"
            columns: ["linked_form_submission_id"]
            isOneToOne: false
            referencedRelation: "me_form_submissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_entries_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_entries_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations_public_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_entries_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "case_entries_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      cash_transfer_batches: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          batch_name: string
          created_at: string | null
          created_by: string | null
          grant_id: string | null
          id: string
          org_id: string
          project_id: string | null
          status: string | null
          total_amount_kes: number | null
          total_recipients: number | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          batch_name: string
          created_at?: string | null
          created_by?: string | null
          grant_id?: string | null
          id?: string
          org_id: string
          project_id?: string | null
          status?: string | null
          total_amount_kes?: number | null
          total_recipients?: number | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          batch_name?: string
          created_at?: string | null
          created_by?: string | null
          grant_id?: string | null
          id?: string
          org_id?: string
          project_id?: string | null
          status?: string | null
          total_amount_kes?: number | null
          total_recipients?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cash_transfer_batches_grant_id_fkey"
            columns: ["grant_id"]
            isOneToOne: false
            referencedRelation: "grants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_transfer_batches_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_transfer_batches_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations_public_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_transfer_batches_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_transfer_batches_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_funding_summary"
            referencedColumns: ["project_id"]
          },
        ]
      }
      cash_transfers: {
        Row: {
          amount_kes: number
          batch_id: string | null
          batch_name: string | null
          beneficiary_id: string | null
          completed_at: string | null
          created_at: string | null
          failure_reason: string | null
          grant_id: string | null
          id: string
          initiated_at: string | null
          initiated_by: string | null
          mpesa_result_code: string | null
          mpesa_result_desc: string | null
          mpesa_transaction_id: string | null
          org_id: string
          phone_number: string
          project_id: string | null
          purpose: string | null
          recipient_name: string
          status: string | null
        }
        Insert: {
          amount_kes: number
          batch_id?: string | null
          batch_name?: string | null
          beneficiary_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          failure_reason?: string | null
          grant_id?: string | null
          id?: string
          initiated_at?: string | null
          initiated_by?: string | null
          mpesa_result_code?: string | null
          mpesa_result_desc?: string | null
          mpesa_transaction_id?: string | null
          org_id: string
          phone_number: string
          project_id?: string | null
          purpose?: string | null
          recipient_name: string
          status?: string | null
        }
        Update: {
          amount_kes?: number
          batch_id?: string | null
          batch_name?: string | null
          beneficiary_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          failure_reason?: string | null
          grant_id?: string | null
          id?: string
          initiated_at?: string | null
          initiated_by?: string | null
          mpesa_result_code?: string | null
          mpesa_result_desc?: string | null
          mpesa_transaction_id?: string | null
          org_id?: string
          phone_number?: string
          project_id?: string | null
          purpose?: string | null
          recipient_name?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cash_transfers_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "cash_transfer_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_transfers_beneficiary_id_fkey"
            columns: ["beneficiary_id"]
            isOneToOne: false
            referencedRelation: "beneficiaries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_transfers_grant_id_fkey"
            columns: ["grant_id"]
            isOneToOne: false
            referencedRelation: "grants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_transfers_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_transfers_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations_public_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_transfers_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_transfers_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_funding_summary"
            referencedColumns: ["project_id"]
          },
        ]
      }
      child_programs: {
        Row: {
          child_id: string
          completion_date: string | null
          created_at: string
          created_by: string | null
          enrollment_date: string
          id: string
          notes: string | null
          program_id: string
          status: string
          updated_at: string
        }
        Insert: {
          child_id: string
          completion_date?: string | null
          created_at?: string
          created_by?: string | null
          enrollment_date?: string
          id?: string
          notes?: string | null
          program_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          child_id?: string
          completion_date?: string | null
          created_at?: string
          created_by?: string | null
          enrollment_date?: string
          id?: string
          notes?: string | null
          program_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "child_programs_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "child_programs_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children_safe_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "child_programs_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "child_programs_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "v_program_funding_summary"
            referencedColumns: ["program_id"]
          },
        ]
      }
      children: {
        Row: {
          academic_level:
            | Database["public"]["Enums"]["academic_level_type"]
            | null
          address: string | null
          contact: string | null
          course_name: string | null
          created_at: string
          created_by: string | null
          date_of_birth: string | null
          donation_received_ksh: number | null
          donor: string | null
          enrollment_date: string
          first_name: string
          gender: Database["public"]["Enums"]["gender_type"] | null
          grade: string | null
          guardian_email: string | null
          guardian_name: string | null
          guardian_phone: string | null
          id: string
          inactive_date: string | null
          inactive_reason: string | null
          institution_name: string | null
          last_name: string
          medical_notes: string | null
          organization_id: string
          parental_status:
            | Database["public"]["Enums"]["parental_status_type"]
            | null
          photo_url: string | null
          receives_hbc: boolean | null
          receives_shopping: boolean | null
          receives_transport: boolean | null
          relation: string | null
          replacement_status: string | null
          residence: Database["public"]["Enums"]["residence_type"] | null
          special_condition: string | null
          special_needs: string | null
          status: string
          student_id: string | null
          updated_at: string
        }
        Insert: {
          academic_level?:
            | Database["public"]["Enums"]["academic_level_type"]
            | null
          address?: string | null
          contact?: string | null
          course_name?: string | null
          created_at?: string
          created_by?: string | null
          date_of_birth?: string | null
          donation_received_ksh?: number | null
          donor?: string | null
          enrollment_date?: string
          first_name: string
          gender?: Database["public"]["Enums"]["gender_type"] | null
          grade?: string | null
          guardian_email?: string | null
          guardian_name?: string | null
          guardian_phone?: string | null
          id?: string
          inactive_date?: string | null
          inactive_reason?: string | null
          institution_name?: string | null
          last_name: string
          medical_notes?: string | null
          organization_id?: string
          parental_status?:
            | Database["public"]["Enums"]["parental_status_type"]
            | null
          photo_url?: string | null
          receives_hbc?: boolean | null
          receives_shopping?: boolean | null
          receives_transport?: boolean | null
          relation?: string | null
          replacement_status?: string | null
          residence?: Database["public"]["Enums"]["residence_type"] | null
          special_condition?: string | null
          special_needs?: string | null
          status?: string
          student_id?: string | null
          updated_at?: string
        }
        Update: {
          academic_level?:
            | Database["public"]["Enums"]["academic_level_type"]
            | null
          address?: string | null
          contact?: string | null
          course_name?: string | null
          created_at?: string
          created_by?: string | null
          date_of_birth?: string | null
          donation_received_ksh?: number | null
          donor?: string | null
          enrollment_date?: string
          first_name?: string
          gender?: Database["public"]["Enums"]["gender_type"] | null
          grade?: string | null
          guardian_email?: string | null
          guardian_name?: string | null
          guardian_phone?: string | null
          id?: string
          inactive_date?: string | null
          inactive_reason?: string | null
          institution_name?: string | null
          last_name?: string
          medical_notes?: string | null
          organization_id?: string
          parental_status?:
            | Database["public"]["Enums"]["parental_status_type"]
            | null
          photo_url?: string | null
          receives_hbc?: boolean | null
          receives_shopping?: boolean | null
          receives_transport?: boolean | null
          relation?: string | null
          replacement_status?: string | null
          residence?: Database["public"]["Enums"]["residence_type"] | null
          special_condition?: string | null
          special_needs?: string | null
          status?: string
          student_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "children_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "children_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations_public_view"
            referencedColumns: ["id"]
          },
        ]
      }
      complaints: {
        Row: {
          assigned_to: string | null
          beneficiary_id: string | null
          category: string
          created_at: string | null
          deleted_at: string | null
          description: string
          id: string
          is_anonymous: boolean | null
          organization_id: string
          priority: string
          resolution_notes: string | null
          resolved_at: string | null
          status: string
          submitted_by_contact: string | null
          submitted_by_name: string | null
        }
        Insert: {
          assigned_to?: string | null
          beneficiary_id?: string | null
          category: string
          created_at?: string | null
          deleted_at?: string | null
          description: string
          id?: string
          is_anonymous?: boolean | null
          organization_id: string
          priority?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          status?: string
          submitted_by_contact?: string | null
          submitted_by_name?: string | null
        }
        Update: {
          assigned_to?: string | null
          beneficiary_id?: string | null
          category?: string
          created_at?: string | null
          deleted_at?: string | null
          description?: string
          id?: string
          is_anonymous?: boolean | null
          organization_id?: string
          priority?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          status?: string
          submitted_by_contact?: string | null
          submitted_by_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "complaints_beneficiary_id_fkey"
            columns: ["beneficiary_id"]
            isOneToOne: false
            referencedRelation: "beneficiaries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "complaints_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "complaints_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations_public_view"
            referencedColumns: ["id"]
          },
        ]
      }
      compliance_exports: {
        Row: {
          created_at: string
          export_type: string
          exported_by: string | null
          file_url: string | null
          id: string
          metadata: Json | null
          organization_id: string
          record_count: number | null
        }
        Insert: {
          created_at?: string
          export_type: string
          exported_by?: string | null
          file_url?: string | null
          id?: string
          metadata?: Json | null
          organization_id: string
          record_count?: number | null
        }
        Update: {
          created_at?: string
          export_type?: string
          exported_by?: string | null
          file_url?: string | null
          id?: string
          metadata?: Json | null
          organization_id?: string
          record_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "compliance_exports_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_exports_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations_public_view"
            referencedColumns: ["id"]
          },
        ]
      }
      consent_records: {
        Row: {
          beneficiary_id: string | null
          consent_date: string | null
          consent_given: boolean
          consent_purpose: string
          consent_type: string
          created_at: string
          evidence_url: string | null
          expiry_date: string | null
          id: string
          metadata: Json | null
          organization_id: string
          recorded_by: string | null
          status: string
          subject_email: string | null
          subject_name: string
          updated_at: string
          withdrawal_date: string | null
          withdrawal_reason: string | null
        }
        Insert: {
          beneficiary_id?: string | null
          consent_date?: string | null
          consent_given?: boolean
          consent_purpose: string
          consent_type: string
          created_at?: string
          evidence_url?: string | null
          expiry_date?: string | null
          id?: string
          metadata?: Json | null
          organization_id: string
          recorded_by?: string | null
          status?: string
          subject_email?: string | null
          subject_name: string
          updated_at?: string
          withdrawal_date?: string | null
          withdrawal_reason?: string | null
        }
        Update: {
          beneficiary_id?: string | null
          consent_date?: string | null
          consent_given?: boolean
          consent_purpose?: string
          consent_type?: string
          created_at?: string
          evidence_url?: string | null
          expiry_date?: string | null
          id?: string
          metadata?: Json | null
          organization_id?: string
          recorded_by?: string | null
          status?: string
          subject_email?: string | null
          subject_name?: string
          updated_at?: string
          withdrawal_date?: string | null
          withdrawal_reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "consent_records_beneficiary_id_fkey"
            columns: ["beneficiary_id"]
            isOneToOne: false
            referencedRelation: "beneficiaries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consent_records_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consent_records_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations_public_view"
            referencedColumns: ["id"]
          },
        ]
      }
      currency_rates: {
        Row: {
          base_currency: string
          fetched_at: string | null
          id: string
          rate: number
          target_currency: string
        }
        Insert: {
          base_currency: string
          fetched_at?: string | null
          id?: string
          rate: number
          target_currency: string
        }
        Update: {
          base_currency?: string
          fetched_at?: string | null
          id?: string
          rate?: number
          target_currency?: string
        }
        Relationships: []
      }
      data_access_requests: {
        Row: {
          affected_tables: string[] | null
          beneficiary_id: string | null
          completed_at: string | null
          created_at: string
          data_deleted: boolean | null
          data_exported: boolean | null
          due_date: string | null
          id: string
          metadata: Json | null
          organization_id: string
          priority: string
          reason: string | null
          request_type: string
          requested_by: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          reviewer_notes: string | null
          status: string
          subject_email: string | null
          subject_identifier: string | null
          subject_name: string
          updated_at: string
        }
        Insert: {
          affected_tables?: string[] | null
          beneficiary_id?: string | null
          completed_at?: string | null
          created_at?: string
          data_deleted?: boolean | null
          data_exported?: boolean | null
          due_date?: string | null
          id?: string
          metadata?: Json | null
          organization_id: string
          priority?: string
          reason?: string | null
          request_type: string
          requested_by?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_notes?: string | null
          status?: string
          subject_email?: string | null
          subject_identifier?: string | null
          subject_name: string
          updated_at?: string
        }
        Update: {
          affected_tables?: string[] | null
          beneficiary_id?: string | null
          completed_at?: string | null
          created_at?: string
          data_deleted?: boolean | null
          data_exported?: boolean | null
          due_date?: string | null
          id?: string
          metadata?: Json | null
          organization_id?: string
          priority?: string
          reason?: string | null
          request_type?: string
          requested_by?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_notes?: string | null
          status?: string
          subject_email?: string | null
          subject_identifier?: string | null
          subject_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "data_access_requests_beneficiary_id_fkey"
            columns: ["beneficiary_id"]
            isOneToOne: false
            referencedRelation: "beneficiaries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "data_access_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "data_access_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations_public_view"
            referencedColumns: ["id"]
          },
        ]
      }
      data_quality_flags: {
        Row: {
          created_at: string
          entity_id: string
          entity_type: string
          flag_message: string
          flag_severity: string
          flag_type: string
          flagged_by: string
          id: string
          is_resolved: boolean
          organization_id: string
          resolution_note: string | null
          resolved_at: string | null
          resolved_by: string | null
        }
        Insert: {
          created_at?: string
          entity_id: string
          entity_type: string
          flag_message: string
          flag_severity?: string
          flag_type: string
          flagged_by?: string
          id?: string
          is_resolved?: boolean
          organization_id: string
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
        }
        Update: {
          created_at?: string
          entity_id?: string
          entity_type?: string
          flag_message?: string
          flag_severity?: string
          flag_type?: string
          flagged_by?: string
          id?: string
          is_resolved?: boolean
          organization_id?: string
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "data_quality_flags_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "data_quality_flags_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations_public_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "data_quality_flags_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      data_retention_policies: {
        Row: {
          action_on_expiry: string
          created_at: string
          created_by: string | null
          data_category: string
          description: string | null
          id: string
          is_active: boolean
          last_executed_at: string | null
          name: string
          organization_id: string
          retention_period_days: number
          updated_at: string
        }
        Insert: {
          action_on_expiry?: string
          created_at?: string
          created_by?: string | null
          data_category: string
          description?: string | null
          id?: string
          is_active?: boolean
          last_executed_at?: string | null
          name: string
          organization_id: string
          retention_period_days: number
          updated_at?: string
        }
        Update: {
          action_on_expiry?: string
          created_at?: string
          created_by?: string | null
          data_category?: string
          description?: string | null
          id?: string
          is_active?: boolean
          last_executed_at?: string | null
          name?: string
          organization_id?: string
          retention_period_days?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "data_retention_policies_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "data_retention_policies_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations_public_view"
            referencedColumns: ["id"]
          },
        ]
      }
      dedup_decisions: {
        Row: {
          beneficiary_id_a: string
          beneficiary_id_b: string
          created_at: string | null
          decided_by: string | null
          decision: string
          id: string
          organization_id: string
        }
        Insert: {
          beneficiary_id_a: string
          beneficiary_id_b: string
          created_at?: string | null
          decided_by?: string | null
          decision: string
          id?: string
          organization_id: string
        }
        Update: {
          beneficiary_id_a?: string
          beneficiary_id_b?: string
          created_at?: string | null
          decided_by?: string | null
          decision?: string
          id?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dedup_decisions_beneficiary_id_a_fkey"
            columns: ["beneficiary_id_a"]
            isOneToOne: false
            referencedRelation: "beneficiaries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dedup_decisions_beneficiary_id_b_fkey"
            columns: ["beneficiary_id_b"]
            isOneToOne: false
            referencedRelation: "beneficiaries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dedup_decisions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dedup_decisions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations_public_view"
            referencedColumns: ["id"]
          },
        ]
      }
      disaggregation_categories: {
        Row: {
          created_at: string | null
          id: string
          name: string
          org_id: string
          values: Json
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          org_id: string
          values?: Json
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          org_id?: string
          values?: Json
        }
        Relationships: [
          {
            foreignKeyName: "disaggregation_categories_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disaggregation_categories_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations_public_view"
            referencedColumns: ["id"]
          },
        ]
      }
      dismissed_household_suggestions: {
        Row: {
          beneficiary_a_id: string
          beneficiary_b_id: string
          created_at: string | null
          id: string
          organization_id: string
          user_id: string
        }
        Insert: {
          beneficiary_a_id: string
          beneficiary_b_id: string
          created_at?: string | null
          id?: string
          organization_id: string
          user_id: string
        }
        Update: {
          beneficiary_a_id?: string
          beneficiary_b_id?: string
          created_at?: string | null
          id?: string
          organization_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dismissed_household_suggestions_beneficiary_a_id_fkey"
            columns: ["beneficiary_a_id"]
            isOneToOne: false
            referencedRelation: "beneficiaries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dismissed_household_suggestions_beneficiary_b_id_fkey"
            columns: ["beneficiary_b_id"]
            isOneToOne: false
            referencedRelation: "beneficiaries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dismissed_household_suggestions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dismissed_household_suggestions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations_public_view"
            referencedColumns: ["id"]
          },
        ]
      }
      document_access_logs: {
        Row: {
          action: string
          created_at: string
          document_id: string
          id: string
          metadata: Json | null
          organization_id: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          document_id: string
          id?: string
          metadata?: Json | null
          organization_id: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          document_id?: string
          id?: string
          metadata?: Json | null
          organization_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_access_logs_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "managed_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_access_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_access_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations_public_view"
            referencedColumns: ["id"]
          },
        ]
      }
      document_versions: {
        Row: {
          change_notes: string | null
          created_at: string
          document_id: string
          file_name: string
          file_size: number | null
          file_type: string | null
          file_url: string
          id: string
          uploaded_by: string | null
          version_number: number
        }
        Insert: {
          change_notes?: string | null
          created_at?: string
          document_id: string
          file_name: string
          file_size?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          uploaded_by?: string | null
          version_number: number
        }
        Update: {
          change_notes?: string | null
          created_at?: string
          document_id?: string
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          uploaded_by?: string | null
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "document_versions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "managed_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          category: string | null
          child_id: string | null
          created_at: string
          description: string | null
          family_adoption_id: string | null
          file_name: string
          file_size: number | null
          file_type: string | null
          file_url: string
          id: string
          title: string
          uploaded_by: string | null
        }
        Insert: {
          category?: string | null
          child_id?: string | null
          created_at?: string
          description?: string | null
          family_adoption_id?: string | null
          file_name: string
          file_size?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          title: string
          uploaded_by?: string | null
        }
        Update: {
          category?: string | null
          child_id?: string | null
          created_at?: string
          description?: string | null
          family_adoption_id?: string | null
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          title?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children_safe_view"
            referencedColumns: ["id"]
          },
        ]
      }
      donation_campaigns: {
        Row: {
          beneficiary_id: string | null
          created_at: string
          created_by: string | null
          currency: string
          deleted_at: string | null
          donor_count: number
          end_date: string | null
          id: string
          image_url: string | null
          organization_id: string
          program_id: string | null
          project_id: string | null
          raised_amount: number
          slug: string
          status: string
          story: string | null
          target_amount: number
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          beneficiary_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          deleted_at?: string | null
          donor_count?: number
          end_date?: string | null
          id?: string
          image_url?: string | null
          organization_id: string
          program_id?: string | null
          project_id?: string | null
          raised_amount?: number
          slug: string
          status?: string
          story?: string | null
          target_amount?: number
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          beneficiary_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          deleted_at?: string | null
          donor_count?: number
          end_date?: string | null
          id?: string
          image_url?: string | null
          organization_id?: string
          program_id?: string | null
          project_id?: string | null
          raised_amount?: number
          slug?: string
          status?: string
          story?: string | null
          target_amount?: number
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "donation_campaigns_beneficiary_id_fkey"
            columns: ["beneficiary_id"]
            isOneToOne: false
            referencedRelation: "beneficiaries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "donation_campaigns_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "donation_campaigns_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations_public_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "donation_campaigns_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "donation_campaigns_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "v_program_funding_summary"
            referencedColumns: ["program_id"]
          },
          {
            foreignKeyName: "donation_campaigns_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "donation_campaigns_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_funding_summary"
            referencedColumns: ["project_id"]
          },
        ]
      }
      donations: {
        Row: {
          amount: number
          campaign_id: string | null
          completed_at: string | null
          created_at: string
          currency: string
          donor_email: string | null
          donor_name: string
          donor_phone: string | null
          id: string
          is_anonymous: boolean
          message: string | null
          metadata: Json
          organization_id: string
          provider: string
          provider_reference: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          campaign_id?: string | null
          completed_at?: string | null
          created_at?: string
          currency?: string
          donor_email?: string | null
          donor_name: string
          donor_phone?: string | null
          id?: string
          is_anonymous?: boolean
          message?: string | null
          metadata?: Json
          organization_id: string
          provider?: string
          provider_reference?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          campaign_id?: string | null
          completed_at?: string | null
          created_at?: string
          currency?: string
          donor_email?: string | null
          donor_name?: string
          donor_phone?: string | null
          id?: string
          is_anonymous?: boolean
          message?: string | null
          metadata?: Json
          organization_id?: string
          provider?: string
          provider_reference?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "donations_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "donation_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "donations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "donations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations_public_view"
            referencedColumns: ["id"]
          },
        ]
      }
      donor_accounts: {
        Row: {
          created_at: string | null
          donor_name: string
          email: string
          id: string
          is_active: boolean | null
          last_login_at: string | null
          organization_id: string
          phone: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          donor_name: string
          email: string
          id?: string
          is_active?: boolean | null
          last_login_at?: string | null
          organization_id: string
          phone?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          donor_name?: string
          email?: string
          id?: string
          is_active?: boolean | null
          last_login_at?: string | null
          organization_id?: string
          phone?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "donor_accounts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "donor_accounts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations_public_view"
            referencedColumns: ["id"]
          },
        ]
      }
      donor_report_packs: {
        Row: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          donor_name: string | null
          grant_id: string | null
          id: string
          narrative_challenges: string | null
          narrative_executive_summary: string | null
          narrative_lessons: string | null
          narrative_next_steps: string | null
          organization_id: string
          pdf_url: string | null
          period_end: string
          period_start: string
          program_id: string | null
          project_id: string | null
          snapshot_json: Json | null
          status: string
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          donor_name?: string | null
          grant_id?: string | null
          id?: string
          narrative_challenges?: string | null
          narrative_executive_summary?: string | null
          narrative_lessons?: string | null
          narrative_next_steps?: string | null
          organization_id: string
          pdf_url?: string | null
          period_end: string
          period_start: string
          program_id?: string | null
          project_id?: string | null
          snapshot_json?: Json | null
          status?: string
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          donor_name?: string | null
          grant_id?: string | null
          id?: string
          narrative_challenges?: string | null
          narrative_executive_summary?: string | null
          narrative_lessons?: string | null
          narrative_next_steps?: string | null
          organization_id?: string
          pdf_url?: string | null
          period_end?: string
          period_start?: string
          program_id?: string | null
          project_id?: string | null
          snapshot_json?: Json | null
          status?: string
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "donor_report_packs_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "donor_report_packs_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "v_program_funding_summary"
            referencedColumns: ["program_id"]
          },
          {
            foreignKeyName: "donor_report_packs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "donor_report_packs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_funding_summary"
            referencedColumns: ["project_id"]
          },
        ]
      }
      donor_report_runs: {
        Row: {
          created_at: string
          deleted_at: string | null
          generated_by: string | null
          generated_data: Json | null
          id: string
          is_deleted: boolean
          notes: string | null
          organization_id: string
          report_period_end: string
          report_period_start: string
          sent_at: string | null
          sent_to: string[] | null
          status: string
          template_id: string | null
          template_name: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          generated_by?: string | null
          generated_data?: Json | null
          id?: string
          is_deleted?: boolean
          notes?: string | null
          organization_id: string
          report_period_end: string
          report_period_start: string
          sent_at?: string | null
          sent_to?: string[] | null
          status?: string
          template_id?: string | null
          template_name?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          generated_by?: string | null
          generated_data?: Json | null
          id?: string
          is_deleted?: boolean
          notes?: string | null
          organization_id?: string
          report_period_end?: string
          report_period_start?: string
          sent_at?: string | null
          sent_to?: string[] | null
          status?: string
          template_id?: string | null
          template_name?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "donor_report_runs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "donor_report_runs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations_public_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "donor_report_runs_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "donor_report_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      donor_report_templates: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          donor_name: string | null
          id: string
          include_beneficiary_stats: boolean | null
          include_financials: boolean | null
          include_photos: boolean | null
          include_program_progress: boolean | null
          is_active: boolean | null
          name: string
          organization_id: string
          program_id: string | null
          sections: Json | null
          template_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          donor_name?: string | null
          id?: string
          include_beneficiary_stats?: boolean | null
          include_financials?: boolean | null
          include_photos?: boolean | null
          include_program_progress?: boolean | null
          is_active?: boolean | null
          name: string
          organization_id: string
          program_id?: string | null
          sections?: Json | null
          template_type?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          donor_name?: string | null
          id?: string
          include_beneficiary_stats?: boolean | null
          include_financials?: boolean | null
          include_photos?: boolean | null
          include_program_progress?: boolean | null
          is_active?: boolean | null
          name?: string
          organization_id?: string
          program_id?: string | null
          sections?: Json | null
          template_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "donor_report_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "donor_report_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations_public_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "donor_report_templates_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "donor_report_templates_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "v_program_funding_summary"
            referencedColumns: ["program_id"]
          },
        ]
      }
      entities: {
        Row: {
          created_at: string
          created_by: string | null
          data: Json
          display_name: string
          entity_type_id: string
          id: string
          linked_child_id: string | null
          organization_id: string
          status: string | null
          tags: string[] | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          data?: Json
          display_name: string
          entity_type_id: string
          id?: string
          linked_child_id?: string | null
          organization_id: string
          status?: string | null
          tags?: string[] | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          data?: Json
          display_name?: string
          entity_type_id?: string
          id?: string
          linked_child_id?: string | null
          organization_id?: string
          status?: string | null
          tags?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "entities_entity_type_id_fkey"
            columns: ["entity_type_id"]
            isOneToOne: false
            referencedRelation: "entity_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entities_linked_child_id_fkey"
            columns: ["linked_child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entities_linked_child_id_fkey"
            columns: ["linked_child_id"]
            isOneToOne: false
            referencedRelation: "children_safe_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entities_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entities_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations_public_view"
            referencedColumns: ["id"]
          },
        ]
      }
      entity_relationships: {
        Row: {
          created_at: string
          id: string
          metadata: Json | null
          organization_id: string
          relationship_type: string
          source_entity_id: string
          target_entity_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          metadata?: Json | null
          organization_id: string
          relationship_type: string
          source_entity_id: string
          target_entity_id: string
        }
        Update: {
          created_at?: string
          id?: string
          metadata?: Json | null
          organization_id?: string
          relationship_type?: string
          source_entity_id?: string
          target_entity_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "entity_relationships_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entity_relationships_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations_public_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entity_relationships_source_entity_id_fkey"
            columns: ["source_entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entity_relationships_target_entity_id_fkey"
            columns: ["target_entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
        ]
      }
      entity_types: {
        Row: {
          color: string | null
          created_at: string
          created_by: string | null
          description: string | null
          field_schema: Json
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          organization_id: string
          settings: Json | null
          slug: string
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          field_schema?: Json
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          organization_id: string
          settings?: Json | null
          slug: string
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          field_schema?: Json
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          organization_id?: string
          settings?: Json | null
          slug?: string
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "entity_types_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entity_types_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations_public_view"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_claims: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          claim_date: string
          claim_title: string
          created_at: string | null
          currency: string | null
          deleted_at: string | null
          grant_id: string | null
          id: string
          items: Json | null
          notes: string | null
          org_id: string
          paid_at: string | null
          project_id: string | null
          receipt_urls: string[] | null
          rejection_reason: string | null
          staff_id: string
          status: string | null
          submitted_at: string | null
          total_amount: number
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          claim_date?: string
          claim_title: string
          created_at?: string | null
          currency?: string | null
          deleted_at?: string | null
          grant_id?: string | null
          id?: string
          items?: Json | null
          notes?: string | null
          org_id: string
          paid_at?: string | null
          project_id?: string | null
          receipt_urls?: string[] | null
          rejection_reason?: string | null
          staff_id: string
          status?: string | null
          submitted_at?: string | null
          total_amount?: number
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          claim_date?: string
          claim_title?: string
          created_at?: string | null
          currency?: string | null
          deleted_at?: string | null
          grant_id?: string | null
          id?: string
          items?: Json | null
          notes?: string | null
          org_id?: string
          paid_at?: string | null
          project_id?: string | null
          receipt_urls?: string[] | null
          rejection_reason?: string | null
          staff_id?: string
          status?: string | null
          submitted_at?: string | null
          total_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "expense_claims_grant_id_fkey"
            columns: ["grant_id"]
            isOneToOne: false
            referencedRelation: "grants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_claims_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_claims_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations_public_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_claims_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_claims_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_funding_summary"
            referencedColumns: ["project_id"]
          },
        ]
      }
      expenses: {
        Row: {
          activity_id: string | null
          amount: number
          approved_at: string | null
          approved_by: string | null
          budget_id: string | null
          budget_line_item_id: string | null
          category_id: string | null
          created_at: string
          created_by: string | null
          currency: string
          deleted_at: string | null
          description: string | null
          expense_date: string
          id: string
          notes: string | null
          organization_id: string
          payment_method: string | null
          program_id: string | null
          project_id: string | null
          receipt_file_name: string | null
          receipt_url: string | null
          reference_number: string | null
          reimbursement_date: string | null
          rejection_reason: string | null
          status: string
          submitted_by: string | null
          title: string
          updated_at: string
          updated_by: string | null
          vendor: string | null
        }
        Insert: {
          activity_id?: string | null
          amount: number
          approved_at?: string | null
          approved_by?: string | null
          budget_id?: string | null
          budget_line_item_id?: string | null
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          deleted_at?: string | null
          description?: string | null
          expense_date?: string
          id?: string
          notes?: string | null
          organization_id: string
          payment_method?: string | null
          program_id?: string | null
          project_id?: string | null
          receipt_file_name?: string | null
          receipt_url?: string | null
          reference_number?: string | null
          reimbursement_date?: string | null
          rejection_reason?: string | null
          status?: string
          submitted_by?: string | null
          title: string
          updated_at?: string
          updated_by?: string | null
          vendor?: string | null
        }
        Update: {
          activity_id?: string | null
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          budget_id?: string | null
          budget_line_item_id?: string | null
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          deleted_at?: string | null
          description?: string | null
          expense_date?: string
          id?: string
          notes?: string | null
          organization_id?: string
          payment_method?: string | null
          program_id?: string | null
          project_id?: string | null
          receipt_file_name?: string | null
          receipt_url?: string | null
          reference_number?: string | null
          reimbursement_date?: string | null
          rejection_reason?: string | null
          status?: string
          submitted_by?: string | null
          title?: string
          updated_at?: string
          updated_by?: string | null
          vendor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "budgets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_budget_line_item_id_fkey"
            columns: ["budget_line_item_id"]
            isOneToOne: false
            referencedRelation: "budget_line_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "budget_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations_public_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "v_program_funding_summary"
            referencedColumns: ["program_id"]
          },
          {
            foreignKeyName: "expenses_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_funding_summary"
            referencedColumns: ["project_id"]
          },
        ]
      }
      feature_flags: {
        Row: {
          created_at: string
          description: string | null
          flag_key: string
          flag_name: string
          id: string
          is_enabled: boolean | null
          rollout_percentage: number | null
          target_organizations: string[] | null
          target_tiers: string[] | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          flag_key: string
          flag_name: string
          id?: string
          is_enabled?: boolean | null
          rollout_percentage?: number | null
          target_organizations?: string[] | null
          target_tiers?: string[] | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          flag_key?: string
          flag_name?: string
          id?: string
          is_enabled?: boolean | null
          rollout_percentage?: number | null
          target_organizations?: string[] | null
          target_tiers?: string[] | null
          updated_at?: string
        }
        Relationships: []
      }
      field_check_ins: {
        Row: {
          accuracy_meters: number | null
          activity_id: string | null
          beneficiary_id: string | null
          check_in_type: string
          checked_in_at: string
          checked_out_at: string | null
          created_at: string
          id: string
          latitude: number
          location_name: string | null
          longitude: number
          notes: string | null
          organization_id: string
          photo_url: string | null
          staff_user_id: string
        }
        Insert: {
          accuracy_meters?: number | null
          activity_id?: string | null
          beneficiary_id?: string | null
          check_in_type?: string
          checked_in_at?: string
          checked_out_at?: string | null
          created_at?: string
          id?: string
          latitude: number
          location_name?: string | null
          longitude: number
          notes?: string | null
          organization_id: string
          photo_url?: string | null
          staff_user_id: string
        }
        Update: {
          accuracy_meters?: number | null
          activity_id?: string | null
          beneficiary_id?: string | null
          check_in_type?: string
          checked_in_at?: string
          checked_out_at?: string | null
          created_at?: string
          id?: string
          latitude?: number
          location_name?: string | null
          longitude?: number
          notes?: string | null
          organization_id?: string
          photo_url?: string | null
          staff_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "field_check_ins_beneficiary_id_fkey"
            columns: ["beneficiary_id"]
            isOneToOne: false
            referencedRelation: "beneficiaries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "field_check_ins_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "field_check_ins_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations_public_view"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_transactions: {
        Row: {
          amount: number
          beneficiary_id: string | null
          created_at: string
          created_by: string | null
          currency: string
          description: string | null
          donor_id: string | null
          donor_name: string | null
          expense_id: string | null
          funding_category: string | null
          grant_id: string | null
          id: string
          metadata: Json | null
          notes: string | null
          organization_id: string
          program_id: string | null
          project_id: string | null
          transaction_date: string
          transaction_type: string
          updated_at: string
        }
        Insert: {
          amount?: number
          beneficiary_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string | null
          donor_id?: string | null
          donor_name?: string | null
          expense_id?: string | null
          funding_category?: string | null
          grant_id?: string | null
          id?: string
          metadata?: Json | null
          notes?: string | null
          organization_id: string
          program_id?: string | null
          project_id?: string | null
          transaction_date?: string
          transaction_type: string
          updated_at?: string
        }
        Update: {
          amount?: number
          beneficiary_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string | null
          donor_id?: string | null
          donor_name?: string | null
          expense_id?: string | null
          funding_category?: string | null
          grant_id?: string | null
          id?: string
          metadata?: Json | null
          notes?: string | null
          organization_id?: string
          program_id?: string | null
          project_id?: string | null
          transaction_date?: string
          transaction_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_transactions_beneficiary_id_fkey"
            columns: ["beneficiary_id"]
            isOneToOne: false
            referencedRelation: "beneficiaries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_transactions_donor_id_fkey"
            columns: ["donor_id"]
            isOneToOne: false
            referencedRelation: "beneficiary_donors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_transactions_expense_id_fkey"
            columns: ["expense_id"]
            isOneToOne: false
            referencedRelation: "expenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_transactions_grant_id_fkey"
            columns: ["grant_id"]
            isOneToOne: false
            referencedRelation: "grants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_transactions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_transactions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations_public_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_transactions_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_transactions_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "v_program_funding_summary"
            referencedColumns: ["program_id"]
          },
          {
            foreignKeyName: "financial_transactions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_transactions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_funding_summary"
            referencedColumns: ["project_id"]
          },
        ]
      }
      funding_schedule_receipts: {
        Row: {
          amount_received: number
          created_at: string | null
          currency: string | null
          id: string
          notes: string | null
          received_date: string
          recorded_by: string | null
          reference: string | null
          schedule_id: string
        }
        Insert: {
          amount_received: number
          created_at?: string | null
          currency?: string | null
          id?: string
          notes?: string | null
          received_date: string
          recorded_by?: string | null
          reference?: string | null
          schedule_id: string
        }
        Update: {
          amount_received?: number
          created_at?: string | null
          currency?: string | null
          id?: string
          notes?: string | null
          received_date?: string
          recorded_by?: string | null
          reference?: string | null
          schedule_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "funding_schedule_receipts_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "funding_schedule_receipts_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "funding_schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      funding_schedules: {
        Row: {
          amount: number
          auto_create_expense: boolean | null
          beneficiary_service_id: string | null
          created_at: string | null
          currency: string | null
          donor_name: string
          end_date: string | null
          frequency: string
          funding_model: string | null
          grant_id: string | null
          id: string
          is_active: boolean | null
          next_due_date: string
          notes: string | null
          org_id: string
          start_date: string
          updated_at: string | null
        }
        Insert: {
          amount: number
          auto_create_expense?: boolean | null
          beneficiary_service_id?: string | null
          created_at?: string | null
          currency?: string | null
          donor_name: string
          end_date?: string | null
          frequency: string
          funding_model?: string | null
          grant_id?: string | null
          id?: string
          is_active?: boolean | null
          next_due_date: string
          notes?: string | null
          org_id: string
          start_date: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          auto_create_expense?: boolean | null
          beneficiary_service_id?: string | null
          created_at?: string | null
          currency?: string | null
          donor_name?: string
          end_date?: string | null
          frequency?: string
          funding_model?: string | null
          grant_id?: string | null
          id?: string
          is_active?: boolean | null
          next_due_date?: string
          notes?: string | null
          org_id?: string
          start_date?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "funding_schedules_beneficiary_service_id_fkey"
            columns: ["beneficiary_service_id"]
            isOneToOne: false
            referencedRelation: "beneficiary_services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "funding_schedules_grant_id_fkey"
            columns: ["grant_id"]
            isOneToOne: false
            referencedRelation: "grants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "funding_schedules_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "funding_schedules_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations_public_view"
            referencedColumns: ["id"]
          },
        ]
      }
      grant_compliance_items: {
        Row: {
          completed_at: string | null
          completed_by: string | null
          created_at: string
          due_date: string | null
          grant_id: string
          id: string
          is_completed: boolean | null
          item_description: string
          notes: string | null
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          due_date?: string | null
          grant_id: string
          id?: string
          is_completed?: boolean | null
          item_description: string
          notes?: string | null
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          due_date?: string | null
          grant_id?: string
          id?: string
          is_completed?: boolean | null
          item_description?: string
          notes?: string | null
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "grant_compliance_items_grant_id_fkey"
            columns: ["grant_id"]
            isOneToOne: false
            referencedRelation: "grants"
            referencedColumns: ["id"]
          },
        ]
      }
      grant_documents: {
        Row: {
          created_at: string
          description: string | null
          document_name: string
          document_type: string | null
          file_size: number | null
          file_url: string
          grant_id: string
          id: string
          organization_id: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          document_name: string
          document_type?: string | null
          file_size?: number | null
          file_url: string
          grant_id: string
          id?: string
          organization_id: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          document_name?: string
          document_type?: string | null
          file_size?: number | null
          file_url?: string
          grant_id?: string
          id?: string
          organization_id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "grant_documents_grant_id_fkey"
            columns: ["grant_id"]
            isOneToOne: false
            referencedRelation: "grants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grant_documents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grant_documents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations_public_view"
            referencedColumns: ["id"]
          },
        ]
      }
      grant_opportunities: {
        Row: {
          ai_payload: Json | null
          created_at: string
          created_by: string | null
          currency: string | null
          deadline: string | null
          deleted_at: string | null
          estimated_amount: number | null
          funder_name: string | null
          id: string
          match_reasons: Json | null
          match_score: number | null
          organization_id: string
          saved_grant_id: string | null
          sdg_focus: number[] | null
          sectors: string[] | null
          source_id: string | null
          status: string | null
          summary: string | null
          title: string
          updated_at: string
          updated_by: string | null
          url: string | null
        }
        Insert: {
          ai_payload?: Json | null
          created_at?: string
          created_by?: string | null
          currency?: string | null
          deadline?: string | null
          deleted_at?: string | null
          estimated_amount?: number | null
          funder_name?: string | null
          id?: string
          match_reasons?: Json | null
          match_score?: number | null
          organization_id: string
          saved_grant_id?: string | null
          sdg_focus?: number[] | null
          sectors?: string[] | null
          source_id?: string | null
          status?: string | null
          summary?: string | null
          title: string
          updated_at?: string
          updated_by?: string | null
          url?: string | null
        }
        Update: {
          ai_payload?: Json | null
          created_at?: string
          created_by?: string | null
          currency?: string | null
          deadline?: string | null
          deleted_at?: string | null
          estimated_amount?: number | null
          funder_name?: string | null
          id?: string
          match_reasons?: Json | null
          match_score?: number | null
          organization_id?: string
          saved_grant_id?: string | null
          sdg_focus?: number[] | null
          sectors?: string[] | null
          source_id?: string | null
          status?: string | null
          summary?: string | null
          title?: string
          updated_at?: string
          updated_by?: string | null
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "grant_opportunities_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "grant_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      grant_programs: {
        Row: {
          allocated_amount: number | null
          created_at: string
          grant_id: string
          id: string
          notes: string | null
          program_id: string
        }
        Insert: {
          allocated_amount?: number | null
          created_at?: string
          grant_id: string
          id?: string
          notes?: string | null
          program_id: string
        }
        Update: {
          allocated_amount?: number | null
          created_at?: string
          grant_id?: string
          id?: string
          notes?: string | null
          program_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "grant_programs_grant_id_fkey"
            columns: ["grant_id"]
            isOneToOne: false
            referencedRelation: "grants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grant_programs_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grant_programs_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "v_program_funding_summary"
            referencedColumns: ["program_id"]
          },
        ]
      }
      grant_reminder_logs: {
        Row: {
          channel: string | null
          grant_report_id: string
          id: string
          reminder_type: string
          sent_at: string | null
          sent_to: string[] | null
        }
        Insert: {
          channel?: string | null
          grant_report_id: string
          id?: string
          reminder_type: string
          sent_at?: string | null
          sent_to?: string[] | null
        }
        Update: {
          channel?: string | null
          grant_report_id?: string
          id?: string
          reminder_type?: string
          sent_at?: string | null
          sent_to?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "grant_reminder_logs_grant_report_id_fkey"
            columns: ["grant_report_id"]
            isOneToOne: false
            referencedRelation: "grant_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      grant_reports: {
        Row: {
          created_at: string
          due_date: string
          grant_id: string
          id: string
          notes: string | null
          organization_id: string
          report_title: string
          report_type: string
          reporting_period_end: string | null
          reporting_period_start: string | null
          status: string
          submitted_at: string | null
          submitted_by: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          due_date: string
          grant_id: string
          id?: string
          notes?: string | null
          organization_id: string
          report_title: string
          report_type?: string
          reporting_period_end?: string | null
          reporting_period_start?: string | null
          status?: string
          submitted_at?: string | null
          submitted_by?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          due_date?: string
          grant_id?: string
          id?: string
          notes?: string | null
          organization_id?: string
          report_title?: string
          report_type?: string
          reporting_period_end?: string | null
          reporting_period_start?: string | null
          status?: string
          submitted_at?: string | null
          submitted_by?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "grant_reports_grant_id_fkey"
            columns: ["grant_id"]
            isOneToOne: false
            referencedRelation: "grants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grant_reports_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grant_reports_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations_public_view"
            referencedColumns: ["id"]
          },
        ]
      }
      grant_sources: {
        Row: {
          application_url: string | null
          contact_email: string | null
          created_at: string
          created_by: string | null
          currency: string | null
          deleted_at: string | null
          eligibility_notes: string | null
          funder_name: string | null
          funder_type: string | null
          geographies: string[] | null
          id: string
          is_active: boolean | null
          max_amount: number | null
          min_amount: number | null
          name: string
          next_deadline: string | null
          notes: string | null
          organization_id: string
          sdg_focus: number[] | null
          sectors: string[] | null
          typical_deadline_month: number | null
          updated_at: string
          updated_by: string | null
          url: string | null
        }
        Insert: {
          application_url?: string | null
          contact_email?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string | null
          deleted_at?: string | null
          eligibility_notes?: string | null
          funder_name?: string | null
          funder_type?: string | null
          geographies?: string[] | null
          id?: string
          is_active?: boolean | null
          max_amount?: number | null
          min_amount?: number | null
          name: string
          next_deadline?: string | null
          notes?: string | null
          organization_id: string
          sdg_focus?: number[] | null
          sectors?: string[] | null
          typical_deadline_month?: number | null
          updated_at?: string
          updated_by?: string | null
          url?: string | null
        }
        Update: {
          application_url?: string | null
          contact_email?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string | null
          deleted_at?: string | null
          eligibility_notes?: string | null
          funder_name?: string | null
          funder_type?: string | null
          geographies?: string[] | null
          id?: string
          is_active?: boolean | null
          max_amount?: number | null
          min_amount?: number | null
          name?: string
          next_deadline?: string | null
          notes?: string | null
          organization_id?: string
          sdg_focus?: number[] | null
          sectors?: string[] | null
          typical_deadline_month?: number | null
          updated_at?: string
          updated_by?: string | null
          url?: string | null
        }
        Relationships: []
      }
      grants: {
        Row: {
          amount_received: number | null
          application_deadline: string | null
          compliance_notes: string | null
          created_at: string
          created_by: string | null
          currency: string
          description: string | null
          donor_contact_email: string | null
          donor_contact_phone: string | null
          donor_name: string
          end_date: string | null
          grant_amount: number
          grant_name: string
          id: string
          next_report_due: string | null
          notes: string | null
          objectives: string | null
          organization_id: string
          reporting_frequency: string | null
          start_date: string | null
          status: string
          supported_funding_model: string | null
          updated_at: string
        }
        Insert: {
          amount_received?: number | null
          application_deadline?: string | null
          compliance_notes?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string | null
          donor_contact_email?: string | null
          donor_contact_phone?: string | null
          donor_name: string
          end_date?: string | null
          grant_amount?: number
          grant_name: string
          id?: string
          next_report_due?: string | null
          notes?: string | null
          objectives?: string | null
          organization_id: string
          reporting_frequency?: string | null
          start_date?: string | null
          status?: string
          supported_funding_model?: string | null
          updated_at?: string
        }
        Update: {
          amount_received?: number | null
          application_deadline?: string | null
          compliance_notes?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string | null
          donor_contact_email?: string | null
          donor_contact_phone?: string | null
          donor_name?: string
          end_date?: string | null
          grant_amount?: number
          grant_name?: string
          id?: string
          next_report_due?: string | null
          notes?: string | null
          objectives?: string | null
          organization_id?: string
          reporting_frequency?: string | null
          start_date?: string | null
          status?: string
          supported_funding_model?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "grants_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grants_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations_public_view"
            referencedColumns: ["id"]
          },
        ]
      }
      guardians: {
        Row: {
          address: string | null
          age: number | null
          created_at: string
          created_by: string | null
          date_of_death: string | null
          email: string | null
          employment_details: string | null
          employment_type: string | null
          full_name: string
          guardian_type: Database["public"]["Enums"]["guardian_type"]
          id: string
          is_alive: boolean | null
          national_id: string | null
          organization_id: string
          phone: string | null
          source_of_income: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          age?: number | null
          created_at?: string
          created_by?: string | null
          date_of_death?: string | null
          email?: string | null
          employment_details?: string | null
          employment_type?: string | null
          full_name: string
          guardian_type: Database["public"]["Enums"]["guardian_type"]
          id?: string
          is_alive?: boolean | null
          national_id?: string | null
          organization_id: string
          phone?: string | null
          source_of_income?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          age?: number | null
          created_at?: string
          created_by?: string | null
          date_of_death?: string | null
          email?: string | null
          employment_details?: string | null
          employment_type?: string | null
          full_name?: string
          guardian_type?: Database["public"]["Enums"]["guardian_type"]
          id?: string
          is_alive?: boolean | null
          national_id?: string | null
          organization_id?: string
          phone?: string | null
          source_of_income?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "guardians_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guardians_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations_public_view"
            referencedColumns: ["id"]
          },
        ]
      }
      households: {
        Row: {
          county: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          formed_from_relationship_id: string | null
          head_of_household_id: string | null
          household_name: string | null
          household_size: number | null
          id: string
          latitude: number | null
          longitude: number | null
          member_count: number | null
          notes: string | null
          organization_id: string
          relationship_formed: boolean | null
          sub_county: string | null
          updated_at: string
          village: string | null
          vulnerability_score: number | null
        }
        Insert: {
          county?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          formed_from_relationship_id?: string | null
          head_of_household_id?: string | null
          household_name?: string | null
          household_size?: number | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          member_count?: number | null
          notes?: string | null
          organization_id: string
          relationship_formed?: boolean | null
          sub_county?: string | null
          updated_at?: string
          village?: string | null
          vulnerability_score?: number | null
        }
        Update: {
          county?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          formed_from_relationship_id?: string | null
          head_of_household_id?: string | null
          household_name?: string | null
          household_size?: number | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          member_count?: number | null
          notes?: string | null
          organization_id?: string
          relationship_formed?: boolean | null
          sub_county?: string | null
          updated_at?: string
          village?: string | null
          vulnerability_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "households_formed_from_relationship_id_fkey"
            columns: ["formed_from_relationship_id"]
            isOneToOne: false
            referencedRelation: "beneficiary_relationships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "households_head_of_household_fkey"
            columns: ["head_of_household_id"]
            isOneToOne: false
            referencedRelation: "beneficiaries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "households_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "households_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations_public_view"
            referencedColumns: ["id"]
          },
        ]
      }
      impact_stories: {
        Row: {
          author_id: string | null
          beneficiary_id: string | null
          created_at: string | null
          deleted_at: string | null
          id: string
          org_id: string
          photo_urls: string[] | null
          project_id: string | null
          published_at: string | null
          status: string | null
          story_text: string | null
          tags: string[] | null
          theme: string | null
          title: string
        }
        Insert: {
          author_id?: string | null
          beneficiary_id?: string | null
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          org_id: string
          photo_urls?: string[] | null
          project_id?: string | null
          published_at?: string | null
          status?: string | null
          story_text?: string | null
          tags?: string[] | null
          theme?: string | null
          title: string
        }
        Update: {
          author_id?: string | null
          beneficiary_id?: string | null
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          org_id?: string
          photo_urls?: string[] | null
          project_id?: string | null
          published_at?: string | null
          status?: string | null
          story_text?: string | null
          tags?: string[] | null
          theme?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "impact_stories_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "impact_stories_beneficiary_id_fkey"
            columns: ["beneficiary_id"]
            isOneToOne: false
            referencedRelation: "beneficiaries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "impact_stories_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "impact_stories_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations_public_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "impact_stories_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "impact_stories_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_funding_summary"
            referencedColumns: ["project_id"]
          },
        ]
      }
      indicator_categories: {
        Row: {
          color: string | null
          created_at: string
          created_by: string | null
          description: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          organization_id: string
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          organization_id: string
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          organization_id?: string
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "indicator_categories_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "indicator_categories_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations_public_view"
            referencedColumns: ["id"]
          },
        ]
      }
      indicator_disaggregations: {
        Row: {
          disaggregation_category_id: string
          id: string
          indicator_id: string
        }
        Insert: {
          disaggregation_category_id: string
          id?: string
          indicator_id: string
        }
        Update: {
          disaggregation_category_id?: string
          id?: string
          indicator_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "indicator_disaggregations_disaggregation_category_id_fkey"
            columns: ["disaggregation_category_id"]
            isOneToOne: false
            referencedRelation: "disaggregation_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "indicator_disaggregations_indicator_id_fkey"
            columns: ["indicator_id"]
            isOneToOne: false
            referencedRelation: "indicators"
            referencedColumns: ["id"]
          },
        ]
      }
      indicator_targets: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          indicator_id: string
          minimum_value: number | null
          notes: string | null
          period_type: string
          period_value: number
          period_year: number
          stretch_value: number | null
          target_value: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          indicator_id: string
          minimum_value?: number | null
          notes?: string | null
          period_type: string
          period_value: number
          period_year: number
          stretch_value?: number | null
          target_value: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          indicator_id?: string
          minimum_value?: number | null
          notes?: string | null
          period_type?: string
          period_value?: number
          period_year?: number
          stretch_value?: number | null
          target_value?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "indicator_targets_indicator_id_fkey"
            columns: ["indicator_id"]
            isOneToOne: false
            referencedRelation: "indicators"
            referencedColumns: ["id"]
          },
        ]
      }
      indicator_templates: {
        Row: {
          aggregation_period: string | null
          category: string
          code: string
          created_at: string
          decimal_places: number | null
          default_target: number | null
          description: string | null
          formula_config: Json
          formula_type: string
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          trend_direction: string | null
          unit: string | null
        }
        Insert: {
          aggregation_period?: string | null
          category: string
          code: string
          created_at?: string
          decimal_places?: number | null
          default_target?: number | null
          description?: string | null
          formula_config?: Json
          formula_type: string
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          trend_direction?: string | null
          unit?: string | null
        }
        Update: {
          aggregation_period?: string | null
          category?: string
          code?: string
          created_at?: string
          decimal_places?: number | null
          default_target?: number | null
          description?: string | null
          formula_config?: Json
          formula_type?: string
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          trend_direction?: string | null
          unit?: string | null
        }
        Relationships: []
      }
      indicator_validation_rules: {
        Row: {
          created_at: string | null
          id: string
          indicator_id: string
          rule_type: string
          rule_value: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          indicator_id: string
          rule_type: string
          rule_value?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          indicator_id?: string
          rule_type?: string
          rule_value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "indicator_validation_rules_indicator_id_fkey"
            columns: ["indicator_id"]
            isOneToOne: false
            referencedRelation: "indicators"
            referencedColumns: ["id"]
          },
        ]
      }
      indicator_values: {
        Row: {
          actual_value: number
          computed_at: string | null
          created_at: string
          created_by: string | null
          dimension_key: string | null
          dimension_value: string | null
          disaggregation_category_id: string | null
          disaggregation_value: string | null
          id: string
          indicator_id: string
          is_manual_override: boolean | null
          notes: string | null
          period_end: string
          period_start: string
          updated_at: string
        }
        Insert: {
          actual_value: number
          computed_at?: string | null
          created_at?: string
          created_by?: string | null
          dimension_key?: string | null
          dimension_value?: string | null
          disaggregation_category_id?: string | null
          disaggregation_value?: string | null
          id?: string
          indicator_id: string
          is_manual_override?: boolean | null
          notes?: string | null
          period_end: string
          period_start: string
          updated_at?: string
        }
        Update: {
          actual_value?: number
          computed_at?: string | null
          created_at?: string
          created_by?: string | null
          dimension_key?: string | null
          dimension_value?: string | null
          disaggregation_category_id?: string | null
          disaggregation_value?: string | null
          id?: string
          indicator_id?: string
          is_manual_override?: boolean | null
          notes?: string | null
          period_end?: string
          period_start?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "indicator_values_disaggregation_category_id_fkey"
            columns: ["disaggregation_category_id"]
            isOneToOne: false
            referencedRelation: "disaggregation_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "indicator_values_indicator_id_fkey"
            columns: ["indicator_id"]
            isOneToOne: false
            referencedRelation: "indicators"
            referencedColumns: ["id"]
          },
        ]
      }
      indicator_versions: {
        Row: {
          baseline_value: number | null
          calculation_method: string | null
          change_reason: string
          changed_by: string | null
          created_at: string
          definition: string | null
          disaggregation_dimensions: string[] | null
          effective_from: string
          effective_to: string | null
          id: string
          indicator_id: string
          name: string
          organization_id: string
          snapshot: Json
          target_value: number | null
          unit: string | null
          version: number
        }
        Insert: {
          baseline_value?: number | null
          calculation_method?: string | null
          change_reason: string
          changed_by?: string | null
          created_at?: string
          definition?: string | null
          disaggregation_dimensions?: string[] | null
          effective_from: string
          effective_to?: string | null
          id?: string
          indicator_id: string
          name: string
          organization_id: string
          snapshot: Json
          target_value?: number | null
          unit?: string | null
          version: number
        }
        Update: {
          baseline_value?: number | null
          calculation_method?: string | null
          change_reason?: string
          changed_by?: string | null
          created_at?: string
          definition?: string | null
          disaggregation_dimensions?: string[] | null
          effective_from?: string
          effective_to?: string | null
          id?: string
          indicator_id?: string
          name?: string
          organization_id?: string
          snapshot?: Json
          target_value?: number | null
          unit?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "indicator_versions_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "indicator_versions_indicator_id_fkey"
            columns: ["indicator_id"]
            isOneToOne: false
            referencedRelation: "indicators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "indicator_versions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "indicator_versions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations_public_view"
            referencedColumns: ["id"]
          },
        ]
      }
      indicators: {
        Row: {
          aggregation_period: string | null
          baseline_date: string | null
          baseline_source: string | null
          baseline_value: number | null
          calculation_method: string | null
          category_id: string | null
          code: string
          collection_method: string | null
          collection_responsibility: string | null
          created_at: string
          created_by: string | null
          data_source_description: string | null
          decimal_places: number | null
          decision_context: string | null
          deleted_at: string | null
          description: string | null
          disaggregation_dimensions: string[]
          formula_config: Json
          formula_type: string
          id: string
          is_active: boolean | null
          is_template: boolean | null
          level: string | null
          logframe_entry_id: string | null
          name: string
          notes: string | null
          organization_id: string
          program_ids: string[] | null
          publish_status: string
          published_at: string | null
          reporting_frequency: string | null
          retired_at: string | null
          retired_reason: string | null
          show_trend: boolean | null
          sort_order: number | null
          superseded_by: string | null
          target_date: string | null
          target_value: number | null
          template_source_id: string | null
          trend_direction: string | null
          unit: string | null
          updated_at: string
          updated_by: string | null
          validation_rule: Json | null
          version: number
          version_notes: string | null
        }
        Insert: {
          aggregation_period?: string | null
          baseline_date?: string | null
          baseline_source?: string | null
          baseline_value?: number | null
          calculation_method?: string | null
          category_id?: string | null
          code: string
          collection_method?: string | null
          collection_responsibility?: string | null
          created_at?: string
          created_by?: string | null
          data_source_description?: string | null
          decimal_places?: number | null
          decision_context?: string | null
          deleted_at?: string | null
          description?: string | null
          disaggregation_dimensions?: string[]
          formula_config?: Json
          formula_type: string
          id?: string
          is_active?: boolean | null
          is_template?: boolean | null
          level?: string | null
          logframe_entry_id?: string | null
          name: string
          notes?: string | null
          organization_id: string
          program_ids?: string[] | null
          publish_status?: string
          published_at?: string | null
          reporting_frequency?: string | null
          retired_at?: string | null
          retired_reason?: string | null
          show_trend?: boolean | null
          sort_order?: number | null
          superseded_by?: string | null
          target_date?: string | null
          target_value?: number | null
          template_source_id?: string | null
          trend_direction?: string | null
          unit?: string | null
          updated_at?: string
          updated_by?: string | null
          validation_rule?: Json | null
          version?: number
          version_notes?: string | null
        }
        Update: {
          aggregation_period?: string | null
          baseline_date?: string | null
          baseline_source?: string | null
          baseline_value?: number | null
          calculation_method?: string | null
          category_id?: string | null
          code?: string
          collection_method?: string | null
          collection_responsibility?: string | null
          created_at?: string
          created_by?: string | null
          data_source_description?: string | null
          decimal_places?: number | null
          decision_context?: string | null
          deleted_at?: string | null
          description?: string | null
          disaggregation_dimensions?: string[]
          formula_config?: Json
          formula_type?: string
          id?: string
          is_active?: boolean | null
          is_template?: boolean | null
          level?: string | null
          logframe_entry_id?: string | null
          name?: string
          notes?: string | null
          organization_id?: string
          program_ids?: string[] | null
          publish_status?: string
          published_at?: string | null
          reporting_frequency?: string | null
          retired_at?: string | null
          retired_reason?: string | null
          show_trend?: boolean | null
          sort_order?: number | null
          superseded_by?: string | null
          target_date?: string | null
          target_value?: number | null
          template_source_id?: string | null
          trend_direction?: string | null
          unit?: string | null
          updated_at?: string
          updated_by?: string | null
          validation_rule?: Json | null
          version?: number
          version_notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "indicators_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "indicator_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "indicators_collection_responsibility_fkey"
            columns: ["collection_responsibility"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "indicators_logframe_entry_id_fkey"
            columns: ["logframe_entry_id"]
            isOneToOne: false
            referencedRelation: "logframe_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "indicators_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "indicators_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations_public_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "indicators_superseded_by_fkey"
            columns: ["superseded_by"]
            isOneToOne: false
            referencedRelation: "indicators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "indicators_template_source_id_fkey"
            columns: ["template_source_id"]
            isOneToOne: false
            referencedRelation: "indicators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "indicators_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      leave_balances: {
        Row: {
          carried_over_days: number | null
          created_at: string
          id: string
          leave_type_id: string
          organization_id: string
          staff_user_id: string
          total_days: number | null
          updated_at: string
          used_days: number | null
          year: number
        }
        Insert: {
          carried_over_days?: number | null
          created_at?: string
          id?: string
          leave_type_id: string
          organization_id: string
          staff_user_id: string
          total_days?: number | null
          updated_at?: string
          used_days?: number | null
          year: number
        }
        Update: {
          carried_over_days?: number | null
          created_at?: string
          id?: string
          leave_type_id?: string
          organization_id?: string
          staff_user_id?: string
          total_days?: number | null
          updated_at?: string
          used_days?: number | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "leave_balances_leave_type_id_fkey"
            columns: ["leave_type_id"]
            isOneToOne: false
            referencedRelation: "leave_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_balances_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_balances_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations_public_view"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_requests: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          attachment_url: string | null
          created_at: string
          days_requested: number
          end_date: string
          id: string
          leave_type_id: string
          organization_id: string
          reason: string | null
          rejection_reason: string | null
          staff_user_id: string
          start_date: string
          status: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          attachment_url?: string | null
          created_at?: string
          days_requested: number
          end_date: string
          id?: string
          leave_type_id: string
          organization_id: string
          reason?: string | null
          rejection_reason?: string | null
          staff_user_id: string
          start_date: string
          status?: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          attachment_url?: string | null
          created_at?: string
          days_requested?: number
          end_date?: string
          id?: string
          leave_type_id?: string
          organization_id?: string
          reason?: string | null
          rejection_reason?: string | null
          staff_user_id?: string
          start_date?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leave_requests_leave_type_id_fkey"
            columns: ["leave_type_id"]
            isOneToOne: false
            referencedRelation: "leave_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations_public_view"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_types: {
        Row: {
          color: string | null
          created_at: string
          default_days_per_year: number | null
          description: string | null
          id: string
          is_active: boolean | null
          is_paid: boolean | null
          name: string
          organization_id: string
          requires_approval: boolean | null
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          default_days_per_year?: number | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_paid?: boolean | null
          name: string
          organization_id: string
          requires_approval?: boolean | null
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          default_days_per_year?: number | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_paid?: boolean | null
          name?: string
          organization_id?: string
          requires_approval?: boolean | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leave_types_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_types_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations_public_view"
            referencedColumns: ["id"]
          },
        ]
      }
      lessons_learned: {
        Row: {
          author_id: string | null
          category: string | null
          context: string | null
          created_at: string | null
          deleted_at: string | null
          id: string
          org_id: string
          project_id: string | null
          recommendation: string | null
          tags: string[] | null
          title: string
          what_didnt_work: string | null
          what_worked: string | null
        }
        Insert: {
          author_id?: string | null
          category?: string | null
          context?: string | null
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          org_id: string
          project_id?: string | null
          recommendation?: string | null
          tags?: string[] | null
          title: string
          what_didnt_work?: string | null
          what_worked?: string | null
        }
        Update: {
          author_id?: string | null
          category?: string | null
          context?: string | null
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          org_id?: string
          project_id?: string | null
          recommendation?: string | null
          tags?: string[] | null
          title?: string
          what_didnt_work?: string | null
          what_worked?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lessons_learned_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "lessons_learned_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lessons_learned_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations_public_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lessons_learned_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lessons_learned_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_funding_summary"
            referencedColumns: ["project_id"]
          },
        ]
      }
      logframe_assumptions: {
        Row: {
          assumption: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          linked_risk_id: string | null
          logframe_entry_id: string | null
          notes: string | null
          org_id: string
          program_id: string | null
          updated_at: string
          updated_by: string | null
          validity: string
        }
        Insert: {
          assumption: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          linked_risk_id?: string | null
          logframe_entry_id?: string | null
          notes?: string | null
          org_id: string
          program_id?: string | null
          updated_at?: string
          updated_by?: string | null
          validity?: string
        }
        Update: {
          assumption?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          linked_risk_id?: string | null
          logframe_entry_id?: string | null
          notes?: string | null
          org_id?: string
          program_id?: string | null
          updated_at?: string
          updated_by?: string | null
          validity?: string
        }
        Relationships: [
          {
            foreignKeyName: "logframe_assumptions_linked_risk_id_fkey"
            columns: ["linked_risk_id"]
            isOneToOne: false
            referencedRelation: "program_risks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logframe_assumptions_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logframe_assumptions_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "v_program_funding_summary"
            referencedColumns: ["program_id"]
          },
        ]
      }
      logframe_entries: {
        Row: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          description: string | null
          display_order: number
          id: string
          indicator_ids: string[] | null
          level: string
          org_id: string
          parent_id: string | null
          program_id: string
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          display_order?: number
          id?: string
          indicator_ids?: string[] | null
          level: string
          org_id: string
          parent_id?: string | null
          program_id: string
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          display_order?: number
          id?: string
          indicator_ids?: string[] | null
          level?: string
          org_id?: string
          parent_id?: string | null
          program_id?: string
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "logframe_entries_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logframe_entries_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations_public_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logframe_entries_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "logframe_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logframe_entries_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logframe_entries_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "v_program_funding_summary"
            referencedColumns: ["program_id"]
          },
        ]
      }
      logframe_indicators: {
        Row: {
          actual_value: number | null
          created_at: string
          custom_indicator_name: string | null
          id: string
          indicator_id: string | null
          logframe_level_id: string
          reporting_frequency: string | null
          target_value: number | null
          unit: string | null
          updated_at: string
        }
        Insert: {
          actual_value?: number | null
          created_at?: string
          custom_indicator_name?: string | null
          id?: string
          indicator_id?: string | null
          logframe_level_id: string
          reporting_frequency?: string | null
          target_value?: number | null
          unit?: string | null
          updated_at?: string
        }
        Update: {
          actual_value?: number | null
          created_at?: string
          custom_indicator_name?: string | null
          id?: string
          indicator_id?: string | null
          logframe_level_id?: string
          reporting_frequency?: string | null
          target_value?: number | null
          unit?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "logframe_indicators_indicator_id_fkey"
            columns: ["indicator_id"]
            isOneToOne: false
            referencedRelation: "indicators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logframe_indicators_logframe_level_id_fkey"
            columns: ["logframe_level_id"]
            isOneToOne: false
            referencedRelation: "logframe_levels"
            referencedColumns: ["id"]
          },
        ]
      }
      logframe_levels: {
        Row: {
          assumptions: string | null
          created_at: string
          description: string | null
          id: string
          level_type: string
          logframe_id: string
          means_of_verification: string | null
          narrative: string | null
          parent_id: string | null
          risks: string | null
          sort_order: number | null
          title: string
          updated_at: string
        }
        Insert: {
          assumptions?: string | null
          created_at?: string
          description?: string | null
          id?: string
          level_type: string
          logframe_id: string
          means_of_verification?: string | null
          narrative?: string | null
          parent_id?: string | null
          risks?: string | null
          sort_order?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          assumptions?: string | null
          created_at?: string
          description?: string | null
          id?: string
          level_type?: string
          logframe_id?: string
          means_of_verification?: string | null
          narrative?: string | null
          parent_id?: string | null
          risks?: string | null
          sort_order?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "logframe_levels_logframe_id_fkey"
            columns: ["logframe_id"]
            isOneToOne: false
            referencedRelation: "logframes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logframe_levels_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "logframe_levels"
            referencedColumns: ["id"]
          },
        ]
      }
      logframes: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          organization_id: string
          program_id: string | null
          project_id: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          organization_id: string
          program_id?: string | null
          project_id?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          organization_id?: string
          program_id?: string | null
          project_id?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "logframes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logframes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations_public_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logframes_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logframes_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "v_program_funding_summary"
            referencedColumns: ["program_id"]
          },
          {
            foreignKeyName: "logframes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logframes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_funding_summary"
            referencedColumns: ["project_id"]
          },
        ]
      }
      managed_documents: {
        Row: {
          access_level: string
          category: string
          created_at: string
          created_by: string | null
          current_file_name: string | null
          current_file_size: number | null
          current_file_type: string | null
          current_file_url: string | null
          current_version: number
          deleted_at: string | null
          description: string | null
          document_type: string | null
          donor_visible: boolean | null
          id: string
          organization_id: string
          status: string
          tags: string[] | null
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          access_level?: string
          category?: string
          created_at?: string
          created_by?: string | null
          current_file_name?: string | null
          current_file_size?: number | null
          current_file_type?: string | null
          current_file_url?: string | null
          current_version?: number
          deleted_at?: string | null
          description?: string | null
          document_type?: string | null
          donor_visible?: boolean | null
          id?: string
          organization_id: string
          status?: string
          tags?: string[] | null
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          access_level?: string
          category?: string
          created_at?: string
          created_by?: string | null
          current_file_name?: string | null
          current_file_size?: number | null
          current_file_type?: string | null
          current_file_url?: string | null
          current_version?: number
          deleted_at?: string | null
          description?: string | null
          document_type?: string | null
          donor_visible?: boolean | null
          id?: string
          organization_id?: string
          status?: string
          tags?: string[] | null
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "managed_documents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "managed_documents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations_public_view"
            referencedColumns: ["id"]
          },
        ]
      }
      me_data_schedule: {
        Row: {
          assigned_to: string | null
          collection_frequency: string
          collection_method: string | null
          created_at: string | null
          created_by: string | null
          frequency: string | null
          id: string
          indicator_id: string
          is_active: boolean
          last_collected_at: string | null
          last_collected_date: string | null
          next_collection_date: string | null
          next_due_date: string
          notes: string | null
          org_id: string
          program_id: string | null
          project_id: string | null
          responsible_staff_id: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          assigned_to?: string | null
          collection_frequency: string
          collection_method?: string | null
          created_at?: string | null
          created_by?: string | null
          frequency?: string | null
          id?: string
          indicator_id: string
          is_active?: boolean
          last_collected_at?: string | null
          last_collected_date?: string | null
          next_collection_date?: string | null
          next_due_date: string
          notes?: string | null
          org_id: string
          program_id?: string | null
          project_id?: string | null
          responsible_staff_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          assigned_to?: string | null
          collection_frequency?: string
          collection_method?: string | null
          created_at?: string | null
          created_by?: string | null
          frequency?: string | null
          id?: string
          indicator_id?: string
          is_active?: boolean
          last_collected_at?: string | null
          last_collected_date?: string | null
          next_collection_date?: string | null
          next_due_date?: string
          notes?: string | null
          org_id?: string
          program_id?: string | null
          project_id?: string | null
          responsible_staff_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "me_data_schedule_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "me_data_schedule_indicator_id_fkey"
            columns: ["indicator_id"]
            isOneToOne: false
            referencedRelation: "indicators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "me_data_schedule_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "me_data_schedule_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations_public_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "me_data_schedule_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "me_data_schedule_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "v_program_funding_summary"
            referencedColumns: ["program_id"]
          },
          {
            foreignKeyName: "me_data_schedule_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "me_data_schedule_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_funding_summary"
            referencedColumns: ["project_id"]
          },
        ]
      }
      me_form_fields: {
        Row: {
          created_at: string
          depends_on_field_id: string | null
          depends_on_value: string | null
          display_order: number
          field_key: string
          field_label: string
          field_options: Json
          field_type: string
          form_id: string
          helper_text: string | null
          id: string
          is_required: boolean
          linked_indicator_id: string | null
          maps_to_column: string | null
          organization_id: string
          updated_at: string
          validation_rule: string | null
        }
        Insert: {
          created_at?: string
          depends_on_field_id?: string | null
          depends_on_value?: string | null
          display_order?: number
          field_key: string
          field_label: string
          field_options?: Json
          field_type: string
          form_id: string
          helper_text?: string | null
          id?: string
          is_required?: boolean
          linked_indicator_id?: string | null
          maps_to_column?: string | null
          organization_id: string
          updated_at?: string
          validation_rule?: string | null
        }
        Update: {
          created_at?: string
          depends_on_field_id?: string | null
          depends_on_value?: string | null
          display_order?: number
          field_key?: string
          field_label?: string
          field_options?: Json
          field_type?: string
          form_id?: string
          helper_text?: string | null
          id?: string
          is_required?: boolean
          linked_indicator_id?: string | null
          maps_to_column?: string | null
          organization_id?: string
          updated_at?: string
          validation_rule?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "me_form_fields_depends_on_field_id_fkey"
            columns: ["depends_on_field_id"]
            isOneToOne: false
            referencedRelation: "me_form_fields"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "me_form_fields_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "me_forms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "me_form_fields_linked_indicator_id_fkey"
            columns: ["linked_indicator_id"]
            isOneToOne: false
            referencedRelation: "indicators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "me_form_fields_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "me_form_fields_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations_public_view"
            referencedColumns: ["id"]
          },
        ]
      }
      me_form_submissions: {
        Row: {
          activity_id: string | null
          beneficiary_ids: string[]
          created_at: string
          data: Json
          data_quality_flags: string[]
          deleted_at: string | null
          form_id: string
          household_id: string | null
          id: string
          is_synced: boolean
          latitude: number | null
          location_county: string | null
          location_sub_county: string | null
          longitude: number | null
          organization_id: string
          program_id: string | null
          project_id: string | null
          submission_date: string
          submitted_by: string | null
          synced_at: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          activity_id?: string | null
          beneficiary_ids?: string[]
          created_at?: string
          data?: Json
          data_quality_flags?: string[]
          deleted_at?: string | null
          form_id: string
          household_id?: string | null
          id?: string
          is_synced?: boolean
          latitude?: number | null
          location_county?: string | null
          location_sub_county?: string | null
          longitude?: number | null
          organization_id: string
          program_id?: string | null
          project_id?: string | null
          submission_date?: string
          submitted_by?: string | null
          synced_at?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          activity_id?: string | null
          beneficiary_ids?: string[]
          created_at?: string
          data?: Json
          data_quality_flags?: string[]
          deleted_at?: string | null
          form_id?: string
          household_id?: string | null
          id?: string
          is_synced?: boolean
          latitude?: number | null
          location_county?: string | null
          location_sub_county?: string | null
          longitude?: number | null
          organization_id?: string
          program_id?: string | null
          project_id?: string | null
          submission_date?: string
          submitted_by?: string | null
          synced_at?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "me_form_submissions_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "me_forms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "me_form_submissions_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "me_form_submissions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "me_form_submissions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations_public_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "me_form_submissions_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "me_form_submissions_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "v_program_funding_summary"
            referencedColumns: ["program_id"]
          },
          {
            foreignKeyName: "me_form_submissions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "me_form_submissions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_funding_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "me_form_submissions_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "me_form_submissions_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      me_forms: {
        Row: {
          allow_offline: boolean
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deployed_to_roles: string[]
          description: string | null
          form_purpose: string | null
          id: string
          name: string
          organization_id: string
          program_id: string | null
          project_id: string | null
          published_at: string | null
          requires_beneficiary_link: boolean
          requires_location: boolean
          requires_photo: boolean
          retired_at: string | null
          status: string
          updated_at: string
          updated_by: string | null
          version: number
        }
        Insert: {
          allow_offline?: boolean
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deployed_to_roles?: string[]
          description?: string | null
          form_purpose?: string | null
          id?: string
          name: string
          organization_id: string
          program_id?: string | null
          project_id?: string | null
          published_at?: string | null
          requires_beneficiary_link?: boolean
          requires_location?: boolean
          requires_photo?: boolean
          retired_at?: string | null
          status?: string
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Update: {
          allow_offline?: boolean
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deployed_to_roles?: string[]
          description?: string | null
          form_purpose?: string | null
          id?: string
          name?: string
          organization_id?: string
          program_id?: string | null
          project_id?: string | null
          published_at?: string | null
          requires_beneficiary_link?: boolean
          requires_location?: boolean
          requires_photo?: boolean
          retired_at?: string | null
          status?: string
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "me_forms_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "me_forms_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "me_forms_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations_public_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "me_forms_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "me_forms_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "v_program_funding_summary"
            referencedColumns: ["program_id"]
          },
          {
            foreignKeyName: "me_forms_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "me_forms_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_funding_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "me_forms_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      module_entries: {
        Row: {
          child_id: string | null
          created_at: string
          created_by: string | null
          data: Json
          id: string
          module_id: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          child_id?: string | null
          created_at?: string
          created_by?: string | null
          data?: Json
          id?: string
          module_id: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          child_id?: string | null
          created_at?: string
          created_by?: string | null
          data?: Json
          id?: string
          module_id?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "module_entries_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "module_entries_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children_safe_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "module_entries_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "program_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          category: string
          created_at: string
          id: string
          is_read: boolean
          message: string
          metadata: Json | null
          organization_id: string
          read_at: string | null
          related_entity_id: string | null
          related_entity_type: string | null
          severity: string
          title: string
          user_id: string
        }
        Insert: {
          category?: string
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          metadata?: Json | null
          organization_id: string
          read_at?: string | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          severity?: string
          title: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          metadata?: Json | null
          organization_id?: string
          read_at?: string | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          severity?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations_public_view"
            referencedColumns: ["id"]
          },
        ]
      }
      org_beneficiary_config: {
        Row: {
          beneficiary_terminology: string
          beneficiary_terminology_plural: string
          collect_disability_details: boolean
          collect_economic_data: boolean
          collect_education_data: boolean
          collect_health_data: boolean
          collect_hiv_status: boolean
          collect_household_data: boolean
          collect_nutritional_status: boolean
          collect_religion: boolean
          created_at: string
          custom_fields: Json
          custom_vulnerability_tags: Json
          id: string
          id_prefix: string | null
          minor_age_threshold: number | null
          org_type: string
          organization_id: string
          require_guardian_for_minors: boolean | null
          updated_at: string
        }
        Insert: {
          beneficiary_terminology?: string
          beneficiary_terminology_plural?: string
          collect_disability_details?: boolean
          collect_economic_data?: boolean
          collect_education_data?: boolean
          collect_health_data?: boolean
          collect_hiv_status?: boolean
          collect_household_data?: boolean
          collect_nutritional_status?: boolean
          collect_religion?: boolean
          created_at?: string
          custom_fields?: Json
          custom_vulnerability_tags?: Json
          id?: string
          id_prefix?: string | null
          minor_age_threshold?: number | null
          org_type?: string
          organization_id: string
          require_guardian_for_minors?: boolean | null
          updated_at?: string
        }
        Update: {
          beneficiary_terminology?: string
          beneficiary_terminology_plural?: string
          collect_disability_details?: boolean
          collect_economic_data?: boolean
          collect_education_data?: boolean
          collect_health_data?: boolean
          collect_hiv_status?: boolean
          collect_household_data?: boolean
          collect_nutritional_status?: boolean
          collect_religion?: boolean
          created_at?: string
          custom_fields?: Json
          custom_vulnerability_tags?: Json
          id?: string
          id_prefix?: string | null
          minor_age_threshold?: number | null
          org_type?: string
          organization_id?: string
          require_guardian_for_minors?: boolean | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_beneficiary_config_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_beneficiary_config_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations_public_view"
            referencedColumns: ["id"]
          },
        ]
      }
      org_notification_prefs: {
        Row: {
          channel: string
          created_at: string
          id: string
          is_enabled: boolean
          organization_id: string
          preference_key: string
          updated_at: string
        }
        Insert: {
          channel: string
          created_at?: string
          id?: string
          is_enabled?: boolean
          organization_id: string
          preference_key: string
          updated_at?: string
        }
        Update: {
          channel?: string
          created_at?: string
          id?: string
          is_enabled?: boolean
          organization_id?: string
          preference_key?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_notification_prefs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_notification_prefs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations_public_view"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          organization_id: string
          role: string
          status: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by: string
          organization_id: string
          role?: string
          status?: string
          token?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          organization_id?: string
          role?: string
          status?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_invitations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_invitations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations_public_view"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          branch_id: string | null
          created_at: string
          id: string
          invited_by: string | null
          is_primary: boolean
          joined_at: string
          organization_id: string
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          branch_id?: string | null
          created_at?: string
          id?: string
          invited_by?: string | null
          is_primary?: boolean
          joined_at?: string
          organization_id: string
          role?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          branch_id?: string | null
          created_at?: string
          id?: string
          invited_by?: string | null
          is_primary?: boolean
          joined_at?: string
          organization_id?: string
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations_public_view"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          address: string | null
          allow_export_non_admin: boolean | null
          annual_returns_uploaded_at: string | null
          annual_returns_url: string | null
          base_currency: string | null
          budget_approval_threshold: number | null
          country: string | null
          county: string | null
          created_at: string
          data_protection_policy_uploaded_at: string | null
          data_protection_policy_url: string | null
          default_indicator_frequency: string | null
          default_narrative_sections: Json | null
          default_new_staff_role: string | null
          description: string | null
          dpo_email: string | null
          dpo_name: string | null
          email: string | null
          email_from_name: string | null
          email_reply_to: string | null
          expense_approval_threshold: number | null
          features_enabled: Json | null
          field_officer_sees_all: boolean | null
          financial_audit_uploaded_at: string | null
          financial_audit_url: string | null
          fiscal_year_start_month: number | null
          id: string
          incorporation_cert_uploaded_at: string | null
          incorporation_cert_url: string | null
          indicator_at_risk_threshold: number | null
          indicator_on_track_threshold: number | null
          is_active: boolean
          is_partner: boolean | null
          kra_cert_uploaded_at: string | null
          kra_exemption_cert_url: string | null
          kra_exemption_expiry: string | null
          logo_url: string | null
          moa_uploaded_at: string | null
          moa_url: string | null
          name: string
          ngo_board_cert_expiry: string | null
          ngo_board_cert_uploaded_at: string | null
          ngo_board_cert_url: string | null
          onboarding_completed: boolean
          onboarding_completed_at: string | null
          organization_type: string | null
          overdue_visit_days: number | null
          ownership_type: string | null
          partner_granted_at: string | null
          partner_granted_by: string | null
          partner_notes: string | null
          pbo_cert_uploaded_at: string | null
          pbo_cert_url: string | null
          pbo_expiry: string | null
          pbo_number: string | null
          phone: string | null
          physical_address: string | null
          plan_override: string | null
          primary_color: string | null
          registration_number: string | null
          require_2fa_admins: boolean | null
          require_2fa_all: boolean | null
          require_gps_checkin: boolean | null
          require_indicator_justification: boolean | null
          safeguarding_policy_uploaded_at: string | null
          safeguarding_policy_url: string | null
          session_timeout_minutes: number | null
          settings: Json | null
          setup_completed: boolean
          setup_completed_at: string | null
          setup_config: Json
          show_name_in_sidebar: boolean | null
          slug: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          sub_county: string | null
          subscription_ends_at: string | null
          subscription_started_at: string | null
          subscription_status: string | null
          subscription_tier: string | null
          suspended_at: string | null
          suspended_reason: string | null
          trial_ends_at: string | null
          updated_at: string
          usage_stats: Json | null
          website: string | null
          year_founded: number | null
        }
        Insert: {
          address?: string | null
          allow_export_non_admin?: boolean | null
          annual_returns_uploaded_at?: string | null
          annual_returns_url?: string | null
          base_currency?: string | null
          budget_approval_threshold?: number | null
          country?: string | null
          county?: string | null
          created_at?: string
          data_protection_policy_uploaded_at?: string | null
          data_protection_policy_url?: string | null
          default_indicator_frequency?: string | null
          default_narrative_sections?: Json | null
          default_new_staff_role?: string | null
          description?: string | null
          dpo_email?: string | null
          dpo_name?: string | null
          email?: string | null
          email_from_name?: string | null
          email_reply_to?: string | null
          expense_approval_threshold?: number | null
          features_enabled?: Json | null
          field_officer_sees_all?: boolean | null
          financial_audit_uploaded_at?: string | null
          financial_audit_url?: string | null
          fiscal_year_start_month?: number | null
          id?: string
          incorporation_cert_uploaded_at?: string | null
          incorporation_cert_url?: string | null
          indicator_at_risk_threshold?: number | null
          indicator_on_track_threshold?: number | null
          is_active?: boolean
          is_partner?: boolean | null
          kra_cert_uploaded_at?: string | null
          kra_exemption_cert_url?: string | null
          kra_exemption_expiry?: string | null
          logo_url?: string | null
          moa_uploaded_at?: string | null
          moa_url?: string | null
          name: string
          ngo_board_cert_expiry?: string | null
          ngo_board_cert_uploaded_at?: string | null
          ngo_board_cert_url?: string | null
          onboarding_completed?: boolean
          onboarding_completed_at?: string | null
          organization_type?: string | null
          overdue_visit_days?: number | null
          ownership_type?: string | null
          partner_granted_at?: string | null
          partner_granted_by?: string | null
          partner_notes?: string | null
          pbo_cert_uploaded_at?: string | null
          pbo_cert_url?: string | null
          pbo_expiry?: string | null
          pbo_number?: string | null
          phone?: string | null
          physical_address?: string | null
          plan_override?: string | null
          primary_color?: string | null
          registration_number?: string | null
          require_2fa_admins?: boolean | null
          require_2fa_all?: boolean | null
          require_gps_checkin?: boolean | null
          require_indicator_justification?: boolean | null
          safeguarding_policy_uploaded_at?: string | null
          safeguarding_policy_url?: string | null
          session_timeout_minutes?: number | null
          settings?: Json | null
          setup_completed?: boolean
          setup_completed_at?: string | null
          setup_config?: Json
          show_name_in_sidebar?: boolean | null
          slug: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          sub_county?: string | null
          subscription_ends_at?: string | null
          subscription_started_at?: string | null
          subscription_status?: string | null
          subscription_tier?: string | null
          suspended_at?: string | null
          suspended_reason?: string | null
          trial_ends_at?: string | null
          updated_at?: string
          usage_stats?: Json | null
          website?: string | null
          year_founded?: number | null
        }
        Update: {
          address?: string | null
          allow_export_non_admin?: boolean | null
          annual_returns_uploaded_at?: string | null
          annual_returns_url?: string | null
          base_currency?: string | null
          budget_approval_threshold?: number | null
          country?: string | null
          county?: string | null
          created_at?: string
          data_protection_policy_uploaded_at?: string | null
          data_protection_policy_url?: string | null
          default_indicator_frequency?: string | null
          default_narrative_sections?: Json | null
          default_new_staff_role?: string | null
          description?: string | null
          dpo_email?: string | null
          dpo_name?: string | null
          email?: string | null
          email_from_name?: string | null
          email_reply_to?: string | null
          expense_approval_threshold?: number | null
          features_enabled?: Json | null
          field_officer_sees_all?: boolean | null
          financial_audit_uploaded_at?: string | null
          financial_audit_url?: string | null
          fiscal_year_start_month?: number | null
          id?: string
          incorporation_cert_uploaded_at?: string | null
          incorporation_cert_url?: string | null
          indicator_at_risk_threshold?: number | null
          indicator_on_track_threshold?: number | null
          is_active?: boolean
          is_partner?: boolean | null
          kra_cert_uploaded_at?: string | null
          kra_exemption_cert_url?: string | null
          kra_exemption_expiry?: string | null
          logo_url?: string | null
          moa_uploaded_at?: string | null
          moa_url?: string | null
          name?: string
          ngo_board_cert_expiry?: string | null
          ngo_board_cert_uploaded_at?: string | null
          ngo_board_cert_url?: string | null
          onboarding_completed?: boolean
          onboarding_completed_at?: string | null
          organization_type?: string | null
          overdue_visit_days?: number | null
          ownership_type?: string | null
          partner_granted_at?: string | null
          partner_granted_by?: string | null
          partner_notes?: string | null
          pbo_cert_uploaded_at?: string | null
          pbo_cert_url?: string | null
          pbo_expiry?: string | null
          pbo_number?: string | null
          phone?: string | null
          physical_address?: string | null
          plan_override?: string | null
          primary_color?: string | null
          registration_number?: string | null
          require_2fa_admins?: boolean | null
          require_2fa_all?: boolean | null
          require_gps_checkin?: boolean | null
          require_indicator_justification?: boolean | null
          safeguarding_policy_uploaded_at?: string | null
          safeguarding_policy_url?: string | null
          session_timeout_minutes?: number | null
          settings?: Json | null
          setup_completed?: boolean
          setup_completed_at?: string | null
          setup_config?: Json
          show_name_in_sidebar?: boolean | null
          slug?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          sub_county?: string | null
          subscription_ends_at?: string | null
          subscription_started_at?: string | null
          subscription_status?: string | null
          subscription_tier?: string | null
          suspended_at?: string | null
          suspended_reason?: string | null
          trial_ends_at?: string | null
          updated_at?: string
          usage_stats?: Json | null
          website?: string | null
          year_founded?: number | null
        }
        Relationships: []
      }
      partner_access_log: {
        Row: {
          action: string
          created_at: string | null
          id: string
          notes: string | null
          organization_id: string
          performed_by: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          notes?: string | null
          organization_id: string
          performed_by?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          notes?: string | null
          organization_id?: string
          performed_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partner_access_log_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_access_log_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations_public_view"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_activities: {
        Row: {
          activity_date: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          location: string | null
          organization_id: string
          outcome: string | null
          participants_count: number | null
          partner_id: string
          program_id: string | null
          status: string | null
          title: string
          updated_at: string
        }
        Insert: {
          activity_date?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          location?: string | null
          organization_id: string
          outcome?: string | null
          participants_count?: number | null
          partner_id: string
          program_id?: string | null
          status?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          activity_date?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          location?: string | null
          organization_id?: string
          outcome?: string | null
          participants_count?: number | null
          partner_id?: string
          program_id?: string | null
          status?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_activities_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_activities_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations_public_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_activities_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partner_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_activities_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_activities_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "v_program_funding_summary"
            referencedColumns: ["program_id"]
          },
        ]
      }
      partner_organizations: {
        Row: {
          address: string | null
          agreement_url: string | null
          contact_email: string | null
          contact_person: string | null
          contact_phone: string | null
          country: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          metadata: Json | null
          organization_id: string
          partner_name: string
          partner_type: string
          partnership_end: string | null
          partnership_start: string | null
          status: string
          updated_at: string
          website: string | null
        }
        Insert: {
          address?: string | null
          agreement_url?: string | null
          contact_email?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          organization_id: string
          partner_name: string
          partner_type?: string
          partnership_end?: string | null
          partnership_start?: string | null
          status?: string
          updated_at?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          agreement_url?: string | null
          contact_email?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          organization_id?: string
          partner_name?: string
          partner_type?: string
          partnership_end?: string | null
          partnership_start?: string | null
          status?: string
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partner_organizations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_organizations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations_public_view"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_shared_resources: {
        Row: {
          created_at: string
          currency: string | null
          description: string | null
          direction: string
          end_date: string | null
          id: string
          notes: string | null
          organization_id: string
          partner_id: string
          resource_type: string
          start_date: string | null
          status: string | null
          title: string
          updated_at: string
          value_amount: number | null
        }
        Insert: {
          created_at?: string
          currency?: string | null
          description?: string | null
          direction?: string
          end_date?: string | null
          id?: string
          notes?: string | null
          organization_id: string
          partner_id: string
          resource_type: string
          start_date?: string | null
          status?: string | null
          title: string
          updated_at?: string
          value_amount?: number | null
        }
        Update: {
          created_at?: string
          currency?: string | null
          description?: string | null
          direction?: string
          end_date?: string | null
          id?: string
          notes?: string | null
          organization_id?: string
          partner_id?: string
          resource_type?: string
          start_date?: string | null
          status?: string | null
          title?: string
          updated_at?: string
          value_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "partner_shared_resources_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_shared_resources_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations_public_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_shared_resources_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partner_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      petty_cash_funds: {
        Row: {
          created_at: string | null
          currency: string | null
          current_balance: number
          custodian_id: string | null
          fund_name: string
          id: string
          is_active: boolean | null
          opening_balance: number
          org_id: string
          project_id: string | null
        }
        Insert: {
          created_at?: string | null
          currency?: string | null
          current_balance?: number
          custodian_id?: string | null
          fund_name: string
          id?: string
          is_active?: boolean | null
          opening_balance?: number
          org_id: string
          project_id?: string | null
        }
        Update: {
          created_at?: string | null
          currency?: string | null
          current_balance?: number
          custodian_id?: string | null
          fund_name?: string
          id?: string
          is_active?: boolean | null
          opening_balance?: number
          org_id?: string
          project_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "petty_cash_funds_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "petty_cash_funds_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations_public_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "petty_cash_funds_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "petty_cash_funds_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_funding_summary"
            referencedColumns: ["project_id"]
          },
        ]
      }
      petty_cash_transactions: {
        Row: {
          amount: number
          created_at: string | null
          description: string
          fund_id: string
          id: string
          receipt_url: string | null
          recorded_by: string | null
          transaction_date: string
          transaction_type: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          description: string
          fund_id: string
          id?: string
          receipt_url?: string | null
          recorded_by?: string | null
          transaction_date?: string
          transaction_type: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          description?: string
          fund_id?: string
          id?: string
          receipt_url?: string | null
          recorded_by?: string | null
          transaction_date?: string
          transaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "petty_cash_transactions_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "petty_cash_funds"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_announcement_reads: {
        Row: {
          announcement_id: string | null
          id: string
          read_at: string | null
          user_id: string | null
        }
        Insert: {
          announcement_id?: string | null
          id?: string
          read_at?: string | null
          user_id?: string | null
        }
        Update: {
          announcement_id?: string | null
          id?: string
          read_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "platform_announcement_reads_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "platform_announcements"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_announcements: {
        Row: {
          body: string
          created_at: string | null
          created_by: string | null
          expires_at: string | null
          id: string
          published_at: string | null
          target: string | null
          title: string
          type: string | null
        }
        Insert: {
          body: string
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          id?: string
          published_at?: string | null
          target?: string | null
          title: string
          type?: string | null
        }
        Update: {
          body?: string
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          id?: string
          published_at?: string | null
          target?: string | null
          title?: string
          type?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          county: string | null
          created_at: string
          date_of_birth: string | null
          department: string | null
          email: string
          employment_type: string | null
          full_name: string
          gender: string | null
          id: string
          job_title: string | null
          last_login_at: string | null
          national_id: string | null
          notes: string | null
          organization_id: string | null
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          staff_id: string | null
          start_date: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          county?: string | null
          created_at?: string
          date_of_birth?: string | null
          department?: string | null
          email: string
          employment_type?: string | null
          full_name: string
          gender?: string | null
          id?: string
          job_title?: string | null
          last_login_at?: string | null
          national_id?: string | null
          notes?: string | null
          organization_id?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          staff_id?: string | null
          start_date?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          county?: string | null
          created_at?: string
          date_of_birth?: string | null
          department?: string | null
          email?: string
          employment_type?: string | null
          full_name?: string
          gender?: string | null
          id?: string
          job_title?: string | null
          last_login_at?: string | null
          national_id?: string | null
          notes?: string | null
          organization_id?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          staff_id?: string | null
          start_date?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations_public_view"
            referencedColumns: ["id"]
          },
        ]
      }
      program_beneficiaries: {
        Row: {
          created_at: string
          created_by: string | null
          data: Json | null
          display_name: string
          enrolled_at: string
          id: string
          linked_child_id: string | null
          organization_id: string
          program_id: string
          status: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          data?: Json | null
          display_name: string
          enrolled_at?: string
          id?: string
          linked_child_id?: string | null
          organization_id: string
          program_id: string
          status?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          data?: Json | null
          display_name?: string
          enrolled_at?: string
          id?: string
          linked_child_id?: string | null
          organization_id?: string
          program_id?: string
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "program_beneficiaries_linked_child_id_fkey"
            columns: ["linked_child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_beneficiaries_linked_child_id_fkey"
            columns: ["linked_child_id"]
            isOneToOne: false
            referencedRelation: "children_safe_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_beneficiaries_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_beneficiaries_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations_public_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_beneficiaries_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_beneficiaries_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "v_program_funding_summary"
            referencedColumns: ["program_id"]
          },
        ]
      }
      program_comms_outputs: {
        Row: {
          audience_reach: number | null
          channel: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          description: string | null
          donor_name: string | null
          id: string
          organization_id: string
          output_type: string
          planned_date: string | null
          program_id: string | null
          project_id: string | null
          published_date: string | null
          status: string
          tags: string[] | null
          title: string
          updated_at: string
          updated_by: string | null
          url: string | null
        }
        Insert: {
          audience_reach?: number | null
          channel?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          donor_name?: string | null
          id?: string
          organization_id: string
          output_type?: string
          planned_date?: string | null
          program_id?: string | null
          project_id?: string | null
          published_date?: string | null
          status?: string
          tags?: string[] | null
          title: string
          updated_at?: string
          updated_by?: string | null
          url?: string | null
        }
        Update: {
          audience_reach?: number | null
          channel?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          donor_name?: string | null
          id?: string
          organization_id?: string
          output_type?: string
          planned_date?: string | null
          program_id?: string | null
          project_id?: string | null
          published_date?: string | null
          status?: string
          tags?: string[] | null
          title?: string
          updated_at?: string
          updated_by?: string | null
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "program_comms_outputs_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_comms_outputs_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "v_program_funding_summary"
            referencedColumns: ["program_id"]
          },
          {
            foreignKeyName: "program_comms_outputs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_comms_outputs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_funding_summary"
            referencedColumns: ["project_id"]
          },
        ]
      }
      program_donors: {
        Row: {
          contribution_amount: number | null
          contribution_date: string | null
          created_at: string
          created_by: string | null
          donor_name: string | null
          id: string
          notes: string | null
          organization_id: string
          program_id: string
          sponsor_id: string | null
        }
        Insert: {
          contribution_amount?: number | null
          contribution_date?: string | null
          created_at?: string
          created_by?: string | null
          donor_name?: string | null
          id?: string
          notes?: string | null
          organization_id: string
          program_id: string
          sponsor_id?: string | null
        }
        Update: {
          contribution_amount?: number | null
          contribution_date?: string | null
          created_at?: string
          created_by?: string | null
          donor_name?: string | null
          id?: string
          notes?: string | null
          organization_id?: string
          program_id?: string
          sponsor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "program_donors_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_donors_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations_public_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_donors_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_donors_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "v_program_funding_summary"
            referencedColumns: ["program_id"]
          },
        ]
      }
      program_entries: {
        Row: {
          child_id: string | null
          created_at: string
          created_by: string | null
          data: Json
          id: string
          program_id: string
          updated_at: string
        }
        Insert: {
          child_id?: string | null
          created_at?: string
          created_by?: string | null
          data?: Json
          id?: string
          program_id: string
          updated_at?: string
        }
        Update: {
          child_id?: string | null
          created_at?: string
          created_by?: string | null
          data?: Json
          id?: string
          program_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "program_entries_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_entries_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children_safe_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_entries_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_entries_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "v_program_funding_summary"
            referencedColumns: ["program_id"]
          },
        ]
      }
      program_indicators: {
        Row: {
          created_at: string
          created_by: string | null
          current_value: number | null
          data_collection_method: string | null
          id: string
          indicator_type: string | null
          is_active: boolean | null
          measurement_unit: string | null
          name: string
          organization_id: string
          program_id: string | null
          project_id: string | null
          reporting_frequency: string | null
          responsible_person_id: string | null
          target_value: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          current_value?: number | null
          data_collection_method?: string | null
          id?: string
          indicator_type?: string | null
          is_active?: boolean | null
          measurement_unit?: string | null
          name: string
          organization_id: string
          program_id?: string | null
          project_id?: string | null
          reporting_frequency?: string | null
          responsible_person_id?: string | null
          target_value?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          current_value?: number | null
          data_collection_method?: string | null
          id?: string
          indicator_type?: string | null
          is_active?: boolean | null
          measurement_unit?: string | null
          name?: string
          organization_id?: string
          program_id?: string | null
          project_id?: string | null
          reporting_frequency?: string | null
          responsible_person_id?: string | null
          target_value?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "program_indicators_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_indicators_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations_public_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_indicators_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_indicators_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "v_program_funding_summary"
            referencedColumns: ["program_id"]
          },
          {
            foreignKeyName: "program_indicators_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_indicators_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_funding_summary"
            referencedColumns: ["project_id"]
          },
        ]
      }
      program_modules: {
        Row: {
          created_at: string
          custom_fields: Json | null
          description: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          program_id: string
          slug: string
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          custom_fields?: Json | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          program_id: string
          slug: string
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          custom_fields?: Json | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          program_id?: string
          slug?: string
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "program_modules_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_modules_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "v_program_funding_summary"
            referencedColumns: ["program_id"]
          },
        ]
      }
      program_observations: {
        Row: {
          activity_id: string | null
          assigned_staff_id: string | null
          beneficiary_id: string | null
          created_at: string
          created_by: string | null
          follow_up_date: string | null
          id: string
          narrative_notes: string
          observation_category: string | null
          observation_date: string
          organization_id: string
          program_id: string | null
          project_id: string | null
          recommended_action: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          activity_id?: string | null
          assigned_staff_id?: string | null
          beneficiary_id?: string | null
          created_at?: string
          created_by?: string | null
          follow_up_date?: string | null
          id?: string
          narrative_notes: string
          observation_category?: string | null
          observation_date: string
          organization_id: string
          program_id?: string | null
          project_id?: string | null
          recommended_action?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          activity_id?: string | null
          assigned_staff_id?: string | null
          beneficiary_id?: string | null
          created_at?: string
          created_by?: string | null
          follow_up_date?: string | null
          id?: string
          narrative_notes?: string
          observation_category?: string | null
          observation_date?: string
          organization_id?: string
          program_id?: string | null
          project_id?: string | null
          recommended_action?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "program_observations_beneficiary_id_fkey"
            columns: ["beneficiary_id"]
            isOneToOne: false
            referencedRelation: "beneficiaries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_observations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_observations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations_public_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_observations_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_observations_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "v_program_funding_summary"
            referencedColumns: ["program_id"]
          },
          {
            foreignKeyName: "program_observations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_observations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_funding_summary"
            referencedColumns: ["project_id"]
          },
        ]
      }
      program_partners: {
        Row: {
          contribution_currency: string | null
          contribution_type: string | null
          contribution_value: number | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          mou_end_date: string | null
          mou_reference: string | null
          mou_start_date: string | null
          notes: string | null
          org_id: string
          partner_id: string
          program_id: string | null
          project_id: string | null
          role: string
          status: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          contribution_currency?: string | null
          contribution_type?: string | null
          contribution_value?: number | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          mou_end_date?: string | null
          mou_reference?: string | null
          mou_start_date?: string | null
          notes?: string | null
          org_id: string
          partner_id: string
          program_id?: string | null
          project_id?: string | null
          role?: string
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          contribution_currency?: string | null
          contribution_type?: string | null
          contribution_value?: number | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          mou_end_date?: string | null
          mou_reference?: string | null
          mou_start_date?: string | null
          notes?: string | null
          org_id?: string
          partner_id?: string
          program_id?: string | null
          project_id?: string | null
          role?: string
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "program_partners_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partner_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_partners_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_partners_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "v_program_funding_summary"
            referencedColumns: ["program_id"]
          },
          {
            foreignKeyName: "program_partners_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_partners_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_funding_summary"
            referencedColumns: ["project_id"]
          },
        ]
      }
      program_reach_targets: {
        Row: {
          category: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          location: string | null
          notes: string | null
          organization_id: string
          period_end: string | null
          period_start: string | null
          program_id: string
          project_id: string | null
          segment: string
          target_count: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          category: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          location?: string | null
          notes?: string | null
          organization_id: string
          period_end?: string | null
          period_start?: string | null
          program_id: string
          project_id?: string | null
          segment: string
          target_count?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          location?: string | null
          notes?: string | null
          organization_id?: string
          period_end?: string | null
          period_start?: string | null
          program_id?: string
          project_id?: string | null
          segment?: string
          target_count?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      program_report_types: {
        Row: {
          created_at: string
          frequency: string | null
          id: string
          is_required: boolean | null
          program_id: string
          template_id: string
        }
        Insert: {
          created_at?: string
          frequency?: string | null
          id?: string
          is_required?: boolean | null
          program_id: string
          template_id: string
        }
        Update: {
          created_at?: string
          frequency?: string | null
          id?: string
          is_required?: boolean | null
          program_id?: string
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "program_report_types_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_report_types_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "v_program_funding_summary"
            referencedColumns: ["program_id"]
          },
          {
            foreignKeyName: "program_report_types_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "report_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      program_risks: {
        Row: {
          category: string
          contingency_plan: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          description: string | null
          due_date: string | null
          id: string
          impact: number
          likelihood: number
          mitigation_plan: string | null
          org_id: string
          owner_id: string | null
          program_id: string | null
          project_id: string | null
          reviewed_at: string | null
          risk_score: number | null
          status: string
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          category?: string
          contingency_plan?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          impact?: number
          likelihood?: number
          mitigation_plan?: string | null
          org_id: string
          owner_id?: string | null
          program_id?: string | null
          project_id?: string | null
          reviewed_at?: string | null
          risk_score?: number | null
          status?: string
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          category?: string
          contingency_plan?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          impact?: number
          likelihood?: number
          mitigation_plan?: string | null
          org_id?: string
          owner_id?: string | null
          program_id?: string | null
          project_id?: string | null
          reviewed_at?: string | null
          risk_score?: number | null
          status?: string
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "program_risks_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_risks_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "v_program_funding_summary"
            referencedColumns: ["program_id"]
          },
          {
            foreignKeyName: "program_risks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_risks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_funding_summary"
            referencedColumns: ["project_id"]
          },
        ]
      }
      program_stakeholders: {
        Row: {
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          engagement_strategy: string | null
          id: string
          influence: number
          interest: number
          name: string
          notes: string | null
          org_id: string
          organization_name: string | null
          program_id: string | null
          project_id: string | null
          role_title: string | null
          stakeholder_type: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          engagement_strategy?: string | null
          id?: string
          influence?: number
          interest?: number
          name: string
          notes?: string | null
          org_id: string
          organization_name?: string | null
          program_id?: string | null
          project_id?: string | null
          role_title?: string | null
          stakeholder_type?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          engagement_strategy?: string | null
          id?: string
          influence?: number
          interest?: number
          name?: string
          notes?: string | null
          org_id?: string
          organization_name?: string | null
          program_id?: string | null
          project_id?: string | null
          role_title?: string | null
          stakeholder_type?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "program_stakeholders_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_stakeholders_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "v_program_funding_summary"
            referencedColumns: ["program_id"]
          },
          {
            foreignKeyName: "program_stakeholders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_stakeholders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_funding_summary"
            referencedColumns: ["project_id"]
          },
        ]
      }
      program_sustainability_milestones: {
        Row: {
          category: string
          completion_date: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          description: string | null
          due_date: string | null
          id: string
          notes: string | null
          organization_id: string
          program_id: string | null
          progress_percent: number
          project_id: string | null
          responsible_party: string | null
          status: string
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          category?: string
          completion_date?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          notes?: string | null
          organization_id: string
          program_id?: string | null
          progress_percent?: number
          project_id?: string | null
          responsible_party?: string | null
          status?: string
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          category?: string
          completion_date?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          notes?: string | null
          organization_id?: string
          program_id?: string | null
          progress_percent?: number
          project_id?: string | null
          responsible_party?: string | null
          status?: string
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "program_sustainability_milestones_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_sustainability_milestones_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "v_program_funding_summary"
            referencedColumns: ["program_id"]
          },
          {
            foreignKeyName: "program_sustainability_milestones_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_sustainability_milestones_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_funding_summary"
            referencedColumns: ["project_id"]
          },
        ]
      }
      program_sustainability_plans: {
        Row: {
          capacity_transfer_notes: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          exit_strategy_summary: string | null
          financial_sustainability_notes: string | null
          id: string
          organization_id: string
          ownership_model: string | null
          post_exit_owner: string | null
          program_id: string | null
          project_id: string | null
          risks_to_continuity: string | null
          target_handover_date: string | null
          updated_at: string
          updated_by: string | null
          vision: string | null
        }
        Insert: {
          capacity_transfer_notes?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          exit_strategy_summary?: string | null
          financial_sustainability_notes?: string | null
          id?: string
          organization_id: string
          ownership_model?: string | null
          post_exit_owner?: string | null
          program_id?: string | null
          project_id?: string | null
          risks_to_continuity?: string | null
          target_handover_date?: string | null
          updated_at?: string
          updated_by?: string | null
          vision?: string | null
        }
        Update: {
          capacity_transfer_notes?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          exit_strategy_summary?: string | null
          financial_sustainability_notes?: string | null
          id?: string
          organization_id?: string
          ownership_model?: string | null
          post_exit_owner?: string | null
          program_id?: string | null
          project_id?: string | null
          risks_to_continuity?: string | null
          target_handover_date?: string | null
          updated_at?: string
          updated_by?: string | null
          vision?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "program_sustainability_plans_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_sustainability_plans_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "v_program_funding_summary"
            referencedColumns: ["program_id"]
          },
          {
            foreignKeyName: "program_sustainability_plans_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_sustainability_plans_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_funding_summary"
            referencedColumns: ["project_id"]
          },
        ]
      }
      program_visit_types: {
        Row: {
          created_at: string
          description: string | null
          field_schema: Json | null
          id: string
          is_active: boolean | null
          name: string
          program_id: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          field_schema?: Json | null
          id?: string
          is_active?: boolean | null
          name: string
          program_id: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          field_schema?: Json | null
          id?: string
          is_active?: boolean | null
          name?: string
          program_id?: string
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "program_visit_types_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_visit_types_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "v_program_funding_summary"
            referencedColumns: ["program_id"]
          },
        ]
      }
      program_visits: {
        Row: {
          beneficiary_id: string | null
          created_at: string
          created_by: string | null
          data: Json | null
          id: string
          linked_child_id: string | null
          organization_id: string
          program_id: string
          staff: string | null
          updated_at: string
          visit_date: string
          visit_type_id: string
        }
        Insert: {
          beneficiary_id?: string | null
          created_at?: string
          created_by?: string | null
          data?: Json | null
          id?: string
          linked_child_id?: string | null
          organization_id: string
          program_id: string
          staff?: string | null
          updated_at?: string
          visit_date: string
          visit_type_id: string
        }
        Update: {
          beneficiary_id?: string | null
          created_at?: string
          created_by?: string | null
          data?: Json | null
          id?: string
          linked_child_id?: string | null
          organization_id?: string
          program_id?: string
          staff?: string | null
          updated_at?: string
          visit_date?: string
          visit_type_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "program_visits_beneficiary_id_fkey"
            columns: ["beneficiary_id"]
            isOneToOne: false
            referencedRelation: "program_beneficiaries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_visits_linked_child_id_fkey"
            columns: ["linked_child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_visits_linked_child_id_fkey"
            columns: ["linked_child_id"]
            isOneToOne: false
            referencedRelation: "children_safe_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_visits_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_visits_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations_public_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_visits_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_visits_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "v_program_funding_summary"
            referencedColumns: ["program_id"]
          },
          {
            foreignKeyName: "program_visits_visit_type_id_fkey"
            columns: ["visit_type_id"]
            isOneToOne: false
            referencedRelation: "program_visit_types"
            referencedColumns: ["id"]
          },
        ]
      }
      programme_field_config: {
        Row: {
          created_at: string
          display_order: number
          field_label: string
          field_name: string
          field_options: Json
          field_type: string
          id: string
          is_required: boolean
          organization_id: string
          program_id: string | null
          project_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          field_label: string
          field_name: string
          field_options?: Json
          field_type: string
          id?: string
          is_required?: boolean
          organization_id: string
          program_id?: string | null
          project_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number
          field_label?: string
          field_name?: string
          field_options?: Json
          field_type?: string
          id?: string
          is_required?: boolean
          organization_id?: string
          program_id?: string | null
          project_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "programme_field_config_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "programme_field_config_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations_public_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "programme_field_config_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "programme_field_config_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "v_program_funding_summary"
            referencedColumns: ["program_id"]
          },
          {
            foreignKeyName: "programme_field_config_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "programme_field_config_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_funding_summary"
            referencedColumns: ["project_id"]
          },
        ]
      }
      programme_logframes: {
        Row: {
          created_at: string
          created_by: string | null
          goal: string | null
          goal_indicator: string | null
          id: string
          org_id: string
          program_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          goal?: string | null
          goal_indicator?: string | null
          id?: string
          org_id: string
          program_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          goal?: string | null
          goal_indicator?: string | null
          id?: string
          org_id?: string
          program_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "programme_logframes_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "programme_logframes_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations_public_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "programme_logframes_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "programme_logframes_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "v_program_funding_summary"
            referencedColumns: ["program_id"]
          },
        ]
      }
      programme_milestones: {
        Row: {
          assigned_to: string | null
          completed_date: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          description: string | null
          due_date: string
          id: string
          milestone_type: string
          org_id: string
          program_id: string | null
          project_id: string | null
          status: string
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          assigned_to?: string | null
          completed_date?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          due_date: string
          id?: string
          milestone_type?: string
          org_id: string
          program_id?: string | null
          project_id?: string | null
          status?: string
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          assigned_to?: string | null
          completed_date?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          due_date?: string
          id?: string
          milestone_type?: string
          org_id?: string
          program_id?: string | null
          project_id?: string | null
          status?: string
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "programme_milestones_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "programme_milestones_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations_public_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "programme_milestones_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "programme_milestones_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "v_program_funding_summary"
            referencedColumns: ["program_id"]
          },
          {
            foreignKeyName: "programme_milestones_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "programme_milestones_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_funding_summary"
            referencedColumns: ["project_id"]
          },
        ]
      }
      programme_team: {
        Row: {
          created_at: string
          created_by: string | null
          end_date: string | null
          id: string
          is_lead: boolean
          org_id: string
          program_id: string | null
          project_id: string | null
          role: string
          role_label: string | null
          staff_id: string
          start_date: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          end_date?: string | null
          id?: string
          is_lead?: boolean
          org_id: string
          program_id?: string | null
          project_id?: string | null
          role: string
          role_label?: string | null
          staff_id: string
          start_date?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          end_date?: string | null
          id?: string
          is_lead?: boolean
          org_id?: string
          program_id?: string | null
          project_id?: string | null
          role?: string
          role_label?: string | null
          staff_id?: string
          start_date?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "programme_team_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "programme_team_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations_public_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "programme_team_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "programme_team_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "v_program_funding_summary"
            referencedColumns: ["program_id"]
          },
          {
            foreignKeyName: "programme_team_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "programme_team_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_funding_summary"
            referencedColumns: ["project_id"]
          },
        ]
      }
      programs: {
        Row: {
          annual_funding_required: number | null
          category: string | null
          color: string | null
          created_at: string
          created_by: string | null
          currency: string
          custom_fields: Json | null
          deleted_at: string | null
          description: string | null
          end_date: string | null
          geographic_coverage: Json | null
          icon: string | null
          id: string
          is_active: boolean
          location: string | null
          logframe_status: string
          module_config: Json | null
          name: string
          objectives: string | null
          organization_id: string
          primary_sector: string | null
          program_id: string | null
          program_manager_id: string | null
          secondary_sectors: string[] | null
          settings: Json | null
          show_in_navigation: boolean | null
          slug: string | null
          sort_order: number | null
          start_date: string | null
          status: string | null
          target_population: string[] | null
          total_budget: number | null
          updated_by: string | null
        }
        Insert: {
          annual_funding_required?: number | null
          category?: string | null
          color?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          custom_fields?: Json | null
          deleted_at?: string | null
          description?: string | null
          end_date?: string | null
          geographic_coverage?: Json | null
          icon?: string | null
          id?: string
          is_active?: boolean
          location?: string | null
          logframe_status?: string
          module_config?: Json | null
          name: string
          objectives?: string | null
          organization_id?: string
          primary_sector?: string | null
          program_id?: string | null
          program_manager_id?: string | null
          secondary_sectors?: string[] | null
          settings?: Json | null
          show_in_navigation?: boolean | null
          slug?: string | null
          sort_order?: number | null
          start_date?: string | null
          status?: string | null
          target_population?: string[] | null
          total_budget?: number | null
          updated_by?: string | null
        }
        Update: {
          annual_funding_required?: number | null
          category?: string | null
          color?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          custom_fields?: Json | null
          deleted_at?: string | null
          description?: string | null
          end_date?: string | null
          geographic_coverage?: Json | null
          icon?: string | null
          id?: string
          is_active?: boolean
          location?: string | null
          logframe_status?: string
          module_config?: Json | null
          name?: string
          objectives?: string | null
          organization_id?: string
          primary_sector?: string | null
          program_id?: string | null
          program_manager_id?: string | null
          secondary_sectors?: string[] | null
          settings?: Json | null
          show_in_navigation?: boolean | null
          slug?: string | null
          sort_order?: number | null
          start_date?: string | null
          status?: string | null
          target_population?: string[] | null
          total_budget?: number | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "programs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "programs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations_public_view"
            referencedColumns: ["id"]
          },
        ]
      }
      project_baseline_indicators: {
        Row: {
          created_at: string
          id: string
          indicator_key: string
          indicator_label: string
          organization_id: string
          project_id: string
          required: boolean
          sort_order: number | null
          unit: string | null
          updated_at: string
          value_type: string
        }
        Insert: {
          created_at?: string
          id?: string
          indicator_key: string
          indicator_label: string
          organization_id: string
          project_id: string
          required?: boolean
          sort_order?: number | null
          unit?: string | null
          updated_at?: string
          value_type: string
        }
        Update: {
          created_at?: string
          id?: string
          indicator_key?: string
          indicator_label?: string
          organization_id?: string
          project_id?: string
          required?: boolean
          sort_order?: number | null
          unit?: string | null
          updated_at?: string
          value_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_baseline_indicators_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_baseline_indicators_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations_public_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_baseline_indicators_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_baseline_indicators_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_funding_summary"
            referencedColumns: ["project_id"]
          },
        ]
      }
      project_narrative_reports: {
        Row: {
          achievements: string | null
          approved_at: string | null
          approved_by: string | null
          author_id: string | null
          challenges: string | null
          created_at: string | null
          deleted_at: string | null
          id: string
          lessons: string | null
          next_steps: string | null
          org_id: string
          project_id: string
          report_period_end: string
          report_period_start: string
          status: string | null
          submitted_at: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          achievements?: string | null
          approved_at?: string | null
          approved_by?: string | null
          author_id?: string | null
          challenges?: string | null
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          lessons?: string | null
          next_steps?: string | null
          org_id: string
          project_id: string
          report_period_end: string
          report_period_start: string
          status?: string | null
          submitted_at?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          achievements?: string | null
          approved_at?: string | null
          approved_by?: string | null
          author_id?: string | null
          challenges?: string | null
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          lessons?: string | null
          next_steps?: string | null
          org_id?: string
          project_id?: string
          report_period_end?: string
          report_period_start?: string
          status?: string | null
          submitted_at?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_narrative_reports_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "project_narrative_reports_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "project_narrative_reports_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_narrative_reports_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations_public_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_narrative_reports_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_narrative_reports_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_funding_summary"
            referencedColumns: ["project_id"]
          },
        ]
      }
      project_team_members: {
        Row: {
          created_at: string | null
          end_date: string | null
          id: string
          project_id: string
          role_on_project: string | null
          start_date: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          end_date?: string | null
          id?: string
          project_id: string
          role_on_project?: string | null
          start_date?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          end_date?: string | null
          id?: string
          project_id?: string
          role_on_project?: string | null
          start_date?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_team_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_team_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_funding_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_team_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      projects: {
        Row: {
          allow_partial_sponsorship: boolean | null
          budget: number | null
          created_at: string
          created_by: string | null
          custom_data: Json | null
          custom_fields: Json | null
          deleted_at: string | null
          description: string | null
          donor_visibility: string
          end_date: string | null
          estimated_cost: number | null
          expected_outputs: string | null
          funding_cycle: string | null
          funding_model: string
          geographic_focus: string[] | null
          id: string
          latitude: number | null
          location: string | null
          longitude: number | null
          name: string
          organization_id: string
          program_id: string | null
          project_code: string | null
          project_lead_id: string | null
          project_manager_id: string | null
          slug: string
          sponsorship_currency: string | null
          sponsorship_frequency: string | null
          sponsorship_required: boolean | null
          sponsorship_target_amount: number | null
          start_date: string | null
          status: string | null
          target_beneficiaries: number | null
          target_beneficiary_types: string[] | null
          theory_of_change: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          allow_partial_sponsorship?: boolean | null
          budget?: number | null
          created_at?: string
          created_by?: string | null
          custom_data?: Json | null
          custom_fields?: Json | null
          deleted_at?: string | null
          description?: string | null
          donor_visibility?: string
          end_date?: string | null
          estimated_cost?: number | null
          expected_outputs?: string | null
          funding_cycle?: string | null
          funding_model?: string
          geographic_focus?: string[] | null
          id?: string
          latitude?: number | null
          location?: string | null
          longitude?: number | null
          name: string
          organization_id: string
          program_id?: string | null
          project_code?: string | null
          project_lead_id?: string | null
          project_manager_id?: string | null
          slug: string
          sponsorship_currency?: string | null
          sponsorship_frequency?: string | null
          sponsorship_required?: boolean | null
          sponsorship_target_amount?: number | null
          start_date?: string | null
          status?: string | null
          target_beneficiaries?: number | null
          target_beneficiary_types?: string[] | null
          theory_of_change?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          allow_partial_sponsorship?: boolean | null
          budget?: number | null
          created_at?: string
          created_by?: string | null
          custom_data?: Json | null
          custom_fields?: Json | null
          deleted_at?: string | null
          description?: string | null
          donor_visibility?: string
          end_date?: string | null
          estimated_cost?: number | null
          expected_outputs?: string | null
          funding_cycle?: string | null
          funding_model?: string
          geographic_focus?: string[] | null
          id?: string
          latitude?: number | null
          location?: string | null
          longitude?: number | null
          name?: string
          organization_id?: string
          program_id?: string | null
          project_code?: string | null
          project_lead_id?: string | null
          project_manager_id?: string | null
          slug?: string
          sponsorship_currency?: string | null
          sponsorship_frequency?: string | null
          sponsorship_required?: boolean | null
          sponsorship_target_amount?: number | null
          start_date?: string | null
          status?: string | null
          target_beneficiaries?: number | null
          target_beneficiary_types?: string[] | null
          theory_of_change?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations_public_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "v_program_funding_summary"
            referencedColumns: ["program_id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          budget_line_item_id: string | null
          created_at: string | null
          currency: string | null
          delivered_at: string | null
          delivery_date: string | null
          delivery_location: string | null
          id: string
          issued_at: string | null
          items: Json | null
          notes: string | null
          org_id: string
          po_number: string | null
          requisition_id: string | null
          status: string | null
          total_amount: number | null
          vendor_id: string | null
        }
        Insert: {
          budget_line_item_id?: string | null
          created_at?: string | null
          currency?: string | null
          delivered_at?: string | null
          delivery_date?: string | null
          delivery_location?: string | null
          id?: string
          issued_at?: string | null
          items?: Json | null
          notes?: string | null
          org_id: string
          po_number?: string | null
          requisition_id?: string | null
          status?: string | null
          total_amount?: number | null
          vendor_id?: string | null
        }
        Update: {
          budget_line_item_id?: string | null
          created_at?: string | null
          currency?: string | null
          delivered_at?: string | null
          delivery_date?: string | null
          delivery_location?: string | null
          id?: string
          issued_at?: string | null
          items?: Json | null
          notes?: string | null
          org_id?: string
          po_number?: string | null
          requisition_id?: string | null
          status?: string | null
          total_amount?: number | null
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations_public_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_requisition_id_fkey"
            columns: ["requisition_id"]
            isOneToOne: false
            referencedRelation: "purchase_requisitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_requisitions: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string | null
          currency: string | null
          deleted_at: string | null
          grant_id: string | null
          id: string
          items: Json | null
          justification: string | null
          org_id: string
          project_id: string | null
          rejection_reason: string | null
          requested_by: string | null
          status: string | null
          title: string
          total_amount: number | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          currency?: string | null
          deleted_at?: string | null
          grant_id?: string | null
          id?: string
          items?: Json | null
          justification?: string | null
          org_id: string
          project_id?: string | null
          rejection_reason?: string | null
          requested_by?: string | null
          status?: string | null
          title: string
          total_amount?: number | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          currency?: string | null
          deleted_at?: string | null
          grant_id?: string | null
          id?: string
          items?: Json | null
          justification?: string | null
          org_id?: string
          project_id?: string | null
          rejection_reason?: string | null
          requested_by?: string | null
          status?: string | null
          title?: string
          total_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_requisitions_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "purchase_requisitions_grant_id_fkey"
            columns: ["grant_id"]
            isOneToOne: false
            referencedRelation: "grants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_requisitions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_requisitions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations_public_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_requisitions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_requisitions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_funding_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "purchase_requisitions_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      rate_limits: {
        Row: {
          action_type: string
          attempt_count: number
          blocked_until: string | null
          created_at: string
          id: string
          updated_at: string
          user_id: string
          window_start: string
        }
        Insert: {
          action_type: string
          attempt_count?: number
          blocked_until?: string | null
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
          window_start?: string
        }
        Update: {
          action_type?: string
          attempt_count?: number
          blocked_until?: string | null
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
          window_start?: string
        }
        Relationships: []
      }
      rbac_permissions: {
        Row: {
          action: string
          created_at: string | null
          description: string | null
          display_name: string
          id: string
          module: string
          module_display_name: string
          resource: string
          sort_order: number | null
        }
        Insert: {
          action: string
          created_at?: string | null
          description?: string | null
          display_name: string
          id?: string
          module: string
          module_display_name: string
          resource: string
          sort_order?: number | null
        }
        Update: {
          action?: string
          created_at?: string | null
          description?: string | null
          display_name?: string
          id?: string
          module?: string
          module_display_name?: string
          resource?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      rbac_role_permissions: {
        Row: {
          created_at: string | null
          id: string
          permission_id: string
          role_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          permission_id: string
          role_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          permission_id?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rbac_role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "rbac_permissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rbac_role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "rbac_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      rbac_roles: {
        Row: {
          cloned_from: string | null
          color: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          display_name: string
          icon: string | null
          id: string
          is_active: boolean | null
          is_system_role: boolean | null
          name: string
          organization_id: string | null
          updated_at: string | null
        }
        Insert: {
          cloned_from?: string | null
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          display_name: string
          icon?: string | null
          id?: string
          is_active?: boolean | null
          is_system_role?: boolean | null
          name: string
          organization_id?: string | null
          updated_at?: string | null
        }
        Update: {
          cloned_from?: string | null
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          display_name?: string
          icon?: string | null
          id?: string
          is_active?: boolean | null
          is_system_role?: boolean | null
          name?: string
          organization_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rbac_roles_cloned_from_fkey"
            columns: ["cloned_from"]
            isOneToOne: false
            referencedRelation: "rbac_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rbac_roles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rbac_roles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations_public_view"
            referencedColumns: ["id"]
          },
        ]
      }
      rbac_user_role_assignments: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          id: string
          is_active: boolean | null
          organization_id: string
          role_id: string
          user_id: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          id?: string
          is_active?: boolean | null
          organization_id: string
          role_id: string
          user_id: string
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          id?: string
          is_active?: boolean | null
          organization_id?: string
          role_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rbac_user_role_assignments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rbac_user_role_assignments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations_public_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rbac_user_role_assignments_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "rbac_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      regions: {
        Row: {
          coordinates: Json | null
          country: string | null
          county: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          coordinates?: Json | null
          country?: string | null
          county?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          coordinates?: Json | null
          country?: string | null
          county?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "regions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "regions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations_public_view"
            referencedColumns: ["id"]
          },
        ]
      }
      report_entries: {
        Row: {
          created_at: string
          data: Json
          id: string
          organization_id: string
          report_date: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
          submitted_by: string | null
          template_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          data?: Json
          id?: string
          organization_id: string
          report_date?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          submitted_by?: string | null
          template_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          data?: Json
          id?: string
          organization_id?: string
          report_date?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          submitted_by?: string | null
          template_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_entries_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "report_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      report_templates: {
        Row: {
          category: string | null
          created_at: string
          created_by: string | null
          description: string | null
          fields: Json
          header_config: Json | null
          id: string
          is_active: boolean | null
          name: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          fields?: Json
          header_config?: Json | null
          id?: string
          is_active?: boolean | null
          name: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          fields?: Json
          header_config?: Json | null
          id?: string
          is_active?: boolean | null
          name?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      risk_reviews: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          organization_id: string
          reviewed_at: string
          reviewed_by: string | null
          risk_category: string
          risk_description: string | null
          risk_key: string
          risk_severity: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          organization_id: string
          reviewed_at?: string
          reviewed_by?: string | null
          risk_category: string
          risk_description?: string | null
          risk_key: string
          risk_severity: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          organization_id?: string
          reviewed_at?: string
          reviewed_by?: string | null
          risk_category?: string
          risk_description?: string | null
          risk_key?: string
          risk_severity?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "risk_reviews_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "risk_reviews_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations_public_view"
            referencedColumns: ["id"]
          },
        ]
      }
      safeguarding_incidents: {
        Row: {
          assigned_to: string | null
          closed_at: string | null
          created_at: string | null
          deleted_at: string | null
          description: string
          escalated_at: string | null
          id: string
          immediate_action_taken: string | null
          incident_date: string
          incident_type: string
          is_confidential: boolean | null
          location: string | null
          organization_id: string
          persons_involved: string | null
          reporter_id: string | null
          severity: string | null
          status: string | null
        }
        Insert: {
          assigned_to?: string | null
          closed_at?: string | null
          created_at?: string | null
          deleted_at?: string | null
          description: string
          escalated_at?: string | null
          id?: string
          immediate_action_taken?: string | null
          incident_date: string
          incident_type: string
          is_confidential?: boolean | null
          location?: string | null
          organization_id: string
          persons_involved?: string | null
          reporter_id?: string | null
          severity?: string | null
          status?: string | null
        }
        Update: {
          assigned_to?: string | null
          closed_at?: string | null
          created_at?: string | null
          deleted_at?: string | null
          description?: string
          escalated_at?: string | null
          id?: string
          immediate_action_taken?: string | null
          incident_date?: string
          incident_type?: string
          is_confidential?: boolean | null
          location?: string | null
          organization_id?: string
          persons_involved?: string | null
          reporter_id?: string | null
          severity?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "safeguarding_incidents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "safeguarding_incidents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations_public_view"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_report_templates: {
        Row: {
          config: Json
          created_at: string | null
          created_by: string | null
          data_type: string
          id: string
          name: string
          organization_id: string
          updated_at: string | null
        }
        Insert: {
          config?: Json
          created_at?: string | null
          created_by?: string | null
          data_type: string
          id?: string
          name: string
          organization_id: string
          updated_at?: string | null
        }
        Update: {
          config?: Json
          created_at?: string | null
          created_by?: string | null
          data_type?: string
          id?: string
          name?: string
          organization_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "saved_report_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "saved_report_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_report_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations_public_view"
            referencedColumns: ["id"]
          },
        ]
      }
      sponsorship_updates: {
        Row: {
          beneficiary_id: string
          content: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          donor_name: string | null
          file_type: string | null
          file_url: string | null
          id: string
          organization_id: string
          scheduled_for: string | null
          sent_at: string | null
          title: string
          update_type: string
          updated_at: string
          updated_by: string | null
          visible_to_donor: boolean
        }
        Insert: {
          beneficiary_id: string
          content?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          donor_name?: string | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          organization_id: string
          scheduled_for?: string | null
          sent_at?: string | null
          title: string
          update_type?: string
          updated_at?: string
          updated_by?: string | null
          visible_to_donor?: boolean
        }
        Update: {
          beneficiary_id?: string
          content?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          donor_name?: string | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          organization_id?: string
          scheduled_for?: string | null
          sent_at?: string | null
          title?: string
          update_type?: string
          updated_at?: string
          updated_by?: string | null
          visible_to_donor?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "sponsorship_updates_beneficiary_id_fkey"
            columns: ["beneficiary_id"]
            isOneToOne: false
            referencedRelation: "beneficiaries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sponsorship_updates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sponsorship_updates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations_public_view"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_contract_objectives: {
        Row: {
          actual_value: number | null
          contract_id: string
          created_at: string
          description: string | null
          evidence: string | null
          id: string
          objective_title: string
          score: number | null
          sort_order: number | null
          target_value: number | null
          unit: string | null
          updated_at: string
          weight: number | null
        }
        Insert: {
          actual_value?: number | null
          contract_id: string
          created_at?: string
          description?: string | null
          evidence?: string | null
          id?: string
          objective_title: string
          score?: number | null
          sort_order?: number | null
          target_value?: number | null
          unit?: string | null
          updated_at?: string
          weight?: number | null
        }
        Update: {
          actual_value?: number | null
          contract_id?: string
          created_at?: string
          description?: string | null
          evidence?: string | null
          id?: string
          objective_title?: string
          score?: number | null
          sort_order?: number | null
          target_value?: number | null
          unit?: string | null
          updated_at?: string
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_contract_objectives_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "staff_performance_contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_performance_contracts: {
        Row: {
          contract_period_end: string
          contract_period_start: string
          contract_title: string
          created_at: string
          created_by: string | null
          id: string
          organization_id: string
          overall_score: number | null
          reviewed_at: string | null
          reviewer_comments: string | null
          reviewer_id: string | null
          staff_user_id: string
          status: string
          updated_at: string
        }
        Insert: {
          contract_period_end: string
          contract_period_start: string
          contract_title: string
          created_at?: string
          created_by?: string | null
          id?: string
          organization_id: string
          overall_score?: number | null
          reviewed_at?: string | null
          reviewer_comments?: string | null
          reviewer_id?: string | null
          staff_user_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          contract_period_end?: string
          contract_period_start?: string
          contract_title?: string
          created_at?: string
          created_by?: string | null
          id?: string
          organization_id?: string
          overall_score?: number | null
          reviewed_at?: string | null
          reviewer_comments?: string | null
          reviewer_id?: string | null
          staff_user_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_performance_contracts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_performance_contracts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations_public_view"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_tasks: {
        Row: {
          assigned_by: string | null
          assigned_to: string | null
          completed_at: string | null
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          organization_id: string
          priority: string
          program_id: string | null
          project_id: string | null
          status: string
          tags: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          assigned_by?: string | null
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          organization_id: string
          priority?: string
          program_id?: string | null
          project_id?: string | null
          status?: string
          tags?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          assigned_by?: string | null
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          organization_id?: string
          priority?: string
          program_id?: string | null
          project_id?: string | null
          status?: string
          tags?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_tasks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_tasks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations_public_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_tasks_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_tasks_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "v_program_funding_summary"
            referencedColumns: ["program_id"]
          },
          {
            foreignKeyName: "staff_tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_funding_summary"
            referencedColumns: ["project_id"]
          },
        ]
      }
      stakeholder_access: {
        Row: {
          access_level: string
          access_token: string
          allowed_grant_ids: string[]
          allowed_program_ids: string[]
          can_download_reports: boolean
          can_view_beneficiary_data: boolean
          created_at: string
          created_by: string | null
          email: string
          full_name: string
          id: string
          is_active: boolean
          last_accessed_at: string | null
          organization_id: string
          stakeholder_type: string
          token_expires_at: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          access_level?: string
          access_token?: string
          allowed_grant_ids?: string[]
          allowed_program_ids?: string[]
          can_download_reports?: boolean
          can_view_beneficiary_data?: boolean
          created_at?: string
          created_by?: string | null
          email: string
          full_name: string
          id?: string
          is_active?: boolean
          last_accessed_at?: string | null
          organization_id: string
          stakeholder_type: string
          token_expires_at?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          access_level?: string
          access_token?: string
          allowed_grant_ids?: string[]
          allowed_program_ids?: string[]
          can_download_reports?: boolean
          can_view_beneficiary_data?: boolean
          created_at?: string
          created_by?: string | null
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean
          last_accessed_at?: string | null
          organization_id?: string
          stakeholder_type?: string
          token_expires_at?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stakeholder_access_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "stakeholder_access_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stakeholder_access_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations_public_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stakeholder_access_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      stakeholder_messages: {
        Row: {
          body: string
          channel: string
          created_at: string
          direction: string
          id: string
          metadata: Json | null
          organization_id: string
          recipient_contact: string | null
          recipient_id: string | null
          recipient_name: string | null
          recipient_type: string
          sender_id: string
          status: string
          subject: string | null
          updated_at: string
        }
        Insert: {
          body: string
          channel?: string
          created_at?: string
          direction?: string
          id?: string
          metadata?: Json | null
          organization_id: string
          recipient_contact?: string | null
          recipient_id?: string | null
          recipient_name?: string | null
          recipient_type: string
          sender_id: string
          status?: string
          subject?: string | null
          updated_at?: string
        }
        Update: {
          body?: string
          channel?: string
          created_at?: string
          direction?: string
          id?: string
          metadata?: Json | null
          organization_id?: string
          recipient_contact?: string | null
          recipient_id?: string | null
          recipient_name?: string | null
          recipient_type?: string
          sender_id?: string
          status?: string
          subject?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stakeholder_messages_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stakeholder_messages_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations_public_view"
            referencedColumns: ["id"]
          },
        ]
      }
      survey_answers: {
        Row: {
          answer_json: Json | null
          answer_number: number | null
          answer_text: string | null
          created_at: string
          id: string
          question_id: string
          response_id: string
        }
        Insert: {
          answer_json?: Json | null
          answer_number?: number | null
          answer_text?: string | null
          created_at?: string
          id?: string
          question_id: string
          response_id: string
        }
        Update: {
          answer_json?: Json | null
          answer_number?: number | null
          answer_text?: string | null
          created_at?: string
          id?: string
          question_id?: string
          response_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "survey_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "survey_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_answers_response_id_fkey"
            columns: ["response_id"]
            isOneToOne: false
            referencedRelation: "survey_responses"
            referencedColumns: ["id"]
          },
        ]
      }
      survey_questions: {
        Row: {
          created_at: string
          id: string
          is_required: boolean | null
          linked_indicator_id: string | null
          options: Json | null
          question_text: string
          question_type: string
          section: string | null
          sort_order: number | null
          survey_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_required?: boolean | null
          linked_indicator_id?: string | null
          options?: Json | null
          question_text: string
          question_type: string
          section?: string | null
          sort_order?: number | null
          survey_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_required?: boolean | null
          linked_indicator_id?: string | null
          options?: Json | null
          question_text?: string
          question_type?: string
          section?: string | null
          sort_order?: number | null
          survey_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "survey_questions_linked_indicator_id_fkey"
            columns: ["linked_indicator_id"]
            isOneToOne: false
            referencedRelation: "indicators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_questions_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "surveys"
            referencedColumns: ["id"]
          },
        ]
      }
      survey_responses: {
        Row: {
          beneficiary_id: string | null
          created_at: string
          id: string
          respondent_name: string | null
          submitted_at: string | null
          submitted_by: string | null
          survey_id: string
        }
        Insert: {
          beneficiary_id?: string | null
          created_at?: string
          id?: string
          respondent_name?: string | null
          submitted_at?: string | null
          submitted_by?: string | null
          survey_id: string
        }
        Update: {
          beneficiary_id?: string | null
          created_at?: string
          id?: string
          respondent_name?: string | null
          submitted_at?: string | null
          submitted_by?: string | null
          survey_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "survey_responses_beneficiary_id_fkey"
            columns: ["beneficiary_id"]
            isOneToOne: false
            referencedRelation: "beneficiaries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_responses_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "surveys"
            referencedColumns: ["id"]
          },
        ]
      }
      surveys: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          end_date: string | null
          id: string
          organization_id: string
          program_id: string | null
          project_id: string | null
          start_date: string | null
          status: string
          survey_type: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          organization_id: string
          program_id?: string | null
          project_id?: string | null
          start_date?: string | null
          status?: string
          survey_type: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          organization_id?: string
          program_id?: string | null
          project_id?: string | null
          start_date?: string | null
          status?: string
          survey_type?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "surveys_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "surveys_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations_public_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "surveys_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "surveys_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "v_program_funding_summary"
            referencedColumns: ["program_id"]
          },
          {
            foreignKeyName: "surveys_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "surveys_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_funding_summary"
            referencedColumns: ["project_id"]
          },
        ]
      }
      task_comments: {
        Row: {
          comment: string
          created_at: string
          id: string
          task_id: string
          user_id: string
        }
        Insert: {
          comment: string
          created_at?: string
          id?: string
          task_id: string
          user_id: string
        }
        Update: {
          comment?: string
          created_at?: string
          id?: string
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_comments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "staff_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      theory_of_change: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          narrative: string | null
          organization_id: string
          program_id: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          narrative?: string | null
          organization_id: string
          program_id?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          narrative?: string | null
          organization_id?: string
          program_id?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "theory_of_change_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "theory_of_change_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations_public_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "theory_of_change_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "theory_of_change_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "v_program_funding_summary"
            referencedColumns: ["program_id"]
          },
        ]
      }
      toc_connections: {
        Row: {
          created_at: string
          id: string
          label: string | null
          source_node_id: string
          target_node_id: string
          toc_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          label?: string | null
          source_node_id: string
          target_node_id: string
          toc_id: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string | null
          source_node_id?: string
          target_node_id?: string
          toc_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "toc_connections_source_node_id_fkey"
            columns: ["source_node_id"]
            isOneToOne: false
            referencedRelation: "toc_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "toc_connections_target_node_id_fkey"
            columns: ["target_node_id"]
            isOneToOne: false
            referencedRelation: "toc_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "toc_connections_toc_id_fkey"
            columns: ["toc_id"]
            isOneToOne: false
            referencedRelation: "theory_of_change"
            referencedColumns: ["id"]
          },
        ]
      }
      toc_node_indicators: {
        Row: {
          created_at: string
          id: string
          indicator_id: string | null
          toc_node_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          indicator_id?: string | null
          toc_node_id: string
        }
        Update: {
          created_at?: string
          id?: string
          indicator_id?: string | null
          toc_node_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "toc_node_indicators_indicator_id_fkey"
            columns: ["indicator_id"]
            isOneToOne: false
            referencedRelation: "indicators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "toc_node_indicators_toc_node_id_fkey"
            columns: ["toc_node_id"]
            isOneToOne: false
            referencedRelation: "toc_nodes"
            referencedColumns: ["id"]
          },
        ]
      }
      toc_nodes: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          id: string
          node_type: string
          position_x: number | null
          position_y: number | null
          sort_order: number | null
          title: string
          toc_id: string
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          node_type: string
          position_x?: number | null
          position_y?: number | null
          sort_order?: number | null
          title: string
          toc_id: string
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          node_type?: string
          position_x?: number | null
          position_y?: number | null
          sort_order?: number | null
          title?: string
          toc_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "toc_nodes_toc_id_fkey"
            columns: ["toc_id"]
            isOneToOne: false
            referencedRelation: "theory_of_change"
            referencedColumns: ["id"]
          },
        ]
      }
      user_notification_preferences: {
        Row: {
          created_at: string | null
          id: string
          is_enabled: boolean | null
          org_id: string
          preference_key: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_enabled?: boolean | null
          org_id: string
          preference_key: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_enabled?: boolean | null
          org_id?: string
          preference_key?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_notification_preferences_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_notification_preferences_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations_public_view"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          granted_at: string | null
          granted_by: string | null
          id: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          user_id?: string
        }
        Relationships: []
      }
      vendors: {
        Row: {
          category: string | null
          contact_person: string | null
          created_at: string | null
          deleted_at: string | null
          email: string | null
          id: string
          kra_pin: string | null
          name: string
          notes: string | null
          org_id: string
          phone: string | null
          registration_number: string | null
          status: string | null
        }
        Insert: {
          category?: string | null
          contact_person?: string | null
          created_at?: string | null
          deleted_at?: string | null
          email?: string | null
          id?: string
          kra_pin?: string | null
          name: string
          notes?: string | null
          org_id: string
          phone?: string | null
          registration_number?: string | null
          status?: string | null
        }
        Update: {
          category?: string | null
          contact_person?: string | null
          created_at?: string | null
          deleted_at?: string | null
          email?: string | null
          id?: string
          kra_pin?: string | null
          name?: string
          notes?: string | null
          org_id?: string
          phone?: string | null
          registration_number?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vendors_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendors_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations_public_view"
            referencedColumns: ["id"]
          },
        ]
      }
      volunteer_assignments: {
        Row: {
          created_at: string
          description: string | null
          end_date: string | null
          id: string
          organization_id: string
          program_id: string | null
          project_id: string | null
          role_title: string
          start_date: string
          status: string
          supervisor_name: string | null
          updated_at: string
          volunteer_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          organization_id: string
          program_id?: string | null
          project_id?: string | null
          role_title: string
          start_date: string
          status?: string
          supervisor_name?: string | null
          updated_at?: string
          volunteer_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          organization_id?: string
          program_id?: string | null
          project_id?: string | null
          role_title?: string
          start_date?: string
          status?: string
          supervisor_name?: string | null
          updated_at?: string
          volunteer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "volunteer_assignments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "volunteer_assignments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations_public_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "volunteer_assignments_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "volunteer_assignments_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "v_program_funding_summary"
            referencedColumns: ["program_id"]
          },
          {
            foreignKeyName: "volunteer_assignments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "volunteer_assignments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_funding_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "volunteer_assignments_volunteer_id_fkey"
            columns: ["volunteer_id"]
            isOneToOne: false
            referencedRelation: "volunteers"
            referencedColumns: ["id"]
          },
        ]
      }
      volunteer_hours: {
        Row: {
          assignment_id: string | null
          created_at: string
          description: string | null
          hours: number
          id: string
          log_date: string
          organization_id: string
          verified_at: string | null
          verified_by: string | null
          volunteer_id: string
        }
        Insert: {
          assignment_id?: string | null
          created_at?: string
          description?: string | null
          hours: number
          id?: string
          log_date: string
          organization_id: string
          verified_at?: string | null
          verified_by?: string | null
          volunteer_id: string
        }
        Update: {
          assignment_id?: string | null
          created_at?: string
          description?: string | null
          hours?: number
          id?: string
          log_date?: string
          organization_id?: string
          verified_at?: string | null
          verified_by?: string | null
          volunteer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "volunteer_hours_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "volunteer_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "volunteer_hours_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "volunteer_hours_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations_public_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "volunteer_hours_volunteer_id_fkey"
            columns: ["volunteer_id"]
            isOneToOne: false
            referencedRelation: "volunteers"
            referencedColumns: ["id"]
          },
        ]
      }
      volunteers: {
        Row: {
          availability: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          email: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          end_date: string | null
          full_name: string
          id: string
          is_deleted: boolean
          notes: string | null
          organization_id: string
          phone: string | null
          photo_url: string | null
          skills: string[] | null
          start_date: string | null
          status: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          availability?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          end_date?: string | null
          full_name: string
          id?: string
          is_deleted?: boolean
          notes?: string | null
          organization_id: string
          phone?: string | null
          photo_url?: string | null
          skills?: string[] | null
          start_date?: string | null
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          availability?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          end_date?: string | null
          full_name?: string
          id?: string
          is_deleted?: boolean
          notes?: string | null
          organization_id?: string
          phone?: string | null
          photo_url?: string | null
          skills?: string[] | null
          start_date?: string | null
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "volunteers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "volunteers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations_public_view"
            referencedColumns: ["id"]
          },
        ]
      }
      whistleblower_reports: {
        Row: {
          assigned_to: string | null
          contact_info: string | null
          created_at: string | null
          description: string
          evidence_description: string | null
          id: string
          is_anonymous: boolean | null
          organization_id: string
          report_type: string
          response_notes: string | null
          status: string | null
        }
        Insert: {
          assigned_to?: string | null
          contact_info?: string | null
          created_at?: string | null
          description: string
          evidence_description?: string | null
          id?: string
          is_anonymous?: boolean | null
          organization_id: string
          report_type: string
          response_notes?: string | null
          status?: string | null
        }
        Update: {
          assigned_to?: string | null
          contact_info?: string | null
          created_at?: string | null
          description?: string
          evidence_description?: string | null
          id?: string
          is_anonymous?: boolean | null
          organization_id?: string
          report_type?: string
          response_notes?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whistleblower_reports_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whistleblower_reports_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations_public_view"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      children_safe_view: {
        Row: {
          academic_level:
            | Database["public"]["Enums"]["academic_level_type"]
            | null
          address: string | null
          course_name: string | null
          created_at: string | null
          created_by: string | null
          date_of_birth: string | null
          donation_received_ksh: number | null
          donor: string | null
          enrollment_date: string | null
          first_name: string | null
          gender: Database["public"]["Enums"]["gender_type"] | null
          grade: string | null
          id: string | null
          inactive_date: string | null
          inactive_reason: string | null
          institution_name: string | null
          last_name: string | null
          organization_id: string | null
          parental_status:
            | Database["public"]["Enums"]["parental_status_type"]
            | null
          photo_url: string | null
          receives_hbc: boolean | null
          receives_shopping: boolean | null
          receives_transport: boolean | null
          replacement_status: string | null
          residence: Database["public"]["Enums"]["residence_type"] | null
          status: string | null
          student_id: string | null
          updated_at: string | null
        }
        Insert: {
          academic_level?:
            | Database["public"]["Enums"]["academic_level_type"]
            | null
          address?: string | null
          course_name?: string | null
          created_at?: string | null
          created_by?: string | null
          date_of_birth?: string | null
          donation_received_ksh?: number | null
          donor?: string | null
          enrollment_date?: string | null
          first_name?: string | null
          gender?: Database["public"]["Enums"]["gender_type"] | null
          grade?: string | null
          id?: string | null
          inactive_date?: string | null
          inactive_reason?: string | null
          institution_name?: string | null
          last_name?: string | null
          organization_id?: string | null
          parental_status?:
            | Database["public"]["Enums"]["parental_status_type"]
            | null
          photo_url?: string | null
          receives_hbc?: boolean | null
          receives_shopping?: boolean | null
          receives_transport?: boolean | null
          replacement_status?: string | null
          residence?: Database["public"]["Enums"]["residence_type"] | null
          status?: string | null
          student_id?: string | null
          updated_at?: string | null
        }
        Update: {
          academic_level?:
            | Database["public"]["Enums"]["academic_level_type"]
            | null
          address?: string | null
          course_name?: string | null
          created_at?: string | null
          created_by?: string | null
          date_of_birth?: string | null
          donation_received_ksh?: number | null
          donor?: string | null
          enrollment_date?: string | null
          first_name?: string | null
          gender?: Database["public"]["Enums"]["gender_type"] | null
          grade?: string | null
          id?: string | null
          inactive_date?: string | null
          inactive_reason?: string | null
          institution_name?: string | null
          last_name?: string | null
          organization_id?: string | null
          parental_status?:
            | Database["public"]["Enums"]["parental_status_type"]
            | null
          photo_url?: string | null
          receives_hbc?: boolean | null
          receives_shopping?: boolean | null
          receives_transport?: boolean | null
          replacement_status?: string | null
          residence?: Database["public"]["Enums"]["residence_type"] | null
          status?: string | null
          student_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "children_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "children_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations_public_view"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations_public_view: {
        Row: {
          address: string | null
          country: string | null
          county: string | null
          created_at: string | null
          description: string | null
          email: string | null
          features_enabled: Json | null
          id: string | null
          is_active: boolean | null
          logo_url: string | null
          name: string | null
          onboarding_completed: boolean | null
          organization_type: string | null
          phone: string | null
          registration_number: string | null
          settings: Json | null
          slug: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_ends_at: string | null
          subscription_started_at: string | null
          subscription_status: string | null
          subscription_tier: string | null
          suspended_at: string | null
          suspended_reason: string | null
          trial_ends_at: string | null
          updated_at: string | null
          usage_stats: Json | null
          website: string | null
        }
        Insert: {
          address?: string | null
          country?: string | null
          county?: string | null
          created_at?: string | null
          description?: string | null
          email?: string | null
          features_enabled?: never
          id?: string | null
          is_active?: boolean | null
          logo_url?: string | null
          name?: string | null
          onboarding_completed?: boolean | null
          organization_type?: string | null
          phone?: string | null
          registration_number?: string | null
          settings?: never
          slug?: string | null
          stripe_customer_id?: never
          stripe_subscription_id?: never
          subscription_ends_at?: never
          subscription_started_at?: never
          subscription_status?: never
          subscription_tier?: never
          suspended_at?: string | null
          suspended_reason?: string | null
          trial_ends_at?: never
          updated_at?: string | null
          usage_stats?: never
          website?: string | null
        }
        Update: {
          address?: string | null
          country?: string | null
          county?: string | null
          created_at?: string | null
          description?: string | null
          email?: string | null
          features_enabled?: never
          id?: string | null
          is_active?: boolean | null
          logo_url?: string | null
          name?: string | null
          onboarding_completed?: boolean | null
          organization_type?: string | null
          phone?: string | null
          registration_number?: string | null
          settings?: never
          slug?: string | null
          stripe_customer_id?: never
          stripe_subscription_id?: never
          subscription_ends_at?: never
          subscription_started_at?: never
          subscription_status?: never
          subscription_tier?: never
          suspended_at?: string | null
          suspended_reason?: string | null
          trial_ends_at?: never
          updated_at?: string | null
          usage_stats?: never
          website?: string | null
        }
        Relationships: []
      }
      v_program_funding_summary: {
        Row: {
          beneficiary_level_funding: number | null
          currency: string | null
          donor_count: number | null
          name: string | null
          organization_id: string | null
          program_id: string | null
          program_level_funding: number | null
          project_level_funding: number | null
          status: string | null
          total_budget: number | null
          total_received: number | null
          total_spent: number | null
        }
        Relationships: [
          {
            foreignKeyName: "programs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "programs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations_public_view"
            referencedColumns: ["id"]
          },
        ]
      }
      v_project_funding_summary: {
        Row: {
          end_date: string | null
          name: string | null
          organization_id: string | null
          program_id: string | null
          project_id: string | null
          start_date: string | null
          status: string | null
          total_budget: number | null
          total_received: number | null
          total_spent: number | null
        }
        Insert: {
          end_date?: string | null
          name?: string | null
          organization_id?: string | null
          program_id?: string | null
          project_id?: string | null
          start_date?: string | null
          status?: string | null
          total_budget?: never
          total_received?: never
          total_spent?: never
        }
        Update: {
          end_date?: string | null
          name?: string | null
          organization_id?: string | null
          program_id?: string | null
          project_id?: string | null
          start_date?: string | null
          status?: string | null
          total_budget?: never
          total_received?: never
          total_spent?: never
        }
        Relationships: [
          {
            foreignKeyName: "projects_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations_public_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "v_program_funding_summary"
            referencedColumns: ["program_id"]
          },
        ]
      }
    }
    Functions: {
      accept_invitation: {
        Args: { _invitation_id: string; _user_id: string }
        Returns: boolean
      }
      auto_approve_request: { Args: { request_id: string }; Returns: boolean }
      check_org_usage_limit: {
        Args: { _limit_type: string; _org_id: string }
        Returns: boolean
      }
      check_rate_limit: {
        Args: {
          action_type_param: string
          max_attempts?: number
          user_id_param: string
          window_minutes?: number
        }
        Returns: boolean
      }
      find_potential_duplicates: {
        Args: { _org_id: string }
        Returns: {
          dob_a: string
          dob_b: string
          id_a: string
          id_b: string
          match_type: string
          name_a: string
          name_b: string
        }[]
      }
      generate_beneficiary_unique_id: {
        Args: { _org_id: string }
        Returns: string
      }
      get_org_member_role: {
        Args: { _org_id: string; _user_id: string }
        Returns: string
      }
      get_org_subscription: { Args: { _org_id: string }; Returns: Json }
      get_stakeholder_portal_data: { Args: { _token: string }; Returns: Json }
      get_unique_beneficiary_count: {
        Args: { _org_id: string }
        Returns: number
      }
      get_user_current_organization: {
        Args: { _user_id: string }
        Returns: {
          organization_id: string
          organization_name: string
          organization_slug: string
          user_role: string
        }[]
      }
      get_user_organization_id: { Args: { _user_id: string }; Returns: string }
      get_user_permissions: {
        Args: { _org_id: string; _user_id: string }
        Returns: string[]
      }
      get_user_rbac_roles: {
        Args: { _org_id: string; _user_id: string }
        Returns: {
          color: string
          display_name: string
          icon: string
          is_system_role: boolean
          role_id: string
          role_name: string
        }[]
      }
      get_user_role: {
        Args: { user_id: string }
        Returns: Database["public"]["Enums"]["user_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["user_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
      program_funding_health_score: {
        Args: { _program_id: string }
        Returns: Json
      }
      register_organization: {
        Args: {
          _address?: string
          _admin_user_id?: string
          _country?: string
          _county?: string
          _description?: string
          _email?: string
          _features_enabled?: Json
          _org_name: string
          _org_slug: string
          _org_type: string
          _phone?: string
          _registration_number?: string
          _subscription_tier?: string
          _website?: string
        }
        Returns: Json
      }
      search_children_for_linking: {
        Args: { _org_id: string; _search_term: string }
        Returns: {
          academic_level: string
          first_name: string
          full_name: string
          gender: string
          id: string
          institution_name: string
          last_name: string
          student_id: string
        }[]
      }
      seed_default_org_roles: {
        Args: { _admin_user_id: string; _org_id: string }
        Returns: undefined
      }
      seed_project_baseline_indicators: {
        Args: { _project_id: string; _sector?: string }
        Returns: undefined
      }
      switch_user_organization: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
      user_belongs_to_org: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
      user_has_permission: {
        Args: {
          _action: string
          _module: string
          _org_id: string
          _resource: string
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      academic_level_type:
        | "Pre Primary"
        | "Lower Primary"
        | "Upper Primary"
        | "Junior Secondary"
        | "Secondary School"
        | "Tertiary"
        | "Special School"
        | "Junior School"
        | "Junior Secondary School"
        | "Senior School"
      activity_status: "planned" | "in_progress" | "completed" | "cancelled"
      activity_type: "event" | "disbursement"
      amount_status_type: "Loan" | "Grant"
      beneficiary_type: "student" | "adult" | "group"
      care_arrangement_type:
        | "unknown"
        | "independent"
        | "under_guardian_care"
        | "head_of_household_with_dependents"
        | "institutional_care"
      disbursement_kind:
        | "cash"
        | "school_fees"
        | "textbook"
        | "uniform"
        | "food_kit"
        | "medical"
        | "agricultural_input"
        | "hygiene_kit"
        | "transport"
        | "rent"
        | "other"
      family_category_type: "Guardian Ration" | "Home Based Care"
      feeding_type: "Kawangware Lunch Hour" | "Kibera Early Dinner"
      gender_type: "Male" | "Female"
      guardian_type: "father" | "mother" | "other"
      hiv_status_type: "positive" | "negative" | "unknown"
      parental_status_type: "Both alive" | "Both deceased" | "Partial"
      residence_type: "Kibera" | "Kawangware" | "Diaspora" | "Outside Nairobi"
      specific_skill_type:
        | "Singing"
        | "Spoken Word"
        | "Drawing"
        | "Instruments"
        | "Football"
        | "Basketball"
        | "Chess"
        | "Fashion"
        | "Modern"
        | "Traditional"
      sponsor_type: "NSP-AID" | "Donation"
      talent_category_type:
        | "Music"
        | "Dance"
        | "Poetry"
        | "Art & Craft"
        | "Sport"
        | "Boardgames"
      user_role: "admin" | "management" | "staff"
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
      academic_level_type: [
        "Pre Primary",
        "Lower Primary",
        "Upper Primary",
        "Junior Secondary",
        "Secondary School",
        "Tertiary",
        "Special School",
        "Junior School",
        "Junior Secondary School",
        "Senior School",
      ],
      activity_status: ["planned", "in_progress", "completed", "cancelled"],
      activity_type: ["event", "disbursement"],
      amount_status_type: ["Loan", "Grant"],
      beneficiary_type: ["student", "adult", "group"],
      care_arrangement_type: [
        "unknown",
        "independent",
        "under_guardian_care",
        "head_of_household_with_dependents",
        "institutional_care",
      ],
      disbursement_kind: [
        "cash",
        "school_fees",
        "textbook",
        "uniform",
        "food_kit",
        "medical",
        "agricultural_input",
        "hygiene_kit",
        "transport",
        "rent",
        "other",
      ],
      family_category_type: ["Guardian Ration", "Home Based Care"],
      feeding_type: ["Kawangware Lunch Hour", "Kibera Early Dinner"],
      gender_type: ["Male", "Female"],
      guardian_type: ["father", "mother", "other"],
      hiv_status_type: ["positive", "negative", "unknown"],
      parental_status_type: ["Both alive", "Both deceased", "Partial"],
      residence_type: ["Kibera", "Kawangware", "Diaspora", "Outside Nairobi"],
      specific_skill_type: [
        "Singing",
        "Spoken Word",
        "Drawing",
        "Instruments",
        "Football",
        "Basketball",
        "Chess",
        "Fashion",
        "Modern",
        "Traditional",
      ],
      sponsor_type: ["NSP-AID", "Donation"],
      talent_category_type: [
        "Music",
        "Dance",
        "Poetry",
        "Art & Craft",
        "Sport",
        "Boardgames",
      ],
      user_role: ["admin", "management", "staff"],
    },
  },
} as const

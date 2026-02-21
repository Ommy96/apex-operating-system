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
    PostgrestVersion: "12.2.3 (519615d)"
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
          activity_date: string
          activity_type: string | null
          actual_date: string | null
          actual_participants: number | null
          attachments: Json | null
          child_id: string
          created_at: string
          created_by: string | null
          description: string | null
          expected_participants: number | null
          id: string
          location: string | null
          name: string | null
          notes: string | null
          organization_id: string | null
          outcome: string | null
          planned_date: string | null
          program_id: string
          project_id: string | null
          responsible_staff_id: string | null
          status: string | null
          term: string | null
          title: string
          updated_at: string
        }
        Insert: {
          activity_date?: string
          activity_type?: string | null
          actual_date?: string | null
          actual_participants?: number | null
          attachments?: Json | null
          child_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          expected_participants?: number | null
          id?: string
          location?: string | null
          name?: string | null
          notes?: string | null
          organization_id?: string | null
          outcome?: string | null
          planned_date?: string | null
          program_id: string
          project_id?: string | null
          responsible_staff_id?: string | null
          status?: string | null
          term?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          activity_date?: string
          activity_type?: string | null
          actual_date?: string | null
          actual_participants?: number | null
          attachments?: Json | null
          child_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          expected_participants?: number | null
          id?: string
          location?: string | null
          name?: string | null
          notes?: string | null
          organization_id?: string | null
          outcome?: string | null
          planned_date?: string | null
          program_id?: string
          project_id?: string | null
          responsible_staff_id?: string | null
          status?: string | null
          term?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "activities_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children_safe_view"
            referencedColumns: ["id"]
          },
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
            foreignKeyName: "activities_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_attendance: {
        Row: {
          activity_id: string
          attendance_status: string | null
          beneficiary_id: string
          created_at: string
          id: string
          notes: string | null
          organization_id: string
          recorded_by: string | null
        }
        Insert: {
          activity_id: string
          attendance_status?: string | null
          beneficiary_id: string
          created_at?: string
          id?: string
          notes?: string | null
          organization_id: string
          recorded_by?: string | null
        }
        Update: {
          activity_id?: string
          attendance_status?: string | null
          beneficiary_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          organization_id?: string
          recorded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_attendance_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_attendance_beneficiary_id_fkey"
            columns: ["beneficiary_id"]
            isOneToOne: false
            referencedRelation: "beneficiaries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_attendance_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_attendance_organization_id_fkey"
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
          amount_given: number | null
          background_image_url: string | null
          background_narrative: string | null
          beneficiary_type: Database["public"]["Enums"]["beneficiary_type"]
          county: string | null
          course_name: string | null
          created_at: string
          created_by: string | null
          date_of_birth: string | null
          display_name: string
          estate_village: string | null
          first_name: string | null
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
          id: string
          inactive_date: string | null
          inactive_reason: string | null
          institution_name: string | null
          last_name: string | null
          leader_name: string | null
          leader_phone: string | null
          legacy_child_id: string | null
          location: string | null
          member_count: number | null
          middle_name: string | null
          organization_id: string
          other_medical_conditions: string | null
          photo_url: string | null
          religion: string | null
          source_of_income: string | null
          special_needs_details: string | null
          status: string
          student_id_number: string | null
          sub_county: string | null
          updated_at: string
          year_enrolled: number | null
        }
        Insert: {
          academic_level?:
            | Database["public"]["Enums"]["academic_level_type"]
            | null
          amount_given?: number | null
          background_image_url?: string | null
          background_narrative?: string | null
          beneficiary_type: Database["public"]["Enums"]["beneficiary_type"]
          county?: string | null
          course_name?: string | null
          created_at?: string
          created_by?: string | null
          date_of_birth?: string | null
          display_name: string
          estate_village?: string | null
          first_name?: string | null
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
          id?: string
          inactive_date?: string | null
          inactive_reason?: string | null
          institution_name?: string | null
          last_name?: string | null
          leader_name?: string | null
          leader_phone?: string | null
          legacy_child_id?: string | null
          location?: string | null
          member_count?: number | null
          middle_name?: string | null
          organization_id: string
          other_medical_conditions?: string | null
          photo_url?: string | null
          religion?: string | null
          source_of_income?: string | null
          special_needs_details?: string | null
          status?: string
          student_id_number?: string | null
          sub_county?: string | null
          updated_at?: string
          year_enrolled?: number | null
        }
        Update: {
          academic_level?:
            | Database["public"]["Enums"]["academic_level_type"]
            | null
          amount_given?: number | null
          background_image_url?: string | null
          background_narrative?: string | null
          beneficiary_type?: Database["public"]["Enums"]["beneficiary_type"]
          county?: string | null
          course_name?: string | null
          created_at?: string
          created_by?: string | null
          date_of_birth?: string | null
          display_name?: string
          estate_village?: string | null
          first_name?: string | null
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
          id?: string
          inactive_date?: string | null
          inactive_reason?: string | null
          institution_name?: string | null
          last_name?: string | null
          leader_name?: string | null
          leader_phone?: string | null
          legacy_child_id?: string | null
          location?: string | null
          member_count?: number | null
          middle_name?: string | null
          organization_id?: string
          other_medical_conditions?: string | null
          photo_url?: string | null
          religion?: string | null
          source_of_income?: string | null
          special_needs_details?: string | null
          status?: string
          student_id_number?: string | null
          sub_county?: string | null
          updated_at?: string
          year_enrolled?: number | null
        }
        Relationships: [
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
            foreignKeyName: "beneficiary_services_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
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
            foreignKeyName: "budgets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
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
      donor_report_runs: {
        Row: {
          created_at: string
          generated_by: string | null
          generated_data: Json | null
          id: string
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
          generated_by?: string | null
          generated_data?: Json | null
          id?: string
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
          generated_by?: string | null
          generated_data?: Json | null
          id?: string
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
          vendor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
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
            foreignKeyName: "expenses_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
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
            foreignKeyName: "field_check_ins_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
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
        ]
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
      indicator_values: {
        Row: {
          actual_value: number
          computed_at: string | null
          created_at: string
          created_by: string | null
          dimension_key: string | null
          dimension_value: string | null
          id: string
          indicator_id: string
          is_manual_override: boolean | null
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
          id?: string
          indicator_id: string
          is_manual_override?: boolean | null
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
          id?: string
          indicator_id?: string
          is_manual_override?: boolean | null
          period_end?: string
          period_start?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "indicator_values_indicator_id_fkey"
            columns: ["indicator_id"]
            isOneToOne: false
            referencedRelation: "indicators"
            referencedColumns: ["id"]
          },
        ]
      }
      indicators: {
        Row: {
          aggregation_period: string | null
          category_id: string | null
          code: string
          created_at: string
          created_by: string | null
          decimal_places: number | null
          description: string | null
          formula_config: Json
          formula_type: string
          id: string
          is_active: boolean | null
          is_template: boolean | null
          name: string
          organization_id: string
          show_trend: boolean | null
          sort_order: number | null
          template_source_id: string | null
          trend_direction: string | null
          unit: string | null
          updated_at: string
        }
        Insert: {
          aggregation_period?: string | null
          category_id?: string | null
          code: string
          created_at?: string
          created_by?: string | null
          decimal_places?: number | null
          description?: string | null
          formula_config?: Json
          formula_type: string
          id?: string
          is_active?: boolean | null
          is_template?: boolean | null
          name: string
          organization_id: string
          show_trend?: boolean | null
          sort_order?: number | null
          template_source_id?: string | null
          trend_direction?: string | null
          unit?: string | null
          updated_at?: string
        }
        Update: {
          aggregation_period?: string | null
          category_id?: string | null
          code?: string
          created_at?: string
          created_by?: string | null
          decimal_places?: number | null
          description?: string | null
          formula_config?: Json
          formula_type?: string
          id?: string
          is_active?: boolean | null
          is_template?: boolean | null
          name?: string
          organization_id?: string
          show_trend?: boolean | null
          sort_order?: number | null
          template_source_id?: string | null
          trend_direction?: string | null
          unit?: string | null
          updated_at?: string
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
            foreignKeyName: "indicators_template_source_id_fkey"
            columns: ["template_source_id"]
            isOneToOne: false
            referencedRelation: "indicators"
            referencedColumns: ["id"]
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
            foreignKeyName: "logframes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
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
          country: string | null
          county: string | null
          created_at: string
          description: string | null
          email: string | null
          features_enabled: Json | null
          id: string
          is_active: boolean
          logo_url: string | null
          name: string
          onboarding_completed: boolean
          onboarding_completed_at: string | null
          organization_type: string | null
          phone: string | null
          registration_number: string | null
          settings: Json | null
          slug: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
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
        }
        Insert: {
          address?: string | null
          country?: string | null
          county?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          features_enabled?: Json | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name: string
          onboarding_completed?: boolean
          onboarding_completed_at?: string | null
          organization_type?: string | null
          phone?: string | null
          registration_number?: string | null
          settings?: Json | null
          slug: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
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
        }
        Update: {
          address?: string | null
          country?: string | null
          county?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          features_enabled?: Json | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name?: string
          onboarding_completed?: boolean
          onboarding_completed_at?: string | null
          organization_type?: string | null
          phone?: string | null
          registration_number?: string | null
          settings?: Json | null
          slug?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
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
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
          last_login_at: string | null
          organization_id: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name: string
          id?: string
          last_login_at?: string | null
          organization_id?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          last_login_at?: string | null
          organization_id?: string | null
          role?: Database["public"]["Enums"]["user_role"]
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
            foreignKeyName: "program_indicators_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
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
            foreignKeyName: "program_observations_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
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
            foreignKeyName: "program_observations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
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
            foreignKeyName: "program_report_types_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "report_templates"
            referencedColumns: ["id"]
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
            foreignKeyName: "program_visits_visit_type_id_fkey"
            columns: ["visit_type_id"]
            isOneToOne: false
            referencedRelation: "program_visit_types"
            referencedColumns: ["id"]
          },
        ]
      }
      programs: {
        Row: {
          category: string | null
          color: string | null
          created_at: string
          created_by: string | null
          custom_fields: Json | null
          description: string | null
          end_date: string | null
          geographic_coverage: Json | null
          icon: string | null
          id: string
          is_active: boolean
          location: string | null
          module_config: Json | null
          name: string
          objectives: string | null
          organization_id: string
          program_id: string | null
          program_manager_id: string | null
          settings: Json | null
          show_in_navigation: boolean | null
          slug: string | null
          sort_order: number | null
          start_date: string | null
          status: string | null
          target_population: string[] | null
        }
        Insert: {
          category?: string | null
          color?: string | null
          created_at?: string
          created_by?: string | null
          custom_fields?: Json | null
          description?: string | null
          end_date?: string | null
          geographic_coverage?: Json | null
          icon?: string | null
          id?: string
          is_active?: boolean
          location?: string | null
          module_config?: Json | null
          name: string
          objectives?: string | null
          organization_id?: string
          program_id?: string | null
          program_manager_id?: string | null
          settings?: Json | null
          show_in_navigation?: boolean | null
          slug?: string | null
          sort_order?: number | null
          start_date?: string | null
          status?: string | null
          target_population?: string[] | null
        }
        Update: {
          category?: string | null
          color?: string | null
          created_at?: string
          created_by?: string | null
          custom_fields?: Json | null
          description?: string | null
          end_date?: string | null
          geographic_coverage?: Json | null
          icon?: string | null
          id?: string
          is_active?: boolean
          location?: string | null
          module_config?: Json | null
          name?: string
          objectives?: string | null
          organization_id?: string
          program_id?: string | null
          program_manager_id?: string | null
          settings?: Json | null
          show_in_navigation?: boolean | null
          slug?: string | null
          sort_order?: number | null
          start_date?: string | null
          status?: string | null
          target_population?: string[] | null
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
      projects: {
        Row: {
          budget: number | null
          created_at: string
          created_by: string | null
          custom_data: Json | null
          custom_fields: Json | null
          description: string | null
          end_date: string | null
          expected_outputs: string | null
          id: string
          location: string | null
          name: string
          organization_id: string
          program_id: string | null
          project_code: string | null
          project_lead_id: string | null
          slug: string
          start_date: string | null
          status: string | null
          target_beneficiary_types: string[] | null
          updated_at: string
        }
        Insert: {
          budget?: number | null
          created_at?: string
          created_by?: string | null
          custom_data?: Json | null
          custom_fields?: Json | null
          description?: string | null
          end_date?: string | null
          expected_outputs?: string | null
          id?: string
          location?: string | null
          name: string
          organization_id: string
          program_id?: string | null
          project_code?: string | null
          project_lead_id?: string | null
          slug: string
          start_date?: string | null
          status?: string | null
          target_beneficiary_types?: string[] | null
          updated_at?: string
        }
        Update: {
          budget?: number | null
          created_at?: string
          created_by?: string | null
          custom_data?: Json | null
          custom_fields?: Json | null
          description?: string | null
          end_date?: string | null
          expected_outputs?: string | null
          id?: string
          location?: string | null
          name?: string
          organization_id?: string
          program_id?: string | null
          project_code?: string | null
          project_lead_id?: string | null
          slug?: string
          start_date?: string | null
          status?: string | null
          target_beneficiary_types?: string[] | null
          updated_at?: string
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
            foreignKeyName: "staff_tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
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
            foreignKeyName: "surveys_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
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
    }
    Functions: {
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
      get_org_member_role: {
        Args: { _org_id: string; _user_id: string }
        Returns: string
      }
      get_org_subscription: { Args: { _org_id: string }; Returns: Json }
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
      amount_status_type: "Loan" | "Grant"
      beneficiary_type: "student" | "adult" | "group"
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
      amount_status_type: ["Loan", "Grant"],
      beneficiary_type: ["student", "adult", "group"],
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

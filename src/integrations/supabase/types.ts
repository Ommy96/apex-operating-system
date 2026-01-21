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
        ]
      }
      activities: {
        Row: {
          activity_date: string
          attachments: Json | null
          child_id: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          outcome: string | null
          program_id: string
          term: string | null
          title: string
          updated_at: string
        }
        Insert: {
          activity_date?: string
          attachments?: Json | null
          child_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          outcome?: string | null
          program_id: string
          term?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          activity_date?: string
          attachments?: Json | null
          child_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          outcome?: string | null
          program_id?: string
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
            foreignKeyName: "activities_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_reports: {
        Row: {
          beneficiary_impact: string
          challenges: string
          created_at: string
          created_by: string | null
          executive_summary: string
          id: string
          organization_id: string
          program: Database["public"]["Enums"]["program_type"]
          proposed_recommendations: string
          reporting_date: string
          staff: string
          updated_at: string
        }
        Insert: {
          beneficiary_impact: string
          challenges: string
          created_at?: string
          created_by?: string | null
          executive_summary: string
          id?: string
          organization_id?: string
          program: Database["public"]["Enums"]["program_type"]
          proposed_recommendations: string
          reporting_date: string
          staff: string
          updated_at?: string
        }
        Update: {
          beneficiary_impact?: string
          challenges?: string
          created_at?: string
          created_by?: string | null
          executive_summary?: string
          id?: string
          organization_id?: string
          program?: Database["public"]["Enums"]["program_type"]
          proposed_recommendations?: string
          reporting_date?: string
          staff?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_reports_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      alumni: {
        Row: {
          achievements: string | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          created_by: string | null
          current_status: string | null
          detailed_story: string | null
          exit_year: number | null
          full_name: string
          gender: string | null
          graduation_year: number | null
          id: string
          location: string | null
          organization_id: string
          profile_photo_url: string | null
          short_bio: string | null
          social_link: string | null
          updated_at: string
        }
        Insert: {
          achievements?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          created_by?: string | null
          current_status?: string | null
          detailed_story?: string | null
          exit_year?: number | null
          full_name: string
          gender?: string | null
          graduation_year?: number | null
          id?: string
          location?: string | null
          organization_id?: string
          profile_photo_url?: string | null
          short_bio?: string | null
          social_link?: string | null
          updated_at?: string
        }
        Update: {
          achievements?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          created_by?: string | null
          current_status?: string | null
          detailed_story?: string | null
          exit_year?: number | null
          full_name?: string
          gender?: string | null
          graduation_year?: number | null
          id?: string
          location?: string | null
          organization_id?: string
          profile_photo_url?: string | null
          short_bio?: string | null
          social_link?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "alumni_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
      attendance_records: {
        Row: {
          absent_count: number
          created_at: string
          id: string
          month: string
          organization_id: string | null
          present_count: number
          program_id: string
          recorded_by: string | null
          updated_at: string
          week: number
        }
        Insert: {
          absent_count?: number
          created_at?: string
          id?: string
          month: string
          organization_id?: string | null
          present_count?: number
          program_id: string
          recorded_by?: string | null
          updated_at?: string
          week: number
        }
        Update: {
          absent_count?: number
          created_at?: string
          id?: string
          month?: string
          organization_id?: string | null
          present_count?: number
          program_id?: string
          recorded_by?: string | null
          updated_at?: string
          week?: number
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
      business_visit_reports: {
        Row: {
          business_id: string | null
          challenges_identified: string
          created_at: string
          created_by: string | null
          id: string
          location: string | null
          observation_findings: string
          organization_id: string
          reason_for_visit: string | null
          recommendations: string
          staff: string
          updated_at: string
          visit_date: string
        }
        Insert: {
          business_id?: string | null
          challenges_identified: string
          created_at?: string
          created_by?: string | null
          id?: string
          location?: string | null
          observation_findings: string
          organization_id?: string
          reason_for_visit?: string | null
          recommendations: string
          staff: string
          updated_at?: string
          visit_date: string
        }
        Update: {
          business_id?: string | null
          challenges_identified?: string
          created_at?: string
          created_by?: string | null
          id?: string
          location?: string | null
          observation_findings?: string
          organization_id?: string
          reason_for_visit?: string | null
          recommendations?: string
          staff?: string
          updated_at?: string
          visit_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_visit_reports_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "self_empowerment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_visit_reports_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
          institution_name: string | null
          last_name: string
          medical_notes: string | null
          organization_id: string
          parental_status:
            | Database["public"]["Enums"]["parental_status_type"]
            | null
          photo_url: string | null
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
          institution_name?: string | null
          last_name: string
          medical_notes?: string | null
          organization_id?: string
          parental_status?:
            | Database["public"]["Enums"]["parental_status_type"]
            | null
          photo_url?: string | null
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
          institution_name?: string | null
          last_name?: string
          medical_notes?: string | null
          organization_id?: string
          parental_status?:
            | Database["public"]["Enums"]["parental_status_type"]
            | null
          photo_url?: string | null
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
            foreignKeyName: "documents_family_adoption_id_fkey"
            columns: ["family_adoption_id"]
            isOneToOne: false
            referencedRelation: "family_adoption"
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
            foreignKeyName: "entities_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
        ]
      }
      family_adoption: {
        Row: {
          actual_name: string | null
          category: Database["public"]["Enums"]["family_category_type"] | null
          created_at: string
          created_by: string | null
          family_status: string | null
          gender: Database["public"]["Enums"]["gender_type"] | null
          id: string
          known_name: string
          no_of_beneficiaries: number | null
          organization_id: string
          residence: Database["public"]["Enums"]["residence_type"] | null
          source_of_income: string | null
          sponsor: Database["public"]["Enums"]["sponsor_type"] | null
          updated_at: string
        }
        Insert: {
          actual_name?: string | null
          category?: Database["public"]["Enums"]["family_category_type"] | null
          created_at?: string
          created_by?: string | null
          family_status?: string | null
          gender?: Database["public"]["Enums"]["gender_type"] | null
          id?: string
          known_name: string
          no_of_beneficiaries?: number | null
          organization_id?: string
          residence?: Database["public"]["Enums"]["residence_type"] | null
          source_of_income?: string | null
          sponsor?: Database["public"]["Enums"]["sponsor_type"] | null
          updated_at?: string
        }
        Update: {
          actual_name?: string | null
          category?: Database["public"]["Enums"]["family_category_type"] | null
          created_at?: string
          created_by?: string | null
          family_status?: string | null
          gender?: Database["public"]["Enums"]["gender_type"] | null
          id?: string
          known_name?: string
          no_of_beneficiaries?: number | null
          organization_id?: string
          residence?: Database["public"]["Enums"]["residence_type"] | null
          source_of_income?: string | null
          sponsor?: Database["public"]["Enums"]["sponsor_type"] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "family_adoption_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      feeding_program: {
        Row: {
          academic_level:
            | Database["public"]["Enums"]["academic_level_type"]
            | null
          contact: string | null
          created_at: string
          created_by: string | null
          education_sponsorship: boolean | null
          gender: Database["public"]["Enums"]["gender_type"] | null
          grade: string | null
          id: string
          name: string
          organization_id: string
          school: string | null
          type: Database["public"]["Enums"]["feeding_type"] | null
          updated_at: string
        }
        Insert: {
          academic_level?:
            | Database["public"]["Enums"]["academic_level_type"]
            | null
          contact?: string | null
          created_at?: string
          created_by?: string | null
          education_sponsorship?: boolean | null
          gender?: Database["public"]["Enums"]["gender_type"] | null
          grade?: string | null
          id?: string
          name: string
          organization_id?: string
          school?: string | null
          type?: Database["public"]["Enums"]["feeding_type"] | null
          updated_at?: string
        }
        Update: {
          academic_level?:
            | Database["public"]["Enums"]["academic_level_type"]
            | null
          contact?: string | null
          created_at?: string
          created_by?: string | null
          education_sponsorship?: boolean | null
          gender?: Database["public"]["Enums"]["gender_type"] | null
          grade?: string | null
          id?: string
          name?: string
          organization_id?: string
          school?: string | null
          type?: Database["public"]["Enums"]["feeding_type"] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "feeding_program_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      home_visit_reports: {
        Row: {
          challenges_identified: string
          created_at: string
          created_by: string | null
          id: string
          location: Database["public"]["Enums"]["residence_type"] | null
          observation_findings: string
          organization_id: string
          reason_for_visit: string | null
          recommendations: string
          staff: string
          student_id: string | null
          updated_at: string
          visit_date: string
        }
        Insert: {
          challenges_identified: string
          created_at?: string
          created_by?: string | null
          id?: string
          location?: Database["public"]["Enums"]["residence_type"] | null
          observation_findings: string
          organization_id?: string
          reason_for_visit?: string | null
          recommendations: string
          staff: string
          student_id?: string | null
          updated_at?: string
          visit_date: string
        }
        Update: {
          challenges_identified?: string
          created_at?: string
          created_by?: string | null
          id?: string
          location?: Database["public"]["Enums"]["residence_type"] | null
          observation_findings?: string
          organization_id?: string
          reason_for_visit?: string | null
          recommendations?: string
          staff?: string
          student_id?: string | null
          updated_at?: string
          visit_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "home_visit_reports_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
            foreignKeyName: "indicators_template_source_id_fkey"
            columns: ["template_source_id"]
            isOneToOne: false
            referencedRelation: "indicators"
            referencedColumns: ["id"]
          },
        ]
      }
      kipawa_sato: {
        Row: {
          academic_level:
            | Database["public"]["Enums"]["academic_level_type"]
            | null
          age: number | null
          awards_recognition: string | null
          coach_mentor_name: string | null
          created_at: string
          created_by: string | null
          full_name: string
          gender: Database["public"]["Enums"]["gender_type"] | null
          id: string
          location: Database["public"]["Enums"]["residence_type"] | null
          organization_id: string
          school_support_given: boolean | null
          specific_skill:
            | Database["public"]["Enums"]["specific_skill_type"]
            | null
          talent_category:
            | Database["public"]["Enums"]["talent_category_type"]
            | null
          updated_at: string
          year_enrolled: number | null
        }
        Insert: {
          academic_level?:
            | Database["public"]["Enums"]["academic_level_type"]
            | null
          age?: number | null
          awards_recognition?: string | null
          coach_mentor_name?: string | null
          created_at?: string
          created_by?: string | null
          full_name: string
          gender?: Database["public"]["Enums"]["gender_type"] | null
          id?: string
          location?: Database["public"]["Enums"]["residence_type"] | null
          organization_id?: string
          school_support_given?: boolean | null
          specific_skill?:
            | Database["public"]["Enums"]["specific_skill_type"]
            | null
          talent_category?:
            | Database["public"]["Enums"]["talent_category_type"]
            | null
          updated_at?: string
          year_enrolled?: number | null
        }
        Update: {
          academic_level?:
            | Database["public"]["Enums"]["academic_level_type"]
            | null
          age?: number | null
          awards_recognition?: string | null
          coach_mentor_name?: string | null
          created_at?: string
          created_by?: string | null
          full_name?: string
          gender?: Database["public"]["Enums"]["gender_type"] | null
          id?: string
          location?: Database["public"]["Enums"]["residence_type"] | null
          organization_id?: string
          school_support_given?: boolean | null
          specific_skill?:
            | Database["public"]["Enums"]["specific_skill_type"]
            | null
          talent_category?:
            | Database["public"]["Enums"]["talent_category_type"]
            | null
          updated_at?: string
          year_enrolled?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "kipawa_sato_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      loan_repayments: {
        Row: {
          amount_paid: number
          balance_after_payment: number | null
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          payment_method: string | null
          reference_number: string | null
          repayment_date: string
          self_empowerment_id: string
          updated_at: string
        }
        Insert: {
          amount_paid: number
          balance_after_payment?: number | null
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          payment_method?: string | null
          reference_number?: string | null
          repayment_date?: string
          self_empowerment_id: string
          updated_at?: string
        }
        Update: {
          amount_paid?: number
          balance_after_payment?: number | null
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          payment_method?: string | null
          reference_number?: string | null
          repayment_date?: string
          self_empowerment_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "loan_repayments_self_empowerment_id_fkey"
            columns: ["self_empowerment_id"]
            isOneToOne: false
            referencedRelation: "self_empowerment"
            referencedColumns: ["id"]
          },
        ]
      }
      medical_records: {
        Row: {
          created_at: string
          created_by: string | null
          date: string | null
          doctors_report: string | null
          full_name: string
          gender: string | null
          hospital: string
          id: string
          location: string | null
          medical_condition: string
          organization_id: string
          outcome: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          date?: string | null
          doctors_report?: string | null
          full_name: string
          gender?: string | null
          hospital: string
          id?: string
          location?: string | null
          medical_condition: string
          organization_id?: string
          outcome?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          date?: string | null
          doctors_report?: string | null
          full_name?: string
          gender?: string | null
          hospital?: string
          id?: string
          location?: string | null
          medical_condition?: string
          organization_id?: string
          outcome?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "medical_records_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
            foreignKeyName: "module_entries_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "program_modules"
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
        ]
      }
      organizations: {
        Row: {
          address: string | null
          country: string | null
          created_at: string
          description: string | null
          email: string | null
          id: string
          is_active: boolean
          logo_url: string | null
          name: string
          phone: string | null
          settings: Json | null
          slug: string
          updated_at: string
          website: string | null
        }
        Insert: {
          address?: string | null
          country?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name: string
          phone?: string | null
          settings?: Json | null
          slug: string
          updated_at?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          country?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name?: string
          phone?: string | null
          settings?: Json | null
          slug?: string
          updated_at?: string
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
            foreignKeyName: "program_entries_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
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
      program_reports: {
        Row: {
          beneficiary_impact: string
          challenges: string
          created_at: string
          created_by: string | null
          executive_summary: string
          id: string
          organization_id: string
          program: Database["public"]["Enums"]["program_type"]
          proposed_recommendations: string
          reporting_date: string
          staff: string
          updated_at: string
        }
        Insert: {
          beneficiary_impact: string
          challenges: string
          created_at?: string
          created_by?: string | null
          executive_summary: string
          id?: string
          organization_id?: string
          program: Database["public"]["Enums"]["program_type"]
          proposed_recommendations: string
          reporting_date: string
          staff: string
          updated_at?: string
        }
        Update: {
          beneficiary_impact?: string
          challenges?: string
          created_at?: string
          created_by?: string | null
          executive_summary?: string
          id?: string
          organization_id?: string
          program?: Database["public"]["Enums"]["program_type"]
          proposed_recommendations?: string
          reporting_date?: string
          staff?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "program_reports_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      programs: {
        Row: {
          created_at: string
          custom_fields: Json | null
          description: string | null
          id: string
          is_active: boolean
          location: string | null
          name: string
          organization_id: string
          program_id: string | null
          show_in_navigation: boolean | null
        }
        Insert: {
          created_at?: string
          custom_fields?: Json | null
          description?: string | null
          id?: string
          is_active?: boolean
          location?: string | null
          name: string
          organization_id?: string
          program_id?: string | null
          show_in_navigation?: boolean | null
        }
        Update: {
          created_at?: string
          custom_fields?: Json | null
          description?: string | null
          id?: string
          is_active?: boolean
          location?: string | null
          name?: string
          organization_id?: string
          program_id?: string | null
          show_in_navigation?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "programs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
      replacements: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          new_child_academic_level: string | null
          new_child_full_name: string
          new_child_gender: Database["public"]["Enums"]["gender_type"] | null
          new_child_grade: string | null
          new_child_location:
            | Database["public"]["Enums"]["residence_type"]
            | null
          new_child_school: string | null
          notes: string | null
          organization_id: string | null
          original_child_id: string
          reason: string | null
          replacement_date: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          new_child_academic_level?: string | null
          new_child_full_name: string
          new_child_gender?: Database["public"]["Enums"]["gender_type"] | null
          new_child_grade?: string | null
          new_child_location?:
            | Database["public"]["Enums"]["residence_type"]
            | null
          new_child_school?: string | null
          notes?: string | null
          organization_id?: string | null
          original_child_id: string
          reason?: string | null
          replacement_date?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          new_child_academic_level?: string | null
          new_child_full_name?: string
          new_child_gender?: Database["public"]["Enums"]["gender_type"] | null
          new_child_grade?: string | null
          new_child_location?:
            | Database["public"]["Enums"]["residence_type"]
            | null
          new_child_school?: string | null
          notes?: string | null
          organization_id?: string | null
          original_child_id?: string
          reason?: string | null
          replacement_date?: string
          updated_at?: string
        }
        Relationships: []
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
      school_visit_reports: {
        Row: {
          challenges_identified: string
          created_at: string
          created_by: string | null
          id: string
          location: Database["public"]["Enums"]["residence_type"] | null
          observation_findings: string
          organization_id: string
          reason_for_visit: string | null
          recommendations: string
          school: string
          staff: string
          updated_at: string
          visit_date: string
        }
        Insert: {
          challenges_identified: string
          created_at?: string
          created_by?: string | null
          id?: string
          location?: Database["public"]["Enums"]["residence_type"] | null
          observation_findings: string
          organization_id?: string
          reason_for_visit?: string | null
          recommendations: string
          school: string
          staff: string
          updated_at?: string
          visit_date: string
        }
        Update: {
          challenges_identified?: string
          created_at?: string
          created_by?: string | null
          id?: string
          location?: Database["public"]["Enums"]["residence_type"] | null
          observation_findings?: string
          organization_id?: string
          reason_for_visit?: string | null
          recommendations?: string
          school?: string
          staff?: string
          updated_at?: string
          visit_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_visit_reports_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      self_empowerment: {
        Row: {
          amount_approved: number | null
          amount_requested: number | null
          amount_status:
            | Database["public"]["Enums"]["amount_status_type"]
            | null
          applicant_id: string | null
          business_location: string | null
          business_name: string | null
          contact: string | null
          created_at: string
          created_by: string | null
          current_status: string | null
          full_name: string
          gender: Database["public"]["Enums"]["gender_type"] | null
          id: string
          is_active: boolean | null
          organization_id: string
          residence: Database["public"]["Enums"]["residence_type"] | null
          start_date: string | null
          support_status: string | null
          type_of_business: string | null
          updated_at: string
        }
        Insert: {
          amount_approved?: number | null
          amount_requested?: number | null
          amount_status?:
            | Database["public"]["Enums"]["amount_status_type"]
            | null
          applicant_id?: string | null
          business_location?: string | null
          business_name?: string | null
          contact?: string | null
          created_at?: string
          created_by?: string | null
          current_status?: string | null
          full_name: string
          gender?: Database["public"]["Enums"]["gender_type"] | null
          id?: string
          is_active?: boolean | null
          organization_id?: string
          residence?: Database["public"]["Enums"]["residence_type"] | null
          start_date?: string | null
          support_status?: string | null
          type_of_business?: string | null
          updated_at?: string
        }
        Update: {
          amount_approved?: number | null
          amount_requested?: number | null
          amount_status?:
            | Database["public"]["Enums"]["amount_status_type"]
            | null
          applicant_id?: string | null
          business_location?: string | null
          business_name?: string | null
          contact?: string | null
          created_at?: string
          created_by?: string | null
          current_status?: string | null
          full_name?: string
          gender?: Database["public"]["Enums"]["gender_type"] | null
          id?: string
          is_active?: boolean | null
          organization_id?: string
          residence?: Database["public"]["Enums"]["residence_type"] | null
          start_date?: string | null
          support_status?: string | null
          type_of_business?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "self_empowerment_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          key: string
          organization_id: string
          updated_at: string
          value: Json
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          key: string
          organization_id?: string
          updated_at?: string
          value: Json
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          key?: string
          organization_id?: string
          updated_at?: string
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      sponsors: {
        Row: {
          country: string | null
          created_at: string
          created_by: string | null
          email: string | null
          id: string
          is_active: boolean
          name: string
          notes: string | null
          organization_id: string
          phone: string | null
          sponsor_id: string | null
          updated_at: string
        }
        Insert: {
          country?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          organization_id?: string
          phone?: string | null
          sponsor_id?: string | null
          updated_at?: string
        }
        Update: {
          country?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          organization_id?: string
          phone?: string | null
          sponsor_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sponsors_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      support_group_activities: {
        Row: {
          activity_name: string
          created_at: string
          created_by: string | null
          description: string | null
          frequency: string | null
          id: string
          notes: string | null
          support_group_id: string
          updated_at: string
        }
        Insert: {
          activity_name: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          frequency?: string | null
          id?: string
          notes?: string | null
          support_group_id: string
          updated_at?: string
        }
        Update: {
          activity_name?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          frequency?: string | null
          id?: string
          notes?: string | null
          support_group_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_group_activities_support_group_id_fkey"
            columns: ["support_group_id"]
            isOneToOne: false
            referencedRelation: "support_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      support_groups: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          facilitator: string | null
          id: string
          location: string | null
          meeting_schedule: string | null
          member_count: number | null
          name: string
          organization_id: string
          team_leader_contact: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          facilitator?: string | null
          id?: string
          location?: string | null
          meeting_schedule?: string | null
          member_count?: number | null
          name: string
          organization_id?: string
          team_leader_contact?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          facilitator?: string | null
          id?: string
          location?: string | null
          meeting_schedule?: string | null
          member_count?: number | null
          name?: string
          organization_id?: string
          team_leader_contact?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_groups_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      transport_records: {
        Row: {
          child_id: string
          created_at: string
          id: string
          receives_shopping: boolean
          receives_transport: boolean
          term: string
          updated_at: string
          year: number
        }
        Insert: {
          child_id: string
          created_at?: string
          id?: string
          receives_shopping?: boolean
          receives_transport?: boolean
          term: string
          updated_at?: string
          year: number
        }
        Update: {
          child_id?: string
          created_at?: string
          id?: string
          receives_shopping?: boolean
          receives_transport?: boolean
          term?: string
          updated_at?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "transport_records_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
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
      visits: {
        Row: {
          child_id: string
          created_at: string
          duration_minutes: number | null
          findings: string | null
          id: string
          location: string | null
          next_visit_date: string | null
          purpose: string | null
          recommendations: string | null
          updated_at: string
          visit_date: string
          visit_type: string
          visited_by: string | null
        }
        Insert: {
          child_id: string
          created_at?: string
          duration_minutes?: number | null
          findings?: string | null
          id?: string
          location?: string | null
          next_visit_date?: string | null
          purpose?: string | null
          recommendations?: string | null
          updated_at?: string
          visit_date: string
          visit_type: string
          visited_by?: string | null
        }
        Update: {
          child_id?: string
          created_at?: string
          duration_minutes?: number | null
          findings?: string | null
          id?: string
          location?: string | null
          next_visit_date?: string | null
          purpose?: string | null
          recommendations?: string | null
          updated_at?: string
          visit_date?: string
          visit_type?: string
          visited_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "visits_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      auto_approve_request: { Args: { request_id: string }; Returns: boolean }
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
      switch_user_organization: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
      user_belongs_to_org: {
        Args: { _org_id: string; _user_id: string }
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
      family_category_type: "Guardian Ration" | "Home Based Care"
      feeding_type: "Kawangware Lunch Hour" | "Kibera Early Dinner"
      gender_type: "Male" | "Female"
      parental_status_type: "Both alive" | "Both deceased" | "Partial"
      program_type:
        | "Education"
        | "Kibera Early Dinner"
        | "Kawangware Lunch Hour"
        | "Kipawa Sato"
        | "Self-Empowerment"
        | "Support Groups"
        | "Communication"
        | "Chess"
        | "Fundraising"
        | "Admin"
        | "Content Creation"
        | "Kibera Early dinner"
        | "Kibera Kipawa Sato"
        | "Kawangware Kipawa Sato"
        | "Self Empowerment"
        | "Family Adoption"
        | "Medical"
        | "Rongai Sunday Feeding"
        | "Kawangware Sunday Feeding"
        | "Kibera Sunday Feeding"
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
      family_category_type: ["Guardian Ration", "Home Based Care"],
      feeding_type: ["Kawangware Lunch Hour", "Kibera Early Dinner"],
      gender_type: ["Male", "Female"],
      parental_status_type: ["Both alive", "Both deceased", "Partial"],
      program_type: [
        "Education",
        "Kibera Early Dinner",
        "Kawangware Lunch Hour",
        "Kipawa Sato",
        "Self-Empowerment",
        "Support Groups",
        "Communication",
        "Chess",
        "Fundraising",
        "Admin",
        "Content Creation",
        "Kibera Early dinner",
        "Kibera Kipawa Sato",
        "Kawangware Kipawa Sato",
        "Self Empowerment",
        "Family Adoption",
        "Medical",
        "Rongai Sunday Feeding",
        "Kawangware Sunday Feeding",
        "Kibera Sunday Feeding",
      ],
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

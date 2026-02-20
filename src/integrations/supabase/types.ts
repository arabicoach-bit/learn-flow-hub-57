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
      audit_logs: {
        Row: {
          action: string
          created_at: string | null
          details: Json | null
          log_id: string
          performed_by: string | null
          target_user: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          details?: Json | null
          log_id?: string
          performed_by?: string | null
          target_user?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          details?: Json | null
          log_id?: string
          performed_by?: string | null
          target_user?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_target_user_fkey"
            columns: ["target_user"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      classes: {
        Row: {
          class_id: string
          created_at: string | null
          name: string
          schedule: string | null
          teacher_id: string | null
        }
        Insert: {
          class_id?: string
          created_at?: string | null
          name: string
          schedule?: string | null
          teacher_id?: string | null
        }
        Update: {
          class_id?: string
          created_at?: string | null
          name?: string
          schedule?: string | null
          teacher_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "classes_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teacher_monthly_stats"
            referencedColumns: ["teacher_id"]
          },
          {
            foreignKeyName: "classes_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["teacher_id"]
          },
        ]
      }
      leads: {
        Row: {
          created_at: string | null
          date: string | null
          first_contact_date: string | null
          follow_up: string | null
          handled_by: string | null
          interest: string | null
          last_contact_date: string | null
          lead_id: string
          name: string
          next_followup_date: string | null
          notes: string | null
          phone: string
          source: string | null
          status: Database["public"]["Enums"]["lead_status"] | null
          trial_status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          date?: string | null
          first_contact_date?: string | null
          follow_up?: string | null
          handled_by?: string | null
          interest?: string | null
          last_contact_date?: string | null
          lead_id?: string
          name: string
          next_followup_date?: string | null
          notes?: string | null
          phone: string
          source?: string | null
          status?: Database["public"]["Enums"]["lead_status"] | null
          trial_status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          date?: string | null
          first_contact_date?: string | null
          follow_up?: string | null
          handled_by?: string | null
          interest?: string | null
          last_contact_date?: string | null
          lead_id?: string
          name?: string
          next_followup_date?: string | null
          notes?: string | null
          phone?: string
          source?: string | null
          status?: Database["public"]["Enums"]["lead_status"] | null
          trial_status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      lesson_schedules: {
        Row: {
          created_at: string | null
          day_of_week: number
          package_id: string | null
          schedule_id: string
          time_slot: string
          timezone: string | null
        }
        Insert: {
          created_at?: string | null
          day_of_week: number
          package_id?: string | null
          schedule_id?: string
          time_slot: string
          timezone?: string | null
        }
        Update: {
          created_at?: string | null
          day_of_week?: number
          package_id?: string | null
          schedule_id?: string
          time_slot?: string
          timezone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lesson_schedules_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["package_id"]
          },
        ]
      }
      lessons_log: {
        Row: {
          class_id: string | null
          created_at: string | null
          date: string | null
          lesson_date: string | null
          lesson_id: string
          notes: string | null
          package_id_used: string | null
          status: Database["public"]["Enums"]["lesson_status"]
          student_id: string | null
          teacher_id: string | null
        }
        Insert: {
          class_id?: string | null
          created_at?: string | null
          date?: string | null
          lesson_date?: string | null
          lesson_id?: string
          notes?: string | null
          package_id_used?: string | null
          status: Database["public"]["Enums"]["lesson_status"]
          student_id?: string | null
          teacher_id?: string | null
        }
        Update: {
          class_id?: string | null
          created_at?: string | null
          date?: string | null
          lesson_date?: string | null
          lesson_id?: string
          notes?: string | null
          package_id_used?: string | null
          status?: Database["public"]["Enums"]["lesson_status"]
          student_id?: string | null
          teacher_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lessons_log_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["class_id"]
          },
          {
            foreignKeyName: "lessons_log_package_id_used_fkey"
            columns: ["package_id_used"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["package_id"]
          },
          {
            foreignKeyName: "lessons_log_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "lessons_log_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teacher_monthly_stats"
            referencedColumns: ["teacher_id"]
          },
          {
            foreignKeyName: "lessons_log_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["teacher_id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          is_read: boolean | null
          message: string
          notification_id: string
          related_id: string | null
          student_name: string | null
          type: Database["public"]["Enums"]["notification_type"]
          wallet_balance: number | null
        }
        Insert: {
          created_at?: string | null
          is_read?: boolean | null
          message: string
          notification_id?: string
          related_id?: string | null
          student_name?: string | null
          type: Database["public"]["Enums"]["notification_type"]
          wallet_balance?: number | null
        }
        Update: {
          created_at?: string | null
          is_read?: boolean | null
          message?: string
          notification_id?: string
          related_id?: string | null
          student_name?: string | null
          type?: Database["public"]["Enums"]["notification_type"]
          wallet_balance?: number | null
        }
        Relationships: []
      }
      package_types: {
        Row: {
          created_at: string | null
          description: string | null
          is_active: boolean | null
          lesson_duration: number | null
          lessons_per_week: number | null
          monthly_fee: number | null
          name: string
          package_type_id: string
          total_lessons: number | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          is_active?: boolean | null
          lesson_duration?: number | null
          lessons_per_week?: number | null
          monthly_fee?: number | null
          name: string
          package_type_id?: string
          total_lessons?: number | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          is_active?: boolean | null
          lesson_duration?: number | null
          lessons_per_week?: number | null
          monthly_fee?: number | null
          name?: string
          package_type_id?: string
          total_lessons?: number | null
        }
        Relationships: []
      }
      packages: {
        Row: {
          admin_approved: boolean | null
          amount: number
          approved_at: string | null
          approved_by: string | null
          completed_date: string | null
          created_at: string | null
          is_renewal: boolean | null
          lesson_duration: number | null
          lessons_purchased: number
          lessons_used: number | null
          next_payment_date: string | null
          package_id: string
          package_type_id: string | null
          payment_date: string | null
          payment_proof: string | null
          payment_received: boolean | null
          schedule_generated: boolean | null
          start_date: string | null
          status: Database["public"]["Enums"]["package_status"] | null
          student_id: string
        }
        Insert: {
          admin_approved?: boolean | null
          amount: number
          approved_at?: string | null
          approved_by?: string | null
          completed_date?: string | null
          created_at?: string | null
          is_renewal?: boolean | null
          lesson_duration?: number | null
          lessons_purchased: number
          lessons_used?: number | null
          next_payment_date?: string | null
          package_id?: string
          package_type_id?: string | null
          payment_date?: string | null
          payment_proof?: string | null
          payment_received?: boolean | null
          schedule_generated?: boolean | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["package_status"] | null
          student_id: string
        }
        Update: {
          admin_approved?: boolean | null
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          completed_date?: string | null
          created_at?: string | null
          is_renewal?: boolean | null
          lesson_duration?: number | null
          lessons_purchased?: number
          lessons_used?: number | null
          next_payment_date?: string | null
          package_id?: string
          package_type_id?: string | null
          payment_date?: string | null
          payment_proof?: string | null
          payment_received?: boolean | null
          schedule_generated?: boolean | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["package_status"] | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "packages_package_type_id_fkey"
            columns: ["package_type_id"]
            isOneToOne: false
            referencedRelation: "package_types"
            referencedColumns: ["package_type_id"]
          },
          {
            foreignKeyName: "packages_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["student_id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string
          first_login_at: string | null
          full_name: string
          id: string
          invitation_sent_at: string | null
          is_active: boolean | null
          last_login: string | null
          password_changed_at: string | null
          phone: string | null
          teacher_id: string | null
          temp_password: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          first_login_at?: string | null
          full_name: string
          id: string
          invitation_sent_at?: string | null
          is_active?: boolean | null
          last_login?: string | null
          password_changed_at?: string | null
          phone?: string | null
          teacher_id?: string | null
          temp_password?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          first_login_at?: string | null
          full_name?: string
          id?: string
          invitation_sent_at?: string | null
          is_active?: boolean | null
          last_login?: string | null
          password_changed_at?: string | null
          phone?: string | null
          teacher_id?: string | null
          temp_password?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teacher_monthly_stats"
            referencedColumns: ["teacher_id"]
          },
          {
            foreignKeyName: "profiles_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["teacher_id"]
          },
        ]
      }
      programs: {
        Row: {
          created_at: string | null
          description: string | null
          is_active: boolean | null
          name: string
          program_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          is_active?: boolean | null
          name: string
          program_id?: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          is_active?: boolean | null
          name?: string
          program_id?: string
        }
        Relationships: []
      }
      scheduled_lessons: {
        Row: {
          class_id: string | null
          created_at: string | null
          duration_minutes: number
          lesson_log_id: string | null
          notes: string | null
          package_id: string | null
          scheduled_date: string
          scheduled_lesson_id: string
          scheduled_time: string
          status: string | null
          student_id: string | null
          teacher_id: string | null
        }
        Insert: {
          class_id?: string | null
          created_at?: string | null
          duration_minutes: number
          lesson_log_id?: string | null
          notes?: string | null
          package_id?: string | null
          scheduled_date: string
          scheduled_lesson_id?: string
          scheduled_time: string
          status?: string | null
          student_id?: string | null
          teacher_id?: string | null
        }
        Update: {
          class_id?: string | null
          created_at?: string | null
          duration_minutes?: number
          lesson_log_id?: string | null
          notes?: string | null
          package_id?: string | null
          scheduled_date?: string
          scheduled_lesson_id?: string
          scheduled_time?: string
          status?: string | null
          student_id?: string | null
          teacher_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_lessons_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["class_id"]
          },
          {
            foreignKeyName: "scheduled_lessons_lesson_log_id_fkey"
            columns: ["lesson_log_id"]
            isOneToOne: false
            referencedRelation: "lessons_log"
            referencedColumns: ["lesson_id"]
          },
          {
            foreignKeyName: "scheduled_lessons_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["package_id"]
          },
          {
            foreignKeyName: "scheduled_lessons_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "scheduled_lessons_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teacher_monthly_stats"
            referencedColumns: ["teacher_id"]
          },
          {
            foreignKeyName: "scheduled_lessons_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["teacher_id"]
          },
        ]
      }
      students: {
        Row: {
          age: number | null
          class_id: string | null
          created_at: string | null
          current_package_id: string | null
          debt_lessons: number
          gender: string | null
          name: string
          nationality: string | null
          number_of_renewals: number | null
          parent_guardian_name: string | null
          parent_phone: string | null
          phone: string
          program_id: string | null
          school: string | null
          status: Database["public"]["Enums"]["student_status"] | null
          student_id: string
          student_level: string | null
          teacher_id: string | null
          total_paid: number | null
          updated_at: string | null
          wallet_balance: number | null
          year_group: string | null
        }
        Insert: {
          age?: number | null
          class_id?: string | null
          created_at?: string | null
          current_package_id?: string | null
          debt_lessons?: number
          gender?: string | null
          name: string
          nationality?: string | null
          number_of_renewals?: number | null
          parent_guardian_name?: string | null
          parent_phone?: string | null
          phone: string
          program_id?: string | null
          school?: string | null
          status?: Database["public"]["Enums"]["student_status"] | null
          student_id?: string
          student_level?: string | null
          teacher_id?: string | null
          total_paid?: number | null
          updated_at?: string | null
          wallet_balance?: number | null
          year_group?: string | null
        }
        Update: {
          age?: number | null
          class_id?: string | null
          created_at?: string | null
          current_package_id?: string | null
          debt_lessons?: number
          gender?: string | null
          name?: string
          nationality?: string | null
          number_of_renewals?: number | null
          parent_guardian_name?: string | null
          parent_phone?: string | null
          phone?: string
          program_id?: string | null
          school?: string | null
          status?: Database["public"]["Enums"]["student_status"] | null
          student_id?: string
          student_level?: string | null
          teacher_id?: string | null
          total_paid?: number | null
          updated_at?: string | null
          wallet_balance?: number | null
          year_group?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_current_package"
            columns: ["current_package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["package_id"]
          },
          {
            foreignKeyName: "students_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["class_id"]
          },
          {
            foreignKeyName: "students_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["program_id"]
          },
          {
            foreignKeyName: "students_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teacher_monthly_stats"
            referencedColumns: ["teacher_id"]
          },
          {
            foreignKeyName: "students_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["teacher_id"]
          },
        ]
      }
      system_config: {
        Row: {
          config_key: string
          config_value: string
          description: string | null
          updated_at: string | null
        }
        Insert: {
          config_key: string
          config_value: string
          description?: string | null
          updated_at?: string | null
        }
        Update: {
          config_key?: string
          config_value?: string
          description?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      teachers: {
        Row: {
          created_at: string | null
          email: string | null
          is_active: boolean | null
          name: string
          phone: string | null
          rate_per_lesson: number | null
          teacher_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          is_active?: boolean | null
          name: string
          phone?: string | null
          rate_per_lesson?: number | null
          teacher_id?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          is_active?: boolean | null
          name?: string
          phone?: string | null
          rate_per_lesson?: number | null
          teacher_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      teachers_payroll: {
        Row: {
          amount_due: number
          created_at: string | null
          lessons_taken: number | null
          payroll_id: string
          period_end: string
          period_start: string
          rate_per_lesson: number
          status: Database["public"]["Enums"]["payroll_status"] | null
          teacher_id: string | null
        }
        Insert: {
          amount_due: number
          created_at?: string | null
          lessons_taken?: number | null
          payroll_id?: string
          period_end: string
          period_start: string
          rate_per_lesson: number
          status?: Database["public"]["Enums"]["payroll_status"] | null
          teacher_id?: string | null
        }
        Update: {
          amount_due?: number
          created_at?: string | null
          lessons_taken?: number | null
          payroll_id?: string
          period_end?: string
          period_start?: string
          rate_per_lesson?: number
          status?: Database["public"]["Enums"]["payroll_status"] | null
          teacher_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "teachers_payroll_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teacher_monthly_stats"
            referencedColumns: ["teacher_id"]
          },
          {
            foreignKeyName: "teachers_payroll_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["teacher_id"]
          },
        ]
      }
      trial_lessons_log: {
        Row: {
          admin_payment_amount: number | null
          created_at: string | null
          duration_minutes: number
          lesson_date: string
          lesson_time: string | null
          notes: string | null
          status: string
          teacher_id: string | null
          teacher_payment_amount: number | null
          trial_lesson_id: string
          trial_student_id: string
        }
        Insert: {
          admin_payment_amount?: number | null
          created_at?: string | null
          duration_minutes?: number
          lesson_date: string
          lesson_time?: string | null
          notes?: string | null
          status?: string
          teacher_id?: string | null
          teacher_payment_amount?: number | null
          trial_lesson_id?: string
          trial_student_id: string
        }
        Update: {
          admin_payment_amount?: number | null
          created_at?: string | null
          duration_minutes?: number
          lesson_date?: string
          lesson_time?: string | null
          notes?: string | null
          status?: string
          teacher_id?: string | null
          teacher_payment_amount?: number | null
          trial_lesson_id?: string
          trial_student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trial_lessons_log_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teacher_monthly_stats"
            referencedColumns: ["teacher_id"]
          },
          {
            foreignKeyName: "trial_lessons_log_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["teacher_id"]
          },
          {
            foreignKeyName: "trial_lessons_log_trial_student_id_fkey"
            columns: ["trial_student_id"]
            isOneToOne: false
            referencedRelation: "trial_students"
            referencedColumns: ["trial_id"]
          },
        ]
      }
      trial_students: {
        Row: {
          admin_payment_amount: number | null
          age: number | null
          converted_student_id: string | null
          created_at: string | null
          duration_minutes: number
          follow_up_notes: string | null
          gender: string | null
          handled_by: string | null
          interested_program: string | null
          lead_id: string | null
          name: string
          notes: string | null
          parent_guardian_name: string | null
          phone: string
          registration_date: string | null
          school: string | null
          status: Database["public"]["Enums"]["trial_status"]
          student_level: string | null
          teacher_id: string | null
          teacher_pay_percentage: number
          teacher_payment_amount: number | null
          teacher_rate_per_lesson: number | null
          trial_date: string | null
          trial_id: string
          trial_result: Database["public"]["Enums"]["trial_result"] | null
          trial_time: string | null
          updated_at: string | null
          year_group: string | null
        }
        Insert: {
          admin_payment_amount?: number | null
          age?: number | null
          converted_student_id?: string | null
          created_at?: string | null
          duration_minutes?: number
          follow_up_notes?: string | null
          gender?: string | null
          handled_by?: string | null
          interested_program?: string | null
          lead_id?: string | null
          name: string
          notes?: string | null
          parent_guardian_name?: string | null
          phone: string
          registration_date?: string | null
          school?: string | null
          status?: Database["public"]["Enums"]["trial_status"]
          student_level?: string | null
          teacher_id?: string | null
          teacher_pay_percentage?: number
          teacher_payment_amount?: number | null
          teacher_rate_per_lesson?: number | null
          trial_date?: string | null
          trial_id?: string
          trial_result?: Database["public"]["Enums"]["trial_result"] | null
          trial_time?: string | null
          updated_at?: string | null
          year_group?: string | null
        }
        Update: {
          admin_payment_amount?: number | null
          age?: number | null
          converted_student_id?: string | null
          created_at?: string | null
          duration_minutes?: number
          follow_up_notes?: string | null
          gender?: string | null
          handled_by?: string | null
          interested_program?: string | null
          lead_id?: string | null
          name?: string
          notes?: string | null
          parent_guardian_name?: string | null
          phone?: string
          registration_date?: string | null
          school?: string | null
          status?: Database["public"]["Enums"]["trial_status"]
          student_level?: string | null
          teacher_id?: string | null
          teacher_pay_percentage?: number
          teacher_payment_amount?: number | null
          teacher_rate_per_lesson?: number | null
          trial_date?: string | null
          trial_id?: string
          trial_result?: Database["public"]["Enums"]["trial_result"] | null
          trial_time?: string | null
          updated_at?: string | null
          year_group?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trial_students_converted_student_id_fkey"
            columns: ["converted_student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "trial_students_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["lead_id"]
          },
          {
            foreignKeyName: "trial_students_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teacher_monthly_stats"
            referencedColumns: ["teacher_id"]
          },
          {
            foreignKeyName: "trial_students_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["teacher_id"]
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
      teacher_monthly_stats: {
        Row: {
          lessons_taught: number | null
          month: string | null
          rate_per_lesson: number | null
          salary_earned: number | null
          teacher_id: string | null
          teacher_name: string | null
          total_hours: number | null
        }
        Relationships: []
      }
      teacher_todays_lessons: {
        Row: {
          duration_minutes: number | null
          program_name: string | null
          scheduled_lesson_id: string | null
          scheduled_time: string | null
          status: string | null
          student_id: string | null
          student_level: string | null
          student_name: string | null
          student_status: Database["public"]["Enums"]["student_status"] | null
          teacher_id: string | null
          teacher_name: string | null
          wallet_balance: number | null
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_lessons_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "scheduled_lessons_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teacher_monthly_stats"
            referencedColumns: ["teacher_id"]
          },
          {
            foreignKeyName: "scheduled_lessons_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["teacher_id"]
          },
        ]
      }
      teacher_tomorrows_lessons: {
        Row: {
          duration_minutes: number | null
          program_name: string | null
          scheduled_lesson_id: string | null
          scheduled_time: string | null
          status: string | null
          student_id: string | null
          student_level: string | null
          student_name: string | null
          student_status: Database["public"]["Enums"]["student_status"] | null
          teacher_id: string | null
          teacher_name: string | null
          wallet_balance: number | null
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_lessons_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "scheduled_lessons_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teacher_monthly_stats"
            referencedColumns: ["teacher_id"]
          },
          {
            foreignKeyName: "scheduled_lessons_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["teacher_id"]
          },
        ]
      }
      teacher_week_lessons: {
        Row: {
          duration_minutes: number | null
          program_name: string | null
          scheduled_date: string | null
          scheduled_lesson_id: string | null
          scheduled_time: string | null
          status: string | null
          student_id: string | null
          student_level: string | null
          student_name: string | null
          student_status: Database["public"]["Enums"]["student_status"] | null
          teacher_id: string | null
          teacher_name: string | null
          wallet_balance: number | null
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_lessons_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "scheduled_lessons_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teacher_monthly_stats"
            referencedColumns: ["teacher_id"]
          },
          {
            foreignKeyName: "scheduled_lessons_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["teacher_id"]
          },
        ]
      }
    }
    Functions: {
      add_package_with_debt: {
        Args: {
          p_amount: number
          p_lessons_purchased: number
          p_student_id: string
        }
        Returns: Json
      }
      generate_package_schedule: {
        Args: {
          p_class_id: string
          p_lesson_duration: number
          p_package_id: string
          p_schedule_days: Json
          p_start_date: string
          p_student_id: string
          p_teacher_id: string
          p_total_lessons: number
        }
        Returns: Json
      }
      generate_package_summary: {
        Args: { p_package_id: string }
        Returns: Json
      }
      get_user_teacher_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      mark_lesson_taken: {
        Args: {
          p_class_id: string
          p_notes?: string
          p_status: string
          p_student_id: string
          p_teacher_id: string
        }
        Returns: Json
      }
    }
    Enums: {
      app_role: "admin" | "teacher"
      lead_status: "New" | "Contacted" | "Interested" | "Converted" | "Lost"
      lesson_status: "Taken" | "Absent" | "Cancelled"
      notification_type:
        | "low_balance"
        | "grace_mode"
        | "blocked"
        | "renewal_due"
        | "followup_due"
        | "unmarked_lesson_reminder"
      package_status: "Active" | "Completed"
      payroll_status: "Draft" | "Approved" | "Paid"
      student_status: "Active" | "Grace" | "Blocked"
      trial_result: "Positive" | "Very Positive" | "Neutral" | "Negative"
      trial_status: "Scheduled" | "Completed" | "Converted" | "Lost"
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
      app_role: ["admin", "teacher"],
      lead_status: ["New", "Contacted", "Interested", "Converted", "Lost"],
      lesson_status: ["Taken", "Absent", "Cancelled"],
      notification_type: [
        "low_balance",
        "grace_mode",
        "blocked",
        "renewal_due",
        "followup_due",
        "unmarked_lesson_reminder",
      ],
      package_status: ["Active", "Completed"],
      payroll_status: ["Draft", "Approved", "Paid"],
      student_status: ["Active", "Grace", "Blocked"],
      trial_result: ["Positive", "Very Positive", "Neutral", "Negative"],
      trial_status: ["Scheduled", "Completed", "Converted", "Lost"],
    },
  },
} as const

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
            referencedRelation: "teachers"
            referencedColumns: ["teacher_id"]
          },
        ]
      }
      leads: {
        Row: {
          created_at: string | null
          date: string | null
          interest: string | null
          lead_id: string
          name: string
          next_followup_date: string | null
          notes: string | null
          phone: string
          source: string | null
          status: Database["public"]["Enums"]["lead_status"] | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          date?: string | null
          interest?: string | null
          lead_id?: string
          name: string
          next_followup_date?: string | null
          notes?: string | null
          phone: string
          source?: string | null
          status?: Database["public"]["Enums"]["lead_status"] | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          date?: string | null
          interest?: string | null
          lead_id?: string
          name?: string
          next_followup_date?: string | null
          notes?: string | null
          phone?: string
          source?: string | null
          status?: Database["public"]["Enums"]["lead_status"] | null
          updated_at?: string | null
        }
        Relationships: []
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
          type: Database["public"]["Enums"]["notification_type"]
        }
        Insert: {
          created_at?: string | null
          is_read?: boolean | null
          message: string
          notification_id?: string
          related_id?: string | null
          type: Database["public"]["Enums"]["notification_type"]
        }
        Update: {
          created_at?: string | null
          is_read?: boolean | null
          message?: string
          notification_id?: string
          related_id?: string | null
          type?: Database["public"]["Enums"]["notification_type"]
        }
        Relationships: []
      }
      packages: {
        Row: {
          amount: number
          completed_date: string | null
          created_at: string | null
          lessons_purchased: number
          lessons_used: number | null
          package_id: string
          payment_date: string | null
          status: Database["public"]["Enums"]["package_status"] | null
          student_id: string
        }
        Insert: {
          amount: number
          completed_date?: string | null
          created_at?: string | null
          lessons_purchased: number
          lessons_used?: number | null
          package_id?: string
          payment_date?: string | null
          status?: Database["public"]["Enums"]["package_status"] | null
          student_id: string
        }
        Update: {
          amount?: number
          completed_date?: string | null
          created_at?: string | null
          lessons_purchased?: number
          lessons_used?: number | null
          package_id?: string
          payment_date?: string | null
          status?: Database["public"]["Enums"]["package_status"] | null
          student_id?: string
        }
        Relationships: [
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
            referencedRelation: "teachers"
            referencedColumns: ["teacher_id"]
          },
        ]
      }
      students: {
        Row: {
          class_id: string | null
          created_at: string | null
          current_package_id: string | null
          name: string
          parent_phone: string | null
          phone: string
          status: Database["public"]["Enums"]["student_status"] | null
          student_id: string
          teacher_id: string | null
          updated_at: string | null
          wallet_balance: number | null
        }
        Insert: {
          class_id?: string | null
          created_at?: string | null
          current_package_id?: string | null
          name: string
          parent_phone?: string | null
          phone: string
          status?: Database["public"]["Enums"]["student_status"] | null
          student_id?: string
          teacher_id?: string | null
          updated_at?: string | null
          wallet_balance?: number | null
        }
        Update: {
          class_id?: string | null
          created_at?: string | null
          current_package_id?: string | null
          name?: string
          parent_phone?: string | null
          phone?: string
          status?: Database["public"]["Enums"]["student_status"] | null
          student_id?: string
          teacher_id?: string | null
          updated_at?: string | null
          wallet_balance?: number | null
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
      [_ in never]: never
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
      package_status: "Active" | "Completed"
      payroll_status: "Draft" | "Approved" | "Paid"
      student_status: "Active" | "Grace" | "Blocked"
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
      ],
      package_status: ["Active", "Completed"],
      payroll_status: ["Draft", "Approved", "Paid"],
      student_status: ["Active", "Grace", "Blocked"],
    },
  },
} as const

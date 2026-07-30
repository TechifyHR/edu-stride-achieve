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
      activity_logs: {
        Row: {
          action: string
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          metadata: Json | null
          organization_id: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          metadata?: Json | null
          organization_id: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          metadata?: Json | null
          organization_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      certificates: {
        Row: {
          certificate_number: string
          course_id: string
          created_at: string
          employee_id: string
          id: string
          issued_at: string
          organization_id: string
          pdf_url: string | null
        }
        Insert: {
          certificate_number: string
          course_id: string
          created_at?: string
          employee_id: string
          id?: string
          issued_at?: string
          organization_id: string
          pdf_url?: string | null
        }
        Update: {
          certificate_number?: string
          course_id?: string
          created_at?: string
          employee_id?: string
          id?: string
          issued_at?: string
          organization_id?: string
          pdf_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "certificates_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificates_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      course_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          assignee_id: string | null
          assignee_type: Database["public"]["Enums"]["assignee_type"]
          course_id: string
          created_at: string
          due_date: string | null
          id: string
          organization_id: string
          reminder_frequency: string | null
          start_date: string | null
          updated_at: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          assignee_id?: string | null
          assignee_type: Database["public"]["Enums"]["assignee_type"]
          course_id: string
          created_at?: string
          due_date?: string | null
          id?: string
          organization_id: string
          reminder_frequency?: string | null
          start_date?: string | null
          updated_at?: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          assignee_id?: string | null
          assignee_type?: Database["public"]["Enums"]["assignee_type"]
          course_id?: string
          created_at?: string
          due_date?: string | null
          id?: string
          organization_id?: string
          reminder_frequency?: string | null
          start_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_assignments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_assignments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      course_lessons: {
        Row: {
          content_url: string | null
          course_id: string
          created_at: string
          deleted_at: string | null
          duration_seconds: number | null
          id: string
          min_watch_pct: number | null
          order_index: number
          text_body: string | null
          title: string
          type: Database["public"]["Enums"]["lesson_type"]
          updated_at: string
          youtube_video_id: string | null
        }
        Insert: {
          content_url?: string | null
          course_id: string
          created_at?: string
          deleted_at?: string | null
          duration_seconds?: number | null
          id?: string
          min_watch_pct?: number | null
          order_index?: number
          text_body?: string | null
          title: string
          type: Database["public"]["Enums"]["lesson_type"]
          updated_at?: string
          youtube_video_id?: string | null
        }
        Update: {
          content_url?: string | null
          course_id?: string
          created_at?: string
          deleted_at?: string | null
          duration_seconds?: number | null
          id?: string
          min_watch_pct?: number | null
          order_index?: number
          text_body?: string | null
          title?: string
          type?: Database["public"]["Enums"]["lesson_type"]
          updated_at?: string
          youtube_video_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "course_lessons_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          category: string | null
          certificate_enabled: boolean
          created_at: string
          created_by: string | null
          deleted_at: string | null
          description: string | null
          difficulty: Database["public"]["Enums"]["difficulty_level"] | null
          due_date: string | null
          duration_minutes: number | null
          id: string
          mandatory: boolean
          min_video_completion_pct: number | null
          organization_id: string
          passing_score: number | null
          quiz_enabled: boolean
          status: Database["public"]["Enums"]["course_status"]
          thumbnail_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          certificate_enabled?: boolean
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          difficulty?: Database["public"]["Enums"]["difficulty_level"] | null
          due_date?: string | null
          duration_minutes?: number | null
          id?: string
          mandatory?: boolean
          min_video_completion_pct?: number | null
          organization_id: string
          passing_score?: number | null
          quiz_enabled?: boolean
          status?: Database["public"]["Enums"]["course_status"]
          thumbnail_url?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          certificate_enabled?: boolean
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          difficulty?: Database["public"]["Enums"]["difficulty_level"] | null
          due_date?: string | null
          duration_minutes?: number | null
          id?: string
          mandatory?: boolean
          min_video_completion_pct?: number | null
          organization_id?: string
          passing_score?: number | null
          quiz_enabled?: boolean
          status?: Database["public"]["Enums"]["course_status"]
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "courses_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          name: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          name: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          name?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "departments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          employee_id: string | null
          expires_at: string
          id: string
          invited_by: string | null
          organization_id: string
          role: Database["public"]["Enums"]["app_role"]
          status: string
          token: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          employee_id?: string | null
          expires_at?: string
          id?: string
          invited_by?: string | null
          organization_id: string
          role?: Database["public"]["Enums"]["app_role"]
          status?: string
          token: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          employee_id?: string | null
          expires_at?: string
          id?: string
          invited_by?: string | null
          organization_id?: string
          role?: Database["public"]["Enums"]["app_role"]
          status?: string
          token?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_invitations_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_invitations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          created_at: string
          date_joined: string | null
          deleted_at: string | null
          department_id: string | null
          email: string
          employee_code: string | null
          employment_status: Database["public"]["Enums"]["employment_status"]
          first_name: string
          gender: Database["public"]["Enums"]["gender_type"] | null
          id: string
          job_title: string | null
          last_name: string
          manager_id: string | null
          organization_id: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          date_joined?: string | null
          deleted_at?: string | null
          department_id?: string | null
          email: string
          employee_code?: string | null
          employment_status?: Database["public"]["Enums"]["employment_status"]
          first_name: string
          gender?: Database["public"]["Enums"]["gender_type"] | null
          id?: string
          job_title?: string | null
          last_name: string
          manager_id?: string | null
          organization_id: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          date_joined?: string | null
          deleted_at?: string | null
          department_id?: string | null
          email?: string
          employee_code?: string | null
          employment_status?: Database["public"]["Enums"]["employment_status"]
          first_name?: string
          gender?: Database["public"]["Enums"]["gender_type"] | null
          id?: string
          job_title?: string | null
          last_name?: string
          manager_id?: string | null
          organization_id?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employees_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_progress: {
        Row: {
          completed_at: string | null
          completion_pct: number | null
          created_at: string
          current_position: number | null
          employee_id: string
          highest_position: number | null
          id: string
          last_position: number | null
          lesson_id: string
          paused_at: string | null
          started_at: string | null
          total_watch_time: number | null
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          completion_pct?: number | null
          created_at?: string
          current_position?: number | null
          employee_id: string
          highest_position?: number | null
          id?: string
          last_position?: number | null
          lesson_id: string
          paused_at?: string | null
          started_at?: string | null
          total_watch_time?: number | null
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          completion_pct?: number | null
          created_at?: string
          current_position?: number | null
          employee_id?: string
          highest_position?: number | null
          id?: string
          last_position?: number | null
          lesson_id?: string
          paused_at?: string | null
          started_at?: string | null
          total_watch_time?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_progress_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "course_lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          link: string | null
          organization_id: string
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          organization_id: string
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          organization_id?: string
          read_at?: string | null
          title?: string
          type?: string
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
        ]
      }
      organizations: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          logo_url: string | null
          name: string
          primary_color: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          logo_url?: string | null
          name: string
          primary_color?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          primary_color?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      quiz_answers: {
        Row: {
          created_at: string
          id: string
          is_correct: boolean
          question_id: string
          text: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_correct?: boolean
          question_id: string
          text: string
        }
        Update: {
          created_at?: string
          id?: string
          is_correct?: boolean
          question_id?: string
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "quiz_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_attempts: {
        Row: {
          answers_json: Json | null
          created_at: string
          employee_id: string
          id: string
          passed: boolean | null
          quiz_id: string
          score: number | null
          started_at: string
          submitted_at: string | null
        }
        Insert: {
          answers_json?: Json | null
          created_at?: string
          employee_id: string
          id?: string
          passed?: boolean | null
          quiz_id: string
          score?: number | null
          started_at?: string
          submitted_at?: string | null
        }
        Update: {
          answers_json?: Json | null
          created_at?: string
          employee_id?: string
          id?: string
          passed?: boolean | null
          quiz_id?: string
          score?: number | null
          started_at?: string
          submitted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quiz_attempts_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_attempts_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_questions: {
        Row: {
          created_at: string
          id: string
          order_index: number
          prompt: string
          quiz_id: string
          type: Database["public"]["Enums"]["question_type"]
        }
        Insert: {
          created_at?: string
          id?: string
          order_index?: number
          prompt: string
          quiz_id: string
          type: Database["public"]["Enums"]["question_type"]
        }
        Update: {
          created_at?: string
          id?: string
          order_index?: number
          prompt?: string
          quiz_id?: string
          type?: Database["public"]["Enums"]["question_type"]
        }
        Relationships: [
          {
            foreignKeyName: "quiz_questions_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quizzes: {
        Row: {
          course_id: string
          created_at: string
          id: string
          max_attempts: number | null
          pass_mark: number | null
          random_order: boolean
          time_limit_seconds: number | null
          updated_at: string
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          max_attempts?: number | null
          pass_mark?: number | null
          random_order?: boolean
          time_limit_seconds?: number | null
          updated_at?: string
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          max_attempts?: number | null
          pass_mark?: number | null
          random_order?: boolean
          time_limit_seconds?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quizzes_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      user_group_members: {
        Row: {
          created_at: string
          employee_id: string
          group_id: string
          id: string
          organization_id: string
        }
        Insert: {
          created_at?: string
          employee_id: string
          group_id: string
          id?: string
          organization_id: string
        }
        Update: {
          created_at?: string
          employee_id?: string
          group_id?: string
          id?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_group_members_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "user_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_group_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_groups: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          name: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_groups_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_org_id: { Args: never; Returns: string }
      has_role: {
        Args: {
          _org: string
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_hr_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      app_role: "super_admin" | "hr_admin" | "manager" | "employee"
      assignee_type: "employee" | "department" | "role" | "company" | "group"
      course_status: "draft" | "published" | "archived"
      difficulty_level: "beginner" | "intermediate" | "advanced"
      employment_status: "active" | "on_leave" | "terminated"
      gender_type: "male" | "female" | "other" | "undisclosed"
      lesson_type: "youtube" | "video" | "pdf" | "pptx" | "text" | "link"
      question_type: "mcq" | "tf" | "multi"
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
      app_role: ["super_admin", "hr_admin", "manager", "employee"],
      assignee_type: ["employee", "department", "role", "company", "group"],
      course_status: ["draft", "published", "archived"],
      difficulty_level: ["beginner", "intermediate", "advanced"],
      employment_status: ["active", "on_leave", "terminated"],
      gender_type: ["male", "female", "other", "undisclosed"],
      lesson_type: ["youtube", "video", "pdf", "pptx", "text", "link"],
      question_type: ["mcq", "tf", "multi"],
    },
  },
} as const

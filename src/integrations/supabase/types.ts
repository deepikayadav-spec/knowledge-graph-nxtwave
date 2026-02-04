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
      class_students: {
        Row: {
          class_id: string
          enrolled_at: string
          id: string
          student_id: string
          student_name: string
        }
        Insert: {
          class_id: string
          enrolled_at?: string
          id?: string
          student_id: string
          student_name: string
        }
        Update: {
          class_id?: string
          enrolled_at?: string
          id?: string
          student_id?: string
          student_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_students_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      classes: {
        Row: {
          created_at: string
          graph_id: string
          id: string
          name: string
          teacher_id: string | null
        }
        Insert: {
          created_at?: string
          graph_id: string
          id?: string
          name: string
          teacher_id?: string | null
        }
        Update: {
          created_at?: string
          graph_id?: string
          id?: string
          name?: string
          teacher_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "classes_graph_id_fkey"
            columns: ["graph_id"]
            isOneToOne: false
            referencedRelation: "knowledge_graphs"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_graphs: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          total_questions: number | null
          total_skills: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          total_questions?: number | null
          total_skills?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          total_questions?: number | null
          total_skills?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      questions: {
        Row: {
          created_at: string | null
          graph_id: string
          id: string
          primary_skills: string[] | null
          question_text: string
          skill_weights: Json | null
          skills: string[]
        }
        Insert: {
          created_at?: string | null
          graph_id: string
          id?: string
          primary_skills?: string[] | null
          question_text: string
          skill_weights?: Json | null
          skills?: string[]
        }
        Update: {
          created_at?: string | null
          graph_id?: string
          id?: string
          primary_skills?: string[] | null
          question_text?: string
          skill_weights?: Json | null
          skills?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "questions_graph_id_fkey"
            columns: ["graph_id"]
            isOneToOne: false
            referencedRelation: "knowledge_graphs"
            referencedColumns: ["id"]
          },
        ]
      }
      skill_edges: {
        Row: {
          from_skill: string
          graph_id: string
          id: string
          reason: string | null
          relationship_type: string | null
          to_skill: string
        }
        Insert: {
          from_skill: string
          graph_id: string
          id?: string
          reason?: string | null
          relationship_type?: string | null
          to_skill: string
        }
        Update: {
          from_skill?: string
          graph_id?: string
          id?: string
          reason?: string | null
          relationship_type?: string | null
          to_skill?: string
        }
        Relationships: [
          {
            foreignKeyName: "skill_edges_graph_id_fkey"
            columns: ["graph_id"]
            isOneToOne: false
            referencedRelation: "knowledge_graphs"
            referencedColumns: ["id"]
          },
        ]
      }
      skill_subtopics: {
        Row: {
          color: string
          created_at: string | null
          display_order: number
          graph_id: string
          id: string
          name: string
          topic_id: string | null
        }
        Insert: {
          color?: string
          created_at?: string | null
          display_order?: number
          graph_id: string
          id?: string
          name: string
          topic_id?: string | null
        }
        Update: {
          color?: string
          created_at?: string | null
          display_order?: number
          graph_id?: string
          id?: string
          name?: string
          topic_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "skill_subtopics_graph_id_fkey"
            columns: ["graph_id"]
            isOneToOne: false
            referencedRelation: "knowledge_graphs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skill_subtopics_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "skill_topics"
            referencedColumns: ["id"]
          },
        ]
      }
      skill_topics: {
        Row: {
          color: string
          created_at: string | null
          display_order: number
          graph_id: string
          id: string
          name: string
        }
        Insert: {
          color?: string
          created_at?: string | null
          display_order?: number
          graph_id: string
          id?: string
          name: string
        }
        Update: {
          color?: string
          created_at?: string | null
          display_order?: number
          graph_id?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "skill_topics_graph_id_fkey"
            columns: ["graph_id"]
            isOneToOne: false
            referencedRelation: "knowledge_graphs"
            referencedColumns: ["id"]
          },
        ]
      }
      skills: {
        Row: {
          created_at: string | null
          description: string | null
          graph_id: string
          id: string
          level: number
          name: string
          skill_id: string
          subtopic_id: string | null
          tier: string
          transferable_contexts: Json | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          graph_id: string
          id?: string
          level?: number
          name: string
          skill_id: string
          subtopic_id?: string | null
          tier: string
          transferable_contexts?: Json | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          graph_id?: string
          id?: string
          level?: number
          name?: string
          skill_id?: string
          subtopic_id?: string | null
          tier?: string
          transferable_contexts?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "skills_graph_id_fkey"
            columns: ["graph_id"]
            isOneToOne: false
            referencedRelation: "knowledge_graphs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skills_subtopic_id_fkey"
            columns: ["subtopic_id"]
            isOneToOne: false
            referencedRelation: "skill_subtopics"
            referencedColumns: ["id"]
          },
        ]
      }
      student_attempts: {
        Row: {
          attempted_at: string
          class_id: string | null
          graph_id: string
          id: string
          independence_level: string
          is_correct: boolean
          question_id: string
          student_id: string
        }
        Insert: {
          attempted_at?: string
          class_id?: string | null
          graph_id: string
          id?: string
          independence_level: string
          is_correct: boolean
          question_id: string
          student_id: string
        }
        Update: {
          attempted_at?: string
          class_id?: string | null
          graph_id?: string
          id?: string
          independence_level?: string
          is_correct?: boolean
          question_id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_attempts_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_attempts_graph_id_fkey"
            columns: ["graph_id"]
            isOneToOne: false
            referencedRelation: "knowledge_graphs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_attempts_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      student_kp_mastery: {
        Row: {
          earned_points: number
          graph_id: string
          id: string
          last_reviewed_at: string | null
          max_points: number
          raw_mastery: number
          retrieval_count: number
          skill_id: string
          stability: number
          student_id: string
        }
        Insert: {
          earned_points?: number
          graph_id: string
          id?: string
          last_reviewed_at?: string | null
          max_points?: number
          raw_mastery?: number
          retrieval_count?: number
          skill_id: string
          stability?: number
          student_id: string
        }
        Update: {
          earned_points?: number
          graph_id?: string
          id?: string
          last_reviewed_at?: string | null
          max_points?: number
          raw_mastery?: number
          retrieval_count?: number
          skill_id?: string
          stability?: number
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_kp_mastery_graph_id_fkey"
            columns: ["graph_id"]
            isOneToOne: false
            referencedRelation: "knowledge_graphs"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const

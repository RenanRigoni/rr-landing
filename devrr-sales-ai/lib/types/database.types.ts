// AUTOGERADO por `npm run gen:types` — NÃO editar à mão.
// Fonte: Supabase Management API
//   GET /v1/projects/{ref}/types/typescript?included_schemas=sales
// Verificado por `npm run types:check` (regenera para um temporário e falha se
// divergir deste arquivo). Depois de qualquer migration: `npm run gen:types` +
// commit no mesmo passo. Ver docs/DECISIONS.md → D-042 e docs/DATABASE.md →
// "Checklist obrigatório por migration".

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
    PostgrestVersion: "14.17"
  }
  sales: {
    Tables: {
      activities: {
        Row: {
          ai_run_id: string | null
          body: string | null
          contact_id: string | null
          created_at: string
          created_by: string | null
          done_at: string | null
          due_at: string | null
          id: string
          is_auto: boolean
          is_demo: boolean
          lead_id: string
          org_id: string
          rule_id: string | null
          status: Database["sales"]["Enums"]["activity_status"]
          step_number: number | null
          title: string
          type: Database["sales"]["Enums"]["activity_type"]
          updated_at: string
        }
        Insert: {
          ai_run_id?: string | null
          body?: string | null
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          done_at?: string | null
          due_at?: string | null
          id?: string
          is_auto?: boolean
          is_demo?: boolean
          lead_id: string
          org_id: string
          rule_id?: string | null
          status?: Database["sales"]["Enums"]["activity_status"]
          step_number?: number | null
          title: string
          type: Database["sales"]["Enums"]["activity_type"]
          updated_at?: string
        }
        Update: {
          ai_run_id?: string | null
          body?: string | null
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          done_at?: string | null
          due_at?: string | null
          id?: string
          is_auto?: boolean
          is_demo?: boolean
          lead_id?: string
          org_id?: string
          rule_id?: string | null
          status?: Database["sales"]["Enums"]["activity_status"]
          step_number?: number | null
          title?: string
          type?: Database["sales"]["Enums"]["activity_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "activities_ai_run_id_fkey"
            columns: ["ai_run_id"]
            isOneToOne: false
            referencedRelation: "ai_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "v_leads_without_action"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "followup_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_prompts: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          model: string
          org_id: string
          slug: string
          system_prompt: string
          temperature: number
          updated_at: string
          user_prompt_template: string
          version: number
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          model?: string
          org_id: string
          slug: string
          system_prompt: string
          temperature?: number
          updated_at?: string
          user_prompt_template: string
          version?: number
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          model?: string
          org_id?: string
          slug?: string
          system_prompt?: string
          temperature?: number
          updated_at?: string
          user_prompt_template?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "ai_prompts_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_runs: {
        Row: {
          contact_id: string | null
          created_at: string
          error_message: string | null
          id: string
          input_payload: Json | null
          input_tokens: number | null
          latency_ms: number | null
          lead_id: string | null
          model: string | null
          org_id: string
          output_tokens: number | null
          parsed_output: Json | null
          prompt_id: string | null
          raw_response: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["sales"]["Enums"]["ai_run_status"]
        }
        Insert: {
          contact_id?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          input_payload?: Json | null
          input_tokens?: number | null
          latency_ms?: number | null
          lead_id?: string | null
          model?: string | null
          org_id: string
          output_tokens?: number | null
          parsed_output?: Json | null
          prompt_id?: string | null
          raw_response?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["sales"]["Enums"]["ai_run_status"]
        }
        Update: {
          contact_id?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          input_payload?: Json | null
          input_tokens?: number | null
          latency_ms?: number | null
          lead_id?: string | null
          model?: string | null
          org_id?: string
          output_tokens?: number | null
          parsed_output?: Json | null
          prompt_id?: string | null
          raw_response?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["sales"]["Enums"]["ai_run_status"]
        }
        Relationships: [
          {
            foreignKeyName: "ai_runs_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_runs_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_runs_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "v_leads_without_action"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_runs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_runs_prompt_id_fkey"
            columns: ["prompt_id"]
            isOneToOne: false
            referencedRelation: "ai_prompts"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          diff: Json | null
          entity: string
          entity_id: string | null
          id: string
          org_id: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          diff?: Json | null
          entity: string
          entity_id?: string | null
          id?: string
          org_id: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          diff?: Json | null
          entity?: string
          entity_id?: string | null
          id?: string
          org_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          city: string | null
          company_name: string | null
          created_at: string
          created_by: string | null
          email: string | null
          full_name: string
          id: string
          is_demo: boolean
          notes: string | null
          org_id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          city?: string | null
          company_name?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          full_name: string
          id?: string
          is_demo?: boolean
          notes?: string | null
          org_id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          city?: string | null
          company_name?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          full_name?: string
          id?: string
          is_demo?: boolean
          notes?: string | null
          org_id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contacts_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      followup_rules: {
        Row: {
          channel: Database["sales"]["Enums"]["activity_type"]
          created_at: string
          delay_days: number
          id: string
          is_active: boolean
          org_id: string
          prompt_slug: string | null
          step_number: number
          trigger_stage_id: string
          updated_at: string
        }
        Insert: {
          channel?: Database["sales"]["Enums"]["activity_type"]
          created_at?: string
          delay_days: number
          id?: string
          is_active?: boolean
          org_id: string
          prompt_slug?: string | null
          step_number: number
          trigger_stage_id: string
          updated_at?: string
        }
        Update: {
          channel?: Database["sales"]["Enums"]["activity_type"]
          created_at?: string
          delay_days?: number
          id?: string
          is_active?: boolean
          org_id?: string
          prompt_slug?: string | null
          step_number?: number
          trigger_stage_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "followup_rules_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "followup_rules_trigger_stage_id_fkey"
            columns: ["trigger_stage_id"]
            isOneToOne: false
            referencedRelation: "pipeline_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_sources: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          org_id: string
          position: number
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          org_id: string
          position?: number
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          org_id?: string
          position?: number
        }
        Relationships: [
          {
            foreignKeyName: "lead_sources_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          closed_at: string | null
          contact_id: string
          created_at: string
          created_by: string | null
          currency: string
          id: string
          interest: string | null
          is_demo: boolean
          last_contact_at: string | null
          lost_reason: string | null
          next_action_at: string | null
          notes: string | null
          org_id: string
          responded_at: string | null
          source_id: string | null
          stage_id: string
          status: Database["sales"]["Enums"]["lead_status"]
          temperature: Database["sales"]["Enums"]["lead_temp"] | null
          title: string
          updated_at: string
          value_cents: number
        }
        Insert: {
          closed_at?: string | null
          contact_id: string
          created_at?: string
          created_by?: string | null
          currency?: string
          id?: string
          interest?: string | null
          is_demo?: boolean
          last_contact_at?: string | null
          lost_reason?: string | null
          next_action_at?: string | null
          notes?: string | null
          org_id: string
          responded_at?: string | null
          source_id?: string | null
          stage_id: string
          status?: Database["sales"]["Enums"]["lead_status"]
          temperature?: Database["sales"]["Enums"]["lead_temp"] | null
          title: string
          updated_at?: string
          value_cents?: number
        }
        Update: {
          closed_at?: string | null
          contact_id?: string
          created_at?: string
          created_by?: string | null
          currency?: string
          id?: string
          interest?: string | null
          is_demo?: boolean
          last_contact_at?: string | null
          lost_reason?: string | null
          next_action_at?: string | null
          notes?: string | null
          org_id?: string
          responded_at?: string | null
          source_id?: string | null
          stage_id?: string
          status?: Database["sales"]["Enums"]["lead_status"]
          temperature?: Database["sales"]["Enums"]["lead_temp"] | null
          title?: string
          updated_at?: string
          value_cents?: number
        }
        Relationships: [
          {
            foreignKeyName: "leads_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "lead_sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "pipeline_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      org_members: {
        Row: {
          created_at: string
          id: string
          org_id: string
          role: Database["sales"]["Enums"]["org_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          org_id: string
          role?: Database["sales"]["Enums"]["org_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          org_id?: string
          role?: Database["sales"]["Enums"]["org_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_members_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          business_hours: Json
          created_at: string
          id: string
          name: string
          slug: string
          timezone: string
          updated_at: string
        }
        Insert: {
          business_hours?: Json
          created_at?: string
          id?: string
          name: string
          slug: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          business_hours?: Json
          created_at?: string
          id?: string
          name?: string
          slug?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      pipeline_stages: {
        Row: {
          color: string | null
          created_at: string
          id: string
          is_lost: boolean
          is_won: boolean
          key: string
          label: string
          org_id: string
          position: number
          probability: number
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          is_lost?: boolean
          is_won?: boolean
          key: string
          label: string
          org_id: string
          position: number
          probability?: number
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          is_lost?: boolean
          is_won?: boolean
          key?: string
          label?: string
          org_id?: string
          position?: number
          probability?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pipeline_stages_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      v_leads_without_action: {
        Row: {
          contact_name: string | null
          contact_phone: string | null
          id: string | null
          last_contact_at: string | null
          org_id: string | null
          stage_id: string | null
          stage_label: string | null
          stage_position: number | null
          title: string | null
          value_cents: number | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "pipeline_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      v_today_actions: {
        Row: {
          body: string | null
          contact_name: string | null
          contact_phone: string | null
          due_at: string | null
          id: string | null
          is_auto: boolean | null
          lead_id: string | null
          lead_title: string | null
          org_id: string | null
          stage_id: string | null
          stage_label: string | null
          step_number: number | null
          title: string | null
          type: Database["sales"]["Enums"]["activity_type"] | null
          value_cents: number | null
        }
        Relationships: [
          {
            foreignKeyName: "activities_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "v_leads_without_action"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "pipeline_stages"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      create_organization: { Args: { p_name: string }; Returns: string }
      current_org_ids: { Args: never; Returns: string[] }
      current_org_role: {
        Args: { p_org_id: string }
        Returns: Database["sales"]["Enums"]["org_role"]
      }
      seed_org_defaults: { Args: { p_org_id: string }; Returns: undefined }
    }
    Enums: {
      activity_status: "pending" | "done" | "cancelled"
      activity_type:
        | "note"
        | "call"
        | "whatsapp"
        | "email"
        | "meeting"
        | "task"
        | "followup"
        | "proposal_sent"
      ai_run_status: "pending_review" | "reviewed" | "discarded" | "error"
      lead_status: "open" | "won" | "lost"
      lead_temp: "cold" | "warm" | "hot"
      org_role: "owner" | "admin" | "member"
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
  sales: {
    Enums: {
      activity_status: ["pending", "done", "cancelled"],
      activity_type: [
        "note",
        "call",
        "whatsapp",
        "email",
        "meeting",
        "task",
        "followup",
        "proposal_sent",
      ],
      ai_run_status: ["pending_review", "reviewed", "discarded", "error"],
      lead_status: ["open", "won", "lost"],
      lead_temp: ["cold", "warm", "hot"],
      org_role: ["owner", "admin", "member"],
    },
  },
} as const

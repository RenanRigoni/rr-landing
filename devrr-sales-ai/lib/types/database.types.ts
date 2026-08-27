// Tipos do schema `sales`, escritos à mão a partir de
// supabase/migrations/0001_schema_and_helpers.sql, 0002_organizations.sql,
// 0004_catalogs.sql, 0005_contacts_leads.sql, 0006_activities.sql,
// 0007_followup_rules.sql, 0008_views.sql, 0009_ai.sql,
// 0010_seed_followup_proposta_prompt.sql e 0011_audit.sql (tarefas 2.1, 2.2,
// 3.1, 3.2, 4.1, 4.3, 5.1, 5.2 e 5.4).
//
// `sales` está em Settings → API → Exposed schemas (confirmado batendo direto
// no PostgREST: erro de "tabela não encontrada", não de "schema inválido").
// O que não funciona é a ferramenta MCP `generate_typescript_types` desta
// sessão, que só introspecta `public` — nem o schema `crm` do CRM-RR aparece
// nela, apesar de exposto e em produção. Limitação da ferramenta, não do
// projeto. Até haver outro meio de gerar (Supabase CLI local, por exemplo),
// este arquivo é mantido em sincronia manual com as migrations; ver
// DATABASE.md.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  sales: {
    Tables: {
      organizations: {
        Row: {
          id: string
          name: string
          slug: string
          timezone: string
          business_hours: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          timezone?: string
          business_hours?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          timezone?: string
          business_hours?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      org_members: {
        Row: {
          id: string
          org_id: string
          user_id: string
          role: 'owner' | 'admin' | 'member'
          created_at: string
        }
        Insert: {
          id?: string
          org_id: string
          user_id: string
          role?: 'owner' | 'admin' | 'member'
          created_at?: string
        }
        Update: {
          id?: string
          org_id?: string
          user_id?: string
          role?: 'owner' | 'admin' | 'member'
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'org_members_org_id_fkey'
            columns: ['org_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
        ]
      }
      lead_sources: {
        Row: {
          id: string
          org_id: string
          name: string
          is_active: boolean
          position: number
          created_at: string
        }
        Insert: {
          id?: string
          org_id: string
          name: string
          is_active?: boolean
          position?: number
          created_at?: string
        }
        Update: {
          id?: string
          org_id?: string
          name?: string
          is_active?: boolean
          position?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'lead_sources_org_id_fkey'
            columns: ['org_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
        ]
      }
      pipeline_stages: {
        Row: {
          id: string
          org_id: string
          key: string
          label: string
          position: number
          probability: number
          is_won: boolean
          is_lost: boolean
          color: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          org_id: string
          key: string
          label: string
          position: number
          probability?: number
          is_won?: boolean
          is_lost?: boolean
          color?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          org_id?: string
          key?: string
          label?: string
          position?: number
          probability?: number
          is_won?: boolean
          is_lost?: boolean
          color?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'pipeline_stages_org_id_fkey'
            columns: ['org_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
        ]
      }
      contacts: {
        Row: {
          id: string
          org_id: string
          full_name: string
          phone: string | null
          email: string | null
          company_name: string | null
          city: string | null
          notes: string | null
          is_demo: boolean
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          org_id: string
          full_name: string
          phone?: string | null
          email?: string | null
          company_name?: string | null
          city?: string | null
          notes?: string | null
          is_demo?: boolean
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          org_id?: string
          full_name?: string
          phone?: string | null
          email?: string | null
          company_name?: string | null
          city?: string | null
          notes?: string | null
          is_demo?: boolean
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'contacts_org_id_fkey'
            columns: ['org_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
        ]
      }
      leads: {
        Row: {
          id: string
          org_id: string
          contact_id: string
          title: string
          interest: string | null
          source_id: string | null
          stage_id: string
          status: 'open' | 'won' | 'lost'
          temperature: 'cold' | 'warm' | 'hot' | null
          value_cents: number
          currency: string
          last_contact_at: string | null
          next_action_at: string | null
          responded_at: string | null
          closed_at: string | null
          lost_reason: string | null
          notes: string | null
          is_demo: boolean
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          org_id: string
          contact_id: string
          title: string
          interest?: string | null
          source_id?: string | null
          stage_id: string
          status?: 'open' | 'won' | 'lost'
          temperature?: 'cold' | 'warm' | 'hot' | null
          value_cents?: number
          currency?: string
          last_contact_at?: string | null
          next_action_at?: string | null
          responded_at?: string | null
          closed_at?: string | null
          lost_reason?: string | null
          notes?: string | null
          is_demo?: boolean
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          org_id?: string
          contact_id?: string
          title?: string
          interest?: string | null
          source_id?: string | null
          stage_id?: string
          status?: 'open' | 'won' | 'lost'
          temperature?: 'cold' | 'warm' | 'hot' | null
          value_cents?: number
          currency?: string
          last_contact_at?: string | null
          next_action_at?: string | null
          responded_at?: string | null
          closed_at?: string | null
          lost_reason?: string | null
          notes?: string | null
          is_demo?: boolean
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'leads_org_id_fkey'
            columns: ['org_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'leads_contact_id_fkey'
            columns: ['contact_id']
            isOneToOne: false
            referencedRelation: 'contacts'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'leads_source_id_fkey'
            columns: ['source_id']
            isOneToOne: false
            referencedRelation: 'lead_sources'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'leads_stage_id_fkey'
            columns: ['stage_id']
            isOneToOne: false
            referencedRelation: 'pipeline_stages'
            referencedColumns: ['id']
          },
        ]
      }
      activities: {
        Row: {
          id: string
          org_id: string
          lead_id: string
          contact_id: string | null
          type:
            | 'note'
            | 'call'
            | 'whatsapp'
            | 'email'
            | 'meeting'
            | 'task'
            | 'followup'
            | 'proposal_sent'
          title: string
          body: string | null
          status: 'pending' | 'done' | 'cancelled'
          due_at: string | null
          done_at: string | null
          is_auto: boolean
          rule_id: string | null
          step_number: number | null
          ai_run_id: string | null
          is_demo: boolean
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          org_id: string
          lead_id: string
          contact_id?: string | null
          type:
            | 'note'
            | 'call'
            | 'whatsapp'
            | 'email'
            | 'meeting'
            | 'task'
            | 'followup'
            | 'proposal_sent'
          title: string
          body?: string | null
          status?: 'pending' | 'done' | 'cancelled'
          due_at?: string | null
          done_at?: string | null
          is_auto?: boolean
          rule_id?: string | null
          step_number?: number | null
          ai_run_id?: string | null
          is_demo?: boolean
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          org_id?: string
          lead_id?: string
          contact_id?: string | null
          type?:
            | 'note'
            | 'call'
            | 'whatsapp'
            | 'email'
            | 'meeting'
            | 'task'
            | 'followup'
            | 'proposal_sent'
          title?: string
          body?: string | null
          status?: 'pending' | 'done' | 'cancelled'
          due_at?: string | null
          done_at?: string | null
          is_auto?: boolean
          rule_id?: string | null
          step_number?: number | null
          ai_run_id?: string | null
          is_demo?: boolean
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'activities_org_id_fkey'
            columns: ['org_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'activities_lead_id_fkey'
            columns: ['lead_id']
            isOneToOne: false
            referencedRelation: 'leads'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'activities_contact_id_fkey'
            columns: ['contact_id']
            isOneToOne: false
            referencedRelation: 'contacts'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'activities_rule_id_fkey'
            columns: ['rule_id']
            isOneToOne: false
            referencedRelation: 'followup_rules'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'activities_ai_run_id_fkey'
            columns: ['ai_run_id']
            isOneToOne: false
            referencedRelation: 'ai_runs'
            referencedColumns: ['id']
          },
        ]
      }
      followup_rules: {
        Row: {
          id: string
          org_id: string
          trigger_stage_id: string
          step_number: number
          delay_days: number
          channel:
            | 'note'
            | 'call'
            | 'whatsapp'
            | 'email'
            | 'meeting'
            | 'task'
            | 'followup'
            | 'proposal_sent'
          prompt_slug: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          org_id: string
          trigger_stage_id: string
          step_number: number
          delay_days: number
          channel?:
            | 'note'
            | 'call'
            | 'whatsapp'
            | 'email'
            | 'meeting'
            | 'task'
            | 'followup'
            | 'proposal_sent'
          prompt_slug?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          org_id?: string
          trigger_stage_id?: string
          step_number?: number
          delay_days?: number
          channel?:
            | 'note'
            | 'call'
            | 'whatsapp'
            | 'email'
            | 'meeting'
            | 'task'
            | 'followup'
            | 'proposal_sent'
          prompt_slug?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'followup_rules_org_id_fkey'
            columns: ['org_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'followup_rules_trigger_stage_id_fkey'
            columns: ['trigger_stage_id']
            isOneToOne: false
            referencedRelation: 'pipeline_stages'
            referencedColumns: ['id']
          },
        ]
      }
      ai_prompts: {
        Row: {
          id: string
          org_id: string
          slug: string
          version: number
          system_prompt: string
          user_prompt_template: string
          model: string
          temperature: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          org_id: string
          slug: string
          version?: number
          system_prompt: string
          user_prompt_template: string
          model?: string
          temperature?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          org_id?: string
          slug?: string
          version?: number
          system_prompt?: string
          user_prompt_template?: string
          model?: string
          temperature?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'ai_prompts_org_id_fkey'
            columns: ['org_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
        ]
      }
      ai_runs: {
        Row: {
          id: string
          org_id: string
          prompt_id: string | null
          lead_id: string | null
          contact_id: string | null
          input_payload: Json | null
          raw_response: string | null
          parsed_output: Json | null
          status: 'pending_review' | 'reviewed' | 'discarded' | 'error'
          model: string | null
          input_tokens: number | null
          output_tokens: number | null
          latency_ms: number | null
          error_message: string | null
          reviewed_by: string | null
          reviewed_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          org_id: string
          prompt_id?: string | null
          lead_id?: string | null
          contact_id?: string | null
          input_payload?: Json | null
          raw_response?: string | null
          parsed_output?: Json | null
          status?: 'pending_review' | 'reviewed' | 'discarded' | 'error'
          model?: string | null
          input_tokens?: number | null
          output_tokens?: number | null
          latency_ms?: number | null
          error_message?: string | null
          reviewed_by?: string | null
          reviewed_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          org_id?: string
          prompt_id?: string | null
          lead_id?: string | null
          contact_id?: string | null
          input_payload?: Json | null
          raw_response?: string | null
          parsed_output?: Json | null
          status?: 'pending_review' | 'reviewed' | 'discarded' | 'error'
          model?: string | null
          input_tokens?: number | null
          output_tokens?: number | null
          latency_ms?: number | null
          error_message?: string | null
          reviewed_by?: string | null
          reviewed_at?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'ai_runs_org_id_fkey'
            columns: ['org_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ai_runs_prompt_id_fkey'
            columns: ['prompt_id']
            isOneToOne: false
            referencedRelation: 'ai_prompts'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ai_runs_lead_id_fkey'
            columns: ['lead_id']
            isOneToOne: false
            referencedRelation: 'leads'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ai_runs_contact_id_fkey'
            columns: ['contact_id']
            isOneToOne: false
            referencedRelation: 'contacts'
            referencedColumns: ['id']
          },
        ]
      }
      audit_logs: {
        Row: {
          id: string
          org_id: string
          user_id: string | null
          entity: string
          entity_id: string | null
          action: string
          diff: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          org_id: string
          user_id?: string | null
          entity: string
          entity_id?: string | null
          action: string
          diff?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          org_id?: string
          user_id?: string | null
          entity?: string
          entity_id?: string | null
          action?: string
          diff?: Json | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'audit_logs_org_id_fkey'
            columns: ['org_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: {
      v_today_actions: {
        Row: {
          id: string
          org_id: string
          lead_id: string
          type:
            | 'note'
            | 'call'
            | 'whatsapp'
            | 'email'
            | 'meeting'
            | 'task'
            | 'followup'
            | 'proposal_sent'
          title: string
          body: string | null
          due_at: string | null
          is_auto: boolean
          step_number: number | null
          lead_title: string
          value_cents: number
          stage_id: string
          contact_name: string
          contact_phone: string | null
          stage_label: string
        }
        Relationships: []
      }
      v_leads_without_action: {
        Row: {
          id: string
          org_id: string
          title: string
          value_cents: number
          stage_id: string
          last_contact_at: string | null
          contact_name: string
          contact_phone: string | null
          stage_label: string
          stage_position: number
        }
        Relationships: []
      }
    }
    Functions: {
      create_organization: {
        Args: { p_name: string }
        Returns: string
      }
      current_org_ids: {
        Args: Record<PropertyKey, never>
        Returns: string[]
      }
      current_org_role: {
        Args: { p_org_id: string }
        Returns: 'owner' | 'admin' | 'member' | null
      }
      // Existe desde a migration 0004; sem call site até a tarefa 6.1
      // (script de seed de demonstração, via service role). Estendida por
      // 0007 e 0010. `revoke execute ... from authenticated` — só
      // `create_organization` (0002) e o service_role a executam.
      seed_org_defaults: {
        Args: { p_org_id: string }
        Returns: undefined
      }
    }
    Enums: {
      org_role: 'owner' | 'admin' | 'member'
      lead_status: 'open' | 'won' | 'lost'
      lead_temp: 'cold' | 'warm' | 'hot'
      activity_type:
        | 'note'
        | 'call'
        | 'whatsapp'
        | 'email'
        | 'meeting'
        | 'task'
        | 'followup'
        | 'proposal_sent'
      activity_status: 'pending' | 'done' | 'cancelled'
      ai_run_status: 'pending_review' | 'reviewed' | 'discarded' | 'error'
    }
    CompositeTypes: Record<string, never>
  }
}

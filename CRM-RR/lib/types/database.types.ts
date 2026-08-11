// Types do schema `crm` do projeto Supabase fvgbbixxcapltudonxqx.
// Escrito manualmente (mcp__supabase__generate_typescript_types só cobre o
// schema `public`, que pertence a outro app nesse mesmo projeto — nunca
// misturar). Mantido em sincronia manual com supabase/migrations/*.sql;
// ver docs/DATABASE_SCHEMA.md.
//
// `Relationships` é obrigatório em cada tabela para o postgrest-js resolver
// os tipos de `.select('a, b(c)')` — sem isso a inferência cai em `never`.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  crm: {
    Tables: {
      pipelines: {
        Row: {
          id: string
          name: string
          is_default: boolean
          owner_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          is_default?: boolean
          owner_id?: string | null
          created_at?: string
        }
        Update: Partial<Database['crm']['Tables']['pipelines']['Insert']>
        Relationships: []
      }
      pipeline_stages: {
        Row: {
          id: string
          pipeline_id: string
          name: string
          position: number
          probability: number
          is_won: boolean
          is_lost: boolean
          color: string | null
          created_at: string
        }
        Insert: {
          id?: string
          pipeline_id: string
          name: string
          position: number
          probability?: number
          is_won?: boolean
          is_lost?: boolean
          color?: string | null
          created_at?: string
        }
        Update: Partial<Database['crm']['Tables']['pipeline_stages']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'pipeline_stages_pipeline_id_fkey'
            columns: ['pipeline_id']
            isOneToOne: false
            referencedRelation: 'pipelines'
            referencedColumns: ['id']
          },
        ]
      }
      lost_reasons: {
        Row: {
          id: string
          label: string
          category: 'price' | 'timing' | 'fit' | 'competitor' | 'no_response' | 'internal' | 'other'
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          label: string
          category: 'price' | 'timing' | 'fit' | 'competitor' | 'no_response' | 'internal' | 'other'
          is_active?: boolean
          created_at?: string
        }
        Update: Partial<Database['crm']['Tables']['lost_reasons']['Insert']>
        Relationships: []
      }
      lead_sources: {
        Row: {
          id: string
          name: string
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          is_active?: boolean
          created_at?: string
        }
        Update: Partial<Database['crm']['Tables']['lead_sources']['Insert']>
        Relationships: []
      }
      companies: {
        Row: {
          id: string
          company_name: string
          website: string | null
          industry: string | null
          company_size: string | null
          city: string | null
          state: string | null
          country: string | null
          estimated_revenue_range: string | null
          acquisition_source_id: string | null
          icp_fit: 'poor' | 'partial' | 'strong' | null
          notes: string | null
          is_demo: boolean
          owner_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_name: string
          website?: string | null
          industry?: string | null
          company_size?: string | null
          city?: string | null
          state?: string | null
          country?: string | null
          estimated_revenue_range?: string | null
          acquisition_source_id?: string | null
          icp_fit?: 'poor' | 'partial' | 'strong' | null
          notes?: string | null
          is_demo?: boolean
          owner_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['crm']['Tables']['companies']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'companies_acquisition_source_id_fkey'
            columns: ['acquisition_source_id']
            isOneToOne: false
            referencedRelation: 'lead_sources'
            referencedColumns: ['id']
          },
        ]
      }
      contacts: {
        Row: {
          id: string
          full_name: string
          email: string | null
          phone: string | null
          role_title: string | null
          company_id: string | null
          linkedin_url: string | null
          notes: string | null
          is_demo: boolean
          owner_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          full_name: string
          email?: string | null
          phone?: string | null
          role_title?: string | null
          company_id?: string | null
          linkedin_url?: string | null
          notes?: string | null
          is_demo?: boolean
          owner_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['crm']['Tables']['contacts']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'contacts_company_id_fkey'
            columns: ['company_id']
            isOneToOne: false
            referencedRelation: 'companies'
            referencedColumns: ['id']
          },
        ]
      }
      deals: {
        Row: {
          id: string
          title: string
          company_id: string | null
          primary_contact_id: string | null
          pipeline_id: string
          stage_id: string
          status: 'open' | 'won' | 'lost'
          value_cents: number
          currency: string
          source_id: string | null
          expected_close_date: string | null
          closed_at: string | null
          lost_reason_id: string | null
          lost_reason_notes: string | null
          qualification_score: number | null
          next_action_at: string | null
          is_demo: boolean
          owner_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          company_id?: string | null
          primary_contact_id?: string | null
          pipeline_id: string
          stage_id: string
          status?: 'open' | 'won' | 'lost'
          value_cents?: number
          currency?: string
          source_id?: string | null
          expected_close_date?: string | null
          closed_at?: string | null
          lost_reason_id?: string | null
          lost_reason_notes?: string | null
          qualification_score?: number | null
          next_action_at?: string | null
          is_demo?: boolean
          owner_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['crm']['Tables']['deals']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'deals_company_id_fkey'
            columns: ['company_id']
            isOneToOne: false
            referencedRelation: 'companies'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'deals_primary_contact_id_fkey'
            columns: ['primary_contact_id']
            isOneToOne: false
            referencedRelation: 'contacts'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'deals_stage_id_fkey'
            columns: ['stage_id']
            isOneToOne: false
            referencedRelation: 'pipeline_stages'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'deals_source_id_fkey'
            columns: ['source_id']
            isOneToOne: false
            referencedRelation: 'lead_sources'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'deals_lost_reason_id_fkey'
            columns: ['lost_reason_id']
            isOneToOne: false
            referencedRelation: 'lost_reasons'
            referencedColumns: ['id']
          },
        ]
      }
      deal_stage_history: {
        Row: {
          id: string
          deal_id: string
          from_stage_id: string | null
          to_stage_id: string
          duration_in_previous_stage_seconds: number | null
          changed_by: string | null
          changed_at: string
        }
        Insert: {
          id?: string
          deal_id: string
          from_stage_id?: string | null
          to_stage_id: string
          duration_in_previous_stage_seconds?: number | null
          changed_by?: string | null
          changed_at?: string
        }
        Update: Partial<Database['crm']['Tables']['deal_stage_history']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'deal_stage_history_deal_id_fkey'
            columns: ['deal_id']
            isOneToOne: false
            referencedRelation: 'deals'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'deal_stage_history_from_stage_id_fkey'
            columns: ['from_stage_id']
            isOneToOne: false
            referencedRelation: 'pipeline_stages'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'deal_stage_history_to_stage_id_fkey'
            columns: ['to_stage_id']
            isOneToOne: false
            referencedRelation: 'pipeline_stages'
            referencedColumns: ['id']
          },
        ]
      }
      activities: {
        Row: {
          id: string
          deal_id: string | null
          contact_id: string | null
          company_id: string | null
          type: 'call' | 'email' | 'whatsapp' | 'meeting' | 'note' | 'task' | 'linkedin'
          status: 'pending' | 'done' | 'cancelled'
          subject: string
          notes: string | null
          due_at: string | null
          completed_at: string | null
          outcome: string | null
          is_demo: boolean
          owner_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          deal_id?: string | null
          contact_id?: string | null
          company_id?: string | null
          type: 'call' | 'email' | 'whatsapp' | 'meeting' | 'note' | 'task' | 'linkedin'
          status?: 'pending' | 'done' | 'cancelled'
          subject: string
          notes?: string | null
          due_at?: string | null
          completed_at?: string | null
          outcome?: string | null
          is_demo?: boolean
          owner_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['crm']['Tables']['activities']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'activities_deal_id_fkey'
            columns: ['deal_id']
            isOneToOne: false
            referencedRelation: 'deals'
            referencedColumns: ['id']
          },
        ]
      }
      audit_log: {
        Row: {
          id: string
          entity_type: string
          entity_id: string
          action: string
          diff: Json | null
          actor: string | null
          created_at: string
        }
        Insert: {
          id?: string
          entity_type: string
          entity_id: string
          action: string
          diff?: Json | null
          actor?: string | null
          created_at?: string
        }
        Update: Partial<Database['crm']['Tables']['audit_log']['Insert']>
        Relationships: []
      }
      qualification_criteria: {
        Row: {
          id: string
          key: string
          label: string
          description: string | null
          weight: number
          max_score: number
          is_active: boolean
          position: number
          created_at: string
        }
        Insert: {
          id?: string
          key: string
          label: string
          description?: string | null
          weight?: number
          max_score?: number
          is_active?: boolean
          position: number
          created_at?: string
        }
        Update: Partial<Database['crm']['Tables']['qualification_criteria']['Insert']>
        Relationships: []
      }
      qualifications: {
        Row: {
          id: string
          deal_id: string
          overall_score: number | null
          summary: string | null
          qualified_by: 'human' | 'ai'
          owner_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          deal_id: string
          overall_score?: number | null
          summary?: string | null
          qualified_by?: 'human' | 'ai'
          owner_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['crm']['Tables']['qualifications']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'qualifications_deal_id_fkey'
            columns: ['deal_id']
            isOneToOne: true
            referencedRelation: 'deals'
            referencedColumns: ['id']
          },
        ]
      }
      qualification_scores: {
        Row: {
          id: string
          qualification_id: string
          criterion_id: string
          score: number
          rationale: string
          created_at: string
        }
        Insert: {
          id?: string
          qualification_id: string
          criterion_id: string
          score: number
          rationale: string
          created_at?: string
        }
        Update: Partial<Database['crm']['Tables']['qualification_scores']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'qualification_scores_qualification_id_fkey'
            columns: ['qualification_id']
            isOneToOne: false
            referencedRelation: 'qualifications'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'qualification_scores_criterion_id_fkey'
            columns: ['criterion_id']
            isOneToOne: false
            referencedRelation: 'qualification_criteria'
            referencedColumns: ['id']
          },
        ]
      }
      qualification_history: {
        Row: {
          id: string
          deal_id: string
          snapshot: Json
          created_at: string
        }
        Insert: {
          id?: string
          deal_id: string
          snapshot: Json
          created_at?: string
        }
        Update: Partial<Database['crm']['Tables']['qualification_history']['Insert']>
        Relationships: []
      }
      ai_prompts: {
        Row: {
          id: string
          slug: string
          version: number
          title: string
          system_prompt: string
          user_prompt_template: string
          model: string
          temperature: number
          is_active: boolean
          notes: string | null
          created_at: string
          created_by: string | null
        }
        Insert: {
          id?: string
          slug: string
          version: number
          title: string
          system_prompt: string
          user_prompt_template: string
          model?: string
          temperature?: number
          is_active?: boolean
          notes?: string | null
          created_at?: string
          created_by?: string | null
        }
        Update: Partial<Database['crm']['Tables']['ai_prompts']['Insert']>
        Relationships: []
      }
      ai_runs: {
        Row: {
          id: string
          prompt_id: string
          deal_id: string | null
          company_id: string | null
          contact_id: string | null
          input_payload: Json
          raw_response: string | null
          parsed_output: Json | null
          status: 'pending_review' | 'reviewed' | 'error'
          model: string | null
          input_tokens: number | null
          output_tokens: number | null
          latency_ms: number | null
          cost_usd: number | null
          error_message: string | null
          applied: boolean
          created_at: string
          reviewed_at: string | null
          reviewed_by: string | null
        }
        Insert: {
          id?: string
          prompt_id: string
          deal_id?: string | null
          company_id?: string | null
          contact_id?: string | null
          input_payload: Json
          raw_response?: string | null
          parsed_output?: Json | null
          status?: 'pending_review' | 'reviewed' | 'error'
          model?: string | null
          input_tokens?: number | null
          output_tokens?: number | null
          latency_ms?: number | null
          cost_usd?: number | null
          error_message?: string | null
          applied?: boolean
          created_at?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
        }
        Update: Partial<Database['crm']['Tables']['ai_runs']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'ai_runs_prompt_id_fkey'
            columns: ['prompt_id']
            isOneToOne: false
            referencedRelation: 'ai_prompts'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ai_runs_deal_id_fkey'
            columns: ['deal_id']
            isOneToOne: false
            referencedRelation: 'deals'
            referencedColumns: ['id']
          },
        ]
      }
      ai_feedback: {
        Row: {
          id: string
          ai_run_id: string
          rating: number | null
          is_useful: boolean
          error_category: string | null
          correction_notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          ai_run_id: string
          rating?: number | null
          is_useful: boolean
          error_category?: string | null
          correction_notes?: string | null
          created_at?: string
        }
        Update: Partial<Database['crm']['Tables']['ai_feedback']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'ai_feedback_ai_run_id_fkey'
            columns: ['ai_run_id']
            isOneToOne: false
            referencedRelation: 'ai_runs'
            referencedColumns: ['id']
          },
        ]
      }
      prompt_lab_comparisons: {
        Row: {
          id: string
          prompt_a_id: string
          prompt_b_id: string
          test_input: Json
          run_a_id: string | null
          run_b_id: string | null
          winner: 'a' | 'b' | 'tie' | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          prompt_a_id: string
          prompt_b_id: string
          test_input: Json
          run_a_id?: string | null
          run_b_id?: string | null
          winner?: 'a' | 'b' | 'tie' | null
          notes?: string | null
          created_at?: string
        }
        Update: Partial<Database['crm']['Tables']['prompt_lab_comparisons']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'prompt_lab_comparisons_prompt_a_id_fkey'
            columns: ['prompt_a_id']
            isOneToOne: false
            referencedRelation: 'ai_prompts'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'prompt_lab_comparisons_prompt_b_id_fkey'
            columns: ['prompt_b_id']
            isOneToOne: false
            referencedRelation: 'ai_prompts'
            referencedColumns: ['id']
          },
        ]
      }
      process_docs: {
        Row: {
          id: string
          slug: string
          title: string
          objective: string | null
          trigger_description: string | null
          inputs: string | null
          steps: Json
          decision_points: string | null
          responsible: string | null
          systems_involved: string | null
          expected_output: string | null
          kpis: string | null
          known_exceptions: string | null
          as_is_content: string | null
          to_be_content: string | null
          status: 'draft' | 'active' | 'archived'
          last_reviewed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          slug: string
          title: string
          objective?: string | null
          trigger_description?: string | null
          inputs?: string | null
          steps?: Json
          decision_points?: string | null
          responsible?: string | null
          systems_involved?: string | null
          expected_output?: string | null
          kpis?: string | null
          known_exceptions?: string | null
          as_is_content?: string | null
          to_be_content?: string | null
          status?: 'draft' | 'active' | 'archived'
          last_reviewed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['crm']['Tables']['process_docs']['Insert']>
        Relationships: []
      }
      process_feedback: {
        Row: {
          id: string
          process_id: string
          deal_id: string | null
          feedback_type: 'friction' | 'idea' | 'win' | 'bug'
          content: string
          resolved: boolean
          created_at: string
          created_by: string | null
        }
        Insert: {
          id?: string
          process_id: string
          deal_id?: string | null
          feedback_type: 'friction' | 'idea' | 'win' | 'bug'
          content: string
          resolved?: boolean
          created_at?: string
          created_by?: string | null
        }
        Update: Partial<Database['crm']['Tables']['process_feedback']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'process_feedback_process_id_fkey'
            columns: ['process_id']
            isOneToOne: false
            referencedRelation: 'process_docs'
            referencedColumns: ['id']
          },
        ]
      }
      playbooks: {
        Row: {
          id: string
          slug: string
          title: string
          type: 'playbook' | 'tutorial' | 'faq' | 'checklist' | 'script' | 'onboarding'
          content: string
          related_process_id: string | null
          version: number
          status: 'draft' | 'active' | 'archived'
          updated_at: string
        }
        Insert: {
          id?: string
          slug: string
          title: string
          type: 'playbook' | 'tutorial' | 'faq' | 'checklist' | 'script' | 'onboarding'
          content: string
          related_process_id?: string | null
          version?: number
          status?: 'draft' | 'active' | 'archived'
          updated_at?: string
        }
        Update: Partial<Database['crm']['Tables']['playbooks']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'playbooks_related_process_id_fkey'
            columns: ['related_process_id']
            isOneToOne: false
            referencedRelation: 'process_docs'
            referencedColumns: ['id']
          },
        ]
      }
      glossary_terms: {
        Row: {
          id: string
          term: string
          definition: string
          created_at: string
        }
        Insert: {
          id?: string
          term: string
          definition: string
          created_at?: string
        }
        Update: Partial<Database['crm']['Tables']['glossary_terms']['Insert']>
        Relationships: []
      }
    }
    Views: {
      v_funnel_conversion: {
        Row: {
          pipeline_id: string
          stage_id: string
          stage_name: string
          position: number
          deals_reached: number
          next_stage_deals_reached: number | null
          conversion_to_next_pct: number | null
        }
        Relationships: []
      }
      v_deal_stage_duration: {
        Row: {
          stage_id: string
          stage_name: string
          pipeline_id: string
          position: number
          transitions_out: number
          avg_days: number | null
          median_days: number | null
          max_days: number | null
        }
        Relationships: []
      }
      v_lost_reason_summary: {
        Row: {
          lost_reason_id: string
          label: string
          category: string
          deals_lost: number
          value_lost_cents: number
          pct_of_all_lost: number | null
        }
        Relationships: []
      }
      v_source_performance: {
        Row: {
          source_id: string
          source_name: string
          total_deals: number
          won_deals: number
          lost_deals: number
          win_rate_pct: number | null
          avg_won_value_cents: number | null
          total_won_value_cents: number
          avg_qualification_score: number | null
        }
        Relationships: []
      }
      v_followup_health: {
        Row: {
          deal_id: string
          title: string
          company_id: string | null
          value_cents: number
          health_status: 'overdue' | 'due_soon' | 'no_next_action' | 'healthy'
        }
        Relationships: []
      }
      v_ai_quality_summary: {
        Row: {
          slug: string
          version: number
          prompt_id: string
          total_runs: number
          error_runs: number
          applied_runs: number
          acceptance_pct: number | null
          avg_rating: number | null
          avg_latency_ms: number | null
        }
        Relationships: []
      }
    }
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

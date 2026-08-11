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
    }
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

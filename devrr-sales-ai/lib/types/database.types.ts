// Tipos do schema `sales`, escritos à mão a partir de
// supabase/migrations/0001_schema_and_helpers.sql, 0002_organizations.sql,
// 0004_catalogs.sql e 0005_contacts_leads.sql (tarefas 2.1, 2.2, 3.1 e 3.2).
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
    }
    Views: Record<string, never>
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

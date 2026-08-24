// Tipos do schema `sales`, escritos à mão a partir de
// supabase/migrations/0001_schema_and_helpers.sql e 0002_organizations.sql
// (tarefas 2.1 e 2.2).
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

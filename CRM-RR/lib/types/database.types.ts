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
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

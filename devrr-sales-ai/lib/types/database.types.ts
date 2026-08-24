// Tipos do schema `sales`, escritos à mão a partir de
// supabase/migrations/0001_schema_and_helpers.sql (tarefa 2.1).
//
// `sales` já está em Settings → API → Exposed schemas (confirmado batendo
// direto no PostgREST: erro de "tabela não encontrada", não de "schema
// inválido" — a lista de exposed schemas do projeto inclui `sales`). O que
// não funciona é a ferramenta MCP `generate_typescript_types` desta sessão,
// que só introspecta `public` — nem o schema `crm` do CRM-RR aparece nela,
// apesar de exposto e em produção. Limitação da ferramenta, não do projeto.
// Até haver outro meio de gerar (Supabase CLI local, por exemplo), este
// arquivo é mantido em sincronia manual com as migrations; ver DATABASE.md.
//
// `Tables`/`Views`/`Functions`/`CompositeTypes` seguem `Record<string, never>`
// porque a migration 0001 só cria schema, enums e as duas funções helper —
// nenhuma tabela, view ou RPC pública ainda (chegam na 0002+). Índice com
// `never` satisfaz estruturalmente o shape `Record<string, GenericTable>` que
// @supabase/ssr espera.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  sales: {
    Tables: Record<string, never>
    Views: Record<string, never>
    Functions: Record<string, never>
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

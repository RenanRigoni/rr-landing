// Placeholder — schema `sales` ainda não existe no Supabase (criado na
// migration 0001, tarefa 2.1). Tipos reais são gerados a partir daí e
// mantidos em sincronia manual com supabase/migrations/*.sql; ver
// docs/DATABASE.md. `Record<string, never>` é estruturalmente compatível
// com o shape `Record<string, GenericTable>` que @supabase/ssr espera
// (index signature com `never` satisfaz qualquer tipo de valor).

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  sales: {
    Tables: Record<string, never>
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

import { differenceInCalendarDays } from 'date-fns'
import { formatRelativeDateBR } from '@/lib/domain/date'
import { formatBRL } from '@/lib/domain/money'

/**
 * Monta as 9 variáveis do prompt `followup_proposta`
 * (docs/IMPLEMENTATION_PLAN.md → 5.2/5.3) a partir de dados já carregados do
 * banco. Puro — zero import de `supabase`/`next`/`ai`, 100% testável com
 * vitest. Quem busca as linhas (sempre com o filtro `org_id`) e chama esta
 * função é `lib/queries/ai-context.ts`.
 *
 * Regras de produto aplicadas aqui (`PRODUCT_SPEC.md` → regra 1: "Se ela não
 * tem o dado, ela declara que não tem — não estima"):
 *
 * - `valor` só entra formatado quando `value_cents > 0`; senão vira o sentinel
 *   `MISSING`. Nunca manda "R$ 0,00" (`IMPLEMENTATION_PLAN.md` → 5.3) e o
 *   `user_prompt_template` do seed 0010 tem a linha fixa `Valor: {{valor}}` —
 *   com `MISSING` ela renderiza `Valor: não informado`, nunca `Valor:` vazio.
 * - Todo campo opcional ausente vira `MISSING` explícito — o `system_prompt`
 *   do seed instrui a IA a não mencionar o que está marcado assim. Não se
 *   inventa valor no lugar.
 * - `historico_resumido` sem atividades vira `EMPTY_HISTORY`.
 *
 * O contrato de saída (`FollowupContextVars`) é exatamente as 9 chaves que o
 * `user_prompt_template` do seed 0010 referencia — nem uma a mais, nem a
 * menos. Mudar aqui sem mudar o template (ou vice-versa) é drift.
 */

/** Sentinel para campo opcional ausente. Explícito de propósito — ver header. */
export const MISSING = 'não informado'
/** Sentinel para lead sem nenhuma atividade registrada. */
export const EMPTY_HISTORY = 'sem histórico registrado'
/** Teto de itens no resumo de histórico (IMPLEMENTATION_PLAN.md → 5.3: "últimas 5"). */
export const MAX_HISTORY_ITEMS = 5

export interface FollowupContextActivity {
  title: string
  status: 'pending' | 'done' | 'cancelled'
  due_at: string | null
  done_at: string | null
  created_at: string
  is_auto: boolean
  step_number: number | null
}

export interface BuildFollowupVarsInput {
  empresa: string
  contatoNome: string
  leadTitulo: string
  interesse: string | null
  valueCents: number
  lastContactAt: string | null
  estagio: string
  /** Atividades do lead, mais recentes primeiro. Já filtradas por org na query. */
  activities: FollowupContextActivity[]
  /** Instante de referência — parâmetro só existe para determinismo em teste. */
  now?: Date
}

/**
 * As 9 chaves que o `user_prompt_template` do seed 0010 referencia. Exportada
 * para o teste de contrato (`tests/domain/ai-context.test.ts`) que trava o
 * conjunto — divergir daqui sem mexer no template (ou vice-versa) é drift.
 * `buildFollowupVars` devolve `Record<string, string>`, que é o que
 * `runAiPrompt` espera em `vars`.
 */
export const FOLLOWUP_VAR_KEYS = [
  'empresa',
  'contato_nome',
  'lead_titulo',
  'interesse',
  'valor',
  'dias_desde_ultimo_contato',
  'estagio',
  'passo_followup',
  'historico_resumido',
] as const

/**
 * Passo de follow-up "corrente" do lead: o menor `step_number` entre as
 * atividades automáticas ainda pendentes — a próxima que o sistema vai
 * cobrar, que é justamente a mensagem que a IA vai escrever. Sem nenhuma
 * pendente automática (lead que respondeu e teve tudo cancelado, ou lead
 * fora de um estágio com cadência) cai em `1` — o passo de menor pressão
 * ("lembrete leve", ver `system_prompt` do seed 0010). Comportamento
 * explícito, não chute: a intenção default é a mais conservadora.
 */
export function resolveFollowupStep(activities: FollowupContextActivity[]): number {
  const pendingAutoSteps = activities
    .filter((activity) => activity.status === 'pending' && activity.is_auto && activity.step_number !== null)
    .map((activity) => activity.step_number as number)

  return pendingAutoSteps.length > 0 ? Math.min(...pendingAutoSteps) : 1
}

function summarizeActivities(activities: FollowupContextActivity[], now: Date): string {
  if (activities.length === 0) {
    return EMPTY_HISTORY
  }

  return activities
    .slice(0, MAX_HISTORY_ITEMS)
    .map((activity) => {
      const stamp = activity.done_at ?? activity.due_at ?? activity.created_at
      const when = formatRelativeDateBR(stamp, now)
      const suffix = activity.status === 'pending' ? ' [pendente]' : activity.status === 'cancelled' ? ' [cancelada]' : ''
      return `- ${when}: ${activity.title}${suffix}`
    })
    .join('\n')
}

function daysSinceLastContact(lastContactAt: string | null, now: Date): string {
  if (!lastContactAt) {
    return MISSING
  }

  const diff = differenceInCalendarDays(now, new Date(lastContactAt))
  // `last_contact_at` é cache de `max(activities.done_at)` (D-006). Um
  // `done_at` no futuro (agendamento marcado como feito adiantado) não deve
  // virar dia negativo no prompt — trava em 0 ("hoje").
  return String(diff < 0 ? 0 : diff)
}

export function buildFollowupVars(input: BuildFollowupVarsInput): Record<string, string> {
  const now = input.now ?? new Date()
  const interesse = input.interesse?.trim()

  const vars: Record<string, string> = {
    empresa: input.empresa,
    contato_nome: input.contatoNome,
    lead_titulo: input.leadTitulo,
    interesse: interesse && interesse.length > 0 ? interesse : MISSING,
    valor: input.valueCents > 0 ? formatBRL(input.valueCents) : MISSING,
    dias_desde_ultimo_contato: daysSinceLastContact(input.lastContactAt, now),
    estagio: input.estagio,
    passo_followup: String(resolveFollowupStep(input.activities)),
    historico_resumido: summarizeActivities(input.activities, now),
  }

  return vars
}

import { z } from 'zod'

/**
 * Schema de saída estruturada dos prompts de IA (`Output.object({ schema })`
 * em lib/ai/gateway.ts). Não portado do CRM-RR: o schemas.ts de lá é
 * qualificação de deal B2B, fora do escopo de IA do MVP — cada schema nasce
 * na tarefa que precisa dele (DECISIONS.md D-028).
 */

/**
 * `followup_proposta` (tarefa 5.2). `reasoning` é para o usuário entender a
 * escolha da IA — nunca é enviado ao cliente.
 */
export const followupPropostaOutputSchema = z.object({
  message: z.string(),
  tone: z.enum(['direto', 'consultivo', 'leve']),
  reasoning: z.string(),
})

export type FollowupPropostaOutput = z.infer<typeof followupPropostaOutputSchema>

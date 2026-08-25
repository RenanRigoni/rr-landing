import { z } from 'zod'
import { optionalUuid } from '@/lib/validation/leads'

const optionalText = z
  .string()
  .trim()
  .transform((value) => (value === '' ? null : value))
  .nullable()
  .optional()

export const activityTypeEnum = z.enum(['note', 'call', 'whatsapp', 'email', 'meeting', 'task', 'followup', 'proposal_sent'])

// is_auto, rule_id, step_number, ai_run_id, org_id, created_by, status e
// done_at nunca fazem parte deste schema — nunca são entrada direta de
// usuário (mass assignment: um cliente enviando is_auto=true/rule_id
// arbitrário poderia se passar por um follow-up automático, driblando a
// semântica de cancelamento em massa de D-005/DATABASE.md). status/done_at
// são derivados de due_at estar presente ou não (docs/DATABASE.md →
// sales.activities: "due_at is null → histórico; due_at + pending →
// agendado"); is_auto/rule_id/step_number só existem no caminho de geração
// automática (lib/actions/leads-core.ts → moveStageCore), nunca no de
// criação manual por usuário.
export const createActivitySchema = z.object({
  lead_id: z.string().uuid('Lead inválido'),
  contact_id: optionalUuid,
  type: activityTypeEnum,
  title: z.string().trim().min(1, 'Título é obrigatório').max(200, 'Título muito longo'),
  body: optionalText,
  due_at: z.coerce.date().nullable().optional(),
})

export type CreateActivityInput = z.infer<typeof createActivitySchema>

export const rescheduleActivitySchema = z.object({
  due_at: z.coerce.date(),
})

export const completeActivitySchema = z.object({
  done_at: z.coerce.date().optional(),
})

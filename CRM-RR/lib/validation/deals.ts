import { z } from 'zod'

export const createDealSchema = z.object({
  title: z.string().trim().min(1, 'Título é obrigatório'),
  company_id: z.string().uuid().nullable().optional().or(z.literal('').transform(() => null)),
  primary_contact_id: z.string().uuid().nullable().optional().or(z.literal('').transform(() => null)),
  pipeline_id: z.string().uuid(),
  stage_id: z.string().uuid(),
  value_cents: z.coerce.number().int().min(0).default(0),
  source_id: z.string().uuid().nullable().optional().or(z.literal('').transform(() => null)),
  expected_close_date: z
    .string()
    .nullable()
    .optional()
    .or(z.literal('').transform(() => null)),
})

export type CreateDealInput = z.infer<typeof createDealSchema>

export const moveDealStageSchema = z.object({
  stage_id: z.string().uuid(),
  lost_reason_id: z.string().uuid().nullable().optional().or(z.literal('').transform(() => null)),
  lost_reason_notes: z
    .string()
    .trim()
    .nullable()
    .optional()
    .or(z.literal('').transform(() => null)),
})

export type MoveDealStageInput = z.infer<typeof moveDealStageSchema>

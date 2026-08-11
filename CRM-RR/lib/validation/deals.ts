import { z } from 'zod'

const optionalText = z
  .string()
  .trim()
  .transform((v) => (v === '' ? null : v))
  .nullable()
  .optional()

const optionalUuid = z
  .string()
  .trim()
  .transform((v) => (v === '' ? null : v))
  .nullable()
  .optional()
  .refine((v) => v === null || v === undefined || z.string().uuid().safeParse(v).success, {
    message: 'Id inválido',
  })

export const createDealSchema = z.object({
  title: z.string().trim().min(1, 'Título é obrigatório'),
  company_id: optionalUuid,
  primary_contact_id: optionalUuid,
  pipeline_id: z.string().uuid(),
  stage_id: z.string().uuid(),
  value_cents: z.coerce.number().int().min(0).default(0),
  source_id: optionalUuid,
  expected_close_date: optionalText,
})

export type CreateDealInput = z.infer<typeof createDealSchema>

export const moveDealStageSchema = z.object({
  stage_id: z.string().uuid(),
  lost_reason_id: optionalUuid,
  lost_reason_notes: optionalText,
})

export type MoveDealStageInput = z.infer<typeof moveDealStageSchema>

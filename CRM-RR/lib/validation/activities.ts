import { z } from 'zod'

export const createActivitySchema = z.object({
  deal_id: z.string().uuid(),
  type: z.enum(['call', 'email', 'whatsapp', 'meeting', 'note', 'task', 'linkedin']),
  subject: z.string().trim().min(1, 'Assunto é obrigatório'),
  notes: z
    .string()
    .trim()
    .nullable()
    .optional()
    .or(z.literal('').transform(() => null)),
  due_at: z
    .string()
    .nullable()
    .optional()
    .or(z.literal('').transform(() => null)),
})

export type CreateActivityInput = z.infer<typeof createActivitySchema>

export const completeActivitySchema = z.object({
  outcome: z
    .string()
    .trim()
    .nullable()
    .optional()
    .or(z.literal('').transform(() => null)),
})

import { z } from 'zod'

export const criterionEntrySchema = z.object({
  score: z.coerce.number().int().min(0).max(5),
  rationale: z.string().trim().min(1, 'Justificativa é obrigatória para cada critério pontuado'),
})

export type CriterionEntryInput = z.infer<typeof criterionEntrySchema>

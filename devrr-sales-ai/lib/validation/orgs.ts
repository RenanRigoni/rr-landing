import { z } from 'zod'

export const createOrganizationSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Nome da organização precisa ter pelo menos 2 caracteres')
    .max(120, 'Nome da organização muito longo'),
})

export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>

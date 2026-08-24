import { z } from 'zod'

const optionalText = z
  .string()
  .trim()
  .transform((value) => (value === '' ? null : value))
  .nullable()
  .optional()

// org_id nunca faz parte do schema — vem sempre de requireOrgId() no
// servidor (lib/actions/, tarefa 3.4), nunca do cliente. Mesmo motivo:
// is_demo e created_by são resolvidos pelo servidor, não input de usuário.
export const createContactSchema = z.object({
  full_name: z.string().trim().min(1, 'Nome é obrigatório').max(200, 'Nome muito longo'),
  phone: optionalText,
  email: z
    .string()
    .trim()
    .email('E-mail inválido')
    .nullable()
    .optional()
    .or(z.literal('').transform(() => null)),
  company_name: optionalText,
  city: optionalText,
  notes: optionalText,
})

export type CreateContactInput = z.infer<typeof createContactSchema>

export const updateContactSchema = createContactSchema.partial()

export type UpdateContactInput = z.infer<typeof updateContactSchema>

import { z } from 'zod'

const optionalText = z
  .string()
  .trim()
  .transform((v) => (v === '' ? null : v))
  .nullable()
  .optional()

export const contactSchema = z.object({
  full_name: z.string().trim().min(1, 'Nome é obrigatório'),
  email: z
    .string()
    .trim()
    .email('E-mail inválido')
    .nullable()
    .optional()
    .or(z.literal('').transform(() => null)),
  phone: optionalText,
  role_title: optionalText,
  company_id: z
    .string()
    .uuid()
    .nullable()
    .optional()
    .or(z.literal('').transform(() => null)),
  linkedin_url: optionalText,
  notes: optionalText,
})

export type ContactInput = z.infer<typeof contactSchema>

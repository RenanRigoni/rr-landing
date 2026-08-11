import { z } from 'zod'

const optionalText = z
  .string()
  .trim()
  .transform((v) => (v === '' ? null : v))
  .nullable()
  .optional()

export const companySchema = z.object({
  company_name: z.string().trim().min(1, 'Nome da empresa é obrigatório'),
  website: optionalText,
  industry: optionalText,
  company_size: optionalText,
  city: optionalText,
  state: optionalText,
  country: optionalText,
  estimated_revenue_range: optionalText,
  acquisition_source_id: z
    .string()
    .uuid()
    .nullable()
    .optional()
    .or(z.literal('').transform(() => null)),
  icp_fit: z.enum(['poor', 'partial', 'strong']).nullable().optional().or(z.literal('').transform(() => null)),
  notes: optionalText,
})

export type CompanyInput = z.infer<typeof companySchema>

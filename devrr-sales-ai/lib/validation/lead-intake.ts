import { z } from 'zod'
import { createContactSchema } from '@/lib/validation/contacts'
import { createLeadSchema, optionalUuid } from '@/lib/validation/leads'

// Formulário único de cadastro (tarefa 3.6): reaproveita campo a campo os
// schemas já validados de contacts/leads, sem duplicar nenhuma regra.
// `value_reais` é próprio deste formulário — o usuário digita em reais, não
// em centavos (createLeadSchema.value_cents espera a unidade de
// armazenamento já convertida); a conversão fica em lib/domain/money.ts
// (reaisToCents), aplicada no core, não aqui.
// `contact_id`/`force_new_contact` só existem neste fluxo: decidem se o
// cadastro vincula a um contato já existente (telefone bateu) ou cria um
// novo mesmo assim — nunca campos de createContactSchema/createLeadSchema.
export const leadIntakeSchema = z.object({
  full_name: createContactSchema.shape.full_name,
  phone: createContactSchema.shape.phone,
  email: createContactSchema.shape.email,
  company_name: createContactSchema.shape.company_name,
  title: createLeadSchema.shape.title,
  interest: createLeadSchema.shape.interest,
  source_id: createLeadSchema.shape.source_id,
  value_reais: z.coerce.number().min(0, 'Valor não pode ser negativo').optional().default(0),
  notes: createLeadSchema.shape.notes,
  contact_id: optionalUuid,
  force_new_contact: z
    .union([z.literal('true'), z.literal('false'), z.boolean()])
    .optional()
    .transform((value) => value === true || value === 'true'),
})

export type LeadIntakeInput = z.infer<typeof leadIntakeSchema>

import { z } from 'zod'

const optionalText = z
  .string()
  .trim()
  .transform((value) => (value === '' ? null : value))
  .nullable()
  .optional()

const optionalUuid = z
  .string()
  .trim()
  .transform((value) => (value === '' ? null : value))
  .nullable()
  .optional()
  .refine((value) => value === null || value === undefined || z.string().uuid().safeParse(value).success, {
    message: 'Id inválido',
  })

// org_id nunca faz parte do schema — vem sempre de requireOrgId() no
// servidor (lib/actions/, tarefa 3.4). Mesmo motivo: status, last_contact_at,
// next_action_at, responded_at, closed_at, is_demo e created_by não são
// input direto de usuário — status/closed_at nascem da transição de estágio
// (is_won/is_lost de pipeline_stages) e os demais são cache mantido pela
// camada de actions (D-006), não campo de formulário.
export const createLeadSchema = z.object({
  contact_id: z.string().uuid('Contato inválido'),
  title: z.string().trim().min(1, 'Título é obrigatório').max(200, 'Título muito longo'),
  interest: optionalText,
  source_id: optionalUuid,
  stage_id: z.string().uuid('Estágio inválido'),
  temperature: z.enum(['cold', 'warm', 'hot']).nullable().optional(),
  value_cents: z.coerce
    .number()
    .int('Valor precisa ser um número inteiro de centavos')
    .min(0, 'Valor não pode ser negativo')
    .default(0),
  currency: z.string().trim().length(3, 'Moeda precisa ter 3 letras (ex.: BRL)').default('BRL'),
  lost_reason: optionalText,
  notes: optionalText,
})

export type CreateLeadInput = z.infer<typeof createLeadSchema>

// stage_id sai do schema de update: mudar o estágio é responsabilidade da
// action dedicada moveStage(leadId, stageId) (tarefa 3.4), que também grava a
// activity da mudança. Se updateLead aceitasse stage_id também, existiriam
// dois caminhos para a mesma mudança e um deles pularia esse registro.
export const updateLeadSchema = createLeadSchema.omit({ stage_id: true }).partial()

export type UpdateLeadInput = z.infer<typeof updateLeadSchema>

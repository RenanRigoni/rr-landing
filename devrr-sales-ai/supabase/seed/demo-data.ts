/**
 * Geradores puros dos dados de demonstração (tarefa 6.1). Zero I/O: recebem
 * ids já resolvidos + um `now` de referência e devolvem as linhas prontas
 * para inserção. `run.ts` é quem fala com o banco; os testes
 * (`tests/seed/demo-data.test.ts`) exercitam só este arquivo.
 *
 * Todas as linhas transacionais entram com `is_demo = true` — o `org_id` e a
 * flag são injetados por `run.ts`, uniformes, para manter os geradores
 * triviais de testar.
 */

export const DEMO_ORG = { name: 'DevRR Demo', slug: 'devrr-demo' } as const

export const DEMO_STAGE_KEYS = [
  'novo',
  'contatado',
  'qualificado',
  'proposta_enviada',
  'negociacao',
  'ganho',
  'perdido',
] as const
export type DemoStageKey = (typeof DEMO_STAGE_KEYS)[number]

type ActivityType =
  | 'note'
  | 'call'
  | 'whatsapp'
  | 'email'
  | 'meeting'
  | 'task'
  | 'followup'
  | 'proposal_sent'

// --- Contatos ---------------------------------------------------------------

export interface DemoContactSeed {
  full_name: string
  phone: string
  email: string | null
  company_name: string | null
  city: string | null
  notes: string | null
}

const CONTACT_SEEDS: readonly DemoContactSeed[] = [
  { full_name: 'Ana Beatriz Moraes', phone: '+5511998010203', email: 'ana.moraes@exemplo.com.br', company_name: 'Ateliê Moraes', city: 'São Paulo', notes: 'Chegou por indicação da arquiteta.' },
  { full_name: 'Carlos Eduardo Lima', phone: '+5521997020304', email: 'cadu.lima@exemplo.com.br', company_name: 'Lima Refrigeração', city: 'Rio de Janeiro', notes: null },
  { full_name: 'Daniela Prado', phone: '+5531996030405', email: 'daniela@pradoconsult.com.br', company_name: 'Prado Consultoria', city: 'Belo Horizonte', notes: 'Prefere contato por WhatsApp à tarde.' },
  { full_name: 'Eduardo Nunes', phone: '+5541995040506', email: null, company_name: 'Marcenaria Nunes', city: 'Curitiba', notes: 'Orçamento de móveis planejados.' },
  { full_name: 'Fernanda Rocha', phone: '+5551994050607', email: 'fernanda.rocha@exemplo.com.br', company_name: null, city: 'Porto Alegre', notes: null },
  { full_name: 'Gabriel Teixeira', phone: '+5561993060708', email: 'gabriel.teixeira@exemplo.com.br', company_name: 'GT Serviços', city: 'Brasília', notes: 'Pediu proposta detalhada por e-mail.' },
  { full_name: 'Helena Castro', phone: '+5585992070809', email: 'helena@castrodesign.com.br', company_name: 'Castro Design', city: 'Fortaleza', notes: null },
  { full_name: 'Igor Almeida', phone: '+5571991080910', email: null, company_name: null, city: 'Salvador', notes: 'Lead frio, respondeu anúncio antigo.' },
  { full_name: 'Juliana Ferreira', phone: '+5548990091011', email: 'juliana.ferreira@exemplo.com.br', company_name: 'Ferreira & Filhos', city: 'Florianópolis', notes: null },
  { full_name: 'Leonardo Barros', phone: '+5511989101112', email: 'leo.barros@exemplo.com.br', company_name: 'Barros Engenharia', city: 'Campinas', notes: 'Reunião presencial agendada uma vez, remarcou.' },
  { full_name: 'Marina Souza', phone: '+5527988111213', email: 'marina.souza@exemplo.com.br', company_name: null, city: 'Vitória', notes: null },
  { full_name: 'Otávio Mendes', phone: '+5562987121314', email: 'otavio.mendes@exemplo.com.br', company_name: 'Mendes Comunicação', city: 'Goiânia', notes: 'Fechou projeto anterior, recompra.' },
]

export const DEMO_CONTACT_COUNT = CONTACT_SEEDS.length

/** Devolve as 12 linhas de contato na ordem estável de `ids`. */
export function buildDemoContacts(ids: readonly string[]): Array<DemoContactSeed & { id: string }> {
  assertLength('contatos', ids.length, DEMO_CONTACT_COUNT)
  return CONTACT_SEEDS.map((seed, index) => ({ id: ids[index]!, ...seed }))
}

// --- Leads ----------------------------------------------------------------

interface DemoLeadPlanItem {
  contactIndex: number
  title: string
  interest: string
  stageKey: DemoStageKey
  valueCents: number
  temperature: 'cold' | 'warm' | 'hot' | null
  /** Dias atrás do último contato registrado; `null` = nunca contatado. */
  lastContactDaysAgo: number | null
}

// 18 leads espalhados pelos 7 estágios (novo×3, contatado×3, qualificado×3,
// proposta_enviada×4, negociacao×2, ganho×2, perdido×1). Alguns sem valor
// (value_cents = 0 — PRODUCT_SPEC #1: sem preço a IA não fala de preço).
const LEAD_PLAN: readonly DemoLeadPlanItem[] = [
  { contactIndex: 0, title: 'Identidade visual para ateliê', interest: 'Branding', stageKey: 'novo', valueCents: 0, temperature: 'warm', lastContactDaysAgo: null },
  { contactIndex: 4, title: 'Site institucional', interest: 'Website', stageKey: 'novo', valueCents: 0, temperature: 'cold', lastContactDaysAgo: null },
  { contactIndex: 7, title: 'Landing page de campanha', interest: 'Landing page', stageKey: 'novo', valueCents: 320000, temperature: 'cold', lastContactDaysAgo: 12 },
  { contactIndex: 1, title: 'Sistema de ordens de serviço', interest: 'Software sob medida', stageKey: 'contatado', valueCents: 1450000, temperature: 'warm', lastContactDaysAgo: 3 },
  { contactIndex: 2, title: 'Portal do cliente', interest: 'Software sob medida', stageKey: 'contatado', valueCents: 0, temperature: 'warm', lastContactDaysAgo: 5 },
  { contactIndex: 10, title: 'Loja virtual', interest: 'E-commerce', stageKey: 'contatado', valueCents: 890000, temperature: 'hot', lastContactDaysAgo: 2 },
  { contactIndex: 3, title: 'Catálogo digital de móveis', interest: 'Website', stageKey: 'qualificado', valueCents: 540000, temperature: 'warm', lastContactDaysAgo: 6 },
  { contactIndex: 6, title: 'Rebranding completo', interest: 'Branding', stageKey: 'qualificado', valueCents: 760000, temperature: 'hot', lastContactDaysAgo: 4 },
  { contactIndex: 8, title: 'App de agendamento', interest: 'Aplicativo', stageKey: 'qualificado', valueCents: 0, temperature: 'warm', lastContactDaysAgo: 8 },
  { contactIndex: 5, title: 'Plataforma de serviços', interest: 'Software sob medida', stageKey: 'proposta_enviada', valueCents: 2100000, temperature: 'hot', lastContactDaysAgo: 1 },
  { contactIndex: 9, title: 'Dashboard de obras', interest: 'Software sob medida', stageKey: 'proposta_enviada', valueCents: 1780000, temperature: 'warm', lastContactDaysAgo: 4 },
  { contactIndex: 11, title: 'Campanha e site de lançamento', interest: 'Website', stageKey: 'proposta_enviada', valueCents: 640000, temperature: 'hot', lastContactDaysAgo: 2 },
  { contactIndex: 2, title: 'Automação de propostas', interest: 'Automação', stageKey: 'proposta_enviada', valueCents: 430000, temperature: 'warm', lastContactDaysAgo: 9 },
  { contactIndex: 6, title: 'Sistema de reservas', interest: 'Software sob medida', stageKey: 'negociacao', valueCents: 1990000, temperature: 'hot', lastContactDaysAgo: 1 },
  { contactIndex: 10, title: 'Integração com ERP', interest: 'Integração', stageKey: 'negociacao', valueCents: 1260000, temperature: 'warm', lastContactDaysAgo: 3 },
  { contactIndex: 11, title: 'Site + identidade (projeto 2025)', interest: 'Website', stageKey: 'ganho', valueCents: 720000, temperature: null, lastContactDaysAgo: 20 },
  { contactIndex: 3, title: 'Landing de pré-venda', interest: 'Landing page', stageKey: 'ganho', valueCents: 280000, temperature: null, lastContactDaysAgo: 34 },
  { contactIndex: 8, title: 'App de fidelidade', interest: 'Aplicativo', stageKey: 'perdido', valueCents: 0, temperature: null, lastContactDaysAgo: 45 },
]

export const DEMO_LEAD_COUNT = LEAD_PLAN.length

export interface DemoLeadRow {
  id: string
  contact_id: string
  title: string
  interest: string
  stage_id: string
  status: 'open' | 'won' | 'lost'
  temperature: 'cold' | 'warm' | 'hot' | null
  value_cents: number
  currency: 'BRL'
  last_contact_at: string | null
  closed_at: string | null
  /** Chave do estágio — não vai pro banco, `run.ts` usa para montar atividades. */
  stageKey: DemoStageKey
}

export interface BuildDemoLeadsInput {
  ids: readonly string[]
  contactIds: readonly string[]
  stageIdByKey: Readonly<Record<DemoStageKey, string>>
  now: Date
}

export function buildDemoLeads(input: BuildDemoLeadsInput): DemoLeadRow[] {
  assertLength('leads', input.ids.length, DEMO_LEAD_COUNT)
  assertLength('contatos (referência dos leads)', input.contactIds.length, DEMO_CONTACT_COUNT)

  return LEAD_PLAN.map((item, index) => {
    const status: DemoLeadRow['status'] =
      item.stageKey === 'ganho' ? 'won' : item.stageKey === 'perdido' ? 'lost' : 'open'
    const lastContactAt =
      item.lastContactDaysAgo === null ? null : daysFromNow(input.now, -item.lastContactDaysAgo)
    const closedAt = status === 'open' ? null : (lastContactAt ?? daysFromNow(input.now, -14))

    return {
      id: input.ids[index]!,
      contact_id: input.contactIds[item.contactIndex]!,
      title: item.title,
      interest: item.interest,
      stage_id: input.stageIdByKey[item.stageKey],
      status,
      temperature: item.temperature,
      value_cents: item.valueCents,
      currency: 'BRL',
      last_contact_at: lastContactAt,
      closed_at: closedAt,
      stageKey: item.stageKey,
    }
  })
}

// --- Atividades ---------------------------------------------------------------

export interface DemoActivityRow {
  lead_id: string
  contact_id: string | null
  type: ActivityType
  title: string
  body: string | null
  status: 'pending' | 'done' | 'cancelled'
  due_at: string | null
  done_at: string | null
  is_auto: boolean
  rule_id: null
  step_number: number | null
}

export interface BuildDemoActivitiesInput {
  leads: ReadonlyArray<{
    id: string
    contactId: string | null
    status: 'open' | 'won' | 'lost'
    stageKey: DemoStageKey
  }>
  now: Date
}

/**
 * Para cada lead: 1–2 registros de histórico (`due_at` nulo, `done`), e — nos
 * leads abertos — uma pendência com `due_at`. As pendências se distribuem por
 * `index % 3` em atrasada / hoje / futura, para a tela "Ações de hoje" ter os
 * três casos. Leads em `proposta_enviada` / `negociacao` recebem a pendência
 * como follow-up automático (`is_auto = true`, com `step_number`); os demais,
 * como tarefa manual.
 */
export function buildDemoActivities(input: BuildDemoActivitiesInput): DemoActivityRow[] {
  const rows: DemoActivityRow[] = []

  input.leads.forEach((lead, index) => {
    const historyRotation = ['whatsapp', 'call', 'note', 'meeting'] as const
    const historyType: ActivityType = historyRotation[index % historyRotation.length]!
    rows.push({
      lead_id: lead.id,
      contact_id: lead.contactId,
      type: historyType,
      title: historyLabel(historyType),
      body: null,
      status: 'done',
      due_at: null,
      done_at: daysFromNow(input.now, -(3 + (index % 9))),
      is_auto: false,
      rule_id: null,
      step_number: null,
    })

    if (index % 4 === 0) {
      rows.push({
        lead_id: lead.id,
        contact_id: lead.contactId,
        type: 'email',
        title: 'Enviei materiais por e-mail',
        body: null,
        status: 'done',
        due_at: null,
        done_at: daysFromNow(input.now, -(1 + (index % 5))),
        is_auto: false,
        rule_id: null,
        step_number: null,
      })
    }

    if (lead.status !== 'open') {
      rows.push({
        lead_id: lead.id,
        contact_id: lead.contactId,
        type: lead.status === 'won' ? 'proposal_sent' : 'note',
        title: lead.status === 'won' ? 'Proposta aceita' : 'Lead encerrado',
        body: null,
        status: 'done',
        due_at: null,
        done_at: daysFromNow(input.now, -(10 + index)),
        is_auto: false,
        rule_id: null,
        step_number: null,
      })
      return
    }

    const isFollowup = lead.stageKey === 'proposta_enviada' || lead.stageKey === 'negociacao'
    const bucket = index % 3
    const dueAt =
      bucket === 0
        ? daysFromNow(input.now, -(2 + (index % 7))) // atrasada
        : bucket === 1
          ? hoursFromNow(input.now, 3 + (index % 6)) // ainda hoje
          : daysFromNow(input.now, 1 + (index % 12)) // futura

    rows.push({
      lead_id: lead.id,
      contact_id: lead.contactId,
      type: isFollowup ? 'followup' : 'task',
      title: isFollowup ? 'Follow-up da proposta' : 'Retornar contato',
      body: null,
      status: 'pending',
      due_at: dueAt,
      done_at: null,
      is_auto: isFollowup,
      rule_id: null,
      step_number: isFollowup ? 1 + (index % 3) : null,
    })
  })

  return rows
}

// --- utils ----------------------------------------------------------------

function historyLabel(type: ActivityType): string {
  switch (type) {
    case 'whatsapp':
      return 'Conversa no WhatsApp'
    case 'call':
      return 'Ligação de retorno'
    case 'meeting':
      return 'Reunião de descoberta'
    default:
      return 'Anotação sobre o lead'
  }
}

function daysFromNow(now: Date, days: number): string {
  return new Date(now.getTime() + days * 24 * 60 * 60 * 1000).toISOString()
}

function hoursFromNow(now: Date, hours: number): string {
  return new Date(now.getTime() + hours * 60 * 60 * 1000).toISOString()
}

function assertLength(what: string, got: number, expected: number): void {
  if (got !== expected) {
    throw new Error(`Seed de demonstração: esperava ${expected} ${what}, recebi ${got}.`)
  }
}

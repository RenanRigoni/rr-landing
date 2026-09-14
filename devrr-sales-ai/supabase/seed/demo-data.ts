/**
 * Geradores puros dos dados de demonstração (6.1, ampliado para a demo
 * comercial). Zero I/O: recebem `now`, uma fábrica de ids e os mapas de
 * catálogo já resolvidos, e devolvem as linhas prontas para inserção.
 * `run.ts` é quem fala com o banco; os testes
 * (`tests/seed/demo-data.test.ts`) exercitam só esta camada.
 *
 * Conteúdo: ~100 empresas reais de Uberlândia e Patrocínio prospectadas nos
 * nichos da DevRR (`demo-companies.ts`) + os clientes reais fechados
 * (`demo-clients.ts`). Pessoas de contato, telefones e e-mails são
 * fictícios. Datas relativas a `now` — rodar o seed de novo "rejuvenesce" o
 * funil (pendências de hoje continuam sendo de hoje).
 *
 * `org_id` e `is_demo` (contacts/leads/activities) são injetados por
 * `run.ts`. `leads.next_action_at`/`last_contact_at` saem dos mesmos helpers
 * de domínio que a aplicação e a reconciliação usam (D-006, 6.3).
 */

import { resolveLastContact, resolveNextAction } from '../../lib/domain/followup'
import { reaisToCents } from '../../lib/domain/money'
import { buildDemoAudit, type DemoAuditRow } from './demo-audits'
import { buildClientDrafts, CLIENT_KEYS } from './demo-clients'
import { buildProspectDrafts } from './demo-prospects'
import { createRng } from './demo-random'
import {
  createClock,
  type ActivityType,
  type DemoPerson,
  type DemoSourceName,
  type DemoStageKey,
  type FollowupStep,
  type LeadDraft,
} from './demo-timeline'

export { DEMO_SOURCE_NAMES, DEMO_STAGE_KEYS, PROSPECTING_SOURCE } from './demo-timeline'
export type { DemoSourceName, DemoStageKey } from './demo-timeline'
export type { DemoAuditRow } from './demo-audits'

export const DEMO_ORG = { name: 'DevRR Demo', slug: 'devrr-demo' } as const

const FUNNEL_SEED = 20260914
const AUDIT_SEED = 20260915

// --- Pessoas de contato (fictícias) ---------------------------------------------

const FIRST_NAMES: ReadonlyArray<readonly [string, 'f' | 'm']> = [
  ['Ana Paula', 'f'], ['André', 'm'], ['Beatriz', 'f'], ['Bruno', 'm'], ['Camila', 'f'],
  ['Carlos', 'm'], ['Daniela', 'f'], ['Diego', 'm'], ['Fernanda', 'f'], ['Eduardo', 'm'],
  ['Gabriela', 'f'], ['Felipe', 'm'], ['Juliana', 'f'], ['Gustavo', 'm'], ['Larissa', 'f'],
  ['Henrique', 'm'], ['Letícia', 'f'], ['Igor', 'm'], ['Mariana', 'f'], ['João Victor', 'm'],
  ['Natália', 'f'], ['Leandro', 'm'], ['Patrícia', 'f'], ['Marcelo', 'm'], ['Renata', 'f'],
  ['Otávio', 'm'], ['Tatiane', 'f'], ['Paulo', 'm'], ['Vanessa', 'f'], ['Rafael', 'm'],
  ['Aline', 'f'], ['Rodrigo', 'm'], ['Bruna', 'f'], ['Thiago', 'm'], ['Carolina', 'f'],
  ['Vinícius', 'm'], ['Débora', 'f'], ['Wesley', 'm'], ['Isabela', 'f'], ['Lucas', 'm'],
]

const LAST_NAMES: readonly string[] = [
  'Alves', 'Andrade', 'Araújo', 'Barbosa', 'Borges', 'Cardoso', 'Carvalho', 'Castro', 'Costa',
  'Cunha', 'Dias', 'Duarte', 'Faria', 'Ferreira', 'Fonseca', 'Freitas', 'Gomes', 'Guimarães',
  'Lacerda', 'Lima', 'Machado', 'Martins', 'Mendes', 'Moraes', 'Nogueira', 'Oliveira', 'Pacheco',
  'Queiroz', 'Rezende', 'Ribeiro', 'Rocha', 'Santos', 'Silveira', 'Soares', 'Tavares', 'Teixeira',
  'Vasconcelos', 'Vieira', 'Xavier', 'Siqueira', 'Prado',
]

const ROLES = {
  f: ['Proprietária', 'Sócia-administradora', 'Gerente', 'Responsável pelo marketing'],
  m: ['Proprietário', 'Sócio-administrador', 'Gerente', 'Responsável pelo marketing'],
} as const

const PREFERENCES = [
  'Prefere WhatsApp à tarde.',
  'Responde melhor por áudio no WhatsApp.',
  'Prefere ligação no fim do dia.',
  'Pede material por e-mail antes de reunião.',
  null,
] as const

/**
 * Pessoa fictícia determinística por índice. Telefone no bloco
 * `+55 34 90000-XXXX` (DDD real da região, prefixo fora de uso comercial) —
 * único por índice e reconhecível como dado de demonstração.
 */
export function demoPersonAt(index: number): DemoPerson {
  const [first, gender] = FIRST_NAMES[(index * 7) % FIRST_NAMES.length]!
  const last = LAST_NAMES[(index * 11) % LAST_NAMES.length]!
  const fullName = `${first} ${last}`
  const slug = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, '.')
  return {
    fullName,
    firstName: first.split(' ')[0]!,
    role: ROLES[gender][index % ROLES[gender].length]!,
    phone: `+553490000${String(index).padStart(4, '0')}`,
    email: index % 5 < 2 ? `${slug(first)}.${slug(last)}@exemplo.com.br` : null,
    notes: PREFERENCES[index % PREFERENCES.length] ?? null,
  }
}

// --- Linhas ---------------------------------------------------------------------

export interface DemoContactRow {
  id: string
  full_name: string
  phone: string
  email: string | null
  company_name: string
  city: string
  notes: string
  created_at: string
}

export interface DemoLeadRow {
  id: string
  contact_id: string
  title: string
  interest: string
  source_id: string
  stage_id: string
  status: 'open' | 'won' | 'lost'
  temperature: 'cold' | 'warm' | 'hot' | null
  value_cents: number
  currency: 'BRL'
  last_contact_at: string | null
  next_action_at: string | null
  responded_at: string | null
  closed_at: string | null
  lost_reason: string | null
  notes: string | null
  created_at: string
  /** Não vai pro banco — `run.ts` remove antes do insert. */
  stageKey: DemoStageKey
  companyName: string
}

export interface DemoActivityRow {
  lead_id: string
  contact_id: string
  type: ActivityType
  title: string
  body: string | null
  status: 'pending' | 'done' | 'cancelled'
  due_at: string | null
  done_at: string | null
  is_auto: boolean
  rule_id: string | null
  step_number: FollowupStep | null
  created_at: string
}

export interface DemoDataset {
  contacts: DemoContactRow[]
  leads: DemoLeadRow[]
  activities: DemoActivityRow[]
  audits: DemoAuditRow[]
}

export interface BuildDemoDatasetInput {
  now: Date
  newId: () => string
  stageIdByKey: Readonly<Record<DemoStageKey, string>>
  sourceIdByName: Readonly<Record<DemoSourceName, string>>
  followupRuleIdByStep: Readonly<Record<FollowupStep, string>>
}

export function buildDemoDataset(input: BuildDemoDatasetInput): DemoDataset {
  const clock = createClock(input.now)
  const clientDrafts = buildClientDrafts(clock, (key) => demoPersonAt(CLIENT_KEYS.indexOf(key)))
  const prospectDrafts = buildProspectDrafts(clock, createRng(FUNNEL_SEED), (i) => demoPersonAt(CLIENT_KEYS.length + i))
  const drafts = [...clientDrafts, ...prospectDrafts]
  const auditRng = createRng(AUDIT_SEED)

  const contacts: DemoContactRow[] = []
  const contactIdByCompany = new Map<string, string>()
  const leads: DemoLeadRow[] = []
  const activities: DemoActivityRow[] = []
  const audits: DemoAuditRow[] = []

  for (const draft of drafts) {
    const contactId = contactIdFor(draft, drafts, contactIdByCompany, contacts, input.newId)
    const leadId = input.newId()
    const leadActivities = draft.acts.map((act) => ({
      lead_id: leadId,
      contact_id: contactId,
      type: act.type,
      title: act.title,
      body: act.body,
      status: act.status,
      due_at: toIso(act.dueAt),
      done_at: toIso(act.doneAt),
      is_auto: act.isAuto,
      rule_id: act.step === null ? null : input.followupRuleIdByStep[act.step],
      step_number: act.step,
      created_at: new Date(act.createdAt).toISOString(),
    }))
    activities.push(...leadActivities)

    leads.push({
      id: leadId,
      contact_id: contactId,
      title: draft.title,
      interest: draft.interest,
      source_id: input.sourceIdByName[draft.source],
      stage_id: input.stageIdByKey[draft.stageKey],
      status: draft.stageKey === 'ganho' ? 'won' : draft.stageKey === 'perdido' ? 'lost' : 'open',
      temperature: draft.temperature,
      value_cents: reaisToCents(draft.valueReais),
      currency: 'BRL',
      last_contact_at: resolveLastContact(leadActivities)?.toISOString() ?? null,
      next_action_at: resolveNextAction(leadActivities)?.toISOString() ?? null,
      responded_at: toIso(draft.respondedAt),
      closed_at: toIso(draft.closedAt),
      lost_reason: draft.lostReason,
      notes: draft.notes,
      created_at: new Date(draft.createdAt).toISOString(),
      stageKey: draft.stageKey,
      companyName: draft.company.name,
    })

    if (draft.withAudit) {
      audits.push(buildDemoAudit({ leadId, company: draft.company, researchedAt: new Date(draft.createdAt), rng: auditRng }))
    }
  }

  return { contacts, leads, activities, audits }
}

/** Um contato por empresa (clientes com mais de um lead reaproveitam o mesmo), criado junto do lead mais antigo. */
function contactIdFor(
  draft: LeadDraft,
  drafts: readonly LeadDraft[],
  idByCompany: Map<string, string>,
  contacts: DemoContactRow[],
  newId: () => string,
): string {
  const existing = idByCompany.get(draft.company.name)
  if (existing) return existing

  const id = newId()
  const firstCreatedAt = Math.min(...drafts.filter((d) => d.company.name === draft.company.name).map((d) => d.createdAt))
  const { person } = draft
  idByCompany.set(draft.company.name, id)
  contacts.push({
    id,
    full_name: person.fullName,
    phone: person.phone,
    email: person.email,
    company_name: draft.company.name,
    city: draft.company.city,
    notes: [person.role, person.notes].filter(Boolean).join(' · '),
    created_at: new Date(firstCreatedAt).toISOString(),
  })
  return id
}

function toIso(ms: number | null): string | null {
  return ms === null ? null : new Date(ms).toISOString()
}

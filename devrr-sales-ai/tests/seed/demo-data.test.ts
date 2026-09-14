import { describe, it, expect } from 'vitest'
import { resolveLastContact, resolveNextAction } from '@/lib/domain/followup'
import { CLIENT_COMPANIES, PROSPECT_COMPANIES } from '@/supabase/seed/demo-companies'
import {
  buildDemoDataset,
  demoPersonAt,
  DEMO_SOURCE_NAMES,
  DEMO_STAGE_KEYS,
  PROSPECTING_SOURCE,
  type BuildDemoDatasetInput,
  type DemoSourceName,
  type DemoStageKey,
} from '@/supabase/seed/demo-data'
import { PROSPECT_STAGE_QUOTA } from '@/supabase/seed/demo-prospects'

const NOW = new Date('2026-09-14T15:00:00.000Z')

function input(): BuildDemoDatasetInput {
  let counter = 0
  return {
    now: NOW,
    newId: () => `id-${counter++}`,
    stageIdByKey: Object.fromEntries(DEMO_STAGE_KEYS.map((k) => [k, `stage-${k}`])) as Record<DemoStageKey, string>,
    sourceIdByName: Object.fromEntries(DEMO_SOURCE_NAMES.map((n) => [n, `source-${n}`])) as Record<DemoSourceName, string>,
    followupRuleIdByStep: { 1: 'rule-1', 2: 'rule-2', 3: 'rule-3' },
  }
}

const dataset = buildDemoDataset(input())
const { contacts, leads, activities, audits } = dataset
const activitiesOf = (leadId: string) => activities.filter((a) => a.lead_id === leadId)
const clientNames = new Set(Object.values(CLIENT_COMPANIES).map((c) => c.name))

describe('buildDemoDataset — volume e catálogo', () => {
  it('gera ao menos 100 leads, um contato por empresa', () => {
    expect(leads.length).toBeGreaterThanOrEqual(100)
    expect(contacts).toHaveLength(PROSPECT_COMPANIES.length + clientNames.size)
    expect(new Set(contacts.map((c) => c.company_name)).size).toBe(contacts.length)
  })

  it('a cota de estágios fecha com o número de empresas prospectadas', () => {
    const total = Object.values(PROSPECT_STAGE_QUOTA).reduce((sum, n) => sum + n, 0)
    expect(total).toBe(PROSPECT_COMPANIES.length)
  })

  it('cobre os 7 estágios e as duas cidades', () => {
    for (const key of DEMO_STAGE_KEYS) expect(leads.some((l) => l.stageKey === key)).toBe(true)
    expect(new Set(contacts.map((c) => c.city))).toEqual(new Set(['Uberlândia', 'Patrocínio']))
  })

  it('é determinístico para o mesmo now', () => {
    expect(buildDemoDataset(input())).toEqual(dataset)
  })
})

describe('buildDemoDataset — contatos fictícios', () => {
  it('telefones no bloco de demonstração +55 34 90000-XXXX, únicos', () => {
    for (const c of contacts) expect(c.phone).toMatch(/^\+553490000\d{4}$/)
    expect(new Set(contacts.map((c) => c.phone)).size).toBe(contacts.length)
  })

  it('e-mails só no domínio reservado exemplo.com.br', () => {
    for (const c of contacts) if (c.email) expect(c.email).toMatch(/^[a-z.]+@exemplo\.com\.br$/)
  })

  it('pessoas não se repetem', () => {
    const names = Array.from({ length: contacts.length }, (_, i) => demoPersonAt(i).fullName)
    expect(new Set(names).size).toBe(names.length)
  })
})

describe('buildDemoDataset — funil', () => {
  it('só clientes reais estão em ganho', () => {
    const won = leads.filter((l) => l.status === 'won')
    expect(won.length).toBeGreaterThanOrEqual(clientNames.size)
    for (const lead of won) expect(clientNames.has(lead.companyName)).toBe(true)
    for (const name of clientNames) expect(won.some((l) => l.companyName === name)).toBe(true)
  })

  it('deriva status do estágio e closed_at só em fechados', () => {
    for (const lead of leads) {
      const expected = lead.stageKey === 'ganho' ? 'won' : lead.stageKey === 'perdido' ? 'lost' : 'open'
      expect(lead.status).toBe(expected)
      if (lead.status === 'open') expect(lead.closed_at).toBeNull()
      else expect(lead.closed_at).not.toBeNull()
    }
  })

  it('todo lead já nasce com valor estimado (abordagem chega com preço)', () => {
    for (const lead of leads) expect(lead.value_cents).toBeGreaterThan(0)
  })

  it('perdidos têm motivo; abertos e ganhos não', () => {
    for (const lead of leads) {
      if (lead.status === 'lost') expect(lead.lost_reason).toBeTruthy()
      else expect(lead.lost_reason).toBeNull()
    }
  })

  it('todo lead aberto tem próxima ação (Regra 1) e nenhum fechado tem pendência', () => {
    for (const lead of leads) {
      const pending = activitiesOf(lead.id).filter((a) => a.status === 'pending')
      if (lead.status === 'open') {
        expect(pending.length).toBeGreaterThan(0)
        expect(lead.next_action_at).not.toBeNull()
      } else {
        expect(pending).toHaveLength(0)
      }
    }
  })

  it('caches batem com os helpers de domínio (a reconciliação não mexe)', () => {
    for (const lead of leads) {
      const acts = activitiesOf(lead.id)
      expect(lead.next_action_at).toBe(resolveNextAction(acts)?.toISOString() ?? null)
      expect(lead.last_contact_at).toBe(resolveLastContact(acts)?.toISOString() ?? null)
    }
  })

  it('pendências atrasadas, de hoje e futuras para "Ações de hoje"', () => {
    const times = activities.filter((a) => a.status === 'pending').map((a) => new Date(a.due_at as string).getTime())
    const endOfToday = new Date('2026-09-15T02:59:59.999Z').getTime() // 23:59 em Brasília
    expect(times.some((t) => t < NOW.getTime())).toBe(true)
    expect(times.some((t) => t >= NOW.getTime() && t <= endOfToday)).toBe(true)
    expect(times.some((t) => t > endOfToday)).toBe(true)
  })

  it('linha do tempo coerente: nada concluído no futuro nem antes do lead existir', () => {
    const createdByLead = new Map(leads.map((l) => [l.id, new Date(l.created_at).getTime()]))
    for (const a of activities) {
      expect(new Date(a.created_at).getTime()).toBeLessThanOrEqual(NOW.getTime())
      if (a.done_at) {
        const doneAt = new Date(a.done_at).getTime()
        expect(doneAt).toBeLessThanOrEqual(NOW.getTime())
        expect(doneAt).toBeGreaterThanOrEqual(createdByLead.get(a.lead_id)!)
      }
    }
  })

  it('follow-ups automáticos carregam passo e regra', () => {
    const auto = activities.filter((a) => a.is_auto)
    expect(auto.length).toBeGreaterThan(0)
    for (const a of auto) {
      expect(a.type).toBe('followup')
      expect(a.step_number).not.toBeNull()
      expect(a.rule_id).toBe(`rule-${a.step_number}`)
    }
  })
})

describe('buildDemoDataset — dossiês', () => {
  it('um dossiê por lead de prospecção ativa, e só para eles', () => {
    const prospectingLeadIds = new Set(
      leads.filter((l) => l.source_id === `source-${PROSPECTING_SOURCE}`).map((l) => l.id),
    )
    expect(audits.length).toBe(prospectingLeadIds.size)
    expect(audits.length).toBeGreaterThan(20)
    for (const audit of audits) expect(prospectingLeadIds.has(audit.lead_id)).toBe(true)
  })

  it('score e completude no domínio do banco; PageSpeed e nota do Google em branco', () => {
    for (const audit of audits) {
      expect(audit.digital_score).toBeGreaterThanOrEqual(0)
      expect(audit.digital_score).toBeLessThanOrEqual(100)
      expect(audit.digital_score_completeness).toBeGreaterThan(0)
      expect(audit.pagespeed_mobile_performance).toBeNull()
      expect(audit.google_rating).toBeNull()
    }
  })
})

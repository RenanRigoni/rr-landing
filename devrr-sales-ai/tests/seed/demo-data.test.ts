import { describe, it, expect } from 'vitest'
import {
  buildDemoActivities,
  buildDemoContacts,
  buildDemoLeads,
  DEMO_CONTACT_COUNT,
  DEMO_LEAD_COUNT,
  DEMO_STAGE_KEYS,
  type DemoStageKey,
} from '@/supabase/seed/demo-data'

const NOW = new Date('2026-08-27T12:00:00.000Z')

const contactIds = Array.from({ length: DEMO_CONTACT_COUNT }, (_, i) => `contact-${i}`)
const leadIds = Array.from({ length: DEMO_LEAD_COUNT }, (_, i) => `lead-${i}`)
const stageIdByKey = Object.fromEntries(
  DEMO_STAGE_KEYS.map((key) => [key, `stage-${key}`]),
) as Record<DemoStageKey, string>

describe('buildDemoContacts', () => {
  it('devolve 12 contatos, um por id, com nome e telefone', () => {
    const contacts = buildDemoContacts(contactIds)
    expect(contacts).toHaveLength(12)
    expect(contacts.map((c) => c.id)).toEqual(contactIds)
    for (const c of contacts) {
      expect(c.full_name.length).toBeGreaterThan(0)
      expect(c.phone).toMatch(/^\+55\d{10,11}$/)
    }
    expect(new Set(contacts.map((c) => c.phone)).size).toBe(12)
  })

  it('lança se a contagem de ids não bate', () => {
    expect(() => buildDemoContacts(contactIds.slice(0, 5))).toThrow(/esperava 12/)
  })
})

describe('buildDemoLeads', () => {
  const leads = buildDemoLeads({ ids: leadIds, contactIds, stageIdByKey, now: NOW })

  it('devolve 18 leads cobrindo os 7 estágios', () => {
    expect(leads).toHaveLength(18)
    for (const key of DEMO_STAGE_KEYS) {
      expect(leads.some((l) => l.stageKey === key)).toBe(true)
    }
  })

  it('deriva status do estágio (ganho→won, perdido→lost, resto→open)', () => {
    for (const lead of leads) {
      const expected =
        lead.stageKey === 'ganho' ? 'won' : lead.stageKey === 'perdido' ? 'lost' : 'open'
      expect(lead.status).toBe(expected)
    }
    expect(leads.some((l) => l.status === 'won')).toBe(true)
    expect(leads.some((l) => l.status === 'lost')).toBe(true)
    expect(leads.some((l) => l.status === 'open')).toBe(true)
  })

  it('tem leads com e sem valor (PRODUCT_SPEC #1)', () => {
    expect(leads.some((l) => l.value_cents === 0)).toBe(true)
    expect(leads.some((l) => l.value_cents > 0)).toBe(true)
  })

  it('resolve contact_id e stage_id contra os mapas recebidos', () => {
    for (const lead of leads) {
      expect(contactIds).toContain(lead.contact_id)
      expect(lead.stage_id).toBe(`stage-${lead.stageKey}`)
    }
  })

  it('leads fechados têm closed_at; abertos não', () => {
    for (const lead of leads) {
      if (lead.status === 'open') expect(lead.closed_at).toBeNull()
      else expect(lead.closed_at).not.toBeNull()
    }
  })
})

describe('buildDemoActivities', () => {
  const leads = buildDemoLeads({ ids: leadIds, contactIds, stageIdByKey, now: NOW }).map((l) => ({
    id: l.id,
    contactId: l.contact_id,
    status: l.status,
    stageKey: l.stageKey,
  }))
  const activities = buildDemoActivities({ leads, now: NOW })

  it('gera histórico (due_at nulo, done) para todo lead', () => {
    const history = activities.filter((a) => a.due_at === null && a.status === 'done')
    expect(history.length).toBeGreaterThanOrEqual(leads.length)
    for (const h of history) expect(h.done_at).not.toBeNull()
  })

  it('gera pendências atrasadas, de hoje e futuras entre os leads abertos', () => {
    const pending = activities.filter((a) => a.status === 'pending' && a.due_at !== null)
    const times = pending.map((a) => new Date(a.due_at as string).getTime())
    const endOfToday = new Date('2026-08-27T23:59:59.999Z').getTime()

    expect(times.some((t) => t < NOW.getTime())).toBe(true) // atrasada
    expect(times.some((t) => t >= NOW.getTime() && t <= endOfToday)).toBe(true) // hoje
    expect(times.some((t) => t > endOfToday)).toBe(true) // futura
  })

  it('não deixa pendência em lead fechado', () => {
    const closedLeadIds = new Set(leads.filter((l) => l.status !== 'open').map((l) => l.id))
    const pendingOnClosed = activities.filter(
      (a) => a.status === 'pending' && closedLeadIds.has(a.lead_id),
    )
    expect(pendingOnClosed).toHaveLength(0)
  })

  it('follow-ups automáticos carregam step_number', () => {
    for (const a of activities) {
      if (a.is_auto) {
        expect(a.type).toBe('followup')
        expect(a.step_number).not.toBeNull()
      }
    }
    expect(activities.some((a) => a.is_auto)).toBe(true)
  })
})

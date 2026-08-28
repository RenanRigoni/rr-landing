import { describe, it, expect } from 'vitest'
import {
  pickDigitalAuditInput,
  hasMeaningfulDigitalAuditInput,
} from '@/lib/validation/digital-audit-intake'
import { DIGITAL_AUDIT_FIELD_NAMES } from '@/lib/validation/digital-audit'

/**
 * Regra que decide se `/leads/new` cria ou não uma auditoria junto do lead
 * (7.7). É ela que preserva a diferença entre "lead existe, nunca foi
 * analisado" e "existe uma auditoria iniciada" — errar para o lado permissivo
 * enche `lead_digital_audits` de linhas vazias, uma por lead cadastrado.
 */
describe('lib/validation/digital-audit-intake', () => {
  describe('pickDigitalAuditInput', () => {
    it('mantém só campos do schema do dossiê e descarta os campos comerciais do mesmo submit', () => {
      const picked = pickDigitalAuditInput({
        full_name: 'Maria',
        phone: '11988887777',
        title: 'Landing page',
        value_reais: '2500',
        notes: 'observação comercial',
        source_id: '00000000-0000-0000-0000-000000000001',
        google_business_profile: 'sim',
        website_notes: 'observação do dossiê',
      })

      expect(picked).toEqual({
        google_business_profile: 'sim',
        website_notes: 'observação do dossiê',
      })
    })

    it('descarta lead_id vindo do navegador — quem chama impõe o id do lead recém-criado', () => {
      const picked = pickDigitalAuditInput({
        lead_id: '11111111-1111-1111-1111-111111111111',
        website_exists: 'sim',
      })

      expect(picked).not.toHaveProperty('lead_id')
      expect(picked).toEqual({ website_exists: 'sim' })
    })

    it('descarta audit_id e expected_updated_at — neste fluxo a auditoria só pode nascer, nunca ser atualizada', () => {
      const picked = pickDigitalAuditInput({
        audit_id: '22222222-2222-2222-2222-222222222222',
        expected_updated_at: '2026-08-28T10:00:00.000Z',
        website_exists: 'sim',
      })

      expect(picked).not.toHaveProperty('audit_id')
      expect(picked).not.toHaveProperty('expected_updated_at')
    })

    it('descarta o sentinel digital_opportunities_present mas preserva o array', () => {
      const picked = pickDigitalAuditInput({
        digital_opportunities_present: '1',
        digital_opportunities: ['website', 'seo_local'],
      })

      expect(picked).not.toHaveProperty('digital_opportunities_present')
      expect(picked.digital_opportunities).toEqual(['website', 'seo_local'])
    })

    it('não inventa chave para campo ausente do payload (update parcial nunca vira apagamento)', () => {
      const picked = pickDigitalAuditInput({ website_exists: 'sim' })
      expect(Object.keys(picked)).toEqual(['website_exists'])
    })

    it('devolve objeto vazio para entrada que não é objeto', () => {
      expect(pickDigitalAuditInput(null)).toEqual({})
      expect(pickDigitalAuditInput(undefined)).toEqual({})
      expect(pickDigitalAuditInput('texto')).toEqual({})
    })

    it('cobre todo campo do schema — a lista vem de digitalAuditObject.shape, não de uma cópia', () => {
      const everyField = Object.fromEntries(DIGITAL_AUDIT_FIELD_NAMES.map((name) => [name, 'x']))
      const picked = pickDigitalAuditInput(everyField)

      // `lead_id` é o único campo do schema deliberadamente removido.
      expect(Object.keys(picked).sort()).toEqual(
        DIGITAL_AUDIT_FIELD_NAMES.filter((name) => name !== 'lead_id')
          .map(String)
          .sort(),
      )
    })
  })

  describe('hasMeaningfulDigitalAuditInput', () => {
    it('é falso quando nenhum campo do dossiê veio', () => {
      expect(hasMeaningfulDigitalAuditInput({})).toBe(false)
    })

    it('é falso para o submit de um lead sem dossiê: só campos comerciais', () => {
      expect(
        hasMeaningfulDigitalAuditInput({
          full_name: 'Maria',
          phone: '11988887777',
          title: 'Landing page',
          value_reais: '2500',
          notes: 'cliente indicado',
        }),
      ).toBe(false)
    })

    it('é falso com o formulário do dossiê inteiro em branco — os 101 campos vazios', () => {
      const allBlank = Object.fromEntries(DIGITAL_AUDIT_FIELD_NAMES.map((name) => [name, '']))
      expect(hasMeaningfulDigitalAuditInput(allBlank)).toBe(false)
    })

    it('NÃO conta o lead_id: vínculo técnico não é diagnóstico', () => {
      expect(hasMeaningfulDigitalAuditInput({ lead_id: '11111111-1111-1111-1111-111111111111' })).toBe(false)
    })

    it('NÃO conta researched_at sozinho: o formulário o pré-preenche com hoje em todo lead novo', () => {
      expect(hasMeaningfulDigitalAuditInput({ researched_at: '2026-08-28' })).toBe(false)
      expect(
        hasMeaningfulDigitalAuditInput({
          lead_id: '11111111-1111-1111-1111-111111111111',
          researched_at: '2026-08-28',
        }),
      ).toBe(false)
    })

    it('NÃO conta o sentinel de oportunidades nem um array vazio de oportunidades', () => {
      expect(
        hasMeaningfulDigitalAuditInput({
          digital_opportunities_present: '1',
          digital_opportunities: [],
          researched_at: '2026-08-28',
        }),
      ).toBe(false)
    })

    it('NÃO conta audit_id nem expected_updated_at (não são campos do schema)', () => {
      expect(
        hasMeaningfulDigitalAuditInput({
          audit_id: '22222222-2222-2222-2222-222222222222',
          expected_updated_at: '2026-08-28T10:00:00.000Z',
        }),
      ).toBe(false)
    })

    it('ignora espaços em branco', () => {
      expect(hasMeaningfulDigitalAuditInput({ website_notes: '   ' })).toBe(false)
      expect(hasMeaningfulDigitalAuditInput({ website_notes: '  algo  ' })).toBe(true)
    })

    it('é verdadeiro com um único enum escolhido', () => {
      expect(hasMeaningfulDigitalAuditInput({ website_exists: 'nao' })).toBe(true)
    })

    it('é verdadeiro com uma oportunidade marcada', () => {
      expect(
        hasMeaningfulDigitalAuditInput({
          digital_opportunities_present: '1',
          digital_opportunities: ['website'],
        }),
      ).toBe(true)
    })

    it('é verdadeiro com número zero — 0 é medição, não ausência', () => {
      expect(hasMeaningfulDigitalAuditInput({ pagespeed_mobile_performance: 0 })).toBe(true)
      expect(hasMeaningfulDigitalAuditInput({ google_reviews_count: '0' })).toBe(true)
    })

    it('é verdadeiro para booleano', () => {
      expect(hasMeaningfulDigitalAuditInput({ website_https: false })).toBe(true)
    })

    it('trata null e undefined como vazio', () => {
      expect(hasMeaningfulDigitalAuditInput({ website_url: null, instagram_url: undefined })).toBe(false)
    })

    it('dá o mesmo veredito no payload cru e no já filtrado por pickDigitalAuditInput', () => {
      const raw = { full_name: 'Maria', title: 'Landing page', google_rating: '4.7' }
      expect(hasMeaningfulDigitalAuditInput(raw)).toBe(true)
      expect(hasMeaningfulDigitalAuditInput(pickDigitalAuditInput(raw))).toBe(true)

      const rawSemDossie = { full_name: 'Maria', title: 'Landing page', researched_at: '2026-08-28' }
      expect(hasMeaningfulDigitalAuditInput(rawSemDossie)).toBe(false)
      expect(hasMeaningfulDigitalAuditInput(pickDigitalAuditInput(rawSemDossie))).toBe(false)
    })

    it('é falso para entrada que não é objeto', () => {
      expect(hasMeaningfulDigitalAuditInput(null)).toBe(false)
      expect(hasMeaningfulDigitalAuditInput(undefined)).toBe(false)
      expect(hasMeaningfulDigitalAuditInput('texto')).toBe(false)
    })
  })
})

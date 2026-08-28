import { describe, it, expect } from 'vitest'
import { carryFormContinuity } from '@/lib/actions/digital-audit-result'
import type { DigitalAuditResult } from '@/lib/actions/digital-audit-core'

// `useActionState` troca o estado pelo retorno da action. Um erro que não
// escreveu nada não pode apagar a identidade/versão que o formulário já tinha.

describe('carryFormContinuity — sucesso', () => {
  it('passa o resultado adiante intacto (valores novos do servidor prevalecem)', () => {
    const prev: DigitalAuditResult = { error: null, auditId: 'X', updatedAt: 'V1', digitalScore: 10, completeness: 20 }
    const fresh: DigitalAuditResult = { error: null, auditId: 'X', updatedAt: 'V2', digitalScore: 40, completeness: 55 }
    expect(carryFormContinuity(prev, fresh)).toBe(fresh)
  })

  it('nunca preserva versão velha sobre nova — mesmo score null vindo do servidor manda', () => {
    const prev: DigitalAuditResult = { error: null, auditId: 'X', updatedAt: 'V1', digitalScore: 90, completeness: 80 }
    const fresh: DigitalAuditResult = { error: null, auditId: 'X', updatedAt: 'V2', digitalScore: null, completeness: 0 }
    const out = carryFormContinuity(prev, fresh)
    expect(out.updatedAt).toBe('V2')
    expect(out.digitalScore).toBeNull()
    expect(out.completeness).toBe(0)
  })
})

describe('carryFormContinuity — erro', () => {
  it('preserva auditId/updatedAt/score do estado anterior e não mascara o erro', () => {
    const prev: DigitalAuditResult = { error: null, auditId: 'X', updatedAt: 'V2', digitalScore: 42, completeness: 60 }
    const errored: DigitalAuditResult = { error: 'Dados inválidos' }
    const out = carryFormContinuity(prev, errored)
    expect(out).toEqual({
      error: 'Dados inválidos',
      auditId: 'X',
      updatedAt: 'V2',
      digitalScore: 42,
      completeness: 60,
    })
  })

  it('create ainda sem save: erro no primeiro submit não inventa auditId', () => {
    const prev: DigitalAuditResult = { error: null }
    const out = carryFormContinuity(prev, { error: 'Dados inválidos' })
    expect(out.error).toBe('Dados inválidos')
    expect(out.auditId).toBeUndefined()
    expect(out.updatedAt).toBeUndefined()
  })

  it('conflito otimista preserva a versão conhecida para o retry (sem conflito falso)', () => {
    const prev: DigitalAuditResult = { error: null, auditId: 'X', updatedAt: 'V2' }
    const out = carryFormContinuity(prev, {
      error: 'Esta auditoria foi alterada por outra operação. Recarregue e tente novamente.',
    })
    expect(out.auditId).toBe('X')
    expect(out.updatedAt).toBe('V2')
  })
})

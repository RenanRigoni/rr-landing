import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { ConsultPagespeedResult } from '@/lib/domain/pagespeed-parse'

// Action `consultPagespeed` (7.10). Fina: resolve a sessão (`requireOrgId`) e
// delega a `runPagespeedAnalysis`. Aqui as duas dependências são mockadas —
// sem Supabase, sem rede, sem `service_role`.

const { requireOrgIdMock, runPagespeedAnalysisMock } = vi.hoisted(() => ({
  requireOrgIdMock: vi.fn(),
  runPagespeedAnalysisMock: vi.fn(),
}))

vi.mock('server-only', () => ({}))
vi.mock('@/lib/queries/require-org', () => ({ requireOrgId: requireOrgIdMock }))
vi.mock('@/lib/api/pagespeed', () => ({ runPagespeedAnalysis: runPagespeedAnalysisMock }))

const { consultPagespeed } = await import('@/lib/actions/pagespeed')

const canned: ConsultPagespeedResult = {
  ok: true,
  error: null,
  analyzedUrl: 'https://clinica.example/',
  analyzedAtIso: '2026-08-28T12:00:00.000Z',
  mobile: { ok: true, fields: null, reportUrl: null, error: null },
  desktop: { ok: true, fields: null, reportUrl: null, error: null },
}

beforeEach(() => {
  vi.clearAllMocks()
  requireOrgIdMock.mockResolvedValue('org-1')
  runPagespeedAnalysisMock.mockResolvedValue(canned)
})

describe('consultPagespeed', () => {
  it('resolve a sessão ANTES de consultar e repassa a URL', async () => {
    const result = await consultPagespeed('https://clinica.example')

    expect(requireOrgIdMock).toHaveBeenCalledTimes(1)
    expect(runPagespeedAnalysisMock).toHaveBeenCalledWith('https://clinica.example')
    expect(result).toBe(canned)
  })

  it('sem sessão (requireOrgId lança) → não consulta o PageSpeed', async () => {
    requireOrgIdMock.mockRejectedValueOnce(new Error('Usuário autenticado sem organização ativa'))

    await expect(consultPagespeed('https://clinica.example')).rejects.toThrow('sem organização')
    expect(runPagespeedAnalysisMock).not.toHaveBeenCalled()
  })
})

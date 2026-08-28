import { describe, it, expect } from 'vitest'
import { config } from '@/proxy'

/**
 * Regressão de 6.3.1 (D-012): `api/cron` sai do matcher do `proxy.ts` para
 * que o Vercel Cron (autenticado por header, sem cookie) não leve `307` para
 * `/login`. Toda outra rota continua passando pelo `updateSession`.
 */
describe('proxy config.matcher', () => {
  const [pattern] = config.matcher
  if (!pattern) {
    throw new Error('config.matcher vazio')
  }
  const regex = new RegExp(`^${pattern}$`)

  it('NÃO casa /api/cron/reconcile (fica fora do updateSession)', () => {
    expect(regex.test('/api/cron/reconcile')).toBe(false)
  })

  it('casa as rotas de aplicação', () => {
    expect(regex.test('/today')).toBe(true)
    expect(regex.test('/login')).toBe(true)
    expect(regex.test('/onboarding')).toBe(true)
  })

  it('casa /api que não é cron (rota de API nasce protegida por default)', () => {
    expect(regex.test('/api/qualquer-outra')).toBe(true)
  })

  it('casa /api/leads/export (7.9 — precisa da sessão que o proxy renova; D-041)', () => {
    expect(regex.test('/api/leads/export')).toBe(true)
  })

  it('continua excluindo assets estáticos', () => {
    expect(regex.test('/_next/static/chunk.js')).toBe(false)
    expect(regex.test('/favicon.ico')).toBe(false)
    expect(regex.test('/logo.svg')).toBe(false)
  })
})

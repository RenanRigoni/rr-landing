import { describe, it, expect } from 'vitest'
import { isAuthorizedCronRequest } from '@/lib/api/cron-auth'

// Segredo da rota `app/api/cron/*` (D-034). Comparação em tempo constante
// sobre o sha256 dos dois lados — nunca lança, nem mesmo com tamanhos
// diferentes.
const SECRET = 'cron-secret-de-teste-com-mais-de-32-caracteres'

describe('isAuthorizedCronRequest', () => {
  it('segredo certo no header Bearer → true', () => {
    expect(isAuthorizedCronRequest(`Bearer ${SECRET}`, SECRET)).toBe(true)
  })

  it('segredo errado do mesmo tamanho → false', () => {
    const wrong = 'x'.repeat(SECRET.length)
    expect(wrong.length).toBe(SECRET.length)
    expect(isAuthorizedCronRequest(`Bearer ${wrong}`, SECRET)).toBe(false)
  })

  it('segredo de tamanho diferente → false, sem lançar', () => {
    expect(() => isAuthorizedCronRequest('Bearer curto', SECRET)).not.toThrow()
    expect(isAuthorizedCronRequest('Bearer curto', SECRET)).toBe(false)
    expect(isAuthorizedCronRequest(`Bearer ${SECRET}${SECRET}`, SECRET)).toBe(false)
  })

  it('header ausente → false', () => {
    expect(isAuthorizedCronRequest(null, SECRET)).toBe(false)
  })

  it('header sem prefixo Bearer → false', () => {
    expect(isAuthorizedCronRequest(SECRET, SECRET)).toBe(false)
    expect(isAuthorizedCronRequest(`Token ${SECRET}`, SECRET)).toBe(false)
  })

  it('token vazio depois de "Bearer " → false', () => {
    expect(isAuthorizedCronRequest('Bearer ', SECRET)).toBe(false)
  })
})

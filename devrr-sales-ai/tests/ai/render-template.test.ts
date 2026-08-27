import { describe, it, expect } from 'vitest'
import { renderTemplate } from '@/lib/ai/render-template'

describe('renderTemplate', () => {
  it('substitui uma variável simples', () => {
    expect(renderTemplate('Oi {{nome}}!', { nome: 'Fulano' })).toBe('Oi Fulano!')
  })

  it('substitui múltiplas variáveis, inclusive repetidas', () => {
    const result = renderTemplate('{{nome}} e {{nome}} de novo, {{outro}}', { nome: 'A', outro: 'B' })
    expect(result).toBe('A e A de novo, B')
  })

  it('variável ausente vira string vazia, não lança nem deixa o placeholder', () => {
    expect(renderTemplate('Oi {{nome}}!', {})).toBe('Oi !')
  })

  it('template sem placeholder é devolvido igual', () => {
    expect(renderTemplate('Sem variáveis aqui.', { nome: 'Fulano' })).toBe('Sem variáveis aqui.')
  })
})

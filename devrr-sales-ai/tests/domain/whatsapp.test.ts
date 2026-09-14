import { describe, it, expect } from 'vitest'
import { buildGreeting, buildWhatsappUrl } from '@/lib/domain/whatsapp'

describe('buildWhatsappUrl', () => {
  it('monta a URL wa.me só com dígitos, sem texto quando não informado', () => {
    expect(buildWhatsappUrl('(11) 98888-7777')).toBe('https://wa.me/5511988887777')
  })

  it('anexa ?text= com o texto codificado quando informado', () => {
    expect(buildWhatsappUrl('(11) 98888-7777', 'Olá!')).toBe('https://wa.me/5511988887777?text=Ol%C3%A1!')
  })

  it('texto vazio não anexa ?text=', () => {
    expect(buildWhatsappUrl('(11) 98888-7777', '')).toBe('https://wa.me/5511988887777')
  })

  it('codifica acento e quebra de linha corretamente', () => {
    const url = buildWhatsappUrl('(11) 98888-7777', 'Olá, tudo bem?\nAqui é da DevRR.')
    expect(url).toBe(`https://wa.me/5511988887777?text=${encodeURIComponent('Olá, tudo bem?\nAqui é da DevRR.')}`)
  })

  it('telefone ausente devolve null', () => {
    expect(buildWhatsappUrl(null)).toBeNull()
  })

  it('telefone inválido devolve null', () => {
    expect(buildWhatsappUrl('123')).toBeNull()
  })
})

describe('buildGreeting', () => {
  it('com nome: "Olá, {nome}! Tudo bem? Aqui é da {orgName}."', () => {
    expect(buildGreeting({ contactFirstName: 'Carlos', orgName: 'DevRR' })).toBe('Olá, Carlos! Tudo bem? Aqui é da DevRR.')
  })

  it('sem nome: "Olá! Tudo bem? Aqui é da {orgName}."', () => {
    expect(buildGreeting({ contactFirstName: null, orgName: 'DevRR' })).toBe('Olá! Tudo bem? Aqui é da DevRR.')
  })
})

const brlFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

/**
 * `value_cents` é a unidade canônica de dinheiro em todo o produto — nunca
 * guardar reais fracionários no banco (ponto flutuante em dinheiro é fonte
 * clássica de bug de arredondamento). Estas duas funções são o único lugar
 * que converte entre a unidade de armazenamento e a de exibição/entrada.
 */
export function centsToReais(cents: number): number {
  return cents / 100
}

export function reaisToCents(reais: number): number {
  return Math.round(reais * 100)
}

/** Formata centavos como BRL: `250000` → `"R$ 2.500,00"`. */
export function formatBRL(cents: number): string {
  return brlFormatter.format(centsToReais(cents))
}

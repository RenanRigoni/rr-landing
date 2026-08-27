// Classificação visual das métricas de PageSpeed — o único lugar do produto
// que conhece estes limiares (DOSSIE.md §8). UI, Markdown e CSV importam
// daqui; nenhum componente repete um limiar.
//
// Lógica pura: zero import de supabase/next (regra de dependência da
// ARCHITECTURE.md).

export type PagespeedRating = 'bom' | 'precisa_melhorar' | 'ruim'

/**
 * Score Lighthouse (0–100): >=90 bom · 50–89 precisa_melhorar · <50 ruim.
 * `null` (não medido) passa direto como `null`.
 */
export function classifyLighthouseScore(v: number | null): PagespeedRating | null {
  if (v === null) return null
  if (v >= 90) return 'bom'
  if (v >= 50) return 'precisa_melhorar'
  return 'ruim'
}

/** LCP em ms: <=2500 bom · <=4000 precisa_melhorar · >4000 ruim. */
export function classifyLcpMs(v: number | null): PagespeedRating | null {
  if (v === null) return null
  if (v <= 2500) return 'bom'
  if (v <= 4000) return 'precisa_melhorar'
  return 'ruim'
}

/** INP em ms: <=200 bom · <=500 precisa_melhorar · >500 ruim. */
export function classifyInpMs(v: number | null): PagespeedRating | null {
  if (v === null) return null
  if (v <= 200) return 'bom'
  if (v <= 500) return 'precisa_melhorar'
  return 'ruim'
}

/** CLS (adimensional): <=0.1 bom · <=0.25 precisa_melhorar · >0.25 ruim. */
export function classifyClsValue(v: number | null): PagespeedRating | null {
  if (v === null) return null
  if (v <= 0.1) return 'bom'
  if (v <= 0.25) return 'precisa_melhorar'
  return 'ruim'
}

/**
 * Armazenamos tempo em ms inteiro, exibimos em segundos com 2 casas:
 * `2480` → `"2,48 s"` (DOSSIE.md §7 — "um padrão consistente em toda a
 * aplicação").
 */
export function formatMsAsSeconds(ms: number): string {
  const seconds = (ms / 1000).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  return `${seconds} s`
}

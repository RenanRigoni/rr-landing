const COUNTRY_CODE = '55'

function onlyDigits(value: string): string {
  return value.replace(/\D/g, '')
}

/**
 * Normaliza um telefone brasileiro (com ou sem DDI, com ou sem formatação)
 * para E.164 (`+55` + DDD + assinante, 10 ou 11 dígitos locais). `null`
 * quando os dígitos não formam um número BR válido.
 *
 * Só remove o DDI quando o total de dígitos é 12 ou 13 — únicos tamanhos que
 * correspondem a "55" + número local de 10 ou 11 dígitos. Isso evita
 * confundir DDI com um DDD real que também começa em "55" (ex.: Santa Maria/RS).
 */
export function normalizePhoneBR(input: string): string | null {
  let digits = onlyDigits(input)

  if (digits.startsWith(COUNTRY_CODE) && (digits.length === 12 || digits.length === 13)) {
    digits = digits.slice(COUNTRY_CODE.length)
  }

  if (digits.length !== 10 && digits.length !== 11) {
    return null
  }

  return `+${COUNTRY_CODE}${digits}`
}

/**
 * Formata um telefone normalizado (E.164, `+55...`) para exibição:
 * `(11) 98888-7777` (celular, 9 dígitos) ou `(11) 3888-7777` (fixo, 8
 * dígitos). Devolve o valor original se não reconhecer o formato — nunca lança.
 */
export function formatPhoneBR(e164: string): string {
  const digits = onlyDigits(e164)
  const local = digits.startsWith(COUNTRY_CODE) ? digits.slice(COUNTRY_CODE.length) : digits

  if (local.length !== 10 && local.length !== 11) {
    return e164
  }

  const ddd = local.slice(0, 2)
  const subscriber = local.slice(2)
  const splitAt = subscriber.length - 4

  return `(${ddd}) ${subscriber.slice(0, splitAt)}-${subscriber.slice(splitAt)}`
}

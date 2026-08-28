// Conversão de data/hora do formulário do dossiê (revisão corretiva da 7.6).
// Lógica pura, sem dependência de fuso ambiente: o offset entra sempre como
// argumento explícito (`Date#getTimezoneOffset()` do fuso do usuário — UTC-3 →
// 180). Zero import de supabase/next (regra de dependência da ARCHITECTURE.md).
//
// Só se aplica a `pagespeed_analyzed_at` (`timestamptz` — um INSTANTE).
// `researched_at` e `instagram_last_post_date` são datas de calendário
// `AAAA-MM-DD` e NÃO passam por aqui.

const DATETIME_LOCAL_RE = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/

const MINUTE_MS = 60_000

function pad2(value: number): string {
  return String(value).padStart(2, '0')
}

/**
 * Valor de `<input type="datetime-local">` (relógio de parede LOCAL, sem
 * fuso) → instante ISO 8601 com `Z`, inequívoco.
 *
 * `datetime-local` não carrega offset: `2026-08-27T10:00` digitado por um
 * usuário em UTC-3 significa `2026-08-27T13:00:00.000Z`. Sem esta conversão
 * explícita, `new Date("2026-08-27T10:00")` no runtime (Vercel = UTC)
 * interpretaria como 10:00 UTC — três horas de corrupção silenciosa.
 *
 * `tzOffsetMinutes` = `Date#getTimezoneOffset()` do fuso do usuário
 * (positivo a oeste de Greenwich: UTC-3 → 180). Vazio ou malformado → `''`.
 */
export function datetimeLocalToIso(local: string, tzOffsetMinutes: number): string {
  const trimmed = local.trim()
  if (trimmed === '') return ''

  const match = DATETIME_LOCAL_RE.exec(trimmed)
  if (!match) return ''

  const [, year, month, day, hour, minute, second] = match
  const utcMs =
    Date.UTC(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
      second ? Number(second) : 0,
    ) +
    tzOffsetMinutes * MINUTE_MS

  return new Date(utcMs).toISOString()
}

/**
 * Instante ISO (do `timestamptz` do banco) → valor local `AAAA-MM-DDTHH:mm`
 * para o `<input type="datetime-local">`. Inverso de `datetimeLocalToIso` na
 * precisão de minutos (o input não tem segundos por padrão). `null`/vazio ou
 * ISO inválido → `''`.
 */
export function isoToDatetimeLocal(iso: string | null | undefined, tzOffsetMinutes: number): string {
  if (!iso) return ''

  const instantMs = new Date(iso).getTime()
  if (Number.isNaN(instantMs)) return ''

  const wallClock = new Date(instantMs - tzOffsetMinutes * MINUTE_MS)
  return (
    `${wallClock.getUTCFullYear()}-${pad2(wallClock.getUTCMonth() + 1)}-${pad2(wallClock.getUTCDate())}` +
    `T${pad2(wallClock.getUTCHours())}:${pad2(wallClock.getUTCMinutes())}`
  )
}

/**
 * Valor a enviar no campo oculto `pagespeed_analyzed_at` no submit do
 * formulário.
 *
 * - Campo intocado (o valor local exibido bate com a renderização local do
 *   ISO original) → devolve o ISO original **verbatim**. Assim um
 *   load → save sem alteração é idempotente até nos segundos/subsegundos que
 *   o `datetime-local` não mostra.
 * - Campo alterado e preenchido → novo instante a partir do relógio local.
 * - Campo vazio → `''` (o schema transforma em `null`).
 *
 * **Dois offsets, de propósito:**
 * - `offsetForOriginal`: o offset com que o ISO original foi renderizado como
 *   relógio local no load — o MESMO tem que ser usado aqui na checagem
 *   "intocado?", senão DST faria um campo intocado parecer alterado e perder
 *   os segundos.
 * - `offsetForEdited`: o offset do relógio local que está de fato no campo
 *   AGORA. Se o usuário digitou uma data em outra estação (DST), esse offset
 *   difere do de abertura do formulário — e é ELE que vale para a conversão.
 */
export function resolvePagespeedAnalyzedAt(args: {
  localValue: string
  originalIso: string | null | undefined
  offsetForOriginal: number
  offsetForEdited: number
}): string {
  const { localValue, originalIso, offsetForOriginal, offsetForEdited } = args
  const trimmed = localValue.trim()
  if (trimmed === '') return ''

  if (originalIso && isoToDatetimeLocal(originalIso, offsetForOriginal) === trimmed) {
    return originalIso
  }

  return datetimeLocalToIso(trimmed, offsetForEdited)
}

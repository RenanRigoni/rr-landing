import { describe, it, expect } from 'vitest'
import {
  datetimeLocalToIso,
  isoToDatetimeLocal,
  resolvePagespeedAnalyzedAt,
} from '@/lib/domain/dossier-datetime'

// `Date#getTimezoneOffset()`: positivo a oeste de Greenwich.
const UTC_MINUS_3 = 180
const UTC_PLUS_2 = -120
const UTC = 0

describe('datetimeLocalToIso', () => {
  it('UTC-3: 2026-08-27T10:00 (relógio local) → 2026-08-27T13:00:00.000Z', () => {
    expect(datetimeLocalToIso('2026-08-27T10:00', UTC_MINUS_3)).toBe('2026-08-27T13:00:00.000Z')
  })

  it('UTC+2: 2026-08-27T10:00 → 2026-08-27T08:00:00.000Z', () => {
    expect(datetimeLocalToIso('2026-08-27T10:00', UTC_PLUS_2)).toBe('2026-08-27T08:00:00.000Z')
  })

  it('UTC: passa direto', () => {
    expect(datetimeLocalToIso('2026-08-27T10:00', UTC)).toBe('2026-08-27T10:00:00.000Z')
  })

  it('respeita os segundos quando o input os traz', () => {
    expect(datetimeLocalToIso('2026-08-27T10:00:37', UTC_MINUS_3)).toBe('2026-08-27T13:00:37.000Z')
  })

  it('vazio ou só espaços → ""', () => {
    expect(datetimeLocalToIso('', UTC_MINUS_3)).toBe('')
    expect(datetimeLocalToIso('   ', UTC_MINUS_3)).toBe('')
  })

  it('formato inválido → ""', () => {
    expect(datetimeLocalToIso('27/08/2026 10:00', UTC_MINUS_3)).toBe('')
    expect(datetimeLocalToIso('2026-08-27', UTC_MINUS_3)).toBe('')
  })

  it('cruza meia-noite corretamente (UTC-3, 23:00 local → dia seguinte em UTC)', () => {
    expect(datetimeLocalToIso('2026-08-27T23:00', UTC_MINUS_3)).toBe('2026-08-28T02:00:00.000Z')
  })
})

describe('isoToDatetimeLocal', () => {
  it('UTC-3: 2026-08-27T13:00:00Z → 2026-08-27T10:00', () => {
    expect(isoToDatetimeLocal('2026-08-27T13:00:00.000Z', UTC_MINUS_3)).toBe('2026-08-27T10:00')
  })

  it('UTC+2: 2026-08-27T08:00:00Z → 2026-08-27T10:00', () => {
    expect(isoToDatetimeLocal('2026-08-27T08:00:00.000Z', UTC_PLUS_2)).toBe('2026-08-27T10:00')
  })

  it('aceita offset explícito na string ISO do banco', () => {
    expect(isoToDatetimeLocal('2026-08-27T13:00:00+00:00', UTC_MINUS_3)).toBe('2026-08-27T10:00')
  })

  it('null / vazio → ""', () => {
    expect(isoToDatetimeLocal(null, UTC_MINUS_3)).toBe('')
    expect(isoToDatetimeLocal('', UTC_MINUS_3)).toBe('')
    expect(isoToDatetimeLocal(undefined, UTC_MINUS_3)).toBe('')
  })

  it('ISO inválido → ""', () => {
    expect(isoToDatetimeLocal('não é data', UTC_MINUS_3)).toBe('')
  })

  it('padroniza mês/dia/hora de um dígito', () => {
    expect(isoToDatetimeLocal('2026-01-05T04:07:00.000Z', UTC)).toBe('2026-01-05T04:07')
  })
})

describe('round-trip local ↔ instante', () => {
  it('local → ISO → local devolve o mesmo relógio de parede', () => {
    const local = '2026-08-27T10:00'
    const iso = datetimeLocalToIso(local, UTC_MINUS_3)
    expect(isoToDatetimeLocal(iso, UTC_MINUS_3)).toBe(local)
  })
})

// Zona com DST tipo "Europe/Berlin": verão UTC+2 (offset -120), inverno UTC+1
// (offset -60). `getTimezoneOffset()` é positivo a oeste de Greenwich, então
// leste = negativo.
const SUMMER = -120
const WINTER = -60

describe('resolvePagespeedAnalyzedAt', () => {
  it('campo intocado → devolve o ISO original VERBATIM (preserva segundos)', () => {
    const originalIso = '2026-08-27T13:00:37.123Z'
    const localValue = isoToDatetimeLocal(originalIso, UTC_MINUS_3) // "2026-08-27T10:00"
    expect(
      resolvePagespeedAnalyzedAt({
        localValue,
        originalIso,
        offsetForOriginal: UTC_MINUS_3,
        offsetForEdited: UTC_MINUS_3,
      }),
    ).toBe(originalIso)
  })

  it('campo alterado → novo instante a partir do relógio local', () => {
    expect(
      resolvePagespeedAnalyzedAt({
        localValue: '2026-08-27T11:30',
        originalIso: '2026-08-27T13:00:00.000Z',
        offsetForOriginal: UTC_MINUS_3,
        offsetForEdited: UTC_MINUS_3,
      }),
    ).toBe('2026-08-27T14:30:00.000Z')
  })

  it('sem ISO original (criação) → converte o relógio local com o offset editado', () => {
    expect(
      resolvePagespeedAnalyzedAt({
        localValue: '2026-08-27T10:00',
        originalIso: null,
        offsetForOriginal: 0,
        offsetForEdited: UTC_MINUS_3,
      }),
    ).toBe('2026-08-27T13:00:00.000Z')
  })

  it('campo esvaziado → ""', () => {
    expect(
      resolvePagespeedAnalyzedAt({
        localValue: '',
        originalIso: '2026-08-27T13:00:00.000Z',
        offsetForOriginal: UTC_MINUS_3,
        offsetForEdited: UTC_MINUS_3,
      }),
    ).toBe('')
  })

  it('DST: form aberto no verão, data editada no inverno → usa o offset da DATA EDITADA', () => {
    // original de agosto (verão, UTC+2). Usuário troca para 15/dez 10:00.
    // Dezembro é inverno (UTC+1) → 10:00 local = 09:00Z.
    const out = resolvePagespeedAnalyzedAt({
      localValue: '2026-12-15T10:00',
      originalIso: '2026-08-01T08:00:00.000Z',
      offsetForOriginal: SUMMER,
      offsetForEdited: WINTER,
    })
    expect(out).toBe('2026-12-15T09:00:00.000Z')
    // Se (erradamente) usasse o offset de abertura (verão), daria 08:00Z.
    expect(out).not.toBe('2026-12-15T08:00:00.000Z')
  })

  it('DST: intocado usa offsetForOriginal para reconhecer o campo, ignora o offset editado', () => {
    const originalIso = '2026-08-01T06:00:37.500Z'
    const local = isoToDatetimeLocal(originalIso, SUMMER) // relógio local de verão
    const out = resolvePagespeedAnalyzedAt({
      localValue: local,
      originalIso,
      offsetForOriginal: SUMMER,
      offsetForEdited: WINTER, // diferente — não deve importar: campo intocado
    })
    expect(out).toBe(originalIso) // verbatim, com os .500 preservados
  })
})

import { normalizePhoneBR } from './phone'

/**
 * Link de "click-to-chat" do WhatsApp (D-010/D-045: sem integração oficial no
 * MVP). `null` quando o telefone é ausente ou não é um BR válido — quem
 * renderiza decide não mostrar nada nesse caso.
 */
export function buildWhatsappUrl(phone: string | null, text?: string): string | null {
  if (phone === null) return null

  const normalized = normalizePhoneBR(phone)
  if (normalized === null) return null

  const digits = normalized.replace('+', '')
  const base = `https://wa.me/${digits}`
  return text ? `${base}?text=${encodeURIComponent(text)}` : base
}

/** Saudação padrão usada como texto pré-preenchido do link do WhatsApp. */
export function buildGreeting(input: { contactFirstName: string | null; orgName: string }): string {
  const { contactFirstName, orgName } = input
  return contactFirstName ? `Olá, ${contactFirstName}! Tudo bem? Aqui é da ${orgName}.` : `Olá! Tudo bem? Aqui é da ${orgName}.`
}

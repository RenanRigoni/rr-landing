/**
 * Regra 2: um deal não pode ser marcado como perdido sem motivo estruturado.
 * Espelha em JS (validação antecipada, mensagem amigável na UI) a mesma regra
 * que o trigger crm.fn_enforce_lost_reason garante no banco como última linha
 * de defesa — as duas camadas devem concordar.
 */
export function isLostReasonRequired(isTargetStageLost: boolean, lostReasonId: string | null | undefined): boolean {
  return isTargetStageLost && !lostReasonId
}

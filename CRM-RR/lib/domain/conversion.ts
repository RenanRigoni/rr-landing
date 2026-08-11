/**
 * Taxa de conversão entre dois estágios consecutivos do funil, em %.
 * Retorna null (não 0) quando o estágio de origem não teve nenhum deal —
 * "sem dados" é diferente de "0% de conversão".
 */
export function calcStageConversion(dealsInCurrentStage: number, dealsInNextStage: number): number | null {
  if (dealsInCurrentStage <= 0) return null
  return Math.round((dealsInNextStage / dealsInCurrentStage) * 1000) / 10
}

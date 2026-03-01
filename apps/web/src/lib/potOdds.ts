export function calcPotOdds(potSize: number, callAmount: number): number | null {
  if (potSize <= 0 || callAmount <= 0) return null;
  return (callAmount / (potSize + callAmount)) * 100;
}

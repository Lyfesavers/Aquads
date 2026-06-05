/** Minimum From-side notional (USD) for swap affiliate points on aquads.xyz AquaSwap */
export const MIN_SWAP_POINTS_USD = 5;

export function getQualifyingSwapPointsPayload(route) {
  if (!route?.id) return null;
  const fromAmountUSD = parseFloat(route.fromAmountUSD);
  if (!Number.isFinite(fromAmountUSD) || fromAmountUSD < MIN_SWAP_POINTS_USD) {
    return null;
  }
  return {
    routeId: String(route.id),
    fromAmountUSD
  };
}

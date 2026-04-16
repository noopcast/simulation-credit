// Barème IR 2025 — 3 parts, plafond QF 3518 € par demi-part
// Basé sur net cadre = 75% du brut, cotisations ~18% (donc tot = brut * 0.82)
// Samia (salariée) : abattement 10% implicite via 1.05 sur NET (approximation)
export function calcIR(brutF, netS) {
  const tot = brutF * 0.82 + netS * 12 * 1.05;
  const abat = Math.max(495, Math.min(tot * 0.1, 14171));
  const rev = tot - abat;
  const bareme = (r) => {
    if (r <= 11294) return 0;
    if (r <= 28797) return (r - 11294) * 0.11;
    if (r <= 82341) return 1925.33 + (r - 28797) * 0.3;
    if (r <= 177106) return 17988.53 + (r - 82341) * 0.41;
    return 56842.18 + (r - 177106) * 0.45;
  };
  let ir3parts = Math.round(bareme(rev / 3) * 3);
  const ir2parts = Math.round(bareme(rev / 2) * 2);
  if (ir2parts - ir3parts > 3518) ir3parts = ir2parts - 3518;
  return Math.max(0, Math.round(ir3parts / 12));
}

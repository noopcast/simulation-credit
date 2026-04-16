export function pmtCalc(P, rAnnual, n) {
  if (!rAnnual || n <= 0) return n > 0 ? P / n : 0;
  const r = rAnnual / 100 / 12;
  return (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
}

export function capAfterAntic(P, rAnnual, months) {
  if (!rAnnual) return P;
  return P * Math.pow(1 + rAnnual / 100 / 12, months);
}

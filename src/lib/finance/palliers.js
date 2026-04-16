import { pmtCalc, capAfterAntic } from "./pmt.js";

let cache = null;
let cacheKey = null;

// Recherche du palier constant qui amortit exactement le Prêt 1
// en tenant compte de la disparition progressive des autres prêts.
// 4 paliers :
//   B : M_l1_start → M_ptz_start-1      (L1 + L2 + L3)
//   C : M_ptz_start → M_short_end       (L1 + L2 + L3 + PTZ)
//   D : M_short_end+1 → M_ptz_end       (L1 + PTZ)
//   E : M_ptz_end+1 → M_l1_end          (L1 seul)
// Le "target" de mensualité totale est cherché par dichotomie (80 itérations).
export function computeLoan1Palliers(loans) {
  const key = JSON.stringify([
    loans.loan1,
    loans.loan2,
    loans.loan3,
    loans.ptz,
  ]);
  if (cacheKey === key && cache) return cache;

  const l1 = loans.loan1;
  const cap1 = capAfterAntic(l1.capital, l1.rate, l1.anticipation);
  const r1 = l1.rate ? l1.rate / 100 / 12 : 0;

  const m_l1_start = l1.anticipation + 1;
  const m_l1_end = l1.anticipation + l1.amortMonths;
  const ptzAnt = loans.ptz.anticipation;
  const ptzFr = loans.ptz.franchiseMonths || 96;
  const m_ptz_start = ptzAnt + ptzFr + 1;
  const m_ptz_end = ptzAnt + ptzFr + loans.ptz.amortMonths;
  const end2 = loans.loan2.anticipation + loans.loan2.amortMonths;
  const end3 = loans.loan3.anticipation + loans.loan3.amortMonths;
  const m_short_end = Math.min(end2, end3);

  const p2 = loans.loan2.capital / loans.loan2.amortMonths;
  const cap3 = capAfterAntic(
    loans.loan3.capital,
    loans.loan3.rate,
    loans.loan3.anticipation,
  );
  const p3 = pmtCalc(cap3, loans.loan3.rate, loans.loan3.amortMonths);
  const pPtz = loans.ptz.capital / loans.ptz.amortMonths;

  const mB = Math.max(0, Math.min(m_ptz_start, m_l1_end + 1) - m_l1_start);
  const mC = Math.max(0, Math.min(m_short_end, m_l1_end) - m_ptz_start + 1);
  const mD = Math.max(0, Math.min(m_ptz_end, m_l1_end) - m_short_end);
  const mE = Math.max(0, m_l1_end - m_ptz_end);

  function simulate(target) {
    let bal = cap1;
    const p1B = Math.max(bal * r1 + 0.01, target - p2 - p3);
    for (let i = 0; i < mB && bal > 0.01; i++) {
      const int = bal * r1;
      bal = Math.max(0, bal - (p1B - int));
    }
    const p1C = Math.max(bal * r1 + 0.01, target - p2 - p3 - pPtz);
    for (let i = 0; i < mC && bal > 0.01; i++) {
      const int = bal * r1;
      bal = Math.max(0, bal - (p1C - int));
    }
    const p1D = Math.max(bal * r1 + 0.01, target - pPtz);
    for (let i = 0; i < mD && bal > 0.01; i++) {
      const int = bal * r1;
      bal = Math.max(0, bal - (p1D - int));
    }
    const p1E = Math.max(bal * r1 + 0.01, target);
    for (let i = 0; i < mE && bal > 0.01; i++) {
      const int = bal * r1;
      bal = Math.max(0, bal - (p1E - int));
    }
    return { bal, p1B, p1C, p1D, p1E };
  }

  let lo = 0;
  let hi = cap1;
  for (let k = 0; k < 80; k++) {
    const mid = (lo + hi) / 2;
    if (simulate(mid).bal > 0.01) lo = mid;
    else hi = mid;
  }
  const result = simulate((lo + hi) / 2);
  const palliers = {
    p1B: result.p1B,
    p1C: result.p1C,
    p1D: result.p1D,
    p1E: result.p1E,
    m_l1_start,
    m_ptz_start,
    m_short_end,
    m_ptz_end,
    m_l1_end,
  };
  cache = palliers;
  cacheKey = key;
  return palliers;
}

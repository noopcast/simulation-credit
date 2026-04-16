import { pmtCalc, capAfterAntic } from "./pmt.js";
import { getMaxMonth } from "./payment.js";

// Échéancier mensuel : intérêts, principal et capital restant, tous prêts cumulés.
export function buildSchedule(loans) {
  const maxM = getMaxMonth(loans);
  const l1 = loans.loan1;
  const l3 = loans.loan3;
  const cap1 = capAfterAntic(l1.capital, l1.rate, l1.anticipation);
  const cap3 = capAfterAntic(l3.capital, l3.rate, l3.anticipation);
  const p1 = pmtCalc(cap1, l1.rate, l1.amortMonths);
  const p3 = pmtCalc(cap3, l3.rate, l3.amortMonths);
  const p2 = loans.loan2.capital / loans.loan2.amortMonths;
  const pPtz = loans.ptz.capital / loans.ptz.amortMonths;
  const r1 = (l1.rate || 0) / 100 / 12;
  const r3 = (l3.rate || 0) / 100 / 12;

  let b1 = cap1;
  let b2 = loans.loan2.capital;
  let b3 = cap3;
  let bP = loans.ptz.capital;
  const data = [];

  for (let m = 1; m <= maxM; m++) {
    let interest = 0;
    let principal = 0;

    if (m > l1.anticipation && b1 > 0.01) {
      const i = b1 * r1;
      const pr = Math.min(p1 - i, b1);
      interest += i;
      principal += pr;
      b1 = Math.max(0, b1 - pr);
    }
    if (
      m > loans.loan2.anticipation &&
      m <= loans.loan2.anticipation + loans.loan2.amortMonths &&
      b2 > 0.01
    ) {
      principal += p2;
      b2 = Math.max(0, b2 - p2);
    }
    if (m > l3.anticipation && b3 > 0.01) {
      const i = b3 * r3;
      const pr = Math.min(p3 - i, b3);
      interest += i;
      principal += pr;
      b3 = Math.max(0, b3 - pr);
    }
    const ptzS = loans.ptz.anticipation + (loans.ptz.franchiseMonths || 96);
    if (m > ptzS && bP > 0.01) {
      principal += pPtz;
      bP = Math.max(0, bP - pPtz);
    }
    data.push({
      month: m,
      interest,
      principal,
      capitalRemaining: b1 + b2 + b3 + bP,
    });
  }
  return data;
}

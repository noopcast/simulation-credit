import { pmtCalc, capAfterAntic } from "./pmt.js";
import { computeLoan1Palliers } from "./palliers.js";
import { FISE_INS_TOTAL } from "../../constants/fise.js";

// Mensualité hors assurance au mois m, tous prêts confondus.
export function getPaymentAtMonth(m, loans) {
  let pay = 0;
  const pal = computeLoan1Palliers(loans);
  if (m >= pal.m_l1_start && m < pal.m_ptz_start && m <= pal.m_l1_end)
    pay += pal.p1B;
  else if (m >= pal.m_ptz_start && m <= pal.m_short_end && m <= pal.m_l1_end)
    pay += pal.p1C;
  else if (m > pal.m_short_end && m <= pal.m_ptz_end && m <= pal.m_l1_end)
    pay += pal.p1D;
  else if (m > pal.m_ptz_end && m <= pal.m_l1_end) pay += pal.p1E;

  const l2 = loans.loan2;
  if (m > l2.anticipation && m <= l2.anticipation + l2.amortMonths)
    pay += l2.capital / l2.amortMonths;

  const l3 = loans.loan3;
  if (m > l3.anticipation && m <= l3.anticipation + l3.amortMonths) {
    const cap3 = capAfterAntic(l3.capital, l3.rate, l3.anticipation);
    pay += pmtCalc(cap3, l3.rate, l3.amortMonths);
  }

  const lp = loans.ptz;
  const ptzStart = lp.anticipation + (lp.franchiseMonths || 96);
  if (m > ptzStart && m <= ptzStart + lp.amortMonths)
    pay += lp.capital / lp.amortMonths;

  return pay;
}

// Assurance au mois m, répartie au prorata de la cible totale mensuelle.
// Bornes exactes : L1→M324, L2→M204, L3→M204, PTZ→M264.
export function insAtMonth(m, loans, assMois) {
  const ratio = assMois / FISE_INS_TOTAL;
  let ins = 0;
  const end1 = loans.loan1.anticipation + loans.loan1.amortMonths;
  const end2 = loans.loan2.anticipation + loans.loan2.amortMonths;
  const end3 = loans.loan3.anticipation + loans.loan3.amortMonths;
  const endPtz =
    loans.ptz.anticipation +
    (loans.ptz.franchiseMonths || 96) +
    loans.ptz.amortMonths;
  if (m >= 1 && m <= end1) ins += loans.loan1.insMonth * ratio;
  if (m >= 1 && m <= end2) ins += loans.loan2.insMonth * ratio;
  if (m >= 1 && m <= end3) ins += loans.loan3.insMonth * ratio;
  if (m >= 1 && m <= endPtz) ins += loans.ptz.insMonth * ratio;
  return ins;
}

export function getMaxMonth(loans) {
  const ends = [
    loans.loan1.anticipation + loans.loan1.amortMonths,
    loans.loan2.anticipation + loans.loan2.amortMonths,
    loans.loan3.anticipation + loans.loan3.amortMonths,
    loans.ptz.anticipation +
      (loans.ptz.franchiseMonths || 96) +
      loans.ptz.amortMonths,
  ];
  return Math.max(...ends);
}

// Agrège les mois consécutifs ayant la même mensualité (hors + ass) en "paliers".
export function getPaliers(loans, assMois) {
  const maxM = getMaxMonth(loans);
  const paliers = [];
  let prevPay = -1;
  let prevIns = -1;
  let startM = 1;

  for (let m = 1; m <= maxM; m++) {
    const pay = Math.round(getPaymentAtMonth(m, loans) * 100);
    const ins = Math.round(insAtMonth(m, loans, assMois) * 100);
    if (pay !== prevPay || ins !== prevIns) {
      if (prevPay >= 0) {
        paliers.push({
          startM,
          endM: m - 1,
          duration: m - startM,
          hors: prevPay / 100,
          ins: prevIns / 100,
          total: Math.round((prevPay + prevIns) / 100),
        });
      }
      prevPay = pay;
      prevIns = ins;
      startM = m;
    }
  }
  paliers.push({
    startM,
    endM: maxM,
    duration: maxM - startM + 1,
    hors: prevPay / 100,
    ins: prevIns / 100,
    total: Math.round((prevPay + prevIns) / 100),
  });
  return paliers;
}

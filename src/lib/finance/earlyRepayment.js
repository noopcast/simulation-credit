import { pmtCalc, capAfterAntic } from "./pmt.js";
import { getMaxMonth } from "./payment.js";

const MAX_SIMULATION_MONTHS = 400;
const YEARLY_DATA_TARGET_LENGTH = 27;
const IRA_MIN_RATIO = 0.1; // RA minimum = 10% du capital original du prêt
const IRA_CAP_RATIO = 0.03; // Plafond IRA = 3% du capital restant
const IRA_INTEREST_MONTHS = 6; // IRA = intérêts sur 6 mois (rate/2 en base annuelle)

// Applique un remboursement anticipé sur un prêt.
// Retourne la partie appliquée, l'IRA engendrée, et le nouveau curP si strategy=payment.
function applyRA({
  balance,
  extra,
  originalCapital,
  rate,
  currentPayment,
  amortMonths,
  strategy,
  month,
}) {
  if (balance <= 0.01 || extra <= 0) {
    return { balance, extra, currentPayment, ira: 0, applied: 0 };
  }
  const minRA = Math.min(originalCapital * IRA_MIN_RATIO, balance);
  const applied = Math.min(extra, balance);
  // Autorisé si au-dessus du seuil mini OU si c'est le solde final
  if (applied < minRA && applied < balance - 0.01) {
    return { balance, extra, currentPayment, ira: 0, applied: 0 };
  }
  const ira =
    rate > 0
      ? Math.min((applied * rate) / 100 / 2, balance * IRA_CAP_RATIO)
      : 0;
  let newBalance = balance - applied;
  let newPayment = currentPayment;
  if (strategy === "payment" && newBalance > 0.01) {
    newPayment = pmtCalc(
      newBalance,
      rate,
      Math.max(amortMonths - (month - 1), 1),
    );
  }
  if (newBalance <= 0.01) {
    newBalance = 0;
    newPayment = 0;
  }
  return {
    balance: newBalance,
    extra: extra - applied,
    currentPayment: newPayment,
    ira,
    applied,
  };
}

// Un mois d'amortissement pour un prêt amortissable (L1, L3).
// Retourne { balance, interest, paid, saved } où saved = origP - paid.
function amortizeStep(balance, rate, currentPayment, originalPayment) {
  if (balance <= 0.01) {
    return { balance: 0, interest: 0, paid: 0, saved: originalPayment };
  }
  const i = balance * rate;
  const pr = Math.min(currentPayment - i, balance);
  const actualPaid = Math.min(currentPayment, pr + i);
  return {
    balance: Math.max(0, balance - pr),
    interest: i,
    paid: actualPaid,
    saved: originalPayment - actualPaid,
  };
}

function buildPaddedYearly(yearly, endMonth, totalInterest) {
  const padded = [...yearly];
  while (padded.length < YEARLY_DATA_TARGET_LENGTH) {
    padded.push({
      year: padded.length + 1,
      capital: 0,
      interest: Math.round(totalInterest),
      payment: 0,
    });
  }
  return {
    data: padded,
    endYear: Math.ceil(endMonth / 12),
  };
}

// Simule le remboursement complet avec un RA annuel (versé chaque janvier).
// Priorité d'affectation : L1 (taux plus élevé) puis L3. L2 (primo) et PTZ : jamais.
// Deux stratégies :
//  - "duration" : mensualité inchangée, durée raccourcie
//  - "payment"  : durée inchangée, mensualité recalculée à la baisse
export function simulateRA(annualRA, strategy, loans) {
  const l1 = loans.loan1;
  const l3 = loans.loan3;
  const r1m = (l1.rate || 0) / 100 / 12;
  const r3m = (l3.rate || 0) / 100 / 12;

  let b1 = capAfterAntic(l1.capital, l1.rate, l1.anticipation);
  let b3 = capAfterAntic(l3.capital, l3.rate, l3.anticipation);
  let bPrimo = loans.loan2.capital;
  let bPtz = loans.ptz.capital;

  const origP1 = pmtCalc(b1, l1.rate, l1.amortMonths);
  const origP3 = pmtCalc(b3, l3.rate, l3.amortMonths);
  let curP1 = origP1;
  let curP3 = origP3;

  const pPrimo = loans.loan2.capital / loans.loan2.amortMonths;
  const pPtz = loans.ptz.capital / loans.ptz.amortMonths;

  let totInt = 0;
  let totPaid = 0;
  let totExtra = 0;
  let totIRA = 0;
  let savCum = 0;
  const yearly = [];

  for (let m = 1; m <= MAX_SIMULATION_MONTHS; m++) {
    // 1. RA annuel en janvier (hors année 1)
    if (m % 12 === 1 && m > 1 && annualRA > 0) {
      let extra = annualRA + (strategy === "payment" ? savCum : 0);
      savCum = 0;

      // Priorité L1 (taux le plus élevé)
      const ra1 = applyRA({
        balance: b1,
        extra,
        originalCapital: l1.capital,
        rate: l1.rate,
        currentPayment: curP1,
        amortMonths: l1.amortMonths,
        strategy,
        month: m,
      });
      b1 = ra1.balance;
      extra = ra1.extra;
      curP1 = ra1.currentPayment;
      totIRA += ra1.ira;
      totExtra += ra1.applied;

      // Puis L3
      const ra3 = applyRA({
        balance: b3,
        extra,
        originalCapital: l3.capital,
        rate: l3.rate,
        currentPayment: curP3,
        amortMonths: l3.amortMonths,
        strategy,
        month: m,
      });
      b3 = ra3.balance;
      curP3 = ra3.currentPayment;
      totIRA += ra3.ira;
      totExtra += ra3.applied;
    }

    // 2. Amortissement mensuel
    let intM = 0;
    let payM = 0;
    let savM = 0;

    const step1 = amortizeStep(b1, r1m, curP1, origP1);
    b1 = step1.balance;
    intM += step1.interest;
    payM += step1.paid;
    savM += step1.saved;

    if (m <= l3.amortMonths) {
      const step3 = amortizeStep(b3, r3m, curP3, origP3);
      b3 = step3.balance;
      intM += step3.interest;
      payM += step3.paid;
      savM += step3.saved;
    }

    if (strategy === "payment") savCum += Math.max(0, savM);

    if (bPrimo > 0.01 && m <= loans.loan2.amortMonths) {
      bPrimo = Math.max(0, bPrimo - pPrimo);
      payM += pPrimo;
    }

    const ptzStart = loans.ptz.franchiseMonths || 96;
    if (m > ptzStart && bPtz > 0.01 && m <= ptzStart + loans.ptz.amortMonths) {
      bPtz = Math.max(0, bPtz - pPtz);
      payM += pPtz;
    }

    totInt += intM;
    totPaid += payM;

    const remaining = b1 + b3 + bPrimo + bPtz;

    if (m % 12 === 0) {
      yearly.push({
        year: m / 12,
        capital: Math.round(remaining),
        interest: Math.round(totInt),
        payment: Math.round(payM),
      });
    }

    if (remaining < 1) {
      const padded = buildPaddedYearly(yearly, m, totInt);
      return {
        data: padded.data,
        totalInterest: Math.round(totInt),
        totalPaid: Math.round(totPaid),
        totalExtra: Math.round(totExtra),
        totalIRA: Math.round(totIRA),
        endYear: padded.endYear,
      };
    }
  }

  return {
    data: yearly,
    totalInterest: Math.round(totInt),
    totalPaid: Math.round(totPaid),
    totalExtra: Math.round(totExtra),
    totalIRA: Math.round(totIRA),
    endYear: Math.ceil(getMaxMonth(loans) / 12),
  };
}

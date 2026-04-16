import { useState, useMemo } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

// ============================================================
// FISE DEFAULTS
// ============================================================
const FISE = {
  loan1: {
    label: "Crédit principal",
    capital: 175440,
    rate: 3.35,
    amortMonths: 300,
    anticipation: 24,
    taeg: "3,91%",
    insMonth: 94.04,
    insDuration: 324,
    commission: 1000,
    garantie: 2168,
  },
  loan2: {
    label: "Primo accédant",
    capital: 20000,
    rate: 0,
    amortMonths: 180,
    anticipation: 24,
    taeg: "0,70%",
    insMonth: 10.72,
    insDuration: 204,
    commission: 0,
    garantie: 247,
  },
  loan3: {
    label: "Crédit 80k",
    capital: 80000,
    rate: 3.25,
    amortMonths: 180,
    anticipation: 24,
    taeg: "3,96%",
    insMonth: 42.88,
    insDuration: 204,
    commission: 450,
    garantie: 988,
  },
  ptz: {
    label: "PTZ 2026",
    capital: 56700,
    rate: 0,
    amortMonths: 144,
    anticipation: 24,
    franchiseMonths: 96,
    taeg: "0,52%",
    insMonth: 30.39,
    insDuration: 264,
    commission: 0,
    garantie: 701,
  },
};
const FISE_INS_TOTAL = 178.03;

// ============================================================
// UTILS
// ============================================================
function pmtCalc(P, rAnnual, n) {
  if (!rAnnual || n <= 0) return n > 0 ? P / n : 0;
  const r = rAnnual / 100 / 12;
  return (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
}
function capAfterAntic(P, rAnnual, months) {
  if (!rAnnual) return P;
  return P * Math.pow(1 + rAnnual / 100 / 12, months);
}

// Cache pour le calcul des paliers Prêt 1 (évite recalcul à chaque getPaymentAtMonth)
let _palliersCache = null;
let _palliersCacheKey = null;

// Calcule les paliers lissés du Prêt 1 via recherche binaire du target constant
// qui maintient une mensualité totale la plus stable possible
function computeLoan1Palliers(loans) {
  const key = JSON.stringify([
    loans.loan1,
    loans.loan2,
    loans.loan3,
    loans.ptz,
  ]);
  if (_palliersCacheKey === key && _palliersCache) return _palliersCache;

  const l1 = loans.loan1;
  const cap1 = capAfterAntic(l1.capital, l1.rate, l1.anticipation);
  const r1 = l1.rate ? l1.rate / 100 / 12 : 0;

  const m_l1_start = l1.anticipation + 1;
  const m_l1_end = l1.anticipation + l1.amortMonths;
  const ptzAnt = loans.ptz.anticipation,
    ptzFr = loans.ptz.franchiseMonths || 96;
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
  const p_ptz = loans.ptz.capital / loans.ptz.amortMonths;

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
    const p1C = Math.max(bal * r1 + 0.01, target - p2 - p3 - p_ptz);
    for (let i = 0; i < mC && bal > 0.01; i++) {
      const int = bal * r1;
      bal = Math.max(0, bal - (p1C - int));
    }
    const p1D = Math.max(bal * r1 + 0.01, target - p_ptz);
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

  // Recherche binaire du target qui amortit exactement
  let lo = 0,
    hi = cap1;
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
  _palliersCache = palliers;
  _palliersCacheKey = key;
  return palliers;
}

// Mensualités hors assurance par mois
function getPaymentAtMonth(m, loans) {
  let pay = 0;
  // Prêt 1 : paliers lissés (calculés dynamiquement)
  const pal = computeLoan1Palliers(loans);
  if (m >= pal.m_l1_start && m < pal.m_ptz_start && m <= pal.m_l1_end)
    pay += pal.p1B;
  else if (m >= pal.m_ptz_start && m <= pal.m_short_end && m <= pal.m_l1_end)
    pay += pal.p1C;
  else if (m > pal.m_short_end && m <= pal.m_ptz_end && m <= pal.m_l1_end)
    pay += pal.p1D;
  else if (m > pal.m_ptz_end && m <= pal.m_l1_end) pay += pal.p1E;
  // Prêt 2
  const l2 = loans.loan2;
  if (m > l2.anticipation && m <= l2.anticipation + l2.amortMonths)
    pay += l2.capital / l2.amortMonths;
  // Prêt 3
  const l3 = loans.loan3;
  if (m > l3.anticipation && m <= l3.anticipation + l3.amortMonths) {
    const cap3 = capAfterAntic(l3.capital, l3.rate, l3.anticipation);
    pay += pmtCalc(cap3, l3.rate, l3.amortMonths);
  }
  // PTZ
  const lp = loans.ptz;
  const ptzStart = lp.anticipation + (lp.franchiseMonths || 96);
  if (m > ptzStart && m <= ptzStart + lp.amortMonths)
    pay += lp.capital / lp.amortMonths;
  return pay;
}

// Insurance at month m, scaled proportionally to target total
// Bornes exactes : Prêt 1 → M324, Prêt 2 → M204, Prêt 3 → M204, PTZ → M264
function insAtMonth(m, loans, assMois) {
  const ratio = assMois / FISE_INS_TOTAL;
  let ins = 0;
  const end1 = loans.loan1.anticipation + loans.loan1.amortMonths; // 324
  const end2 = loans.loan2.anticipation + loans.loan2.amortMonths; // 204
  const end3 = loans.loan3.anticipation + loans.loan3.amortMonths; // 204
  const endPtz =
    loans.ptz.anticipation +
    (loans.ptz.franchiseMonths || 96) +
    loans.ptz.amortMonths; // 264
  if (m >= 1 && m <= end1) ins += loans.loan1.insMonth * ratio;
  if (m >= 1 && m <= end2) ins += loans.loan2.insMonth * ratio;
  if (m >= 1 && m <= end3) ins += loans.loan3.insMonth * ratio;
  if (m >= 1 && m <= endPtz) ins += loans.ptz.insMonth * ratio;
  return ins;
}

function getMaxMonth(loans) {
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

// Build paliers from loans
function getPaliers(loans, assMois) {
  const maxM = getMaxMonth(loans);
  const paliers = [];
  let prevPay = -1,
    prevIns = -1,
    startM = 1;

  for (let m = 1; m <= maxM; m++) {
    const pay = Math.round(getPaymentAtMonth(m, loans) * 100);
    const ins = Math.round(insAtMonth(m, loans, assMois) * 100);
    if (pay !== prevPay || ins !== prevIns) {
      if (prevPay >= 0) {
        paliers.push({
          startM: startM,
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

// Monthly schedule for charts
function buildSchedule(loans) {
  const maxM = getMaxMonth(loans);
  const l1 = loans.loan1,
    l3 = loans.loan3;
  const cap1 = capAfterAntic(l1.capital, l1.rate, l1.anticipation);
  const cap3 = capAfterAntic(l3.capital, l3.rate, l3.anticipation);
  const p1 = pmtCalc(cap1, l1.rate, l1.amortMonths);
  const p3 = pmtCalc(cap3, l3.rate, l3.amortMonths);
  const p2 = loans.loan2.capital / loans.loan2.amortMonths;
  const pPtz = loans.ptz.capital / loans.ptz.amortMonths;
  const r1 = (l1.rate || 0) / 100 / 12,
    r3 = (l3.rate || 0) / 100 / 12;
  let b1 = cap1,
    b2 = loans.loan2.capital,
    b3 = cap3,
    bP = loans.ptz.capital;
  const data = [];
  for (let m = 1; m <= maxM; m++) {
    let interest = 0,
      principal = 0;
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

function calcIR(brutF, netS) {
  const tot = brutF * 0.82 + netS * 12 * 1.05;
  const abat = Math.max(495, Math.min(tot * 0.1, 14171));
  const rev = tot - abat;
  const bar = (r) => {
    if (r <= 11294) return 0;
    if (r <= 28797) return (r - 11294) * 0.11;
    if (r <= 82341) return 1925.33 + (r - 28797) * 0.3;
    if (r <= 177106) return 17988.53 + (r - 82341) * 0.41;
    return 56842.18 + (r - 177106) * 0.45;
  };
  let ir3 = Math.round(bar(rev / 3) * 3);
  const ir2 = Math.round(bar(rev / 2) * 2);
  if (ir2 - ir3 > 3518) ir3 = ir2 - 3518;
  return Math.max(0, Math.round(ir3 / 12));
}

// ============================================================
// EARLY REPAYMENT (uses loans state)
// ============================================================
function simulateRA(annualRA, strategy, loans) {
  const l1 = loans.loan1,
    l3 = loans.loan3;
  const r1m = (l1.rate || 0) / 100 / 12,
    r3m = (l3.rate || 0) / 100 / 12;
  let b1 = capAfterAntic(l1.capital, l1.rate, l1.anticipation);
  let b3 = capAfterAntic(l3.capital, l3.rate, l3.anticipation);
  let bPrimo = loans.loan2.capital,
    bPtz = loans.ptz.capital;
  const origP1 = pmtCalc(b1, l1.rate, l1.amortMonths);
  const origP3 = pmtCalc(b3, l3.rate, l3.amortMonths);
  let curP1 = origP1,
    curP3 = origP3;
  const pPrimo = loans.loan2.capital / loans.loan2.amortMonths;
  const pPtz = loans.ptz.capital / loans.ptz.amortMonths;
  let totInt = 0,
    totPaid = 0,
    totExtra = 0,
    totIRA = 0,
    savCum = 0;
  const yearly = [];
  for (let m = 1; m <= 400; m++) {
    let intM = 0,
      payM = 0;
    if (m % 12 === 1 && m > 1 && annualRA > 0) {
      let extra = annualRA + (strategy === "payment" ? savCum : 0);
      savCum = 0;
      if (b1 > 0.01 && extra > 0) {
        const minRA = Math.min(l1.capital * 0.1, b1);
        const app = Math.min(extra, b1);
        if (app >= minRA || app >= b1 - 0.01) {
          const ira =
            l1.rate > 0 ? Math.min((app * l1.rate) / 100 / 2, b1 * 0.03) : 0;
          totIRA += ira;
          b1 -= app;
          extra -= app;
          totExtra += app;
          if (strategy === "payment" && b1 > 0.01) {
            curP1 = pmtCalc(b1, l1.rate, Math.max(l1.amortMonths - (m - 1), 1));
          }
          if (b1 <= 0.01) {
            b1 = 0;
            curP1 = 0;
          }
        }
      }
      if (b3 > 0.01 && extra > 0) {
        const minRA = Math.min(l3.capital * 0.1, b3);
        const app = Math.min(extra, b3);
        if (app >= minRA || app >= b3 - 0.01) {
          const ira =
            l3.rate > 0 ? Math.min((app * l3.rate) / 100 / 2, b3 * 0.03) : 0;
          totIRA += ira;
          b3 -= app;
          extra -= app;
          totExtra += app;
          if (strategy === "payment" && b3 > 0.01) {
            curP3 = pmtCalc(b3, l3.rate, Math.max(l3.amortMonths - (m - 1), 1));
          }
          if (b3 <= 0.01) {
            b3 = 0;
            curP3 = 0;
          }
        }
      }
    }
    let savM = 0;
    if (b1 > 0.01) {
      const i = b1 * r1m;
      const pr = Math.min(curP1 - i, b1);
      const act = Math.min(curP1, pr + i);
      payM += act;
      intM += i;
      b1 = Math.max(0, b1 - pr);
      savM += origP1 - act;
    } else savM += origP1;
    if (b3 > 0.01 && m <= l3.amortMonths) {
      const i = b3 * r3m;
      const pr = Math.min(curP3 - i, b3);
      const act = Math.min(curP3, pr + i);
      payM += act;
      intM += i;
      b3 = Math.max(0, b3 - pr);
      savM += origP3 - act;
    } else if (m <= l3.amortMonths) savM += origP3;
    if (strategy === "payment") savCum += Math.max(0, savM);
    if (bPrimo > 0.01 && m <= loans.loan2.amortMonths) {
      bPrimo = Math.max(0, bPrimo - pPrimo);
      payM += pPrimo;
    }
    const ptzS = loans.ptz.franchiseMonths || 96;
    if (m > ptzS && bPtz > 0.01 && m <= ptzS + loans.ptz.amortMonths) {
      bPtz = Math.max(0, bPtz - pPtz);
      payM += pPtz;
    }
    totInt += intM;
    totPaid += payM;
    const rem = b1 + b3 + bPrimo + bPtz;
    if (m % 12 === 0)
      yearly.push({
        year: m / 12,
        capital: Math.round(rem),
        interest: Math.round(totInt),
        payment: Math.round(payM),
      });
    if (rem < 1) {
      const ey = Math.ceil(m / 12);
      while (yearly.length < 27)
        yearly.push({
          year: yearly.length + 1,
          capital: 0,
          interest: Math.round(totInt),
          payment: 0,
        });
      return {
        data: yearly,
        totalInterest: Math.round(totInt),
        totalPaid: Math.round(totPaid),
        totalExtra: Math.round(totExtra),
        totalIRA: Math.round(totIRA),
        endYear: ey,
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

// ============================================================
// FORMATTING & TOOLTIP
// ============================================================
const fmt = (n) => Math.round(n).toLocaleString("fr-FR") + " €";
const fmtK = (n) => Math.round(n / 1000) + "k";
const TT = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: "#1a2236",
        border: "1px solid #2a3a5c",
        borderRadius: 8,
        padding: "8px 12px",
        fontSize: 12,
      }}
    >
      <p style={{ color: "#8892a4", marginBottom: 4 }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color || p.fill, margin: "2px 0" }}>
          {p.name}: {(p.value || 0).toLocaleString("fr-FR")} €
        </p>
      ))}
    </div>
  );
};

// ============================================================
// APP
// ============================================================
export default function App() {
  const [tab, setTab] = useState("budget");
  const [brutF, setBrutF] = useState(50000);
  const [netS, setNetS] = useState(1800);
  const [assMois, setAssMois] = useState(178);
  const [ra, setRA] = useState(12000);
  const [loans, setLoans] = useState({
    loan1: { ...FISE.loan1 },
    loan2: { ...FISE.loan2 },
    loan3: { ...FISE.loan3 },
    ptz: { ...FISE.ptz },
  });

  const totalEmprunte =
    loans.loan1.capital +
    loans.loan2.capital +
    loans.loan3.capital +
    loans.ptz.capital;
  const tabs = [
    { id: "params", l: "Prêts" },
    { id: "budget", l: "Budget" },
    { id: "schedule", l: "Échéancier" },
    { id: "ra", l: "Remb. anticipé" },
  ];

  return (
    <div
      style={{
        fontFamily: "'Instrument Sans','Segoe UI',sans-serif",
        background: "#0a0f1a",
        color: "#e8e6e1",
        minHeight: "100vh",
        padding: "20px 16px",
        maxWidth: 600,
        margin: "0 auto",
      }}
    >
      <link
        href="https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
        rel="stylesheet"
      />
      <h1
        style={{
          fontSize: 20,
          fontWeight: 700,
          color: "#fff",
          marginBottom: 4,
        }}
      >
        Simulation de crédit
      </h1>
      <p style={{ fontSize: 13, color: "#8892a4", marginBottom: 16 }}>
        {fmt(totalEmprunte)} · PTZ {fmt(loans.ptz.capital)} · PACS + 2 enfants
      </p>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4,1fr)",
          gap: 2,
          background: "#141b2d",
          borderRadius: 10,
          padding: 3,
          marginBottom: 20,
          border: "1px solid #1e2a42",
        }}
      >
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: "9px 0",
              border: "none",
              borderRadius: 8,
              fontSize: 11,
              fontWeight: 600,
              fontFamily: "inherit",
              cursor: "pointer",
              background: tab === t.id ? "#7c3aed" : "transparent",
              color: tab === t.id ? "#fff" : "#6b7a94",
            }}
          >
            {t.l}
          </button>
        ))}
      </div>
      {tab === "params" && (
        <ParamsTab
          loans={loans}
          setLoans={setLoans}
          assMois={assMois}
          setAssMois={setAssMois}
        />
      )}
      {tab === "budget" && (
        <BudgetTab
          brutF={brutF}
          setBrutF={setBrutF}
          netS={netS}
          setNetS={setNetS}
          loans={loans}
          assMois={assMois}
        />
      )}
      {tab === "schedule" && <ScheduleTab loans={loans} assMois={assMois} />}
      {tab === "ra" && <RATab ra={ra} setRA={setRA} loans={loans} />}
    </div>
  );
}

// ============================================================
// TAB 1: PARAMS
// ============================================================
function ParamsTab({ loans, setLoans, assMois, setAssMois }) {
  const update = (k, f, v) =>
    setLoans((p) => ({ ...p, [k]: { ...p[k], [f]: v } }));
  const reset = () =>
    setLoans({
      loan1: { ...FISE.loan1 },
      loan2: { ...FISE.loan2 },
      loan3: { ...FISE.loan3 },
      ptz: { ...FISE.ptz },
    });
  const total =
    loans.loan1.capital +
    loans.loan2.capital +
    loans.loan3.capital +
    loans.ptz.capital;

  return (
    <>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <span
          style={{
            fontFamily: "'JetBrains Mono'",
            fontSize: 18,
            fontWeight: 700,
            color: "#fff",
          }}
        >
          Total : {fmt(total)}
        </span>
        <button
          onClick={reset}
          style={{
            fontSize: 11,
            padding: "6px 12px",
            background: "#1e2a42",
            border: "1px solid #2a3a5c",
            borderRadius: 8,
            color: "#8892a4",
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          Reset FISE
        </button>
      </div>

      <Sec title="Assurance emprunteur (contrat unique, 4 prêts)">
        <NI
          label="Cotisation mensuelle totale"
          value={assMois}
          onChange={setAssMois}
          suffix="€/mois"
          step={10}
        />
        <Row label="Groupe Suravenir (défaut)" value="178 €" dim />
      </Sec>

      {[
        ["loan1", loans.loan1],
        ["loan2", loans.loan2],
        ["loan3", loans.loan3],
        ["ptz", loans.ptz],
      ].map(([k, l]) => (
        <Sec key={k} title={l.label}>
          <NI
            label="Capital"
            value={l.capital}
            onChange={(v) => update(k, "capital", v)}
            suffix="€"
            step={1000}
          />
          <NI
            label="Taux nominal"
            value={l.rate}
            onChange={(v) => update(k, "rate", v)}
            suffix="%"
            step={0.05}
            isDecimal
          />
          <NI
            label="Durée amortissement"
            value={l.amortMonths}
            onChange={(v) => update(k, "amortMonths", v)}
            suffix="mois"
            step={12}
          />
          <Row label="Frais" value={fmt(l.commission + l.garantie)} dim />
        </Sec>
      ))}
    </>
  );
}

// ============================================================
// TAB 2: BUDGET
// ============================================================
function BudgetTab({ brutF, setBrutF, netS, setNetS, loans, assMois }) {
  const netF = Math.round((brutF * 0.75) / 12);
  const rev = netF + netS;
  const ir = calcIR(brutF, netS);
  const netIR = rev - ir;
  const totalEmprunte =
    loans.loan1.capital +
    loans.loan2.capital +
    loans.loan3.capital +
    loans.ptz.capital;

  const scenarios = [
    {
      id: "g",
      label: "Groupe",
      sub: `${assMois}€/mois`,
      ass: assMois,
      color: "#e74c3c",
    },
    {
      id: "e1",
      label: "Externe",
      sub: "100€/mois",
      ass: 100,
      color: "#f39c12",
    },
    { id: "e8", label: "Externe", sub: "80€/mois", ass: 80, color: "#27ae60" },
  ];

  return (
    <>
      <Sec title="Paramètres revenus">
        <NI
          label="Fabian (brut annuel, cadre)"
          value={brutF}
          onChange={setBrutF}
          suffix="€/an"
          step={5000}
        />
        <NI
          label="Samia (net mensuel)"
          value={netS}
          onChange={setNetS}
          suffix="€/mois"
          step={100}
        />
      </Sec>
      <Sec title="Revenus mensuels nets">
        <Row label="Fabian (75% du brut)" value={fmt(netF)} />
        <Row label="Samia" value={fmt(netS)} />
        <Div />
        <Row label="Total foyer" value={fmt(rev)} bold />
        <Row label="IR (3 parts)" value={"− " + fmt(ir)} dim />
        <Div />
        <Row label="Net après impôt" value={fmt(netIR)} bold accent />
      </Sec>
      <ST text="3 scénarios d'assurance" />
      {scenarios.map((a, idx) => {
        const paliers = getPaliers(loans, a.ass);
        const mensMax = Math.max(...paliers.map((p) => p.total));
        const tauxEnd = ((mensMax / rev) * 100).toFixed(1);
        const tauxOk = parseFloat(tauxEnd) < 35;
        const resteVivre = netIR - mensMax - 1000;
        let totalPaid = 0,
          totalIns = 0;
        paliers.forEach((p) => {
          totalPaid += p.total * p.duration;
          totalIns += p.ins * p.duration;
        });
        const pG = getPaliers(loans, scenarios[0].ass);
        let gTotal = 0;
        pG.forEach((p) => (gTotal += p.total * p.duration));
        const eco = idx > 0 ? gTotal - totalPaid : null;

        return (
          <div
            key={a.id}
            style={{
              background: "#111827",
              borderRadius: 14,
              padding: "18px 16px",
              marginBottom: 14,
              border: `1px solid ${a.color}22`,
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: 4,
                height: "100%",
                background: a.color,
              }}
            />
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                marginBottom: 12,
              }}
            >
              <div>
                <span style={{ fontSize: 16, fontWeight: 700, color: "#fff" }}>
                  {a.label}
                </span>
                <span style={{ fontSize: 12, color: "#6b7a94", marginLeft: 8 }}>
                  {a.sub}
                </span>
              </div>
            </div>
            <ML text="Mensualités par période" />
            {paliers.map((p, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "3px 0",
                }}
              >
                <span
                  style={{
                    fontSize: 12,
                    color: p.hors === 0 ? "#4f5d75" : "#a0aec0",
                  }}
                >
                  M{p.startM}–M{p.endM}{" "}
                  <span style={{ color: "#4f5d75" }}>({p.duration} mois)</span>
                </span>
                <span
                  style={{
                    fontFamily: "'JetBrains Mono'",
                    fontSize: 12,
                    fontWeight: p.hors === 0 ? 400 : 600,
                    color: p.hors === 0 ? "#4f5d75" : "#fff",
                  }}
                >
                  {p.total.toLocaleString("fr-FR")} €
                </span>
              </div>
            ))}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                margin: "12px 0",
              }}
            >
              <div
                style={{
                  flex: 1,
                  height: 6,
                  background: "#1e2a42",
                  borderRadius: 3,
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    left: `${(35 / 45) * 100}%`,
                    top: -2,
                    bottom: -2,
                    width: 2,
                    background: "#ef444488",
                    zIndex: 2,
                  }}
                />
                <div
                  style={{
                    width: `${(Math.min(parseFloat(tauxEnd), 45) / 45) * 100}%`,
                    height: "100%",
                    background: tauxOk ? a.color : "#ef4444",
                    borderRadius: 3,
                  }}
                />
              </div>
              <span
                style={{
                  fontFamily: "'JetBrains Mono'",
                  fontSize: 12,
                  fontWeight: 600,
                  color: tauxOk ? a.color : "#ef4444",
                  minWidth: 70,
                  textAlign: "right",
                }}
              >
                {tauxEnd}% {parseFloat(tauxEnd) >= 35 ? "⚠" : "✓"}
              </span>
            </div>
            <ML text="Budget (palier le plus élevé)" />
            <Row label="Net après IR" value={fmt(netIR)} dim />
            <Row label="Crédit (max)" value={"− " + fmt(mensMax)} />
            <Row label="Charges" value="− 1 000 €" dim />
            <Div />
            <Row label="Reste à vivre" value={fmt(resteVivre)} bold accent />
            <Row
              label="Par personne (÷4)"
              value={fmt(Math.round(resteVivre / 4))}
              dim
            />
            <div style={{ marginTop: 14 }}>
              <ML text="Coût total" />
              <Row
                label="Intérêts"
                value={fmt(totalPaid - totalIns - totalEmprunte)}
                dim
              />
              <Row label="Assurance" value={fmt(totalIns)} dim />
              <Row label="Total remboursé" value={fmt(totalPaid)} bold />
              <Row label="Surcoût" value={fmt(totalPaid - totalEmprunte)} dim />
            </div>
            {eco > 0 && (
              <div
                style={{
                  marginTop: 12,
                  padding: "8px 12px",
                  background: `${a.color}12`,
                  borderRadius: 8,
                  display: "flex",
                  justifyContent: "space-between",
                }}
              >
                <span style={{ fontSize: 12, color: "#8892a4" }}>
                  Économie vs groupe
                </span>
                <span
                  style={{
                    fontFamily: "'JetBrains Mono'",
                    fontSize: 14,
                    fontWeight: 700,
                    color: a.color,
                  }}
                >
                  + {eco.toLocaleString("fr-FR")} €
                </span>
              </div>
            )}
          </div>
        );
      })}
      <p style={{ fontSize: 11, color: "#4a5568", lineHeight: 1.5 }}>
        Net cadre 75% du brut. IR barème 2025, 3 parts. Endettement = mensualité
        max ÷ revenus nets avant IR.
      </p>
    </>
  );
}

// ============================================================
// TAB 3: SCHEDULE
// ============================================================
function ScheduleTab({ loans, assMois }) {
  const schedule = useMemo(() => buildSchedule(loans), [loans]);
  const maxM = getMaxMonth(loans);
  const maxY = Math.ceil(maxM / 12);

  const yearlyData = useMemo(() => {
    const years = [];
    for (let y = 1; y <= maxY; y++) {
      let interest = 0,
        principal = 0,
        insurance = 0;
      for (let m = (y - 1) * 12 + 1; m <= y * 12 && m <= maxM; m++) {
        const s = schedule[m - 1];
        if (s) {
          interest += s.interest;
          principal += s.principal;
        }
        insurance += insAtMonth(m, loans, assMois);
      }
      years.push({
        year: `A${y}`,
        Capital: Math.round(principal),
        Intérêts: Math.round(interest),
        Assurance: Math.round(insurance),
      });
    }
    return years;
  }, [schedule, loans, assMois, maxY, maxM]);

  const events = [
    {
      month: loans.loan1.anticipation,
      label: "Fin construction",
      color: "#60a5fa",
    },
    {
      month: loans.ptz.anticipation + (loans.ptz.franchiseMonths || 96),
      label: "Fin différé PTZ",
      color: "#a78bfa",
    },
    {
      month: loans.loan2.anticipation + loans.loan2.amortMonths,
      label: "Fin primo + 80k",
      color: "#f39c12",
    },
    {
      month:
        loans.ptz.anticipation +
        (loans.ptz.franchiseMonths || 96) +
        loans.ptz.amortMonths,
      label: "Fin PTZ",
      color: "#10b981",
    },
    {
      month: loans.loan1.anticipation + loans.loan1.amortMonths,
      label: "Fin prêt principal",
      color: "#e74c3c",
    },
  ];

  return (
    <>
      <Sec title="Décomposition annuelle">
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={yearlyData}>
            <XAxis
              dataKey="year"
              tick={{ fontSize: 10, fill: "#4a5568" }}
              interval={Math.max(1, Math.floor(maxY / 7))}
            />
            <YAxis
              tickFormatter={fmtK}
              tick={{ fontSize: 10, fill: "#4a5568" }}
              width={40}
            />
            <Tooltip content={<TT />} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Area
              type="monotone"
              dataKey="Capital"
              stackId="1"
              fill="#3b82f6"
              stroke="#3b82f6"
              fillOpacity={0.7}
            />
            <Area
              type="monotone"
              dataKey="Intérêts"
              stackId="1"
              fill="#ef4444"
              stroke="#ef4444"
              fillOpacity={0.7}
            />
            <Area
              type="monotone"
              dataKey="Assurance"
              stackId="1"
              fill="#a78bfa"
              stroke="#a78bfa"
              fillOpacity={0.7}
            />
          </AreaChart>
        </ResponsiveContainer>
      </Sec>
      <Sec title="Timeline">
        <div style={{ position: "relative", paddingLeft: 16 }}>
          <div
            style={{
              position: "absolute",
              left: 7,
              top: 4,
              bottom: 4,
              width: 2,
              background: "#1e2a42",
            }}
          />
          {events.map((e, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "8px 0",
                position: "relative",
              }}
            >
              <div
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: "50%",
                  background: e.color,
                  border: "2px solid #0a0f1a",
                  zIndex: 1,
                  flexShrink: 0,
                }}
              />
              <div>
                <span
                  style={{
                    fontFamily: "'JetBrains Mono'",
                    fontSize: 12,
                    color: e.color,
                    fontWeight: 600,
                  }}
                >
                  M{e.month}
                </span>
                <span style={{ fontSize: 12, color: "#a0aec0", marginLeft: 8 }}>
                  {e.label}
                </span>
              </div>
            </div>
          ))}
        </div>
      </Sec>
    </>
  );
}

// ============================================================
// TAB 4: EARLY REPAYMENT
// ============================================================
function RATab({ ra, setRA, loans }) {
  const base = useMemo(() => simulateRA(0, "duration", loans), [loans]);
  const dur = useMemo(() => simulateRA(ra, "duration", loans), [ra, loans]);
  const pay = useMemo(() => simulateRA(ra, "payment", loans), [ra, loans]);
  const [chart, setChart] = useState("capital");
  const savedD = base.totalInterest - dur.totalInterest,
    savedP = base.totalInterest - pay.totalInterest;
  const netD = savedD - dur.totalIRA,
    netP = savedP - pay.totalIRA;
  const yrD = base.endYear - dur.endYear,
    yrP = base.endYear - pay.endYear;
  const cd = [];
  for (let y = 0; y < 27; y++)
    cd.push({
      year: `A${y + 1}`,
      "Sans RA": base.data[y]?.capital ?? 0,
      "Réd. durée": dur.data[y]?.capital ?? 0,
      "Réd. mens.": pay.data[y]?.capital ?? 0,
      "Int. sans": base.data[y]?.interest ?? base.totalInterest,
      "Int. durée": dur.data[y]?.interest ?? dur.totalInterest,
      "Int. mens.": pay.data[y]?.interest ?? pay.totalInterest,
      "Pmt durée": dur.data[y]?.payment ?? 0,
      "Pmt mens.": pay.data[y]?.payment ?? 0,
    });

  return (
    <>
      <Sec title="Remboursement anticipé">
        <NI
          label="RA annuel (chaque janvier)"
          value={ra}
          onChange={setRA}
          suffix="€/an"
          step={1000}
        />
        <p style={{ fontSize: 11, color: "#4f5d75", marginTop: 4 }}>
          Priorité : taux 3,35% puis 3,25%. PTZ et primo : jamais. IRA calculée.
        </p>
      </Sec>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 6,
          marginBottom: 20,
        }}
      >
        <SC
          label="Sans RA"
          dur={`${base.endYear} ans`}
          int={fmt(base.totalInterest)}
          color="#6b7a94"
        />
        <SC
          label="Réd. durée"
          dur={`${dur.endYear} ans`}
          int={fmt(dur.totalInterest)}
          saved={savedD > 0 ? `−${fmt(savedD)}` : null}
          yrSaved={yrD > 0 ? `−${yrD} ans` : null}
          color="#3b82f6"
        />
        <SC
          label="Réd. mens."
          dur={`${pay.endYear} ans`}
          int={fmt(pay.totalInterest)}
          saved={savedP > 0 ? `−${fmt(savedP)}` : null}
          yrSaved={yrP > 0 ? `−${yrP} ans` : null}
          color="#10b981"
        />
      </div>
      <div
        style={{
          display: "flex",
          background: "#141b2d",
          borderRadius: 10,
          padding: 3,
          marginBottom: 16,
          border: "1px solid #1e2a42",
        }}
      >
        {[
          { id: "capital", l: "Capital" },
          { id: "payment", l: "Mensualités" },
          { id: "interest", l: "Intérêts" },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setChart(t.id)}
            style={{
              flex: 1,
              padding: "8px 0",
              border: "none",
              borderRadius: 8,
              fontSize: 11,
              fontWeight: 600,
              fontFamily: "inherit",
              cursor: "pointer",
              background: chart === t.id ? "#2563eb" : "transparent",
              color: chart === t.id ? "#fff" : "#6b7a94",
            }}
          >
            {t.l}
          </button>
        ))}
      </div>
      <div
        style={{
          background: "#111827",
          borderRadius: 14,
          padding: "16px 8px 8px 0",
          marginBottom: 16,
          border: "1px solid #1e2a42",
        }}
      >
        {chart === "capital" && (
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={cd}>
              <XAxis
                dataKey="year"
                tick={{ fontSize: 10, fill: "#4a5568" }}
                interval={4}
              />
              <YAxis
                tickFormatter={fmtK}
                tick={{ fontSize: 10, fill: "#4a5568" }}
                width={40}
              />
              <Tooltip content={<TT />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line
                type="monotone"
                dataKey="Sans RA"
                stroke="#6b7a94"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="Réd. durée"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="Réd. mens."
                stroke="#10b981"
                strokeWidth={2}
                dot={false}
                strokeDasharray="5 3"
              />
            </LineChart>
          </ResponsiveContainer>
        )}
        {chart === "payment" && (
          <ResponsiveContainer width="100%" height={250}>
            <BarChart
              data={cd.slice(0, Math.max(dur.endYear, pay.endYear, 10))}
              barGap={2}
            >
              <XAxis
                dataKey="year"
                tick={{ fontSize: 10, fill: "#4a5568" }}
                interval={1}
              />
              <YAxis
                tickFormatter={fmtK}
                tick={{ fontSize: 10, fill: "#4a5568" }}
                width={40}
              />
              <Tooltip content={<TT />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="Pmt durée" fill="#3b82f6" radius={[3, 3, 0, 0]} />
              <Bar dataKey="Pmt mens." fill="#10b981" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
        {chart === "interest" && (
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={cd}>
              <XAxis
                dataKey="year"
                tick={{ fontSize: 10, fill: "#4a5568" }}
                interval={4}
              />
              <YAxis
                tickFormatter={fmtK}
                tick={{ fontSize: 10, fill: "#4a5568" }}
                width={40}
              />
              <Tooltip content={<TT />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line
                type="monotone"
                dataKey="Int. sans"
                stroke="#6b7a94"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="Int. durée"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="Int. mens."
                stroke="#10b981"
                strokeWidth={2}
                dot={false}
                strokeDasharray="5 3"
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
      <ST text="Réduire la durée" />
      <div
        style={{
          background: "#111827",
          borderRadius: 14,
          padding: "18px 16px",
          marginBottom: 14,
          border: "1px solid #3b82f622",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: 4,
            height: "100%",
            background: "#3b82f6",
          }}
        />
        <Row label="Durée" value={`${dur.endYear} ans (−${yrD} ans)`} bold />
        <Row label="Intérêts payés" value={fmt(dur.totalInterest)} />
        <Row label="Intérêts économisés" value={fmt(savedD)} bold accent />
        <Row label="IRA payées" value={fmt(dur.totalIRA)} dim />
        <Div />
        <Row label="Économie nette" value={fmt(netD)} bold accent />
        <Row label="Total RA" value={fmt(dur.totalExtra)} dim />
      </div>
      <ST text="Réduire les mensualités (boule de neige)" />
      <div
        style={{
          background: "#111827",
          borderRadius: 14,
          padding: "18px 16px",
          marginBottom: 14,
          border: "1px solid #10b98122",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: 4,
            height: "100%",
            background: "#10b981",
          }}
        />
        <Row label="Durée" value={`${pay.endYear} ans (−${yrP} ans)`} bold />
        <Row label="Intérêts payés" value={fmt(pay.totalInterest)} />
        <Row label="Intérêts économisés" value={fmt(savedP)} bold accent />
        <Row label="IRA payées" value={fmt(pay.totalIRA)} dim />
        <Div />
        <Row label="Économie nette" value={fmt(netP)} bold accent />
        <Row
          label="Total RA (+ boule de neige)"
          value={fmt(pay.totalExtra)}
          dim
        />
      </div>
      <div
        style={{
          background: "#1a1f35",
          borderRadius: 14,
          padding: 16,
          marginBottom: 16,
          border: "1px solid #7c3aed33",
        }}
      >
        <h3
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: "#a78bfa",
            marginBottom: 10,
          }}
        >
          Verdict
        </h3>
        <p
          style={{ fontSize: 13, color: "#c9d1d9", lineHeight: 1.6, margin: 0 }}
        >
          Avec {fmt(ra)}/an, économie nette de{" "}
          <strong style={{ fontFamily: "'JetBrains Mono'", color: "#fff" }}>
            {fmt(Math.round((netD + netP) / 2))}
          </strong>{" "}
          (après IRA) et{" "}
          <strong style={{ fontFamily: "'JetBrains Mono'", color: "#fff" }}>
            {Math.round((yrD + yrP) / 2)} ans
          </strong>{" "}
          de crédit en moins.
        </p>
        <p
          style={{
            fontSize: 13,
            color: "#c9d1d9",
            lineHeight: 1.6,
            margin: "10px 0 0",
          }}
        >
          <strong style={{ color: "#10b981" }}>
            La réduction de mensualité
          </strong>{" "}
          offre plus de flexibilité avec un résultat quasi identique grâce à
          l'effet boule de neige.
        </p>
      </div>
      <p style={{ fontSize: 11, color: "#4a5568", lineHeight: 1.5 }}>
        IRA = min(6 mois d'intérêts, 3% du CRD). Seuil min RA : 10% du capital
        initial (sauf solde). PTZ et primo sans IRA.
      </p>
    </>
  );
}

// ============================================================
// SHARED COMPONENTS
// ============================================================
function Sec({ title, children }) {
  return (
    <div
      style={{
        background: "#111827",
        borderRadius: 14,
        padding: 16,
        marginBottom: 14,
        border: "1px solid #1e2a42",
      }}
    >
      <h3
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: "#6b7a94",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          marginBottom: 12,
        }}
      >
        {title}
      </h3>
      {children}
    </div>
  );
}
function ST({ text }) {
  return (
    <h2
      style={{
        fontSize: 14,
        fontWeight: 600,
        color: "#8892a4",
        textTransform: "uppercase",
        letterSpacing: "0.06em",
        marginTop: 28,
        marginBottom: 16,
      }}
    >
      {text}
    </h2>
  );
}
function Row({ label, value, bold, dim, accent }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
        padding: "4px 0",
      }}
    >
      <span
        style={{
          fontSize: 13,
          color: dim ? "#4f5d75" : "#a0aec0",
          fontWeight: bold ? 600 : 400,
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontFamily: "'JetBrains Mono'",
          fontSize: 13,
          fontWeight: bold ? 700 : 400,
          color: accent
            ? "#60a5fa"
            : bold
              ? "#fff"
              : dim
                ? "#4f5d75"
                : "#c9d1d9",
        }}
      >
        {value}
      </span>
    </div>
  );
}
function Div() {
  return <div style={{ height: 1, background: "#1e2a42", margin: "6px 0" }} />;
}
function ML({ text }) {
  return (
    <p
      style={{
        fontSize: 11,
        fontWeight: 600,
        color: "#4f5d75",
        textTransform: "uppercase",
        letterSpacing: "0.05em",
        marginBottom: 6,
        marginTop: 0,
      }}
    >
      {text}
    </p>
  );
}
function NI({ label, value, onChange, suffix, step = 1000, isDecimal }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "6px 0",
      }}
    >
      <span style={{ fontSize: 13, color: "#a0aec0" }}>{label}</span>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <input
          type="number"
          value={value}
          onChange={(e) =>
            onChange(
              isDecimal
                ? parseFloat(e.target.value) || 0
                : parseInt(e.target.value) || 0,
            )
          }
          step={step}
          style={{
            fontFamily: "'JetBrains Mono'",
            fontSize: 14,
            fontWeight: 600,
            color: "#fff",
            background: "#1a2236",
            border: "1px solid #2a3a5c",
            borderRadius: 8,
            padding: "6px 10px",
            width: isDecimal ? 80 : 110,
            textAlign: "right",
            outline: "none",
          }}
        />
        <span style={{ fontSize: 11, color: "#6b7a94", minWidth: 36 }}>
          {suffix}
        </span>
      </div>
    </div>
  );
}
function SC({ label, dur, int: interest, saved, yrSaved, color }) {
  return (
    <div
      style={{
        background: "#111827",
        borderRadius: 10,
        padding: "12px 8px",
        border: `1px solid ${color}22`,
        textAlign: "center",
      }}
    >
      <p
        style={{
          fontSize: 10,
          fontWeight: 600,
          color,
          margin: "0 0 6px",
          textTransform: "uppercase",
        }}
      >
        {label}
      </p>
      <p
        style={{
          fontFamily: "'JetBrains Mono'",
          fontSize: 15,
          fontWeight: 700,
          color: "#fff",
          margin: "0 0 2px",
        }}
      >
        {dur}
      </p>
      <p
        style={{
          fontFamily: "'JetBrains Mono'",
          fontSize: 10,
          color: "#6b7a94",
          margin: 0,
        }}
      >
        {interest}
      </p>
      {saved && (
        <p
          style={{
            fontFamily: "'JetBrains Mono'",
            fontSize: 10,
            color: "#10b981",
            margin: "3px 0 0",
            fontWeight: 600,
          }}
        >
          {saved}
        </p>
      )}
      {yrSaved && (
        <p
          style={{
            fontFamily: "'JetBrains Mono'",
            fontSize: 10,
            color: "#60a5fa",
            margin: "2px 0 0",
          }}
        >
          {yrSaved}
        </p>
      )}
    </div>
  );
}

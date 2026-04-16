import { describe, it, expect } from "vitest";
import { FISE, FISE_INS_TOTAL } from "../constants/fise.js";
import { pmtCalc, capAfterAntic } from "../lib/finance/pmt.js";
import { computeLoan1Palliers } from "../lib/finance/palliers.js";
import {
  getPaymentAtMonth,
  insAtMonth,
  getMaxMonth,
  getPaliers,
} from "../lib/finance/payment.js";
import { buildSchedule } from "../lib/finance/schedule.js";
import { calcIR } from "../lib/finance/tax.js";
import { simulateRA } from "../lib/finance/earlyRepayment.js";

const loans = () => ({
  loan1: { ...FISE.loan1 },
  loan2: { ...FISE.loan2 },
  loan3: { ...FISE.loan3 },
  ptz: { ...FISE.ptz },
});

const round2 = (n) => Math.round(n * 100) / 100;

describe("pmt", () => {
  it("pmtCalc 175440€ @ 3.35% sur 300 mois", () => {
    expect(round2(pmtCalc(175440, 3.35, 300))).toMatchSnapshot();
  });
  it("pmtCalc sans taux", () => {
    expect(pmtCalc(20000, 0, 180)).toBe(20000 / 180);
  });
  it("capAfterAntic loan1 FISE", () => {
    expect(round2(capAfterAntic(175440, 3.35, 24))).toMatchSnapshot();
  });
  it("capAfterAntic sans taux", () => {
    expect(capAfterAntic(56700, 0, 24)).toBe(56700);
  });
});

describe("tax calcIR", () => {
  it("brut 50k + net 1800", () => {
    expect(calcIR(50000, 1800)).toMatchSnapshot();
  });
  it("brut 30k + net 1500", () => {
    expect(calcIR(30000, 1500)).toMatchSnapshot();
  });
  it("brut 80k + net 2500", () => {
    expect(calcIR(80000, 2500)).toMatchSnapshot();
  });
});

describe("palliers loan1 lissés", () => {
  it("FISE defaults", () => {
    const pal = computeLoan1Palliers(loans());
    expect({
      p1B: round2(pal.p1B),
      p1C: round2(pal.p1C),
      p1D: round2(pal.p1D),
      p1E: round2(pal.p1E),
      m_l1_start: pal.m_l1_start,
      m_ptz_start: pal.m_ptz_start,
      m_short_end: pal.m_short_end,
      m_ptz_end: pal.m_ptz_end,
      m_l1_end: pal.m_l1_end,
    }).toMatchSnapshot();
  });
});

describe("payment per month", () => {
  it("getMaxMonth FISE", () => {
    expect(getMaxMonth(loans())).toMatchSnapshot();
  });
  it("getPaymentAtMonth sample points", () => {
    const l = loans();
    const points = [1, 24, 25, 100, 120, 200, 210, 288, 324];
    const out = Object.fromEntries(
      points.map((m) => [m, round2(getPaymentAtMonth(m, l))]),
    );
    expect(out).toMatchSnapshot();
  });
  it("insAtMonth sample points (ass=178)", () => {
    const l = loans();
    const points = [1, 100, 204, 205, 264, 265, 324, 325];
    const out = Object.fromEntries(
      points.map((m) => [m, round2(insAtMonth(m, l, 178))]),
    );
    expect(out).toMatchSnapshot();
  });
  it("getPaliers FISE ass=178", () => {
    expect(getPaliers(loans(), 178)).toMatchSnapshot();
  });
  it("getPaliers FISE ass=100", () => {
    expect(getPaliers(loans(), 100)).toMatchSnapshot();
  });
  it("getPaliers FISE ass=80", () => {
    expect(getPaliers(loans(), 80)).toMatchSnapshot();
  });
});

describe("buildSchedule", () => {
  it("FISE sample points", () => {
    const s = buildSchedule(loans());
    const pick = (i) => ({
      month: s[i].month,
      interest: round2(s[i].interest),
      principal: round2(s[i].principal),
      capitalRemaining: round2(s[i].capitalRemaining),
    });
    expect({
      total: s.length,
      first: pick(0),
      m100: pick(99),
      m200: pick(199),
      last: pick(s.length - 1),
    }).toMatchSnapshot();
  });
});

describe("simulateRA", () => {
  const pickResult = (r) => ({
    totalInterest: r.totalInterest,
    totalPaid: r.totalPaid,
    totalExtra: r.totalExtra,
    totalIRA: r.totalIRA,
    endYear: r.endYear,
    year1: r.data[0],
    year5: r.data[4],
    year10: r.data[9],
    year15: r.data[14],
    lastFilled: r.data.findLast
      ? r.data.findLast((d) => d.capital > 0)
      : [...r.data].reverse().find((d) => d.capital > 0),
  });

  it("baseline (0 RA)", () => {
    const r = simulateRA(0, "duration", loans());
    expect(pickResult(r)).toMatchSnapshot();
  });
  it("12k/an, strategy=duration", () => {
    const r = simulateRA(12000, "duration", loans());
    expect(pickResult(r)).toMatchSnapshot();
  });
  it("12k/an, strategy=payment", () => {
    const r = simulateRA(12000, "payment", loans());
    expect(pickResult(r)).toMatchSnapshot();
  });
  it("6k/an, strategy=duration", () => {
    const r = simulateRA(6000, "duration", loans());
    expect(pickResult(r)).toMatchSnapshot();
  });
  it("24k/an, strategy=payment", () => {
    const r = simulateRA(24000, "payment", loans());
    expect(pickResult(r)).toMatchSnapshot();
  });
});

describe("constants", () => {
  it("FISE_INS_TOTAL", () => {
    expect(FISE_INS_TOTAL).toBe(178.03);
  });
  it("FISE structure", () => {
    expect(Object.keys(FISE).sort()).toEqual([
      "loan1",
      "loan2",
      "loan3",
      "ptz",
    ]);
  });
});

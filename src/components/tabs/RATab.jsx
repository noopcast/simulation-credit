import { useState, useMemo } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { fmt, fmtK } from "../../lib/format.js";
import { simulateRA } from "../../lib/finance/earlyRepayment.js";
import Section from "../ui/Section.jsx";
import SectionTitle from "../ui/SectionTitle.jsx";
import NumberInput from "../ui/NumberInput.jsx";
import Row from "../ui/Row.jsx";
import Divider from "../ui/Divider.jsx";
import StrategyCard from "../ui/StrategyCard.jsx";
import ChartTooltip from "../chart/ChartTooltip.jsx";

const YEARS_DISPLAY = 27;

export default function RATab({ ra, setRA, loans }) {
  const base = useMemo(() => simulateRA(0, "duration", loans), [loans]);
  const dur = useMemo(() => simulateRA(ra, "duration", loans), [ra, loans]);
  const pay = useMemo(() => simulateRA(ra, "payment", loans), [ra, loans]);
  const [chart, setChart] = useState("capital");

  const savedD = base.totalInterest - dur.totalInterest;
  const savedP = base.totalInterest - pay.totalInterest;
  const netD = savedD - dur.totalIRA;
  const netP = savedP - pay.totalIRA;
  const yrD = base.endYear - dur.endYear;
  const yrP = base.endYear - pay.endYear;

  const cd = [];
  for (let y = 0; y < YEARS_DISPLAY; y++) {
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
  }

  return (
    <>
      <Section title="Remboursement anticipé">
        <NumberInput
          label="RA annuel (chaque janvier)"
          value={ra}
          onChange={setRA}
          suffix="€/an"
          step={1000}
        />
        <p style={{ fontSize: 11, color: "#4f5d75", marginTop: 4 }}>
          Priorité : taux 3,35% puis 3,25%. PTZ et primo : jamais. IRA calculée.
        </p>
      </Section>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 6,
          marginBottom: 20,
        }}
      >
        <StrategyCard
          label="Sans RA"
          dur={`${base.endYear} ans`}
          int={fmt(base.totalInterest)}
          color="#6b7a94"
        />
        <StrategyCard
          label="Réd. durée"
          dur={`${dur.endYear} ans`}
          int={fmt(dur.totalInterest)}
          saved={savedD > 0 ? `−${fmt(savedD)}` : null}
          yrSaved={yrD > 0 ? `−${yrD} ans` : null}
          color="#3b82f6"
        />
        <StrategyCard
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
              minHeight: 40,
              padding: "0 4px",
              border: "none",
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 600,
              fontFamily: "inherit",
              cursor: "pointer",
              background: chart === t.id ? "#2563eb" : "transparent",
              color: chart === t.id ? "#fff" : "#6b7a94",
              transition: "background 0.15s ease, color 0.15s ease",
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
              <Tooltip content={<ChartTooltip />} />
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
              <Tooltip content={<ChartTooltip />} />
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
              <Tooltip content={<ChartTooltip />} />
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
      <SectionTitle text="Réduire la durée" />
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
        <Divider />
        <Row label="Économie nette" value={fmt(netD)} bold accent />
        <Row label="Total RA" value={fmt(dur.totalExtra)} dim />
      </div>
      <SectionTitle text="Réduire les mensualités (boule de neige)" />
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
        <Divider />
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

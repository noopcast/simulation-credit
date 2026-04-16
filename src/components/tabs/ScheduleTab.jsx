import { useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { fmtK } from "../../lib/format.js";
import { buildSchedule } from "../../lib/finance/schedule.js";
import { insAtMonth, getMaxMonth } from "../../lib/finance/payment.js";
import Section from "../ui/Section.jsx";
import ChartTooltip from "../chart/ChartTooltip.jsx";

export default function ScheduleTab({ loans, assMois }) {
  const schedule = useMemo(() => buildSchedule(loans), [loans]);
  const maxM = getMaxMonth(loans);
  const maxY = Math.ceil(maxM / 12);

  const yearlyData = useMemo(() => {
    const years = [];
    for (let y = 1; y <= maxY; y++) {
      let interest = 0;
      let principal = 0;
      let insurance = 0;
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
      <Section title="Décomposition annuelle">
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
            <Tooltip content={<ChartTooltip />} />
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
      </Section>
      <Section title="Timeline">
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
      </Section>
    </>
  );
}

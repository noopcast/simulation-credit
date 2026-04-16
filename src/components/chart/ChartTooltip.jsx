import { fmt } from "../../lib/format.js";

// Tooltip partagé pour tous les graphiques recharts.
// formatValue : (value, name) => string. Par défaut : montant en €.
// formatLabel : (label) => string. Par défaut : identité.
export default function ChartTooltip({
  active,
  payload,
  label,
  formatValue,
  formatLabel,
}) {
  if (!active || !payload?.length) return null;
  const fmtV = formatValue || ((v) => fmt(v || 0));
  const fmtL = formatLabel || ((l) => l);
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
      <p style={{ color: "#8892a4", marginBottom: 4 }}>{fmtL(label)}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color || p.fill, margin: "2px 0" }}>
          {p.name}: {fmtV(p.value, p.name)}
        </p>
      ))}
    </div>
  );
}

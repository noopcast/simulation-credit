import { FISE } from "../../constants/fise.js";
import { fmt } from "../../lib/format.js";
import Section from "../ui/Section.jsx";
import NumberInput from "../ui/NumberInput.jsx";
import Row from "../ui/Row.jsx";

export default function ParamsTab({ loans, setLoans, assMois, setAssMois }) {
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

      <Section title="Assurance emprunteur (contrat unique, 4 prêts)">
        <NumberInput
          label="Cotisation mensuelle totale"
          value={assMois}
          onChange={setAssMois}
          suffix="€/mois"
          step={10}
        />
        <Row label="Groupe Suravenir (défaut)" value="178 €" dim />
      </Section>

      {[
        ["loan1", loans.loan1],
        ["loan2", loans.loan2],
        ["loan3", loans.loan3],
        ["ptz", loans.ptz],
      ].map(([k, l]) => (
        <Section key={k} title={l.label}>
          <NumberInput
            label="Capital"
            value={l.capital}
            onChange={(v) => update(k, "capital", v)}
            suffix="€"
            step={1000}
          />
          <NumberInput
            label="Taux nominal"
            value={l.rate}
            onChange={(v) => update(k, "rate", v)}
            suffix="%"
            step={0.05}
            isDecimal
          />
          <NumberInput
            label="Durée amortissement"
            value={l.amortMonths}
            onChange={(v) => update(k, "amortMonths", v)}
            suffix="mois"
            step={12}
          />
          <Row label="Frais" value={fmt(l.commission + l.garantie)} dim />
        </Section>
      ))}
    </>
  );
}

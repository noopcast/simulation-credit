import { fmt } from "../../lib/format.js";
import { calcIR } from "../../lib/finance/tax.js";
import { getPaliers } from "../../lib/finance/payment.js";
import Section from "../ui/Section.jsx";
import SectionTitle from "../ui/SectionTitle.jsx";
import NumberInput from "../ui/NumberInput.jsx";
import Row from "../ui/Row.jsx";
import Divider from "../ui/Divider.jsx";
import MicroLabel from "../ui/MicroLabel.jsx";

export default function BudgetTab({
  brutF,
  setBrutF,
  netS,
  setNetS,
  loans,
  assMois,
}) {
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
      <Section title="Paramètres revenus">
        <NumberInput
          label="Fabian (brut annuel, cadre)"
          value={brutF}
          onChange={setBrutF}
          suffix="€/an"
          step={5000}
        />
        <NumberInput
          label="Samia (net mensuel)"
          value={netS}
          onChange={setNetS}
          suffix="€/mois"
          step={100}
        />
      </Section>
      <Section title="Revenus mensuels nets">
        <Row label="Fabian (75% du brut)" value={fmt(netF)} />
        <Row label="Samia" value={fmt(netS)} />
        <Divider />
        <Row label="Total foyer" value={fmt(rev)} bold />
        <Row label="IR (3 parts)" value={"− " + fmt(ir)} dim />
        <Divider />
        <Row label="Net après impôt" value={fmt(netIR)} bold accent />
      </Section>
      <SectionTitle text="3 scénarios d'assurance" />
      {scenarios.map((a, idx) => {
        const paliers = getPaliers(loans, a.ass);
        const mensMax = Math.max(...paliers.map((p) => p.total));
        const tauxEnd = ((mensMax / rev) * 100).toFixed(1);
        const tauxOk = parseFloat(tauxEnd) < 35;
        const resteVivre = netIR - mensMax - 1000;
        let totalPaid = 0;
        let totalIns = 0;
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
            <MicroLabel text="Mensualités par période" />
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
            <MicroLabel text="Budget (palier le plus élevé)" />
            <Row label="Net après IR" value={fmt(netIR)} dim />
            <Row label="Crédit (max)" value={"− " + fmt(mensMax)} />
            <Row label="Charges" value="− 1 000 €" dim />
            <Divider />
            <Row label="Reste à vivre" value={fmt(resteVivre)} bold accent />
            <Row
              label="Par personne (÷4)"
              value={fmt(Math.round(resteVivre / 4))}
              dim
            />
            <div style={{ marginTop: 14 }}>
              <MicroLabel text="Coût total" />
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

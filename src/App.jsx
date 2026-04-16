import { useState } from "react";
import { FISE } from "./constants/fise.js";
import { fmt } from "./lib/format.js";
import ParamsTab from "./components/tabs/ParamsTab.jsx";
import BudgetTab from "./components/tabs/BudgetTab.jsx";
import ScheduleTab from "./components/tabs/ScheduleTab.jsx";
import RATab from "./components/tabs/RATab.jsx";

const TABS = [
  { id: "params", label: "Prêts" },
  { id: "budget", label: "Budget" },
  { id: "schedule", label: "Échéancier" },
  { id: "ra", label: "Remb. anticipé" },
];

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

  return (
    <div className="app-root">
      <h1
        style={{
          fontSize: 22,
          fontWeight: 700,
          color: "#fff",
          margin: "4px 0 4px",
        }}
      >
        Simulation de crédit
      </h1>
      <p style={{ fontSize: 13, color: "#8892a4", marginBottom: 12 }}>
        {fmt(totalEmprunte)} · PTZ {fmt(loans.ptz.capital)} · PACS + 2 enfants
      </p>
      <nav className="app-tabbar">
        <div className="app-tabbar-inner">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`app-tab${tab === t.id ? " is-active" : ""}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </nav>
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

export default function StrategyCard({
  label,
  dur,
  int: interest,
  saved,
  yrSaved,
  color,
}) {
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

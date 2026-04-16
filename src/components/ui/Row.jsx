export default function Row({ label, value, bold, dim, accent }) {
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

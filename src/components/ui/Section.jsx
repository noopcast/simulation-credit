export default function Section({ title, children }) {
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

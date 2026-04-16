export default function SectionTitle({ text }) {
  return (
    <h2
      style={{
        fontSize: 14,
        fontWeight: 600,
        color: "#8892a4",
        textTransform: "uppercase",
        letterSpacing: "0.06em",
        marginTop: 28,
        marginBottom: 16,
      }}
    >
      {text}
    </h2>
  );
}

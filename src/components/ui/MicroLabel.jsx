export default function MicroLabel({ text }) {
  return (
    <p
      style={{
        fontSize: 11,
        fontWeight: 600,
        color: "#4f5d75",
        textTransform: "uppercase",
        letterSpacing: "0.05em",
        marginBottom: 6,
        marginTop: 0,
      }}
    >
      {text}
    </p>
  );
}

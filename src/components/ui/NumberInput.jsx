export default function NumberInput({
  label,
  value,
  onChange,
  suffix,
  step = 1000,
  isDecimal,
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 10,
        padding: "6px 0",
      }}
    >
      <span style={{ fontSize: 13, color: "#a0aec0", flex: 1, minWidth: 0 }}>
        {label}
      </span>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          flexShrink: 0,
        }}
      >
        <input
          type="number"
          value={value}
          onChange={(e) =>
            onChange(
              isDecimal
                ? parseFloat(e.target.value) || 0
                : parseInt(e.target.value) || 0,
            )
          }
          step={step}
          className={isDecimal ? "app-num app-num--narrow" : "app-num"}
        />
        <span style={{ fontSize: 11, color: "#6b7a94", minWidth: 36 }}>
          {suffix}
        </span>
      </div>
    </div>
  );
}

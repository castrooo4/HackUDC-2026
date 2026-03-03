export default function ThemeSlider({ isLight, onToggle }) {
  return (
    <div onClick={onToggle} style={containerStyle}>
      <div
        style={{
          ...dotStyle,
          transform: isLight ? "translateX(24px)" : "translateX(0px)",
          background: isLight ? "#f1c40f" : "#46d37e",
        }}
      >
        {isLight ? "L" : "D"}
      </div>
    </div>
  );
}

const containerStyle = {
  width: "54px",
  height: "28px",
  borderRadius: "20px",
  background: "rgba(70, 211, 126, 0.2)",
  border: "1px solid rgba(70, 211, 126, 0.3)",
  cursor: "pointer",
  position: "relative",
  display: "flex",
  alignItems: "center",
  padding: "0 4px",
  transition: "all 0.3s",
};

const dotStyle = {
  width: "20px",
  height: "20px",
  borderRadius: "50%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "12px",
  transition: "all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
};

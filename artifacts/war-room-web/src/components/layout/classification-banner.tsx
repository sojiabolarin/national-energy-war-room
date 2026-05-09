export function ClassificationBanner() {
  return (
    <div
      className="fixed top-0 left-0 w-full z-50 flex items-center justify-center bg-primary text-primary-foreground"
      style={{ height: 24 }}
    >
      <span
        style={{
          fontFamily: "Arial, sans-serif",
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.15em",
          textTransform: "uppercase",
          userSelect: "none",
        }}
      >
        RESTRICTED — MINISTER'S WAR ROOM — DO NOT DISTRIBUTE
      </span>
    </div>
  );
}

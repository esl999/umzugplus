"use client";

const steps = [
  { key: "neu", label: "Angebot" },
  { key: "bestaetigt", label: "Bestätigt" },
  { key: "bezahlt", label: "Bezahlt" },
  { key: "abgeschlossen", label: "Abgeschlossen" },
];

export default function StatusStepper({ status, bezahlt, gesamt }) {
  if (status === "storniert") {
    return (
      <div className="status-stepper">
        <div className="status-step done storniert">
          <span className="status-dot" />
          <span className="status-label">Storniert</span>
        </div>
      </div>
    );
  }

  let currentIndex = 0;
  if (status === "bestaetigt") currentIndex = bezahlt > 0 ? 2 : 1;
  if (status === "abgeschlossen") currentIndex = 3;

  return (
    <div className="status-stepper">
      {steps.map((s, i) => (
        <div key={s.key} className={"status-step" + (i <= currentIndex ? " done" : "")}>
          <span className="status-dot">{i < currentIndex ? "✓" : ""}</span>
          <span className="status-label">{s.label}</span>
          {i < steps.length - 1 && <span className={"status-connector" + (i < currentIndex ? " done" : "")} />}
        </div>
      ))}
    </div>
  );
}

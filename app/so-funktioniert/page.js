import Link from "next/link";

export const metadata = { title: "So funktioniert's — UmzugPlus" };

const schritte = [
  {
    n: "1",
    title: "Leistung & Angaben wählen",
    text: "Du entscheidest dich für Umzug oder Entsorgung und gibst an, ob du privat oder gewerblich buchst. Anschließend berechnest du wahlweise nach Wohnfläche oder nach einzelnen Gegenständen — je nachdem, was für dich schneller oder genauer ist.",
  },
  {
    n: "2",
    title: "Adressen, Etagen & Zusatzleistungen",
    text: "Du trägst Start- und Zieladresse ein (Start aktuell innerhalb Nordrhein-Westfalens, Ziel deutschlandweit), gibst die Etagen sowie vorhandene Aufzüge an und wählst optionale Zusatzleistungen wie Möbelmontage, Verpackungsservice oder eine Halteverbotszone.",
  },
  {
    n: "3",
    title: "Transparenter Sofort-Preis",
    text: "Direkt im Browser siehst du eine vollständige Aufschlüsselung: Grundpreis, Fläche bzw. Gegenstände, Etagenzuschlag, Transportkosten und Steuer — ohne versteckte Kosten. Optional wählst du gleich deinen Wunschtermin im Kalender.",
  },
  {
    n: "4",
    title: "Unverbindliche Anfrage senden",
    text: "Mit einem Klick sendest du deine Anfrage ab. Sie erscheint sofort in deinem Kundenkonto unter „Meine Aufträge” — dort kannst du jederzeit den aktuellen Status einsehen.",
  },
  {
    n: "5",
    title: "Bestätigung durch unser Team",
    text: "Wir prüfen deine Anfrage und bestätigen den Auftrag. Ab diesem Zeitpunkt steht deine Auftragsbestätigung als Dokument in deinem Konto bereit, und die Anzahlung wird fällig — sie muss innerhalb von 24 Stunden eingehen, damit der Termin verbindlich reserviert bleibt.",
  },
  {
    n: "6",
    title: "Anzahlung & Restzahlung",
    text: "Nach Zahlungseingang bestätigen wir deine Anzahlung, danach findest du den entsprechenden Beleg in deinem Konto. Die Restzahlung erfolgt nach erfolgter Leistung; sobald sie vollständig verbucht ist, steht dir die finale Rechnung zum Download bereit.",
  },
  {
    n: "7",
    title: "Durchführung zum vereinbarten Termin",
    text: "Unser Team erledigt deinen Umzug oder deine Entsorgung zuverlässig zum gebuchten Termin — mit der von dir gewählten Anzahl an Mitarbeitern.",
  },
];

export default function SoFunktioniertPage() {
  return (
    <div className="wrap" style={{ padding: "56px 0 80px" }}>
      <span className="badge">So funktioniert's</span>
      <h1 style={{ fontFamily: "var(--display)", fontWeight: 800, fontSize: "clamp(28px, 4vw, 40px)", marginTop: 14, marginBottom: 12 }}>
        Vom Preis bis zur Durchführung — Schritt für Schritt
      </h1>
      <p style={{ color: "var(--text-dim)", maxWidth: 640, marginBottom: 40 }}>
        Wir halten den gesamten Ablauf so transparent wie möglich. Hier siehst du genau, was nach deiner
        Preisberechnung passiert.
      </p>

      <div style={{ display: "grid", gap: 20, maxWidth: 720 }}>
        {schritte.map((s) => (
          <div key={s.n} className="price-row" style={{ alignItems: "flex-start" }}>
            <div style={{ display: "flex", gap: 16 }}>
              <div style={{
                width: 34, height: 34, borderRadius: "50%", background: "var(--yellow-soft)",
                color: "var(--yellow-dark)", fontFamily: "var(--display)", fontWeight: 700,
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}>
                {s.n}
              </div>
              <div>
                <h3 style={{ fontFamily: "var(--display)", fontSize: 16, fontWeight: 700, marginBottom: 6 }}>{s.title}</h3>
                <p style={{ fontSize: 14, color: "var(--text-dim)", lineHeight: 1.6 }}>{s.text}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="btn-row" style={{ marginTop: 40 }}>
        <Link className="btn primary" href="/#rechner">Jetzt Preis berechnen</Link>
      </div>
    </div>
  );
}

export const metadata = { title: "Über uns — UmzugPlus" };

export default function UeberUnsPage() {
  return (
    <div className="wrap" style={{ padding: "56px 0 80px" }}>
      <span className="badge">Über uns</span>
      <h1 style={{ fontFamily: "var(--display)", fontWeight: 800, fontSize: "clamp(28px, 4vw, 40px)", marginTop: 14, marginBottom: 20 }}>
        Umzug &amp; Entsorgung — transparent, fair, persönlich.
      </h1>

      <div style={{ display: "grid", gap: 24, maxWidth: 720 }}>
        <p style={{ color: "var(--text-dim)", lineHeight: 1.7 }}>
          UmzugPlus wurde mit einem klaren Ziel gegründet: Umzüge und Entsorgungen sollen für unsere Kunden so
          einfach, fair und nachvollziehbar wie möglich ablaufen. Statt langwieriger Vor-Ort-Termine für ein Angebot
          berechnen wir den Preis transparent online — inklusive aller relevanten Faktoren wie Fläche, Etagen und
          Entfernung.
        </p>
        <p style={{ color: "var(--text-dim)", lineHeight: 1.7 }}>
          Wir sind aktuell in Nordrhein-Westfalen aktiv und bringen dein Hab und Gut zuverlässig deutschlandweit
          an dein neues Zuhause. Unser Team steht für sorgfältigen Umgang mit deinem Eigentum, pünktliche
          Termine und offene Kommunikation.
        </p>

        <div className="price-row" style={{ marginTop: 12 }}>
          <div>
            <div className="foot-heading" style={{ color: "var(--text)", marginBottom: 8 }}>Adresse (Muster)</div>
            <p style={{ fontSize: 14 }}>
              UmzugPlus GmbH (Muster)<br />
              Musterstraße 1<br />
              12345 Musterstadt
            </p>
          </div>
        </div>

        <div className="price-row">
          <div>
            <div className="foot-heading" style={{ color: "var(--text)", marginBottom: 8 }}>Kontakt (Muster)</div>
            <p style={{ fontSize: 14 }}>
              E-Mail: info@umzugplus.de (Muster)<br />
              Telefon: +49 30 0000000 (Muster)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export const metadata = { title: "Impressum — UmzugPlus" };

export default function ImpressumPage() {
  return (
    <div className="wrap" style={{ padding: "56px 0 80px" }}>
      <h1 style={{ fontFamily: "var(--display)", fontWeight: 800, fontSize: 32, marginBottom: 20 }}>Impressum</h1>

      <div className="calc-error" style={{ maxWidth: 640, marginBottom: 28 }}>
        Hinweis: Diese Seite enthält aktuell Muster-Angaben, da UmzugPlus sich noch im Aufbau befindet. Vor dem
        echten Start müssen hier die tatsächlichen Unternehmensdaten eingetragen und die Angaben rechtlich
        geprüft werden.
      </div>

      <div style={{ maxWidth: 640, fontSize: 14.5, lineHeight: 1.8, color: "var(--text-dim)" }}>
        <p><strong>Angaben gemäß § 5 TMG</strong></p>
        <p>
          UmzugPlus GmbH (Muster)<br />
          Musterstraße 1<br />
          12345 Musterstadt<br />
          Deutschland
        </p>

        <p style={{ marginTop: 20 }}><strong>Vertreten durch</strong></p>
        <p>Geschäftsführer: Max Mustermann (Muster)</p>

        <p style={{ marginTop: 20 }}><strong>Kontakt</strong></p>
        <p>
          Telefon: +49 30 0000000 (Muster)<br />
          E-Mail: info@umzugplus.de (Muster)
        </p>

        <p style={{ marginTop: 20 }}><strong>Registereintrag</strong></p>
        <p>
          Eintragung im Handelsregister (Muster)<br />
          Registergericht: Amtsgericht Musterstadt<br />
          Registernummer: HRB 000000 (Muster)
        </p>

        <p style={{ marginTop: 20 }}><strong>Umsatzsteuer-ID</strong></p>
        <p>Umsatzsteuer-Identifikationsnummer gemäß § 27a UStG: DE123456789 (Muster)</p>

        <p style={{ marginTop: 20 }}><strong>Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV</strong></p>
        <p>Max Mustermann (Muster), Anschrift wie oben</p>

        <p style={{ marginTop: 20 }}><strong>EU-Streitschlichtung</strong></p>
        <p>
          Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit. Wir sind nicht
          verpflichtet und nicht bereit, an einem Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle
          teilzunehmen.
        </p>
      </div>
    </div>
  );
}

export const metadata = { title: "AGB & Widerruf — UmzugPlus" };

export default function AgbPage() {
  return (
    <div className="wrap" style={{ padding: "56px 0 80px" }}>
      <h1 style={{ fontFamily: "var(--display)", fontWeight: 800, fontSize: 32, marginBottom: 20 }}>
        Allgemeine Geschäftsbedingungen &amp; Widerrufsbelehrung
      </h1>

      <div className="calc-error" style={{ maxWidth: 700, marginBottom: 28 }}>
        Hinweis: Diese AGB sind ein Muster-Entwurf und noch nicht rechtlich geprüft. Vor dem echten Geschäftsbetrieb
        sollten sie von einem Rechtsbeistand final erstellt bzw. geprüft werden.
      </div>

      <div style={{ maxWidth: 700, fontSize: 14.5, lineHeight: 1.8, color: "var(--text-dim)" }}>
        <p><strong>§ 1 Geltungsbereich</strong></p>
        <p>
          Diese Allgemeinen Geschäftsbedingungen gelten für alle über die Webseite von UmzugPlus geschlossenen
          Verträge über Umzugs- und Entsorgungsleistungen zwischen UmzugPlus und ihren Kunden.
        </p>

        <p style={{ marginTop: 20 }}><strong>§ 2 Vertragsschluss</strong></p>
        <p>
          Die online berechnete Preisangabe stellt zunächst ein unverbindliches Angebot dar. Ein Vertrag kommt erst
          mit der schriftlichen Auftragsbestätigung durch UmzugPlus zustande.
        </p>

        <p style={{ marginTop: 20 }}><strong>§ 3 Preise und Zahlung</strong></p>
        <p>
          Alle Preise verstehen sich inklusive der gesetzlichen Umsatzsteuer. Mit der Auftragsbestätigung wird eine
          Anzahlung in Höhe des angegebenen Prozentsatzes fällig. Diese muss innerhalb von 24 Stunden nach
          Bestätigung eingehen, andernfalls kann der Termin anderweitig vergeben werden. Die Restzahlung erfolgt
          nach Erbringung der Leistung.
        </p>

        <p style={{ marginTop: 20 }}><strong>§ 4 Stornierung</strong></p>
        <p>
          Der Kunde kann den Auftrag bis 12 Stunden vor dem vereinbarten Termin kostenfrei stornieren. Bei einer
          späteren Stornierung wird der Grundpreis der jeweiligen Leistung einbehalten zzgl. einer
          Bearbeitungsgebühr in Höhe von 3% des Gesamtbetrags. Der übersteigende Betrag wird erstattet.
        </p>

        <p style={{ marginTop: 20 }}><strong>§ 5 Leistungsgebiet</strong></p>
        <p>
          Umzüge und Entsorgungen werden mit Startpunkt innerhalb Nordrhein-Westfalens durchgeführt; das Ziel kann
          deutschlandweit liegen.
        </p>

        <p style={{ marginTop: 20 }}><strong>§ 6 Haftung</strong></p>
        <p>
          UmzugPlus haftet für Schäden nach den gesetzlichen Bestimmungen. Für leichte Fahrlässigkeit haftet
          UmzugPlus nur bei Verletzung wesentlicher Vertragspflichten.
        </p>

        <h2 style={{ fontFamily: "var(--display)", fontSize: 22, fontWeight: 700, marginTop: 40, marginBottom: 16 }}>
          Widerrufsbelehrung
        </h2>
        <p><strong>Widerrufsrecht</strong></p>
        <p>
          Verbrauchern steht ein Widerrufsrecht von 14 Tagen ab Vertragsschluss zu. Zur Wahrung der Widerrufsfrist
          reicht die rechtzeitige Absendung des Widerrufs an die im Impressum genannte Kontaktadresse.
        </p>
        <p style={{ marginTop: 16 }}>
          <strong>Erlöschen bei vorzeitiger Leistungserbringung:</strong> Wird die Leistung vor Ablauf der
          Widerrufsfrist auf ausdrücklichen Wunsch des Kunden vollständig erbracht, erlischt das Widerrufsrecht.
        </p>
      </div>
    </div>
  );
}

export const metadata = { title: "Datenschutz — UmzugPlus" };

export default function DatenschutzPage() {
  return (
    <div className="wrap" style={{ padding: "56px 0 80px" }}>
      <h1 style={{ fontFamily: "var(--display)", fontWeight: 800, fontSize: 32, marginBottom: 20 }}>Datenschutzerklärung</h1>

      <div className="calc-error" style={{ maxWidth: 700, marginBottom: 28 }}>
        Hinweis: Dies ist eine allgemeine Muster-Datenschutzerklärung auf Basis der aktuell genutzten Dienste
        (Supabase, Vercel, OpenStreetMap Nominatim). Vor dem echten Start sollte diese Erklärung von einem
        Rechtsbeistand geprüft und um weitere Dienste (z.B. Zahlungsanbieter, E-Mail-Versand) ergänzt werden.
      </div>

      <div style={{ maxWidth: 700, fontSize: 14.5, lineHeight: 1.8, color: "var(--text-dim)" }}>
        <p><strong>1. Verantwortlicher</strong></p>
        <p>
          UmzugPlus GmbH (Muster), Musterstraße 1, 12345 Musterstadt. Kontakt: info@umzugplus.de (Muster).
        </p>

        <p style={{ marginTop: 20 }}><strong>2. Welche Daten wir verarbeiten</strong></p>
        <p>
          Bei einer Registrierung verarbeiten wir deine E-Mail-Adresse sowie optional Name, Telefon und Adresse.
          Bei einer Preisanfrage verarbeiten wir die eingegebenen Adressen, Auftragsdetails und, falls angegeben,
          deine Kontaktdaten. Für die Adresssuche und Entfernungsberechnung werden Anfragen an den Kartendienst
          OpenStreetMap Nominatim gesendet.
        </p>

        <p style={{ marginTop: 20 }}><strong>3. Zweck der Verarbeitung</strong></p>
        <p>
          Die Daten dienen der Erstellung von Preisangeboten, der Verwaltung deines Kundenkontos, der
          Kommunikation zu deinem Auftrag sowie — im Falle eines Vertragsschlusses — der Vertragserfüllung.
        </p>

        <p style={{ marginTop: 20 }}><strong>4. Rechtsgrundlage</strong></p>
        <p>
          Die Verarbeitung erfolgt auf Grundlage von Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung bzw.
          vorvertragliche Maßnahmen) sowie, soweit du eingewilligt hast, auf Grundlage von Art. 6 Abs. 1 lit. a DSGVO.
        </p>

        <p style={{ marginTop: 20 }}><strong>5. Eingesetzte Dienstleister</strong></p>
        <p>
          Für Datenbank und Authentifizierung nutzen wir Supabase, für das Hosting Vercel. Beide Anbieter
          verarbeiten Daten teils außerhalb der EU; sofern zutreffend, stützen wir dies auf geeignete
          Garantien (z.B. EU-Standardvertragsklauseln).
        </p>

        <p style={{ marginTop: 20 }}><strong>6. Speicherdauer</strong></p>
        <p>
          Wir speichern personenbezogene Daten nur so lange, wie es für die genannten Zwecke erforderlich ist
          oder gesetzliche Aufbewahrungsfristen dies verlangen.
        </p>

        <p style={{ marginTop: 20 }}><strong>7. Deine Rechte</strong></p>
        <p>
          Du hast das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung, Datenübertragbarkeit
          sowie Widerspruch gegen die Verarbeitung deiner Daten. Wende dich hierzu an die oben genannte Kontaktadresse.
        </p>
      </div>
    </div>
  );
}

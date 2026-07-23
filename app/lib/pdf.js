import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

const titles = {
  angebot: "Angebot",
  auftragsbestaetigung: "Auftragsbestätigung",
  anzahlungsbestaetigung: "Anzahlungsbeleg",
  rechnung: "Rechnung",
};

export async function generateBelegPdf(order, type) {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595, 842]); // A4
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  const dark = rgb(0.13, 0.12, 0.1);
  const gray = rgb(0.45, 0.44, 0.41);
  const faint = rgb(0.6, 0.59, 0.56);
  const red = rgb(0.88, 0.22, 0.17);
  const line = rgb(0.85, 0.84, 0.81);

  const left = 56;
  const right = 539;
  let y = 780;

  function row(labelText, valueText, opts = {}) {
    const size = opts.size ?? 10.5;
    const f = opts.bold ? bold : font;
    const color = opts.color ?? dark;
    page.drawText(labelText, { x: left, y, size, font: f, color });
    if (valueText !== undefined) {
      const width = f.widthOfTextAtSize(valueText, size);
      page.drawText(valueText, { x: right - width, y, size, font: f, color });
    }
    y -= opts.gap ?? 16;
  }

  function hr() {
    page.drawLine({ start: { x: left, y }, end: { x: right, y }, thickness: 0.6, color: line });
    y -= 14;
  }

  // Kopfbereich: Logo-Look wie auf der Webseite (rot, fett, "UmzugPlus")
  page.drawText("Umzug", { x: left, y, size: 19, font: bold, color: dark });
  const umzugWidth = bold.widthOfTextAtSize("Umzug", 19);
  page.drawText("Plus", { x: left + umzugWidth, y, size: 19, font: bold, color: red });
  page.drawText(titles[type] || "Dokument", { x: right - font.widthOfTextAtSize(titles[type] || "Dokument", 11), y: y + 4, size: 11, font, color: gray });
  y -= 10;
  page.drawLine({ start: { x: left, y }, end: { x: right, y }, thickness: 1.4, color: red });
  y -= 30;

  // Titel + Referenz
  row(titles[type] || "Dokument", undefined, { bold: true, size: 15, gap: 20 });
  row(`Referenz: ${(titles[type] || "DOC").slice(0, 3).toUpperCase()}-${order.booking_number}`, undefined, { size: 9, color: faint, gap: 13 });
  row(`Datum: ${new Date(order.created_at).toLocaleDateString("de-DE")}`, undefined, { size: 9, color: faint, gap: 13 });
  if (order.wunschtermin) {
    row(`Leistungstermin: ${new Date(order.wunschtermin).toLocaleDateString("de-DE")}${order.wunschtermin_uhrzeit ? ", " + order.wunschtermin_uhrzeit + " Uhr" : ""}`, undefined, { size: 9, color: faint, gap: 13 });
  }
  y -= 12;

  // Kunde & Leistung nebeneinander
  const col2 = 320;
  page.drawText("KUNDE", { x: left, y, size: 8, font: bold, color: faint });
  page.drawText("LEISTUNG", { x: col2, y, size: 8, font: bold, color: faint });
  y -= 14;
  page.drawText(order.name || order.email || "-", { x: left, y, size: 10, font, color: dark });
  page.drawText(order.leistung === "entsorgung" ? "Entsorgung" : order.leistung === "reinigung" ? "Reinigung" : "Umzug", { x: col2, y, size: 10, font, color: dark });
  y -= 14;
  page.drawText(order.email || "", { x: left, y, size: 9, font, color: gray });
  page.drawText(`Von: ${(order.von || "").slice(0, 32)}`, { x: col2, y, size: 9, font, color: gray });
  y -= 13;
  if (order.nach) {
    page.drawText(`Bis: ${order.nach.slice(0, 32)}`, { x: col2, y, size: 9, font, color: gray });
    y -= 13;
  }
  y -= 12;
  hr();
  y -= 4;

  // Positionstabelle
  const d = order.preis_details || {};
  page.drawText("POSITION", { x: left, y, size: 8, font: bold, color: faint });
  page.drawText("BETRAG", { x: right - font.widthOfTextAtSize("BETRAG", 8), y, size: 8, font: bold, color: faint });
  y -= 16;

  row("Grundpreis (Fixkosten)", `${(d.grundpreis || 0).toFixed(2)} €`);
  if (d.umfangLabel) row(d.umfangLabel, `${(d.umfang || 0).toFixed(2)} €`);
  if (d.etagenzuschlag > 0) row(`Etagenzuschlag (${d.etagenOhneAufzug} Etage/n ohne Aufzug)`, `${d.etagenzuschlag.toFixed(2)} €`);
  if (d.transport > 0) row(`Transport (${d.km} km)`, `${d.transport.toFixed(2)} €`);
  if (d.mitarbeiterAufpreis > 0) row("3. Mitarbeiter", `${d.mitarbeiterAufpreis.toFixed(2)} €`);
  if (d.zweitransporterAufpreis > 0) row("2. Transporter", `${d.zweitransporterAufpreis.toFixed(2)} €`);
  if (d.samstagAufpreisBetrag > 0) row("Samstagszuschlag", `${d.samstagAufpreisBetrag.toFixed(2)} €`);
  if (d.montageAbbauSumme > 0) row("Möbel-Abbau", `${d.montageAbbauSumme.toFixed(2)} €`);
  if (d.montageEinbauSumme > 0) row("Möbel-Einbau", `${d.montageEinbauSumme.toFixed(2)} €`);
  if (d.rabattBetrag > 0) row("Rabattcode", `− ${d.rabattBetrag.toFixed(2)} €`);

  y -= 4;
  hr();

  row("Netto", `${(d.netto || 0).toFixed(2)} €`, { color: gray });
  row(`zzgl. USt (${d.mwstSatz || 19}%)`, `${(d.mwstBetrag || 0).toFixed(2)} €`, { color: gray });
  y -= 4;
  hr();

  const gesamt = order.geschaetzter_preis || 0;
  const bezahlt = order.bezahlt_betrag || 0;
  const rest = Math.max(0, gesamt - bezahlt);

  row("Gesamtbetrag", `${gesamt.toFixed(2)} €`, { bold: true, size: 12.5, gap: 20 });
  row("Anzahlung", `${(d.anzahlung || 0).toFixed(2)} €`, { color: gray });
  row("Bereits gezahlt", `${bezahlt.toFixed(2)} €`, { color: gray });
  row("Restbetrag", `${rest.toFixed(2)} €`, { bold: true, color: rest > 0 ? red : dark });

  y -= 20;
  page.drawText(
    "Stornierung bis 12 Stunden vor dem Termin kostenlos. Danach wird der Grundpreis einbehalten",
    { x: left, y, size: 8, font, color: faint }
  );
  y -= 11;
  page.drawText(
    "zzgl. 3% Bearbeitungsgebühr vom Gesamtbetrag.",
    { x: left, y, size: 8, font, color: faint }
  );

  const bytes = await doc.save();
  return Buffer.from(bytes);
}

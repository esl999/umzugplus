import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

const titles = {
  angebot: "Angebot",
  auftragsbestaetigung: "Auftragsbestätigung",
  anzahlungsbestaetigung: "Anzahlungsbeleg",
  rechnung: "Rechnung",
};

const leistungNamen = { umzug: "Umzug", entsorgung: "Entsorgung", reinigung: "Reinigung" };

export async function generateBelegPdf(order, type) {
  const doc = await PDFDocument.create();
  let page = doc.addPage([595, 842]); // A4
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

  function ensureSpace(needed) {
    if (y - needed < 60) {
      page = doc.addPage([595, 842]);
      y = 780;
    }
  }

  function row(labelText, valueText, opts = {}) {
    ensureSpace(opts.gap ?? 16);
    const size = opts.size ?? 10.5;
    const f = opts.bold ? bold : font;
    const color = opts.color ?? dark;
    page.drawText(labelText, { x: opts.indent ?? left, y, size, font: f, color });
    if (valueText !== undefined) {
      const width = f.widthOfTextAtSize(valueText, size);
      page.drawText(valueText, { x: right - width, y, size, font: f, color });
    }
    y -= opts.gap ?? 16;
  }

  function hr() {
    ensureSpace(14);
    page.drawLine({ start: { x: left, y }, end: { x: right, y }, thickness: 0.6, color: line });
    y -= 14;
  }

  // Kopfbereich: Logo-Look wie auf der Webseite
  page.drawText("Umzug", { x: left, y, size: 19, font: bold, color: dark });
  const umzugWidth = bold.widthOfTextAtSize("Umzug", 19);
  page.drawText("Plus", { x: left + umzugWidth, y, size: 19, font: bold, color: red });
  page.drawText(titles[type] || "Dokument", { x: right - font.widthOfTextAtSize(titles[type] || "Dokument", 11), y: y + 4, size: 11, font, color: gray });
  y -= 10;
  page.drawLine({ start: { x: left, y }, end: { x: right, y }, thickness: 1.4, color: red });
  y -= 30;

  row(titles[type] || "Dokument", undefined, { bold: true, size: 15, gap: 20 });
  row(`Referenz: ${(titles[type] || "DOC").slice(0, 3).toUpperCase()}-${order.booking_number}`, undefined, { size: 9, color: faint, gap: 13 });
  row(`Datum: ${new Date(order.created_at).toLocaleDateString("de-DE")}`, undefined, { size: 9, color: faint, gap: 13 });
  if (order.wunschtermin) {
    row(`Leistungstermin: ${new Date(order.wunschtermin).toLocaleDateString("de-DE")}${order.wunschtermin_uhrzeit ? ", " + order.wunschtermin_uhrzeit + " Uhr" : ""}`, undefined, { size: 9, color: faint, gap: 13 });
  }
  y -= 8;

  page.drawText("KUNDE", { x: left, y, size: 8, font: bold, color: faint });
  y -= 14;
  page.drawText(order.name || order.email || "-", { x: left, y, size: 10, font, color: dark });
  y -= 13;
  page.drawText(order.email || "", { x: left, y, size: 9, font, color: gray });
  y -= 12;
  hr();
  y -= 4;

  const d = order.preis_details || {};
  const extras = d.extras || [];
  const alleLeistungen = [order.leistung, ...extras.map((e) => e.leistung)];

  page.drawText(
    alleLeistungen.length > 1 ? `LEISTUNGEN: ${alleLeistungen.map((l) => leistungNamen[l] || l).join(" + ")}` : `LEISTUNG: ${leistungNamen[order.leistung] || order.leistung}`,
    { x: left, y, size: 9, font: bold, color: faint }
  );
  y -= 20;

  // --- Primäre Leistung ---
  page.drawText(`${leistungNamen[order.leistung] || order.leistung}${order.von ? ` — ${order.von.slice(0, 40)}` : ""}`, { x: left, y, size: 11, font: bold, color: dark });
  y -= 6;
  hr();

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
  row("Zwischensumme (netto)", `${(d.netto || 0).toFixed(2)} €`, { color: gray, gap: 18 });

  // --- Zusätzliche Leistungen ---
  extras.forEach((e) => {
    y -= 8;
    ensureSpace(60);
    page.drawText(`${leistungNamen[e.leistung] || e.leistung}${e.adresse ? ` — ${e.adresse.slice(0, 40)}` : ""}`, { x: left, y, size: 11, font: bold, color: dark });
    y -= 6;
    hr();
    row("Grundpreis (Fixkosten)", `${(e.grundpreis || 0).toFixed(2)} €`);
    if (e.umfangLabel) row(e.umfangLabel, `${(e.umfang || 0).toFixed(2)} €`);
    row("Zwischensumme (netto)", `${(e.netto || 0).toFixed(2)} €`, { color: gray, gap: 18 });
  });

  y -= 4;
  hr();

  const nettoGesamt = (d.netto || 0) + extras.reduce((s, e) => s + (e.netto || 0), 0);
  const mwstGesamt = (d.mwstBetrag || 0) + extras.reduce((s, e) => s + (e.mwstBetrag || 0), 0);

  row("Netto gesamt", `${nettoGesamt.toFixed(2)} €`, { color: gray });
  row(`zzgl. USt (${d.mwstSatz || 19}%)`, `${mwstGesamt.toFixed(2)} €`, { color: gray });
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
  ensureSpace(24);
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

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
  const gray = rgb(0.4, 0.39, 0.36);
  const red = rgb(0.88, 0.22, 0.17);

  let y = 800;
  const left = 50;

  function text(str, opts = {}) {
    page.drawText(str, {
      x: opts.x ?? left,
      y,
      size: opts.size ?? 11,
      font: opts.bold ? bold : font,
      color: opts.color ?? dark,
    });
    y -= opts.gap ?? 18;
  }

  function line(desc, amount) {
    page.drawText(desc, { x: left, y, size: 10.5, font, color: gray });
    page.drawText(amount, { x: 480, y, size: 10.5, font, color: dark });
    y -= 16;
  }

  text("UmzugPlus", { bold: true, size: 20, color: red, gap: 26 });
  text(titles[type] || "Dokument", { bold: true, size: 16, gap: 24 });

  text(`${(titles[type] || "DOC").slice(0, 3).toUpperCase()}-${order.booking_number}`, { size: 10, color: gray, gap: 14 });
  text(`Datum: ${new Date(order.created_at).toLocaleDateString("de-DE")}`, { size: 10, color: gray, gap: 14 });
  if (order.wunschtermin) {
    text(`Leistungstermin: ${new Date(order.wunschtermin).toLocaleDateString("de-DE")}`, { size: 10, color: gray, gap: 14 });
  }
  y -= 10;

  text(`Kunde: ${order.name || order.email}`, { size: 10.5, gap: 14 });
  text(`Leistung: ${order.leistung === "entsorgung" ? "Entsorgung" : order.leistung === "reinigung" ? "Reinigung" : "Umzug"}`, { size: 10.5, gap: 14 });
  text(`Von: ${order.von}`, { size: 10.5, gap: 14 });
  if (order.nach) text(`Bis: ${order.nach}`, { size: 10.5, gap: 14 });
  y -= 14;

  const d = order.preis_details || {};
  page.drawLine({ start: { x: left, y }, end: { x: 545, y }, thickness: 0.5, color: gray });
  y -= 20;

  line("Grundpreis (Fixkosten)", `${(d.grundpreis || 0).toFixed(2)} €`);
  if (d.umfangLabel) line(d.umfangLabel, `${(d.umfang || 0).toFixed(2)} €`);
  if (d.etagenzuschlag > 0) line(`Etagenzuschlag (${d.etagenOhneAufzug} Etage/n)`, `${d.etagenzuschlag.toFixed(2)} €`);
  if (d.transport > 0) line(`Transport (${d.km} km)`, `${d.transport.toFixed(2)} €`);

  y -= 6;
  page.drawLine({ start: { x: left, y }, end: { x: 545, y }, thickness: 0.5, color: gray });
  y -= 20;

  line("Netto", `${(d.netto || 0).toFixed(2)} €`);
  line(`zzgl. USt (${d.mwstSatz || 19}%)`, `${(d.mwstBetrag || 0).toFixed(2)} €`);
  text("Gesamtbetrag", { bold: true, size: 12, gap: 0, x: left });
  page.drawText(`${(order.geschaetzter_preis || 0).toFixed(2)} €`, { x: 480, y: y + 18, size: 12, font: bold, color: dark });
  y -= 8;
  line("Anzahlung", `${(d.anzahlung || 0).toFixed(2)} €`);
  line("Bereits gezahlt", `${(order.bezahlt_betrag || 0).toFixed(2)} €`);

  y -= 20;
  page.drawText(
    "Stornierung bis 12 Stunden vor dem Termin kostenlos. Danach wird der Grundpreis",
    { x: left, y, size: 8.5, font, color: gray }
  );
  y -= 12;
  page.drawText(
    "einbehalten zzgl. 3% Bearbeitungsgebühr vom Gesamtbetrag.",
    { x: left, y, size: 8.5, font, color: gray }
  );

  const bytes = await doc.save();
  return Buffer.from(bytes);
}

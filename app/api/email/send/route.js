import { supabaseAdmin } from "../../../lib/supabaseAdmin";
import { generateBelegPdf } from "../../../lib/pdf";
import { sendEmail, emailWrapper } from "../../../lib/email";

const flagColumn = {
  angebot: "email_angebot_gesendet",
  auftragsbestaetigung: "email_bestaetigung_gesendet",
  anzahlungsbestaetigung: "email_anzahlung_gesendet",
  rechnung: "email_rechnung_gesendet",
};

const messages = {
  angebot: {
    subject: (o) => `Dein Angebot ${o.booking_number} von UmzugPlus`,
    body: (o) => `
      <p>Hallo ${o.name || ""},</p>
      <p>vielen Dank für deine Anfrage. Dein unverbindliches Angebot <strong>${o.booking_number}</strong>
      beläuft sich auf <strong>${(o.geschaetzter_preis || 0).toFixed(2)} €</strong>.</p>
      <p>Die vollständige Aufschlüsselung findest du im angehängten PDF sowie jederzeit in deinem Kundenkonto
      unter „Meine Aufträge".</p>
      <p>Wir melden uns zeitnah bei dir.</p>`,
  },
  auftragsbestaetigung: {
    subject: (o) => `Auftragsbestätigung ${o.booking_number}`,
    body: (o) => `
      <p>Hallo ${o.name || ""},</p>
      <p>dein Auftrag <strong>${o.booking_number}</strong> wurde von uns bestätigt${o.wunschtermin ? ` — Termin: <strong>${new Date(o.wunschtermin).toLocaleDateString("de-DE")}</strong>` : ""}.</p>
      <p><strong>Wichtig:</strong> Die Anzahlung muss innerhalb von 24 Stunden eingehen, damit der Termin
      verbindlich reserviert bleibt.</p>
      <p>Die Auftragsbestätigung findest du im Anhang.</p>`,
  },
  anzahlungsbestaetigung: {
    subject: (o) => `Anzahlung erhalten — ${o.booking_number}`,
    body: (o) => `
      <p>Hallo ${o.name || ""},</p>
      <p>wir haben deine Anzahlung für Auftrag <strong>${o.booking_number}</strong> erhalten. Vielen Dank!</p>
      <p>Den aktuellen Beleg findest du im Anhang und in deinem Kundenkonto.</p>`,
  },
  rechnung: {
    subject: (o) => `Rechnung ${o.booking_number} — vollständig bezahlt`,
    body: (o) => `
      <p>Hallo ${o.name || ""},</p>
      <p>dein Auftrag <strong>${o.booking_number}</strong> ist vollständig bezahlt. Die Rechnung findest du
      im Anhang.</p>
      <p>Vielen Dank für dein Vertrauen in UmzugPlus!</p>`,
  },
};

export async function POST(req) {
  try {
    const { anfrageId, type } = await req.json();

    if (!messages[type]) {
      return Response.json({ error: "Unbekannter E-Mail-Typ." }, { status: 400 });
    }
    if (!process.env.RESEND_API_KEY || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return Response.json({ error: "E-Mail-Versand ist noch nicht eingerichtet." }, { status: 500 });
    }

    const admin = supabaseAdmin();
    const { data: order, error } = await admin.from("anfragen").select("*").eq("id", anfrageId).single();
    if (error || !order) {
      return Response.json({ error: "Auftrag nicht gefunden." }, { status: 404 });
    }
    if (!order.email) {
      return Response.json({ error: "Keine E-Mail-Adresse hinterlegt." }, { status: 400 });
    }

    const pdfBuffer = await generateBelegPdf(order, type);
    const msg = messages[type];

    await sendEmail({
      to: order.email,
      subject: msg.subject(order),
      html: emailWrapper(msg.subject(order), msg.body(order)),
      attachment: { filename: `${type}-${order.booking_number}.pdf`, buffer: pdfBuffer },
    });

    const col = flagColumn[type];
    if (col) await admin.from("anfragen").update({ [col]: true }).eq("id", anfrageId);

    return Response.json({ success: true });
  } catch (err) {
    console.error("E-Mail-Versand fehlgeschlagen:", err);
    return Response.json({ error: "E-Mail-Versand fehlgeschlagen." }, { status: 500 });
  }
}

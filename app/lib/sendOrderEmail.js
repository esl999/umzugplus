import { supabaseAdmin } from "./supabaseAdmin";
import { generateBelegPdf } from "./pdf";
import { sendEmail, emailWrapper } from "./email";

export const flagColumn = {
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

async function logResult(admin, level, message) {
  try {
    await admin.from("audit_logs").insert({ actor_email: "system", action: level, object: message });
  } catch {
    // Logging darf den Versand nicht blockieren
  }
}

/**
 * Versendet die passende Beleg-E-Mail für einen Auftrag.
 * Wird sowohl von der manuellen API-Route als auch vom Datenbank-Webhook genutzt.
 * Versucht bei Fehlschlag automatisch ein zweites Mal.
 */
export async function sendOrderEmail(anfrageId, type) {
  if (!messages[type]) return { skipped: true, reason: "unknown_type" };
  if (!process.env.RESEND_API_KEY || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { skipped: true, reason: "not_configured" };
  }

  const admin = supabaseAdmin();
  const { data: order, error } = await admin.from("anfragen").select("*").eq("id", anfrageId).single();
  if (error || !order) return { skipped: true, reason: "order_not_found" };
  if (!order.email) return { skipped: true, reason: "no_email" };

  const col = flagColumn[type];
  if (col && order[col]) return { skipped: true, reason: "already_sent" };

  const msg = messages[type];
  let lastError = null;

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const pdfBuffer = await generateBelegPdf(order, type);
      await sendEmail({
        to: order.email,
        subject: msg.subject(order),
        html: emailWrapper(msg.subject(order), msg.body(order)),
        attachment: { filename: `${type}-${order.booking_number}.pdf`, buffer: pdfBuffer },
      });
      if (col) await admin.from("anfragen").update({ [col]: true }).eq("id", anfrageId);
      await logResult(admin, "email.gesendet", `${type} an ${order.email} (${order.booking_number}, Versuch ${attempt})`);
      return { success: true };
    } catch (err) {
      lastError = err;
      console.error(`E-Mail-Versand fehlgeschlagen (Versuch ${attempt}):`, err);
      if (attempt === 1) await new Promise((r) => setTimeout(r, 1500));
    }
  }

  await logResult(admin, "email.fehler", `${type} an ${order.email} (${order.booking_number}) — ${lastError?.message || "unbekannter Fehler"}`);
  return { success: false, error: lastError?.message };
}

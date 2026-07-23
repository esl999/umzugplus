import { Resend } from "resend";

const FROM = "UmzugPlus <onboarding@resend.dev>";
// Hinweis: "onboarding@resend.dev" funktioniert sofort ohne eigene Domain (nur zum Testen).
// Für den echten Betrieb später eine eigene Domain in Resend verifizieren und hier eintragen,
// z.B. "UmzugPlus <info@umzugplus.de>".

export async function sendEmail({ to, subject, html, attachment }) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  const payload = { from: FROM, to, subject, html };
  if (attachment) {
    payload.attachments = [
      { filename: attachment.filename, content: attachment.buffer.toString("base64") },
    ];
  }
  return resend.emails.send(payload);
}

export function emailWrapper(title, bodyHtml) {
  return `
  <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;color:#211f1a;">
    <div style="padding:20px 0;border-bottom:3px solid #e0392c;">
      <span style="font-size:20px;font-weight:800;color:#e0392c;">UmzugPlus</span>
    </div>
    <h1 style="font-size:18px;margin:24px 0 12px;">${title}</h1>
    ${bodyHtml}
    <p style="margin-top:32px;font-size:12px;color:#8a8a86;">
      UmzugPlus · Musterstraße 1, 12345 Musterstadt · info@umzugplus.de
    </p>
  </div>`;
}

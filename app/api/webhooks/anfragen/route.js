import { sendOrderEmail } from "../../../lib/sendOrderEmail";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";

async function log(action, object) {
  try {
    const admin = supabaseAdmin();
    await admin.from("audit_logs").insert({ actor_email: "webhook", action, object });
  } catch (err) {
    console.error("Webhook-Log fehlgeschlagen:", err);
  }
}

export async function POST(req) {
  const auth = req.headers.get("authorization");

  if (!process.env.SUPABASE_WEBHOOK_SECRET) {
    await log("webhook.fehler", "SUPABASE_WEBHOOK_SECRET fehlt in den Vercel-Umgebungsvariablen");
    return Response.json({ error: "Server nicht konfiguriert." }, { status: 500 });
  }

  if (auth !== `Bearer ${process.env.SUPABASE_WEBHOOK_SECRET}`) {
    await log("webhook.unauthorized", `Erhaltener Header: "${auth || "(kein Header)"}"`);
    return Response.json({ error: "Nicht autorisiert." }, { status: 401 });
  }

  const payload = await req.json();
  const { type, record, old_record } = payload;

  await log("webhook.empfangen", `type=${type}, record.id=${record?.id || "?"}`);

  if (!record) return Response.json({ ok: true });

  const jobs = [];

  if (type === "INSERT") {
    jobs.push("angebot");
  }

  if (type === "UPDATE" && old_record) {
    if (old_record.status !== "bestaetigt" && record.status === "bestaetigt") {
      jobs.push("auftragsbestaetigung");
    }
    const bezahltVorher = old_record.bezahlt_betrag || 0;
    const bezahltJetzt = record.bezahlt_betrag || 0;
    const gesamt = record.geschaetzter_preis || 0;
    if (bezahltJetzt > bezahltVorher) {
      jobs.push(bezahltJetzt >= gesamt && gesamt > 0 ? "rechnung" : "anzahlungsbestaetigung");
    }
  }

  if (jobs.length === 0) {
    await log("webhook.keine_aktion", `type=${type} löste keine E-Mail aus (kein relevanter Statuswechsel erkannt)`);
  }

  const results = [];
  for (const jobType of jobs) {
    const result = await sendOrderEmail(record.id, jobType);
    results.push({ jobType, ...result });
  }

  return Response.json({ ok: true, results });
}
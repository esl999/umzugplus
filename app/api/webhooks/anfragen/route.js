import { sendOrderEmail } from "../../../lib/sendOrderEmail";

export async function POST(req) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.SUPABASE_WEBHOOK_SECRET}`) {
    return Response.json({ error: "Nicht autorisiert." }, { status: 401 });
  }

  const payload = await req.json();
  const { type, record, old_record } = payload;

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

  // nacheinander senden, damit ein Fehlschlag die anderen nicht blockiert
  const results = [];
  for (const jobType of jobs) {
    results.push(await sendOrderEmail(record.id, jobType));
  }

  return Response.json({ ok: true, results });
}

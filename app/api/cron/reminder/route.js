import { supabaseAdmin } from "../../../lib/supabaseAdmin";
import { sendEmail, emailWrapper } from "../../../lib/email";

export async function GET(req) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Nicht autorisiert." }, { status: 401 });
  }

  const admin = supabaseAdmin();

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowISO = tomorrow.toISOString().slice(0, 10);

  const { data: orders, error } = await admin
    .from("anfragen")
    .select("*")
    .eq("wunschtermin", tomorrowISO)
    .eq("status", "bestaetigt")
    .eq("email_erinnerung_gesendet", false);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  let sent = 0;
  for (const order of orders || []) {
    if (!order.email) continue;
    try {
      await sendEmail({
        to: order.email,
        subject: `Erinnerung: Dein Termin morgen — ${order.booking_number}`,
        html: emailWrapper(
          "Erinnerung an deinen Termin morgen",
          `<p>Hallo ${order.name || ""},</p>
           <p>kurze Erinnerung: dein Auftrag <strong>${order.booking_number}</strong>
           (${order.leistung === "entsorgung" ? "Entsorgung" : order.leistung === "reinigung" ? "Reinigung" : "Umzug"})
           ist morgen, <strong>${new Date(order.wunschtermin).toLocaleDateString("de-DE")}</strong>, geplant.</p>
           <p>Von: ${order.von}${order.nach ? `<br>Bis: ${order.nach}` : ""}</p>
           <p>Bei Fragen erreichst du uns jederzeit unter info@umzugplus.de.</p>`
        ),
      });
      await admin.from("anfragen").update({ email_erinnerung_gesendet: true }).eq("id", order.id);
      sent++;
    } catch (err) {
      console.error("Erinnerung fehlgeschlagen für", order.id, err);
    }
  }

  return Response.json({ success: true, sent });
}

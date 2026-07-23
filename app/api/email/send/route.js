import { sendOrderEmail } from "../../../lib/sendOrderEmail";

export async function POST(req) {
  const { anfrageId, type } = await req.json();
  const result = await sendOrderEmail(anfrageId, type);

  if (result.skipped) {
    return Response.json({ error: `E-Mail übersprungen: ${result.reason}` }, { status: 200 });
  }
  if (!result.success) {
    return Response.json({ error: "E-Mail-Versand fehlgeschlagen." }, { status: 500 });
  }
  return Response.json({ success: true });
}

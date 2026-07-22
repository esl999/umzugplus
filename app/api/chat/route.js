export async function POST(req) {
  try {
    const { messages } = await req.json();

    if (!process.env.ANTHROPIC_API_KEY) {
      return Response.json(
        { error: "Der Chat ist noch nicht eingerichtet (fehlender API-Key)." },
        { status: 500 }
      );
    }

    if (!Array.isArray(messages) || messages.length === 0) {
      return Response.json({ error: "Keine Nachricht erhalten." }, { status: 400 });
    }

    const systemPrompt = `Du bist der freundliche Kundenservice-Assistent von UmzugPlus, einer Webseite für Umzug, Entsorgung und Reinigung.

Wichtige Fakten:
- UmzugPlus bietet drei Leistungen: Umzug, Entsorgung (Entrümpelung/Haushaltsauflösung), Reinigung (Übergabereinigung beim Auszug).
- Aktuell wird nur mit Startpunkt in Nordrhein-Westfalen gearbeitet; das Ziel eines Umzugs kann deutschlandweit liegen.
- Der genaue Preis wird individuell über den Online-Rechner auf der Startseite berechnet (Fläche oder einzelne Gegenstände, Etagen, Entfernung usw.) — du kennst keine festen Preise auswendig und nennst daher niemals konkrete Beträge. Verweise dafür immer auf den Rechner ("Preis berechnen").
- Der Rechner ist ohne Konto nutzbar. Für eine verbindliche Anfrage ist ein kostenloses Konto nötig.
- Kunden verwalten ihre Anfragen unter "Meine Aufträge" im Kundenkonto, dort auch Stornierung und Beschwerden möglich.
- Stornierung ist bis 12 Stunden vor dem Termin kostenlos, danach wird der Grundpreis + 3% Bearbeitungsgebühr einbehalten.
- Die Anzahlung muss innerhalb von 24 Stunden nach Auftragsbestätigung eingehen.

Antworte immer auf Deutsch, freundlich, kurz und hilfreich. Wenn du etwas nicht weißt oder es um sehr spezifische Kontodaten geht, verweise höflich an den Kontakt (info@umzugplus.de) oder empfiehl, sich einzuloggen.`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 500,
        system: systemPrompt,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Anthropic API error:", errText);
      return Response.json({ error: "Der Chat ist gerade nicht erreichbar. Bitte versuch es später erneut." }, { status: 502 });
    }

    const data = await response.json();
    const reply = data.content?.find((c) => c.type === "text")?.text || "Entschuldige, da ist etwas schiefgelaufen.";

    return Response.json({ reply });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Ein unerwarteter Fehler ist aufgetreten." }, { status: 500 });
  }
}

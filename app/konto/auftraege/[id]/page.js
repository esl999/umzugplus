"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../../lib/supabaseClient";
import { useAuth } from "../../../lib/useAuth";

const statusLabel = {
  neu: "Angebot",
  bestaetigt: "Bestätigt",
  storniert: "Storniert",
  abgeschlossen: "Abgeschlossen",
};

function getAvailableBelege(order) {
  const gesamt = order.geschaetzter_preis || 0;
  const bezahlt = order.bezahlt_betrag || 0;
  const list = [{ key: "angebot", label: "Angebot" }];

  if (order.status === "bestaetigt" || order.status === "abgeschlossen") {
    list.push({ key: "auftragsbestaetigung", label: "Auftragsbestätigung" });
  }
  if (bezahlt > 0 && bezahlt < gesamt) {
    list.push({ key: "anzahlungsbestaetigung", label: "Anzahlungsbeleg" });
  }
  if (gesamt > 0 && bezahlt >= gesamt) {
    list.push({ key: "rechnung", label: "Rechnung" });
  }
  if (order.status === "storniert") {
    list.push({ key: "storno", label: "Storno-Dokument" });
  }
  return list;
}

export default function AuftragDetail() {
  const { session, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const [order, setOrder] = useState(null);
  const [loadingOrder, setLoadingOrder] = useState(true);
  const [canceling, setCanceling] = useState(false);

  const [beschwerde, setBeschwerde] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [showComplaintForm, setShowComplaintForm] = useState(false);

  const [bewertung, setBewertung] = useState(null);
  const [sterne, setSterne] = useState(0);
  const [bewertungText, setBewertungText] = useState("");
  const [bewertungBild, setBewertungBild] = useState(null);
  const [savingBewertung, setSavingBewertung] = useState(false);
  const [bewertungError, setBewertungError] = useState("");

  const [payStep, setPayStep] = useState(null);
  const [payChoice, setPayChoice] = useState(null);
  const [payNote, setPayNote] = useState("");

  useEffect(() => {
    if (!loading && !session) router.push("/login");
  }, [loading, session, router]);

  useEffect(() => {
    if (session) load();
  }, [session]);

  async function load() {
    setLoadingOrder(true);
    const { data: o } = await supabase.from("anfragen").select("*").eq("id", params.id).single();
    setOrder(o);

    const { data: b } = await supabase
      .from("beschwerden")
      .select("*")
      .eq("anfrage_id", params.id)
      .eq("user_id", session.user.id)
      .maybeSingle();

    if (b) {
      setBeschwerde(b);
      const { data: msgs } = await supabase
        .from("beschwerde_nachrichten")
        .select("*")
        .eq("beschwerde_id", b.id)
        .order("created_at", { ascending: true });
      setMessages(msgs || []);
    }

    const { data: bw } = await supabase
      .from("bewertungen")
      .select("*")
      .eq("anfrage_id", params.id)
      .eq("user_id", session.user.id)
      .maybeSingle();
    setBewertung(bw || null);
    setLoadingOrder(false);
  }

  async function handleCancel() {
    if (!confirm("Möchtest du diesen Auftrag wirklich stornieren? Bitte beachte die Stornobedingungen (siehe Auftragsbestätigung).")) return;
    setCanceling(true);
    const now = new Date().toISOString();
    await supabase.from("anfragen").update({ status: "storniert", storniert_at: now }).eq("id", order.id);
    setOrder({ ...order, status: "storniert", storniert_at: now });
    setCanceling(false);
  }

  async function submitBewertung() {
    setBewertungError("");
    if (sterne === 0) {
      setBewertungError("Bitte wähle eine Sternebewertung aus.");
      return;
    }
    setSavingBewertung(true);
    try {
      let bildUrl = null;
      if (bewertungBild) {
        const path = `${order.id}/${Date.now()}-${bewertungBild.name}`;
        const { error: uploadError } = await supabase.storage.from("bewertungen").upload(path, bewertungBild);
        if (uploadError) throw uploadError;
        const { data: pub } = supabase.storage.from("bewertungen").getPublicUrl(path);
        bildUrl = pub.publicUrl;
      }

      const { data, error: insertError } = await supabase
        .from("bewertungen")
        .insert({
          anfrage_id: order.id,
          user_id: session.user.id,
          sterne,
          text: bewertungText.trim() || null,
          bild_url: bildUrl,
        })
        .select()
        .single();

      if (insertError) throw insertError;
      setBewertung(data);
    } catch (err) {
      setBewertungError("Die Bewertung konnte nicht gespeichert werden. Bitte versuch es erneut.");
    } finally {
      setSavingBewertung(false);
    }
  }

  async function startComplaint() {
    setSending(true);
    const { data } = await supabase
      .from("beschwerden")
      .insert({ anfrage_id: order.id, user_id: session.user.id })
      .select()
      .single();
    if (data) {
      setBeschwerde(data);
      await sendMessage(data.id);
    }
    setSending(false);
  }

  async function sendMessage(beschwerdeId) {
    if (!newMessage.trim()) return;
    setSending(true);
    await supabase.from("beschwerde_nachrichten").insert({
      beschwerde_id: beschwerdeId,
      sender: "kunde",
      message: newMessage.trim(),
    });
    setNewMessage("");
    const { data: msgs } = await supabase
      .from("beschwerde_nachrichten")
      .select("*")
      .eq("beschwerde_id", beschwerdeId)
      .order("created_at", { ascending: true });
    setMessages(msgs || []);
    setSending(false);
  }

  if (loading || loadingOrder || !order) {
    return (
      <div className="auth-page">
        <div className="auth-card">Lädt…</div>
      </div>
    );
  }

  const d = order.preis_details || {};
  const gesamt = order.geschaetzter_preis || 0;
  const bezahlt = order.bezahlt_betrag || 0;
  const offen = Math.max(0, gesamt - bezahlt);

  return (
    <div className="admin-wrap">
      <div className="wrap">
        <h1 className="admin-title">Auftrag {order.booking_number}</h1>

        <div className="calc-result" style={{ maxWidth: 640 }}>
          <div className="calc-result-head">Status: {statusLabel[order.status] || order.status}</div>
          <div style={{ padding: 20 }}>
            <p><strong>Leistung:</strong> {order.leistung === "entsorgung" ? "Entsorgung" : "Umzug"}</p>
            <p style={{ marginTop: 6 }}><strong>{order.leistung === "entsorgung" ? "Objekt" : "Von"}:</strong> {order.von}</p>
            {order.nach && <p style={{ marginTop: 6 }}><strong>Nach:</strong> {order.nach}</p>}
            {order.wunschtermin && (
              <p style={{ marginTop: 6 }}><strong>Leistungstermin:</strong> {new Date(order.wunschtermin).toLocaleDateString("de-DE")}</p>
            )}
          </div>

          {d.grundpreis !== undefined && (
            <div style={{ padding: "0 20px 20px" }}>
              <div className="foot-heading" style={{ color: "var(--text)", marginBottom: 8 }}>Positionen</div>
              <div className="belegzeile"><span>Grundpreis (Fixkosten)</span><span>{d.grundpreis.toFixed(2)} €</span></div>
              <div className="belegzeile"><span>{d.umfangLabel}</span><span>{d.umfang.toFixed(2)} €</span></div>
              {d.etagenzuschlag > 0 && (
                <div className="belegzeile"><span>Etagenzuschlag ({d.etagenOhneAufzug} Etage/n ohne Aufzug)</span><span>{d.etagenzuschlag.toFixed(2)} €</span></div>
              )}
              {d.transport > 0 && (
                <div className="belegzeile"><span>Transport: {d.km} km</span><span>{d.transport.toFixed(2)} €</span></div>
              )}
              <div className="belegzeile" style={{ borderTop: "1px solid var(--border)", marginTop: 8, paddingTop: 10 }}><span>Netto</span><span>{d.netto?.toFixed(2)} €</span></div>
              <div className="belegzeile"><span>zzgl. USt ({d.mwstSatz}%)</span><span>{d.mwstBetrag?.toFixed(2)} €</span></div>
              <div className="belegzeile" style={{ fontWeight: 700 }}><span>Gesamt</span><span>{gesamt.toFixed(2)} €</span></div>
            </div>
          )}

          <div className="calc-note">
            <strong>Zahlungsübersicht</strong>
            <div className="belegzeile" style={{ marginTop: 8 }}><span>Anzahlung fällig</span><span>{d.anzahlung ? d.anzahlung.toFixed(2) : "–"} €</span></div>
            <div className="belegzeile"><span>Bereits bezahlt</span><span>{bezahlt.toFixed(2)} €</span></div>
            <div className="belegzeile" style={{ fontWeight: 700 }}><span>Offen</span><span>{offen.toFixed(2)} €</span></div>

            {offen > 0 && order.status !== "storniert" && (
              <div style={{ marginTop: 16 }}>
                {payStep === null && (
                  <button className="btn primary" onClick={() => setPayStep("choose")}>
                    Jetzt bezahlen
                  </button>
                )}

                {payStep === "choose" && (
                  <div>
                    <p style={{ fontSize: 13, marginBottom: 10 }}>Wie möchtest du zahlen?</p>
                    <div className="method-cards">
                      <div
                        className={"method-card" + (payChoice === "anzahlung" ? " active" : "")}
                        onClick={() => { setPayChoice("anzahlung"); setPayStep("method"); }}
                      >
                        <h4>Anzahlung ({gesamt > 0 ? Math.round(((d.anzahlung || 0) / gesamt) * 100) : 20}%)</h4>
                        <p>{(d.anzahlung || 0).toFixed(2)} € jetzt anzahlen, Rest später.</p>
                      </div>
                      <div
                        className={"method-card" + (payChoice === "gesamt" ? " active" : "")}
                        onClick={() => { setPayChoice("gesamt"); setPayStep("method"); }}
                      >
                        <h4>Gesamtbetrag</h4>
                        <p>{offen.toFixed(2)} € vollständig bezahlen.</p>
                      </div>
                    </div>
                  </div>
                )}

                {payStep === "method" && (
                  <div>
                    <p style={{ fontSize: 13, marginBottom: 10 }}>
                      {payChoice === "anzahlung" ? (d.anzahlung || 0).toFixed(2) : offen.toFixed(2)} € — Zahlungsmethode wählen:
                    </p>
                    <div className="payment-methods">
                      {["PayPal", "Klarna", "Apple Pay", "Mastercard"].map((m) => (
                        <button
                          key={m}
                          type="button"
                          className="payment-method-btn"
                          onClick={() => setPayNote("Zahlungsabwicklung ist in Vorbereitung — diese Auswahl hat aktuell noch keine Funktion. Wir melden uns persönlich bei dir.")}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                    {payNote && <div className="send-success" style={{ marginTop: 12 }}>{payNote}</div>}
                    <button className="small-btn" style={{ marginTop: 10 }} onClick={() => { setPayStep(null); setPayNote(""); }}>
                      Zurück
                    </button>
                  </div>
                )}
              </div>
            )}

            <p style={{ marginTop: 12, fontSize: 12 }}>Echte Zahlungsabwicklung folgt in Kürze — aktuell ist dies eine Vorschau.</p>
          </div>

          <div style={{ padding: 20, display: "flex", flexWrap: "wrap", gap: 10 }}>
            {getAvailableBelege(order).map((b) => (
              <Link key={b.key} className="small-btn" href={`/konto/auftraege/${order.id}/beleg/${b.key}`}>
                {b.label}
              </Link>
            ))}
          </div>

          {order.status !== "storniert" && order.status !== "abgeschlossen" && (
            <div style={{ padding: "0 20px 20px" }}>
              <button className="small-btn danger" onClick={handleCancel} disabled={canceling}>
                {canceling ? "Storniere…" : "Auftrag stornieren"}
              </button>
            </div>
          )}
        </div>

        <div className="contact-box" style={{ maxWidth: 640, marginTop: 32 }}>
          <div className="contact-title">Beschwerde / Nachricht</div>

          {!beschwerde && !showComplaintForm && (
            <button className="btn ghost" onClick={() => setShowComplaintForm(true)}>Beschwerde eröffnen</button>
          )}

          {(beschwerde || showComplaintForm) && (
            <>
              {messages.length > 0 && (
                <div className="chat-thread">
                  {messages.map((m) => (
                    <div key={m.id} className={"chat-bubble " + m.sender}>
                      <div className="chat-meta">
                        {m.sender === "team" ? "Team" : "Du"} · {new Date(m.created_at).toLocaleString("de-DE")}
                      </div>
                      {m.message}
                    </div>
                  ))}
                </div>
              )}
              <textarea
                rows={3}
                placeholder="Deine Nachricht…"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                style={{ width: "100%", padding: 12, borderRadius: 10, border: "1px solid var(--border)", fontFamily: "inherit", fontSize: 14 }}
              />
              <button
                className="btn primary"
                style={{ marginTop: 10 }}
                disabled={sending || !newMessage.trim()}
                onClick={() => (beschwerde ? sendMessage(beschwerde.id) : startComplaint())}
              >
                {sending ? "Sende…" : "Senden"}
              </button>
            </>
          )}
        </div>

        <div className="contact-box" style={{ maxWidth: 640, marginTop: 32 }}>
          <div className="contact-title">Deine Bewertung</div>

          {bewertung ? (
            <div>
              <div className="sterne-anzeige" style={{ marginBottom: 8 }}>
                {[1, 2, 3, 4, 5].map((i) => (
                  <span key={i} className={i <= bewertung.sterne ? "stern voll" : "stern leer"}>★</span>
                ))}
              </div>
              {bewertung.text && <p style={{ fontSize: 14, color: "var(--text-dim)" }}>{bewertung.text}</p>}
              {bewertung.bild_url && (
                <img src={bewertung.bild_url} alt="Dein Bild" style={{ maxWidth: 200, borderRadius: 10, marginTop: 8 }} />
              )}
              {bewertung.admin_antwort && (
                <div style={{ background: "var(--bg-soft)", borderRadius: 10, padding: 12, marginTop: 12 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "var(--red)", marginBottom: 4 }}>Antwort von UmzugPlus</div>
                  <p style={{ fontSize: 13.5, color: "var(--text-dim)" }}>{bewertung.admin_antwort}</p>
                </div>
              )}
              <p className="mini-note" style={{ marginTop: 10 }}>Danke für deine Bewertung!</p>
            </div>
          ) : (
            <>
              <div className="field" style={{ marginBottom: 12 }}>
                <label>Sterne</label>
                <div className="sterne-auswahl">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <button
                      key={i}
                      type="button"
                      className={i <= sterne ? "stern voll" : "stern leer"}
                      onClick={() => setSterne(i)}
                      aria-label={`${i} Sterne`}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>
              <div className="field" style={{ marginBottom: 12 }}>
                <label htmlFor="bewertungText">Deine Erfahrung (optional)</label>
                <textarea
                  id="bewertungText"
                  rows={3}
                  placeholder="Wie war dein Umzug/deine Entsorgung/Reinigung?"
                  value={bewertungText}
                  onChange={(e) => setBewertungText(e.target.value)}
                  style={{ width: "100%", padding: 12, borderRadius: 10, border: "1px solid var(--border)", fontFamily: "inherit" }}
                />
              </div>
              <div className="field" style={{ marginBottom: 12 }}>
                <label htmlFor="bewertungBild">Foto hochladen (optional)</label>
                <input
                  id="bewertungBild"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setBewertungBild(e.target.files?.[0] || null)}
                />
              </div>
              <button className="btn primary" disabled={savingBewertung} onClick={submitBewertung}>
                {savingBewertung ? "Speichere…" : "Bewertung abschicken"}
              </button>
              {bewertungError && <div className="calc-error">{bewertungError}</div>}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

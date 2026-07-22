"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";
import { useAuth } from "../../../lib/useAuth";

const statusLabel = {
  neu: "Angebot",
  bestaetigt: "Bestätigt",
  storniert: "Storniert",
  abgeschlossen: "Abgeschlossen",
};

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

  useEffect(() => {
    if (!loading && !session) router.push("/login");
  }, [loading, session, router]);

  useEffect(() => {
    if (session) load();
  }, [session]);

  async function load() {
    setLoadingOrder(true);
    const { data: o } = await supabase
      .from("anfragen")
      .select("*")
      .eq("id", params.id)
      .single();
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
    setLoadingOrder(false);
  }

  async function handleCancel() {
    if (!confirm("Möchtest du diesen Auftrag wirklich stornieren?")) return;
    setCanceling(true);
    await supabase.from("anfragen").update({ status: "storniert" }).eq("id", order.id);
    setOrder({ ...order, status: "storniert" });
    setCanceling(false);
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

  return (
    <div className="admin-wrap">
      <div className="wrap">
        <h1 className="admin-title">Auftrag {order.booking_number}</h1>

        <div className="calc-result" style={{ maxWidth: 600 }}>
          <div className="calc-result-head">
            Status: {statusLabel[order.status] || order.status}
          </div>
          <div style={{ padding: 20 }}>
            <p><strong>Von:</strong> {order.von}</p>
            <p style={{ marginTop: 6 }}><strong>Nach:</strong> {order.nach}</p>
            <p style={{ marginTop: 6 }}><strong>Entfernung:</strong> {order.entfernung_km} km</p>
            {order.wunschtermin && (
              <p style={{ marginTop: 6 }}><strong>Wunschtermin:</strong> {new Date(order.wunschtermin).toLocaleDateString("de-DE")}</p>
            )}
            <p style={{ marginTop: 6 }}><strong>Geschätzter Preis:</strong> {order.geschaetzter_preis} €</p>
          </div>
          <div className="calc-note" style={{ display: "flex", gap: 10 }}>
            {order.status !== "storniert" && order.status !== "abgeschlossen" && (
              <button className="small-btn danger" onClick={handleCancel} disabled={canceling}>
                {canceling ? "Storniere…" : "Stornieren"}
              </button>
            )}
          </div>
        </div>

        <div className="contact-box" style={{ maxWidth: 600, marginTop: 32 }}>
          <div className="contact-title">Beschwerde / Nachricht</div>

          {!beschwerde && !showComplaintForm && (
            <button className="btn ghost" onClick={() => setShowComplaintForm(true)}>
              Beschwerde eröffnen
            </button>
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
                style={{
                  width: "100%",
                  padding: 12,
                  borderRadius: 10,
                  border: "1px solid var(--border)",
                  fontFamily: "inherit",
                  fontSize: 14,
                }}
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
      </div>
    </div>
  );
}

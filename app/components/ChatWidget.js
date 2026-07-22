"use client";

import { useState, useRef, useEffect } from "react";

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Hallo! Ich bin der UmzugPlus-Assistent. Wie kann ich dir helfen?" },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  async function sendMessage(e) {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    const newMessages = [...messages, { role: "user", content: text }];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages }),
      });
      const data = await res.json();
      if (data.error) {
        setMessages((prev) => [...prev, { role: "assistant", content: data.error }]);
      } else {
        setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
      }
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "Verbindung fehlgeschlagen. Bitte versuch es erneut." }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button className="chat-fab" onClick={() => setOpen((v) => !v)} aria-label="Chat öffnen">
        {open ? "✕" : "💬"}
      </button>

      {open && (
        <div className="chat-panel">
          <div className="chat-panel-head">
            <strong>UmzugPlus-Assistent</strong>
            <span className="admin-sub">Antwortet meist in wenigen Sekunden</span>
          </div>

          <div className="chat-panel-body">
            {messages.map((m, i) => (
              <div key={i} className={"chat-bubble " + (m.role === "user" ? "team" : "kunde")}>
                {m.content}
              </div>
            ))}
            {loading && <div className="chat-bubble kunde">…</div>}
            <div ref={bottomRef} />
          </div>

          <form className="chat-panel-input" onSubmit={sendMessage}>
            <input
              type="text"
              placeholder="Deine Frage…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
            />
            <button type="submit" className="btn primary" disabled={loading || !input.trim()}>
              Senden
            </button>
          </form>
        </div>
      )}
    </>
  );
}

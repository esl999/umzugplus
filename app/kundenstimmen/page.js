"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

function Sterne({ n }) {
  return (
    <span className="sterne-anzeige">
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={i <= n ? "stern voll" : "stern leer"}>★</span>
      ))}
    </span>
  );
}

export default function KundenstimmenPage() {
  const [bewertungen, setBewertungen] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("alle");

  useEffect(() => {
    supabase
      .from("bewertungen")
      .select("*")
      .eq("sichtbar", true)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setBewertungen(data || []);
        setLoading(false);
      });
  }, []);

  const schnitt = bewertungen.length
    ? (bewertungen.reduce((s, b) => s + b.sterne, 0) / bewertungen.length).toFixed(1)
    : null;

  const gefiltert = filter === "alle" ? bewertungen : bewertungen.filter((b) => b.sterne === Number(filter));

  return (
    <div className="wrap" style={{ padding: "56px 0 80px" }}>
      <span className="badge">Kundenstimmen</span>
      <h1 style={{ fontFamily: "var(--display)", fontWeight: 800, fontSize: "clamp(28px, 4vw, 40px)", marginTop: 14, marginBottom: 8 }}>
        Das sagen unsere Kunden
      </h1>
      {schnitt && (
        <p style={{ color: "var(--text-dim)", marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
          <Sterne n={Math.round(schnitt)} /> {schnitt} / 5 · {bewertungen.length} Bewertung(en) insgesamt
        </p>
      )}

      <div className="admin-toolbar" style={{ marginBottom: 28, maxWidth: 300 }}>
        <select value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="alle">Alle Bewertungen</option>
          <option value="5">5 Sterne</option>
          <option value="4">4 Sterne</option>
          <option value="3">3 Sterne</option>
          <option value="2">2 Sterne</option>
          <option value="1">1 Stern</option>
        </select>
      </div>

      {loading ? (
        <p>Lädt…</p>
      ) : gefiltert.length === 0 ? (
        <p style={{ color: "var(--text-dim)" }}>Keine Bewertungen in dieser Ansicht.</p>
      ) : (
        <div style={{ display: "grid", gap: 20, maxWidth: 680 }}>
          {gefiltert.map((b) => (
            <div className="price-row" key={b.id} style={{ alignItems: "flex-start", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", width: "100%", alignItems: "center" }}>
                <Sterne n={b.sterne} />
                <strong style={{ fontSize: 13.5 }}>{b.name || "Kunde"}</strong>
              </div>
              {b.text && <p style={{ fontSize: 14.5, color: "var(--text-dim)" }}>{b.text}</p>}
              {b.bild_url && (
                <img src={b.bild_url} alt="Kundenbild" style={{ maxWidth: 220, borderRadius: 10 }} />
              )}
              <span className="admin-sub">{new Date(b.created_at).toLocaleDateString("de-DE")}</span>

              {b.admin_antwort && (
                <div style={{ background: "var(--bg-soft)", borderRadius: 10, padding: 12, width: "100%" }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "var(--red)", marginBottom: 4 }}>Antwort von UmzugPlus</div>
                  <p style={{ fontSize: 13.5, color: "var(--text-dim)" }}>{b.admin_antwort}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

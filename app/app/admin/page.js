"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../lib/useAuth";

const statusOptions = ["neu", "kontaktiert", "angebot", "abgeschlossen"];

export default function AdminPage() {
  const { session, profile, loading, isAdmin } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState("anfragen");

  const [anfragen, setAnfragen] = useState([]);
  const [kunden, setKunden] = useState([]);
  const [preise, setPreise] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (!loading && (!session || (profile && !isAdmin))) {
      router.push("/");
    }
  }, [loading, session, profile, isAdmin, router]);

  useEffect(() => {
    if (!isAdmin) return;
    loadAll();
  }, [isAdmin]);

  async function loadAll() {
    setDataLoading(true);
    const [a, k, p] = await Promise.all([
      supabase.from("anfragen").select("*").order("created_at", { ascending: false }),
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("price_settings").select("*").order("label"),
    ]);
    setAnfragen(a.data || []);
    setKunden(k.data || []);
    setPreise((p.data || []).map((row) => ({ ...row, _draft: row.price })));
    setDataLoading(false);
  }

  async function updateStatus(id, status) {
    setAnfragen((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
    await supabase.from("anfragen").update({ status }).eq("id", id);
  }

  function setDraftPrice(key, value) {
    setPreise((prev) =>
      prev.map((row) => (row.key === key ? { ...row, _draft: value } : row))
    );
  }

  async function savePrice(key) {
    const row = preise.find((r) => r.key === key);
    if (!row) return;
    await supabase
      .from("price_settings")
      .update({ price: Number(row._draft) })
      .eq("key", key);
    setPreise((prev) =>
      prev.map((r) => (r.key === key ? { ...r, price: Number(row._draft) } : r))
    );
  }

  if (loading || !isAdmin) {
    return (
      <div className="auth-page">
        <div className="auth-card">Lädt…</div>
      </div>
    );
  }

  return (
    <div className="admin-wrap">
      <div className="wrap">
        <h1 className="admin-title">Admin-Bereich</h1>

        <div className="segmented" style={{ maxWidth: 480, marginBottom: 28 }}>
          <button className={tab === "anfragen" ? "active" : ""} onClick={() => setTab("anfragen")}>
            Anfragen
          </button>
          <button className={tab === "kunden" ? "active" : ""} onClick={() => setTab("kunden")}>
            Kunden
          </button>
          <button className={tab === "preise" ? "active" : ""} onClick={() => setTab("preise")}>
            Preise
          </button>
        </div>

        {dataLoading ? (
          <div>Lade Daten…</div>
        ) : (
          <>
            {tab === "anfragen" && (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Datum</th>
                      <th>Typ</th>
                      <th>Von → Nach</th>
                      <th>km</th>
                      <th>Preis</th>
                      <th>Kontakt</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {anfragen.length === 0 && (
                      <tr><td colSpan={7}>Noch keine Anfragen eingegangen.</td></tr>
                    )}
                    {anfragen.map((a) => (
                      <tr key={a.id}>
                        <td>{new Date(a.created_at).toLocaleDateString("de-DE")}</td>
                        <td>{a.kundentyp === "gewerbe" ? "Gewerbe" : "Privat"}</td>
                        <td>{a.von} → {a.nach}</td>
                        <td>{a.entfernung_km}</td>
                        <td>{a.geschaetzter_preis ? `${a.geschaetzter_preis} €` : "–"}</td>
                        <td>
                          {a.name || "–"}
                          {a.email && <div className="admin-sub">{a.email}</div>}
                          {a.telefon && <div className="admin-sub">{a.telefon}</div>}
                        </td>
                        <td>
                          <select
                            value={a.status}
                            onChange={(e) => updateStatus(a.id, e.target.value)}
                          >
                            {statusOptions.map((s) => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {tab === "kunden" && (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>E-Mail</th>
                      <th>Telefon</th>
                      <th>Rolle</th>
                      <th>Registriert seit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {kunden.length === 0 && (
                      <tr><td colSpan={5}>Noch keine registrierten Nutzer.</td></tr>
                    )}
                    {kunden.map((k) => (
                      <tr key={k.id}>
                        <td>{k.name || "–"}</td>
                        <td>{k.email}</td>
                        <td>{k.phone || "–"}</td>
                        <td>{k.role}</td>
                        <td>{new Date(k.created_at).toLocaleDateString("de-DE")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {tab === "preise" && (
              <div className="items-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
                {preise.map((row) => (
                  <div className="price-row" key={row.key}>
                    <div>
                      <div className="price-row-label">{row.label}</div>
                      <div className="admin-sub">pro {row.unit}</div>
                    </div>
                    <div className="price-row-controls">
                      <input
                        type="number"
                        step="0.5"
                        value={row._draft}
                        onChange={(e) => setDraftPrice(row.key, e.target.value)}
                      />
                      <span>€</span>
                      <button className="btn primary" onClick={() => savePrice(row.key)}>
                        Speichern
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

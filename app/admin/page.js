"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../lib/useAuth";
import { useAvailability, WEEKDAYS } from "../lib/availability";

const statusOptions = ["neu", "bestaetigt", "storniert", "abgeschlossen"];
const statusLabel = {
  neu: "Angebot",
  bestaetigt: "Bestätigt",
  storniert: "Storniert",
  abgeschlossen: "Abgeschlossen",
};
const complaintStatusOptions = ["offen", "in_bearbeitung", "geloest", "geschlossen"];

async function logAction(email, action, object) {
  await supabase.from("audit_logs").insert({ actor_email: email, action, object });
}

export default function AdminPage() {
  const { session, profile, loading, isAdmin } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState("anfragen");

  const [anfragen, setAnfragen] = useState([]);
  const [kunden, setKunden] = useState([]);
  const [preise, setPreise] = useState([]);
  const [beschwerden, setBeschwerden] = useState([]);
  const [logs, setLogs] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("alle");

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
    const [a, k, p, b, l] = await Promise.all([
      supabase.from("anfragen").select("*").order("created_at", { ascending: false }),
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("price_settings").select("*").order("label"),
      supabase.from("beschwerden").select("*").order("updated_at", { ascending: false }),
      supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(50),
    ]);
    setAnfragen(a.data || []);
    setKunden(k.data || []);
    setPreise((p.data || []).map((row) => ({ ...row, _draft: row.price })));
    setBeschwerden(b.data || []);
    setLogs(l.data || []);
    setDataLoading(false);
  }

  async function updateStatus(id, status) {
    setAnfragen((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
    await supabase.from("anfragen").update({ status }).eq("id", id);
    logAction(session.user.email, "anfrage.status", `${id} -> ${status}`);
  }

  function setDraftPrice(key, value) {
    setPreise((prev) => prev.map((row) => (row.key === key ? { ...row, _draft: value } : row)));
  }

  async function savePrice(key) {
    const row = preise.find((r) => r.key === key);
    if (!row) return;
    await supabase.from("price_settings").update({ price: Number(row._draft) }).eq("key", key);
    setPreise((prev) => prev.map((r) => (r.key === key ? { ...r, price: Number(row._draft) } : r)));
    logAction(session.user.email, "preis.update", `${key} -> ${row._draft}`);
  }

  const filteredAnfragen = useMemo(() => {
    return anfragen.filter((a) => {
      if (statusFilter !== "alle" && a.status !== statusFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          (a.booking_number || "").toLowerCase().includes(q) ||
          (a.email || "").toLowerCase().includes(q) ||
          (a.name || "").toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [anfragen, statusFilter, search]);

  const stats = useMemo(() => {
    const now = new Date();
    const thisMonth = anfragen.filter((a) => {
      const d = new Date(a.created_at);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() && a.status !== "storniert";
    });
    const umsatz = thisMonth.reduce((sum, a) => sum + (a.geschaetzter_preis || 0), 0);
    const offen = anfragen.filter((a) => a.status === "neu").length;
    const beschwerdenOffen = beschwerden.filter((b) => b.status === "offen").length;
    return { umsatz, offen, beschwerdenOffen, total: anfragen.length };
  }, [anfragen, beschwerden]);

  function exportCSV() {
    const rows = [
      ["Auftrag", "Datum", "Kundentyp", "Von", "Nach", "km", "Preis", "Email", "Status"],
      ...filteredAnfragen.map((a) => [
        a.booking_number,
        new Date(a.created_at).toLocaleDateString("de-DE"),
        a.kundentyp,
        a.von,
        a.nach,
        a.entfernung_km,
        a.geschaetzter_preis,
        a.email,
        a.status,
      ]),
    ];
    const csv = rows.map((r) => r.map((v) => `"${v ?? ""}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "umzugplus-auftraege.csv";
    link.click();
    logAction(session.user.email, "export.csv", `${filteredAnfragen.length} Zeilen`);
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

        <div className="admin-stats">
          <div className="admin-stat"><div className="k">Umsatz (Monat)</div><div className="v">{stats.umsatz.toFixed(0)} €</div></div>
          <div className="admin-stat"><div className="k">Offene Angebote</div><div className="v">{stats.offen}</div></div>
          <div className="admin-stat"><div className="k">Beschwerden offen</div><div className="v">{stats.beschwerdenOffen}</div></div>
          <div className="admin-stat"><div className="k">Aufträge gesamt</div><div className="v">{stats.total}</div></div>
        </div>

        <div className="segmented" style={{ maxWidth: 640, marginBottom: 28 }}>
          <button className={tab === "anfragen" ? "active" : ""} onClick={() => setTab("anfragen")}>Aufträge</button>
          <button className={tab === "kalender" ? "active" : ""} onClick={() => setTab("kalender")}>Kalender</button>
          <button className={tab === "preise" ? "active" : ""} onClick={() => setTab("preise")}>Preise</button>
          <button className={tab === "kunden" ? "active" : ""} onClick={() => setTab("kunden")}>Nutzer</button>
          <button className={tab === "beschwerden" ? "active" : ""} onClick={() => setTab("beschwerden")}>Beschwerden</button>
          <button className={tab === "logs" ? "active" : ""} onClick={() => setTab("logs")}>Logs</button>
        </div>

        {dataLoading ? (
          <div>Lade Daten…</div>
        ) : (
          <>
            {tab === "anfragen" && (
              <>
                <div className="admin-toolbar">
                  <input
                    className="admin-search"
                    placeholder="Auftrag, Name oder E-Mail suchen…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                  <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                    <option value="alle">Alle Status</option>
                    {statusOptions.map((s) => (
                      <option key={s} value={s}>{statusLabel[s]}</option>
                    ))}
                  </select>
                  <button className="btn ghost" onClick={exportCSV}>CSV-Export</button>
                </div>

                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Auftrag</th>
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
                      {filteredAnfragen.length === 0 && (
                        <tr><td colSpan={8}>Keine Treffer.</td></tr>
                      )}
                      {filteredAnfragen.map((a) => (
                        <tr key={a.id}>
                          <td>{a.booking_number || "–"}</td>
                          <td>{new Date(a.created_at).toLocaleDateString("de-DE")}</td>
                          <td>{a.kundentyp === "gewerbe" ? "Gewerbe" : "Privat"}</td>
                          <td>{a.von} → {a.nach}</td>
                          <td>{a.entfernung_km}</td>
                          <td>{a.geschaetzter_preis ? `${a.geschaetzter_preis} €` : "–"}</td>
                          <td>
                            {a.name || "–"}
                            {a.email && <div className="admin-sub">{a.email}</div>}
                          </td>
                          <td>
                            <select value={a.status} onChange={(e) => updateStatus(a.id, e.target.value)}>
                              {statusOptions.map((s) => (
                                <option key={s} value={s}>{statusLabel[s]}</option>
                              ))}
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {tab === "kalender" && <AdminKalender actorEmail={session.user.email} />}

            {tab === "kunden" && (
              <AdminNutzer kunden={kunden} setKunden={setKunden} actorEmail={session.user.email} />
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
                      <button className="btn primary" onClick={() => savePrice(row.key)}>Speichern</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {tab === "beschwerden" && (
              <AdminBeschwerden
                beschwerden={beschwerden}
                actorEmail={session.user.email}
                onChanged={loadAll}
              />
            )}

            {tab === "logs" && (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr><th>Datum</th><th>Admin</th><th>Aktion</th><th>Objekt</th></tr>
                  </thead>
                  <tbody>
                    {logs.length === 0 && <tr><td colSpan={4}>Noch keine Einträge.</td></tr>}
                    {logs.map((l) => (
                      <tr key={l.id}>
                        <td>{new Date(l.created_at).toLocaleString("de-DE")}</td>
                        <td>{l.actor_email}</td>
                        <td>{l.action}</td>
                        <td>{l.object}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function AdminKalender({ actorEmail }) {
  const { loading, days, maxPerDay, counts, blocked, statusFor, reload, toISO } = useAvailability(35);
  const [savingCapacity, setSavingCapacity] = useState(false);
  const [capacityDraft, setCapacityDraft] = useState(maxPerDay);

  useEffect(() => setCapacityDraft(maxPerDay), [maxPerDay]);

  async function saveCapacity() {
    setSavingCapacity(true);
    await supabase.from("capacity_config").update({ max_per_day: Number(capacityDraft) }).eq("id", "default");
    await logAction(actorEmail, "kapazitaet.update", `max_per_day -> ${capacityDraft}`);
    await reload();
    setSavingCapacity(false);
  }

  async function toggleBlock(date) {
    const iso = toISO(date);
    if (blocked.has(iso)) {
      await supabase.from("blocked_days").delete().eq("day", iso);
      await logAction(actorEmail, "tag.entsperrt", iso);
    } else {
      await supabase.from("blocked_days").insert({ day: iso, reason: "Admin gesperrt" });
      await logAction(actorEmail, "tag.gesperrt", iso);
    }
    reload();
  }

  if (loading) return <div>Lade Kalender…</div>;

  return (
    <div>
      <div className="price-row" style={{ maxWidth: 420, marginBottom: 24 }}>
        <div>
          <div className="price-row-label">Buchbare Aufträge pro Tag</div>
          <div className="admin-sub">Maximale Kapazität</div>
        </div>
        <div className="price-row-controls">
          <input type="number" min="1" value={capacityDraft} onChange={(e) => setCapacityDraft(e.target.value)} />
          <button className="btn primary" onClick={saveCapacity} disabled={savingCapacity}>
            {savingCapacity ? "…" : "Speichern"}
          </button>
        </div>
      </div>

      <div className="termin-grid">
        {days.map((d) => {
          const iso = toISO(d);
          const status = statusFor(d);
          const count = counts[iso] || 0;
          return (
            <button
              type="button"
              key={iso}
              onClick={() => status !== "closed" && toggleBlock(d)}
              className={
                "termin-day" +
                (status === "free" ? " free" : "") +
                (status === "full" || status === "blocked" ? " full" : "") +
                (status === "closed" ? " closed" : "")
              }
              title={status === "closed" ? "Sonntag geschlossen" : blocked.has(iso) ? "Klicken zum Entsperren" : "Klicken zum Sperren"}
            >
              <span className="termin-wd">{WEEKDAYS[d.getDay()]}</span>
              <span className="termin-dm">{d.getDate()}.{d.getMonth() + 1}.</span>
              <span className="termin-count">
                {status === "closed" ? "zu" : blocked.has(iso) ? "gesperrt" : `${count}/${maxPerDay}`}
              </span>
            </button>
          );
        })}
      </div>
      <p className="mini-note" style={{ marginTop: 12 }}>
        Tage anklicken, um sie manuell zu sperren oder zu entsperren (Sonntage sind fest geschlossen).
      </p>
    </div>
  );
}

function AdminNutzer({ kunden, setKunden, actorEmail }) {
  const [editing, setEditing] = useState(null);
  const [role, setRole] = useState("user");
  const [status, setStatus] = useState("active");
  const [saving, setSaving] = useState(false);

  function startEdit(k) {
    setEditing(k.id);
    setRole(k.role);
    setStatus(k.status || "active");
  }

  async function save(id) {
    setSaving(true);
    await supabase.from("profiles").update({ role, status }).eq("id", id);
    setKunden((prev) => prev.map((k) => (k.id === id ? { ...k, role, status } : k)));
    await logAction(actorEmail, "nutzer.update", `${id} -> ${role}/${status}`);
    setSaving(false);
    setEditing(null);
  }

  return (
    <div className="admin-table-wrap">
      <table className="admin-table">
        <thead>
          <tr>
            <th>Name</th><th>E-Mail</th><th>Rolle</th><th>Status</th><th>Registriert</th><th></th>
          </tr>
        </thead>
        <tbody>
          {kunden.length === 0 && <tr><td colSpan={6}>Noch keine registrierten Nutzer.</td></tr>}
          {kunden.map((k) => (
            <tr key={k.id}>
              <td>{k.name || "–"}</td>
              <td>{k.email}</td>
              <td>
                {editing === k.id ? (
                  <select value={role} onChange={(e) => setRole(e.target.value)}>
                    <option value="user">user</option>
                    <option value="admin">admin</option>
                  </select>
                ) : k.role}
              </td>
              <td>
                {editing === k.id ? (
                  <select value={status} onChange={(e) => setStatus(e.target.value)}>
                    <option value="active">active</option>
                    <option value="suspended">suspended</option>
                  </select>
                ) : (k.status || "active")}
              </td>
              <td>{new Date(k.created_at).toLocaleDateString("de-DE")}</td>
              <td>
                {editing === k.id ? (
                  <button className="small-btn" onClick={() => save(k.id)} disabled={saving}>
                    {saving ? "…" : "Speichern"}
                  </button>
                ) : (
                  <button className="small-btn" onClick={() => startEdit(k)}>Bearbeiten</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AdminBeschwerden({ beschwerden, actorEmail, onChanged }) {
  const [openId, setOpenId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);

  async function open(b) {
    setOpenId(b.id);
    const { data } = await supabase
      .from("beschwerde_nachrichten")
      .select("*")
      .eq("beschwerde_id", b.id)
      .order("created_at", { ascending: true });
    setMessages(data || []);
  }

  async function sendReply(beschwerdeId) {
    if (!reply.trim()) return;
    setSending(true);
    await supabase.from("beschwerde_nachrichten").insert({
      beschwerde_id: beschwerdeId,
      sender: "team",
      message: reply.trim(),
    });
    await supabase.from("beschwerden").update({ updated_at: new Date().toISOString() }).eq("id", beschwerdeId);
    await logAction(actorEmail, "beschwerde.antwort", beschwerdeId);
    setReply("");
    open({ id: beschwerdeId });
    setSending(false);
  }

  async function changeStatus(id, status) {
    await supabase.from("beschwerden").update({ status }).eq("id", id);
    await logAction(actorEmail, "beschwerde.status", `${id} -> ${status}`);
    onChanged();
  }

  if (beschwerden.length === 0) return <p className="auth-sub">Keine Beschwerden vorhanden.</p>;

  return (
    <div>
      {beschwerden.map((b) => (
        <div key={b.id} className="calc-result" style={{ marginBottom: 20 }}>
          <div className="calc-result-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>Beschwerde zu Auftrag {b.anfrage_id.slice(0, 8)}…</span>
            <select
              value={b.status}
              onChange={(e) => changeStatus(b.id, e.target.value)}
              style={{ fontSize: 12, padding: "4px 8px" }}
            >
              {complaintStatusOptions.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div style={{ padding: 20 }}>
            {openId !== b.id ? (
              <button className="small-btn" onClick={() => open(b)}>Chat öffnen</button>
            ) : (
              <>
                <div className="chat-thread">
                  {messages.map((m) => (
                    <div key={m.id} className={"chat-bubble " + m.sender}>
                      <div className="chat-meta">
                        {m.sender === "team" ? "Team" : "Kunde"} · {new Date(m.created_at).toLocaleString("de-DE")}
                      </div>
                      {m.message}
                    </div>
                  ))}
                </div>
                <textarea
                  rows={2}
                  placeholder="Antwort an den Kunden…"
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid var(--border)", fontFamily: "inherit" }}
                />
                <button className="btn primary" style={{ marginTop: 8 }} disabled={sending} onClick={() => sendReply(b.id)}>
                  {sending ? "Sende…" : "Senden"}
                </button>
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

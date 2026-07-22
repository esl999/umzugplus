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
          <button className={tab === "preise" ? "active" : ""} onClick={() => setTab("preise")}>Katalog &amp; Preise</button>
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
              <>
                <p className="mini-note" style={{ marginBottom: 16 }}>
                  Alle Preise gelten sofort für neue Anfragen. Beträge in Euro, Sätze in Prozent.
                </p>
                <div className="foot-heading" style={{ color: "var(--text)", marginBottom: 12 }}>Preis-Parameter</div>
                <div className="items-grid" style={{ gridTemplateColumns: "1fr 1fr", marginBottom: 32 }}>
                  {preise.map((row) => (
                    <div className="price-row" key={row.key}>
                      <div>
                        <div className="price-row-label">{row.label}</div>
                        <div className="admin-sub">{row.unit}</div>
                      </div>
                      <div className="price-row-controls">
                        <input
                          type="number"
                          step="0.5"
                          value={row._draft}
                          onChange={(e) => setDraftPrice(row.key, e.target.value)}
                        />
                        <button className="btn primary" onClick={() => savePrice(row.key)}>Speichern</button>
                      </div>
                    </div>
                  ))}
                </div>

                <AdminKatalog actorEmail={session.user.email} />
                <AdminRabattcodes actorEmail={session.user.email} />
              </>
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

function AdminKatalog({ actorEmail }) {
  const [items, setItems] = useState([]);
  const [loadingItems, setLoadingItems] = useState(true);
  const [drafts, setDrafts] = useState({});
  const [newName, setNewName] = useState("");
  const [newKategorie, setNewKategorie] = useState("");
  const [newPreis, setNewPreis] = useState("");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoadingItems(true);
    const { data } = await supabase.from("katalog_items").select("*").order("kategorie").order("name");
    setItems(data || []);
    const d = {};
    (data || []).forEach((i) => (d[i.id] = i.preis));
    setDrafts(d);
    setLoadingItems(false);
  }

  async function saveItem(id) {
    await supabase.from("katalog_items").update({ preis: Number(drafts[id]) }).eq("id", id);
    await logAction(actorEmail, "katalog.preis", `${id} -> ${drafts[id]}`);
    load();
  }

  async function toggleActive(item) {
    await supabase.from("katalog_items").update({ aktiv: !item.aktiv }).eq("id", item.id);
    await logAction(actorEmail, item.aktiv ? "katalog.deaktiviert" : "katalog.aktiviert", item.name);
    load();
  }

  async function addItem() {
    if (!newName.trim() || !newPreis) return;
    setAdding(true);
    await supabase.from("katalog_items").insert({
      name: newName.trim(),
      kategorie: newKategorie.trim() || "Sonstiges",
      preis: Number(newPreis),
    });
    await logAction(actorEmail, "katalog.neu", newName.trim());
    setNewName("");
    setNewKategorie("");
    setNewPreis("");
    setAdding(false);
    load();
  }

  if (loadingItems) return <div>Lade Katalog…</div>;

  return (
    <div style={{ marginBottom: 32 }}>
      <div className="foot-heading" style={{ color: "var(--text)", marginBottom: 12 }}>
        Gegenstände — Katalog ({items.length})
      </div>

      <div className="admin-toolbar">
        <input className="admin-search" placeholder="Name (z.B. Kühlschrank)" value={newName} onChange={(e) => setNewName(e.target.value)} />
        <input className="admin-search" style={{ maxWidth: 160 }} placeholder="Kategorie" value={newKategorie} onChange={(e) => setNewKategorie(e.target.value)} />
        <input className="admin-search" type="number" style={{ maxWidth: 100 }} placeholder="€" value={newPreis} onChange={(e) => setNewPreis(e.target.value)} />
        <button className="btn primary" onClick={addItem} disabled={adding}>+ Anlegen</button>
      </div>

      <div className="items-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
        {items.map((item) => (
          <div className="price-row" key={item.id} style={{ opacity: item.aktiv ? 1 : 0.5 }}>
            <div>
              <div className="price-row-label">{item.name}</div>
              <div className="admin-sub">{item.kategorie}</div>
            </div>
            <div className="price-row-controls">
              <input
                type="number"
                value={drafts[item.id] ?? item.preis}
                onChange={(e) => setDrafts((d) => ({ ...d, [item.id]: e.target.value }))}
              />
              <button className="btn primary" onClick={() => saveItem(item.id)}>Speichern</button>
              <button className="small-btn" onClick={() => toggleActive(item)}>
                {item.aktiv ? "Deaktivieren" : "Aktivieren"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AdminRabattcodes({ actorEmail }) {
  const [codes, setCodes] = useState([]);
  const [loadingCodes, setLoadingCodes] = useState(true);
  const [code, setCode] = useState("");
  const [typ, setTyp] = useState("prozent");
  const [wert, setWert] = useState("");
  const [maxNutzungen, setMaxNutzungen] = useState("");

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoadingCodes(true);
    const { data } = await supabase.from("rabattcodes").select("*").order("code");
    setCodes(data || []);
    setLoadingCodes(false);
  }

  async function addCode() {
    if (!code.trim() || !wert) return;
    await supabase.from("rabattcodes").insert({
      code: code.trim().toUpperCase(),
      typ,
      wert: Number(wert),
      max_nutzungen: maxNutzungen ? Number(maxNutzungen) : null,
    });
    await logAction(actorEmail, "rabattcode.neu", code.trim().toUpperCase());
    setCode("");
    setWert("");
    setMaxNutzungen("");
    load();
  }

  async function toggleActive(c) {
    await supabase.from("rabattcodes").update({ aktiv: !c.aktiv }).eq("code", c.code);
    load();
  }

  if (loadingCodes) return null;

  return (
    <div>
      <div className="foot-heading" style={{ color: "var(--text)", marginBottom: 12 }}>Rabattcodes</div>
      <div className="admin-toolbar">
        <input className="admin-search" style={{ maxWidth: 140 }} placeholder="CODE" value={code} onChange={(e) => setCode(e.target.value)} />
        <select value={typ} onChange={(e) => setTyp(e.target.value)}>
          <option value="prozent">Prozent (%)</option>
          <option value="fix">Fixbetrag (€)</option>
        </select>
        <input className="admin-search" type="number" style={{ maxWidth: 100 }} placeholder="Wert" value={wert} onChange={(e) => setWert(e.target.value)} />
        <input className="admin-search" type="number" style={{ maxWidth: 140 }} placeholder="max. Nutzungen" value={maxNutzungen} onChange={(e) => setMaxNutzungen(e.target.value)} />
        <button className="btn primary" onClick={addCode}>+ Anlegen</button>
      </div>
      {codes.map((c) => (
        <div className="price-row" key={c.code} style={{ opacity: c.aktiv ? 1 : 0.5, marginBottom: 8 }}>
          <div>
            <div className="price-row-label">{c.code}</div>
            <div className="admin-sub">
              {c.typ === "prozent" ? `${c.wert}%` : `${c.wert} €`} · {c.nutzungen}/{c.max_nutzungen ?? "∞"} genutzt
            </div>
          </div>
          <button className="small-btn" onClick={() => toggleActive(c)}>{c.aktiv ? "Deaktivieren" : "Aktivieren"}</button>
        </div>
      ))}
    </div>
  );
}

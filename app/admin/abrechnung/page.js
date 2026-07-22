"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../lib/useAuth";
import { MONTHS } from "../../lib/availability";

export default function AbrechnungPage() {
  const { session, profile, loading, isAdmin } = useAuth();
  const router = useRouter();

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [monthIndex, setMonthIndex] = useState(now.getMonth());
  const [orders, setOrders] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (!loading && (!session || (profile && !isAdmin))) router.push("/");
  }, [loading, session, profile, isAdmin, router]);

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin, year, monthIndex]);

  async function load() {
    setDataLoading(true);
    const start = new Date(year, monthIndex, 1).toISOString();
    const end = new Date(year, monthIndex + 1, 1).toISOString();
    const { data } = await supabase
      .from("anfragen")
      .select("*")
      .gte("created_at", start)
      .lt("created_at", end)
      .neq("status", "storniert")
      .order("created_at");
    setOrders(data || []);
    setDataLoading(false);
  }

  if (loading || !isAdmin) {
    return (
      <div className="auth-page">
        <div className="auth-card">Lädt…</div>
      </div>
    );
  }

  const netto = orders.reduce((s, o) => s + (o.preis_details?.netto || 0), 0);
  const ust = orders.reduce((s, o) => s + (o.preis_details?.mwstBetrag || 0), 0);
  const brutto = orders.reduce((s, o) => s + (o.geschaetzter_preis || 0), 0);
  const bezahlt = orders.reduce((s, o) => s + (o.bezahlt_betrag || 0), 0);

  return (
    <div className="wrap" style={{ padding: "40px 0" }}>
      <div className="no-print" style={{ marginBottom: 24, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <select value={monthIndex} onChange={(e) => setMonthIndex(Number(e.target.value))}>
          {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
        </select>
        <select value={year} onChange={(e) => setYear(Number(e.target.value))}>
          {[2025, 2026, 2027].map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
        <button className="btn primary" onClick={() => window.print()}>Als PDF drucken / speichern</button>
      </div>

      <div className="beleg-doc">
        <div className="beleg-head">
          <div><div className="beleg-logo">UmzugPlus</div></div>
          <div className="beleg-address">
            Musterstraße 1, 12345 Musterstadt<br />
            rechnung@umzugplus.de · USt-IdNr.: DE123456789
          </div>
        </div>

        <h1>Monatsabrechnung {MONTHS[monthIndex]} {year}</h1>
        <p className="beleg-meta">
          Erstellt am {new Date().toLocaleDateString("de-DE")} · {orders.length} Aufträge (ohne Stornierungen)
        </p>

        {dataLoading ? (
          <p>Lädt…</p>
        ) : (
          <>
            <table className="beleg-table">
              <thead>
                <tr>
                  <th>Auftrag</th>
                  <th>Datum</th>
                  <th>Kunde</th>
                  <th style={{ textAlign: "right" }}>Netto</th>
                  <th style={{ textAlign: "right" }}>USt</th>
                  <th style={{ textAlign: "right" }}>Brutto</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id}>
                    <td>{o.booking_number}</td>
                    <td>{new Date(o.created_at).toLocaleDateString("de-DE")}</td>
                    <td>{o.name || o.email || "–"}</td>
                    <td style={{ textAlign: "right" }}>{(o.preis_details?.netto || 0).toFixed(2)} €</td>
                    <td style={{ textAlign: "right" }}>{(o.preis_details?.mwstBetrag || 0).toFixed(2)} €</td>
                    <td style={{ textAlign: "right" }}>{(o.geschaetzter_preis || 0).toFixed(2)} €</td>
                  </tr>
                ))}
                {orders.length === 0 && (
                  <tr><td colSpan={6}>Keine Aufträge in diesem Monat.</td></tr>
                )}
              </tbody>
            </table>

            <div className="beleg-totals">
              <div><span>Summe Netto</span><span>{netto.toFixed(2)} €</span></div>
              <div><span>Summe USt</span><span>{ust.toFixed(2)} €</span></div>
              <div className="beleg-total-main"><span>Summe Brutto</span><span>{brutto.toFixed(2)} €</span></div>
              <div><span>Davon bereits bezahlt</span><span>{bezahlt.toFixed(2)} €</span></div>
              <div><span>Davon noch offen</span><span>{(brutto - bezahlt).toFixed(2)} €</span></div>
            </div>
          </>
        )}

        <p className="beleg-footnote">
          Diese Aufstellung dient als Grundlage für die Buchhaltung / den Steuerberater. Stornierte Aufträge sind nicht enthalten.
        </p>
      </div>
    </div>
  );
}

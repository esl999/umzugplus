"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";
import { useAuth } from "../../../lib/useAuth";
import StatusStepper from "../../../components/StatusStepper";

const statusLabel = {
  neu: "Angebot", bestaetigt: "Bestätigt", storniert: "Storniert", abgeschlossen: "Abgeschlossen",
};

export default function AdminNutzerDetail() {
  const { session, profile, loading, isAdmin } = useAuth();
  const router = useRouter();
  const params = useParams();

  const [kunde, setKunde] = useState(null);
  const [orders, setOrders] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (!loading && (!session || (profile && !isAdmin))) router.push("/");
  }, [loading, session, profile, isAdmin, router]);

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin]);

  async function load() {
    setDataLoading(true);
    const [k, o] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", params.id).single(),
      supabase.from("anfragen").select("*").eq("user_id", params.id).order("created_at", { ascending: false }),
    ]);
    setKunde(k.data || null);
    setOrders(o.data || []);
    setDataLoading(false);
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
        <h1 className="admin-title">Nutzerprofil</h1>

        {dataLoading || !kunde ? (
          <p>Lädt…</p>
        ) : (
          <>
            <div className="calc-result" style={{ maxWidth: 560, marginBottom: 32 }}>
              <div className="calc-result-head">{kunde.name || kunde.email}</div>
              <div style={{ padding: 20, fontSize: 14, lineHeight: 1.9 }}>
                <p><strong>E-Mail:</strong> {kunde.email}</p>
                <p><strong>Telefon:</strong> {kunde.phone || "–"}</p>
                <p><strong>Adresse:</strong> {[kunde.adresse_strasse, kunde.adresse_hausnummer].filter(Boolean).join(" ") || "–"}
                  {kunde.adresse_plz || kunde.adresse_stadt ? `, ${[kunde.adresse_plz, kunde.adresse_stadt].filter(Boolean).join(" ")}` : ""}</p>
                <p><strong>Rolle:</strong> {kunde.role}</p>
                <p><strong>Status:</strong> {kunde.status === "suspended" ? "Gesperrt" : "Aktiv"}</p>
                <p><strong>Registriert seit:</strong> {new Date(kunde.created_at).toLocaleDateString("de-DE")}</p>
              </div>
            </div>

            <div className="foot-heading" style={{ color: "var(--text)", marginBottom: 12 }}>
              Aufträge ({orders.length})
            </div>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr><th>Auftrag</th><th>Datum</th><th>Status</th><th>Preis</th></tr>
                </thead>
                <tbody>
                  {orders.length === 0 && <tr><td colSpan={4}>Keine Aufträge vorhanden.</td></tr>}
                  {orders.map((o) => (
                    <tr key={o.id}>
                      <td>{o.booking_number}</td>
                      <td>{new Date(o.created_at).toLocaleDateString("de-DE")}</td>
                      <td>
                        <StatusStepper status={o.status} bezahlt={o.bezahlt_betrag || 0} gesamt={o.geschaetzter_preis || 0} />
                      </td>
                      <td>{o.geschaetzter_preis ? `${o.geschaetzter_preis.toFixed(2)} €` : "–"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

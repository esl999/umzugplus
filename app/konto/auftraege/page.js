"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../lib/useAuth";

const statusLabel = {
  neu: "Angebot",
  bestaetigt: "Bestätigt",
  storniert: "Storniert",
  abgeschlossen: "Abgeschlossen",
};

export default function MeineAuftraege() {
  const { session, loading } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);

  useEffect(() => {
    if (!loading && !session) router.push("/login");
  }, [loading, session, router]);

  useEffect(() => {
    if (session) loadOrders();
  }, [session]);

  async function loadOrders() {
    setLoadingOrders(true);
    const { data } = await supabase
      .from("anfragen")
      .select("*")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false });
    setOrders(data || []);
    setLoadingOrders(false);
  }

  if (loading || !session) {
    return (
      <div className="auth-page">
        <div className="auth-card">Lädt…</div>
      </div>
    );
  }

  return (
    <div className="admin-wrap">
      <div className="wrap">
        <h1 className="admin-title">Meine Aufträge</h1>

        {loadingOrders ? (
          <div>Lade…</div>
        ) : orders.length === 0 ? (
          <p className="auth-sub">Du hast noch keine Anfrage gesendet.</p>
        ) : (
          <div className="orders-table-wrap">
            <table className="orders-table">
              <thead>
                <tr>
                  <th>Auftrag</th>
                  <th>Datum</th>
                  <th>Status</th>
                  <th>Betrag</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id}>
                    <td>{o.booking_number || "–"}</td>
                    <td>{new Date(o.created_at).toLocaleDateString("de-DE")}</td>
                    <td>
                      <span className={"status-pill " + o.status}>
                        {statusLabel[o.status] || o.status}
                      </span>
                    </td>
                    <td>{o.geschaetzter_preis ? `${o.geschaetzter_preis} €` : "–"}</td>
                    <td>
                      <Link className="small-btn" href={`/konto/auftraege/${o.id}`}>
                        Details
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

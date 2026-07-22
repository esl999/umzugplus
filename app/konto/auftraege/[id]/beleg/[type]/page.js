"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "../../../../../lib/supabaseClient";
import { useAuth } from "../../../../../lib/useAuth";

const titles = {
  angebot: "Angebot",
  auftragsbestaetigung: "Auftragsbestätigung",
  anzahlungsbestaetigung: "Anzahlungsbeleg",
  rechnung: "Rechnung",
  storno: "Storno-Dokument",
};

function isAvailable(type, order) {
  const gesamt = order.geschaetzter_preis || 0;
  const bezahlt = order.bezahlt_betrag || 0;
  if (type === "angebot") return true;
  if (type === "auftragsbestaetigung") return order.status === "bestaetigt" || order.status === "abgeschlossen";
  if (type === "anzahlungsbestaetigung") return bezahlt > 0 && bezahlt < gesamt;
  if (type === "rechnung") return gesamt > 0 && bezahlt >= gesamt;
  if (type === "storno") return order.status === "storniert";
  return false;
}

export default function BelegPage() {
  const { session, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const [order, setOrder] = useState(null);

  useEffect(() => {
    if (!loading && !session) router.push("/login");
  }, [loading, session, router]);

  useEffect(() => {
    if (session) {
      supabase.from("anfragen").select("*").eq("id", params.id).single().then(({ data }) => setOrder(data));
    }
  }, [session]);

  if (loading || !order) {
    return (
      <div className="auth-page">
        <div className="auth-card">Lädt…</div>
      </div>
    );
  }

  const type = params.type;

  if (!isAvailable(type, order)) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          Dieses Dokument ist für diesen Auftrag aktuell noch nicht verfügbar — es erscheint automatisch, sobald der
          entsprechende Schritt erreicht ist (z.B. Bestätigung durch das Team oder eingegangene Zahlung).
        </div>
      </div>
    );
  }

  const d = order.preis_details || {};
  const gesamt = order.geschaetzter_preis || 0;
  const bezahlt = order.bezahlt_betrag || 0;
  const offen = Math.max(0, gesamt - bezahlt);

  // Stornogebühr berechnen: bis 12h vor Termin kostenlos, danach Grundpreis + 3% vom Gesamtbetrag
  let stornoInfo = null;
  if (type === "storno") {
    const terminDate = order.wunschtermin ? new Date(order.wunschtermin) : null;
    const stornoDate = order.storniert_at ? new Date(order.storniert_at) : new Date();
    const hoursBefore = terminDate ? (terminDate - stornoDate) / (1000 * 60 * 60) : null;
    const kostenlos = hoursBefore === null || hoursBefore >= 12;
    const gebuehr = kostenlos ? 0 : (d.grundpreis || 0) + gesamt * 0.03;
    const erstattung = Math.max(0, bezahlt - gebuehr);
    stornoInfo = { kostenlos, gebuehr, erstattung, stornoDate };
  }

  return (
    <div className="wrap" style={{ padding: "48px 0" }}>
      <div className="beleg-doc">
        <div className="beleg-head">
          <div>
            <div className="beleg-logo">UmzugPlus</div>
          </div>
          <div className="beleg-address">
            Musterstraße 1, 12345 Musterstadt<br />
            rechnung@umzugplus.de · +49 30 0000000<br />
            USt-IdNr.: DE123456789
          </div>
        </div>

        <h1>{titles[type]}</h1>
        <p className="beleg-meta">
          {titles[type]}-Nr.: {type.slice(0, 3).toUpperCase()}-{order.booking_number}<br />
          Buchung: {order.booking_number}<br />
          Datum: {new Date(order.created_at).toLocaleDateString("de-DE")}<br />
          {order.wunschtermin && <><strong>Leistungstermin: {new Date(order.wunschtermin).toLocaleDateString("de-DE")}</strong></>}
        </p>

        <div className="beleg-parties">
          <div>
            <div className="beleg-heading">Kunde</div>
            {order.name && <p>{order.name}</p>}
            <p>{order.email}</p>
          </div>
          <div>
            <div className="beleg-heading">Leistung &amp; Adresse</div>
            <p>{order.leistung === "entsorgung" ? "Entsorgung" : "Umzug"}</p>
            <p>Von: {order.von}</p>
            {order.nach && <p>Bis: {order.nach}</p>}
          </div>
        </div>

        {type !== "storno" && (
          <>
            <table className="beleg-table">
              <thead>
                <tr><th>Beschreibung</th><th style={{ textAlign: "right" }}>Betrag</th></tr>
              </thead>
              <tbody>
                <tr><td>Grundpreis (Fixkosten)</td><td style={{ textAlign: "right" }}>{(d.grundpreis || 0).toFixed(2)} €</td></tr>
                {d.umfangLabel && <tr><td>{d.umfangLabel}</td><td style={{ textAlign: "right" }}>{(d.umfang || 0).toFixed(2)} €</td></tr>}
                {d.etagenzuschlag > 0 && (
                  <tr><td>Etagenzuschlag: {d.etagenOhneAufzug} Etage(n) ohne Aufzug</td><td style={{ textAlign: "right" }}>{d.etagenzuschlag.toFixed(2)} €</td></tr>
                )}
                {d.transport > 0 && <tr><td>Transport: {d.km} km</td><td style={{ textAlign: "right" }}>{d.transport.toFixed(2)} €</td></tr>}
                {d.mitarbeiterAufpreis > 0 && <tr><td>3. Mitarbeiter</td><td style={{ textAlign: "right" }}>{d.mitarbeiterAufpreis.toFixed(2)} €</td></tr>}
              </tbody>
            </table>

            <div className="beleg-totals">
              <div><span>Netto</span><span>{(d.netto || 0).toFixed(2)} €</span></div>
              <div><span>zzgl. USt ({d.mwstSatz || 19}%)</span><span>{(d.mwstBetrag || 0).toFixed(2)} €</span></div>
              <div className="beleg-total-main"><span>Gesamtbetrag</span><span>{gesamt.toFixed(2)} €</span></div>
              <div><span>Anzahlung</span><span>{(d.anzahlung || 0).toFixed(2)} €</span></div>
              <div><span>Restzahlung</span><span>{offen.toFixed(2)} €</span></div>
              <div><span>Bereits gezahlt</span><span>{bezahlt.toFixed(2)} €</span></div>
            </div>
          </>
        )}

        {type === "storno" && stornoInfo && (
          <div className="beleg-totals" style={{ marginLeft: 0, maxWidth: "100%" }}>
            <div><span>Storniert am</span><span>{stornoInfo.stornoDate.toLocaleString("de-DE")}</span></div>
            <div><span>Ursprünglicher Gesamtbetrag</span><span>{gesamt.toFixed(2)} €</span></div>
            <div><span>Bereits gezahlt</span><span>{bezahlt.toFixed(2)} €</span></div>
            <div>
              <span>{stornoInfo.kostenlos ? "Stornogebühr (kostenlos, > 12h vor Termin)" : "Stornogebühr (Grundpreis + 3%)"}</span>
              <span>{stornoInfo.gebuehr.toFixed(2)} €</span>
            </div>
            <div className="beleg-total-main"><span>Erstattungsbetrag</span><span>{stornoInfo.erstattung.toFixed(2)} €</span></div>
          </div>
        )}

        {type === "auftragsbestaetigung" && (
          <div className="beleg-terms" style={{ borderTop: "none", paddingTop: 0, marginBottom: 16 }}>
            <strong>Wichtiger Hinweis zur Anzahlung</strong>
            <p>
              Die Anzahlung in Höhe von {(d.anzahlung || 0).toFixed(2)} € muss innerhalb von 24 Stunden nach dieser
              Bestätigung eingehen, damit der Auftrag endgültig verbindlich bleibt.
            </p>
          </div>
        )}

        <div className="beleg-terms">
          <strong>Stornobedingungen</strong>
          <p>
            Eine Stornierung ist bis 12 Stunden vor dem vereinbarten Termin kostenlos möglich. Bei einer späteren
            Stornierung wird der Grundpreis einbehalten zzgl. 3% Bearbeitungsgebühr vom Gesamtbetrag. Die Stornierung
            ist jederzeit online im Kundenkonto möglich.
          </p>
        </div>
      </div>

      <div className="wrap" style={{ maxWidth: 700, margin: "0 auto" }}>
        <button className="btn primary no-print" style={{ marginTop: 24 }} onClick={() => window.print()}>
          Als PDF drucken / speichern
        </button>
      </div>
    </div>
  );
}

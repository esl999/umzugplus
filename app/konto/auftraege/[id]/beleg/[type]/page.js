"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "../../../../../lib/supabaseClient";
import { useAuth } from "../../../../../lib/useAuth";

const titles = {
  angebot: "Angebot",
  auftragsbestaetigung: "Auftragsbestätigung",
  rechnung: "Rechnung",
  zahlungsbestaetigung: "Zahlungsbestätigung",
};

const footnotes = {
  angebot: "Unverbindlicher Preisvoranschlag. 14 Tage gültig.",
  auftragsbestaetigung: "Wir freuen uns auf die Durchführung zum vereinbarten Termin.",
  rechnung: "Rechnung gemäß §14 UStG. Zahlungsziel: 14 Tage.",
  zahlungsbestaetigung: "Vielen Dank für Ihre Zahlung.",
};

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
  const d = order.preis_details || {};
  const gesamt = order.geschaetzter_preis || 0;
  const bezahlt = order.bezahlt_betrag || 0;
  const offen = Math.max(0, gesamt - bezahlt);

  if (type === "zahlungsbestaetigung" && bezahlt <= 0) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          Diese Zahlungsbestätigung erscheint automatisch, sobald die Online-Zahlung eingerichtet ist und eine Zahlung eingegangen ist.
        </div>
      </div>
    );
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

        <div className="beleg-terms">
          <strong>Stornobedingungen / Erstattungsregelung</strong>
          <p>
            Ab 5 Werktagen vor dem Termin werden 100% der Anzahlung erstattet, ab 24 Stunden vor dem
            Termin 50%, bei weniger als 24 Stunden keine Erstattung. Die Stornierung ist jederzeit
            online im Kundenkonto möglich.
          </p>
        </div>

        <p className="beleg-footnote">{footnotes[type]}</p>

        <button className="btn primary no-print" style={{ marginTop: 24 }} onClick={() => window.print()}>
          Als PDF drucken / speichern
        </button>
      </div>
    </div>
  );
}

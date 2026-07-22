"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../lib/useAuth";

export default function KontoPage() {
  const { session, profile, loading, isAdmin, refreshProfile } = useAuth();
  const router = useRouter();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [strasse, setStrasse] = useState("");
  const [hausnummer, setHausnummer] = useState("");
  const [plz, setPlz] = useState("");
  const [stadt, setStadt] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!loading && !session) {
      router.push("/login");
    }
  }, [loading, session, router]);

  useEffect(() => {
    if (profile) {
      setName(profile.name || "");
      setPhone(profile.phone || "");
      setStrasse(profile.adresse_strasse || "");
      setHausnummer(profile.adresse_hausnummer || "");
      setPlz(profile.adresse_plz || "");
      setStadt(profile.adresse_stadt || "");
    }
  }, [profile]);

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    await supabase
      .from("profiles")
      .update({
        name,
        phone,
        adresse_strasse: strasse,
        adresse_hausnummer: hausnummer,
        adresse_plz: plz,
        adresse_stadt: stadt,
      })
      .eq("id", session.user.id);
    setSaving(false);
    setSaved(true);
    refreshProfile();
  }

  if (loading || !session) {
    return (
      <div className="auth-page">
        <div className="auth-card">Lädt…</div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ maxWidth: 640 }}>
        <h1>Mein Profil</h1>
        <p className="auth-sub">Deine Kontodaten im Überblick.</p>

        <div className="field">
          <label>E-Mail</label>
          <input type="text" value={session.user.email} disabled />
        </div>

        <form onSubmit={handleSave}>
          <div className="field" style={{ marginTop: 14 }}>
            <label htmlFor="name">Name</label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Dein Name"
            />
          </div>
          <div className="field" style={{ marginTop: 14 }}>
            <label htmlFor="phone">Telefon</label>
            <input
              id="phone"
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Deine Telefonnummer"
            />
          </div>

          <div className="calc-row-3" style={{ marginTop: 14 }}>
            <div className="field">
              <label htmlFor="strasse">Straße</label>
              <input id="strasse" type="text" value={strasse} onChange={(e) => setStrasse(e.target.value)} placeholder="Musterstraße" />
            </div>
            <div className="field">
              <label htmlFor="hausnummer">Hausnummer</label>
              <input id="hausnummer" type="text" value={hausnummer} onChange={(e) => setHausnummer(e.target.value)} placeholder="12" />
            </div>
            <div className="field">
              <label htmlFor="plz">Postleitzahl</label>
              <input id="plz" type="text" value={plz} onChange={(e) => setPlz(e.target.value)} placeholder="58135" />
            </div>
          </div>
          <div className="field" style={{ marginTop: 14, maxWidth: 260 }}>
            <label htmlFor="stadt">Stadt</label>
            <input id="stadt" type="text" value={stadt} onChange={(e) => setStadt(e.target.value)} placeholder="Hagen" />
          </div>

          <button className="calc-submit" style={{ marginTop: 20 }} disabled={saving}>
            {saving ? "Speichere…" : "Änderungen speichern"}
          </button>

          {saved && <div className="send-success" style={{ marginTop: 14 }}>Gespeichert.</div>}
        </form>

        <p className="auth-switch">
          <Link href="/konto/auftraege">Meine Aufträge ansehen →</Link>
        </p>

        {isAdmin && (
          <p className="auth-switch">
            Du bist Admin. <Link href="/admin">Zum Admin-Bereich</Link>
          </p>
        )}
      </div>
    </div>
  );
}

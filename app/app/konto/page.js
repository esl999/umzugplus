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
    }
  }, [profile]);

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    await supabase
      .from("profiles")
      .update({ name, phone })
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
      <div className="auth-card">
        <h1>Mein Konto</h1>
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

          <button className="calc-submit" style={{ marginTop: 20 }} disabled={saving}>
            {saving ? "Speichere…" : "Änderungen speichern"}
          </button>

          {saved && <div className="send-success" style={{ marginTop: 14 }}>Gespeichert.</div>}
        </form>

        {isAdmin && (
          <p className="auth-switch">
            Du bist Admin. <Link href="/admin">Zum Admin-Bereich</Link>
          </p>
        )}
      </div>
    </div>
  );
}

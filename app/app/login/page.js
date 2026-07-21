"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabaseClient";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { data, error: loginError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (loginError) {
      setLoading(false);
      setError(
        loginError.message.includes("Invalid login")
          ? "E-Mail oder Passwort ist falsch, oder das Konto ist noch nicht bestätigt."
          : "Login fehlgeschlagen. Bitte versuch es erneut."
      );
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", data.user.id)
      .single();

    setLoading(false);
    router.push(profile?.role === "admin" ? "/admin" : "/");
    router.refresh();
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Log In</h1>
        <p className="auth-sub">Melde dich mit deinem Konto an.</p>

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="email">E-Mail</label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="du@beispiel.de"
            />
          </div>
          <div className="field" style={{ marginTop: 14 }}>
            <label htmlFor="password">Passwort</label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Dein Passwort"
            />
          </div>

          <button className="calc-submit" style={{ marginTop: 20 }} disabled={loading}>
            {loading ? "Anmelden…" : "Einloggen"}
          </button>

          {error && <div className="calc-error">{error}</div>}
        </form>

        <p className="auth-switch">
          Noch kein Konto? <Link href="/signup">Jetzt registrieren</Link>
        </p>
      </div>
    </div>
  );
}

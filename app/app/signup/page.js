"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "../lib/supabaseClient";

export default function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("Das Passwort muss mindestens 6 Zeichen lang sein.");
      return;
    }

    setLoading(true);
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });
    setLoading(false);

    if (signUpError) {
      setError(
        signUpError.message.includes("already registered")
          ? "Für diese E-Mail existiert bereits ein Konto."
          : "Registrierung fehlgeschlagen. Bitte prüfe deine Eingaben."
      );
      return;
    }

    setSuccess(true);
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Konto erstellen</h1>
        <p className="auth-sub">Registriere dich, um Anfragen zu speichern.</p>

        {success ? (
          <div className="send-success">
            Fast geschafft! Bitte bestätige deine E-Mail-Adresse über den Link,
            den wir dir gerade geschickt haben. Danach kannst du dich einloggen.
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="field">
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
                placeholder="Mind. 6 Zeichen"
              />
            </div>

            <button className="calc-submit" style={{ marginTop: 20 }} disabled={loading}>
              {loading ? "Erstelle Konto…" : "Registrieren"}
            </button>

            {error && <div className="calc-error">{error}</div>}
          </form>
        )}

        <p className="auth-switch">
          Schon ein Konto? <Link href="/login">Jetzt einloggen</Link>
        </p>
      </div>
    </div>
  );
}

"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../lib/useAuth";
import { useLanguage, LANGUAGES } from "../lib/i18n";

const searchIndex = [
  { label: "Rechner", href: "/#rechner", kw: "preis berechnen rechner umzug entsorgung reinigung" },
  { label: "Leistungen", href: "/#leistungen", kw: "leistungen services umzug entsorgung reinigung" },
  { label: "Kundenstimmen", href: "/kundenstimmen", kw: "bewertungen kunden rezensionen sterne" },
  { label: "Über uns", href: "/ueber-uns", kw: "über uns firma unternehmen adresse" },
  { label: "So funktioniert's", href: "/so-funktioniert", kw: "ablauf prozess schritte funktioniert" },
  { label: "Mein Profil", href: "/konto", kw: "profil konto account einstellungen" },
  { label: "Meine Aufträge", href: "/konto/auftraege", kw: "aufträge bestellungen anfragen status" },
  { label: "Impressum", href: "/impressum", kw: "impressum rechtliches" },
  { label: "Datenschutz", href: "/datenschutz", kw: "datenschutz dsgvo privacy" },
  { label: "AGB & Widerruf", href: "/agb", kw: "agb widerruf geschäftsbedingungen" },
  { label: "Log In", href: "/login", kw: "login einloggen anmelden" },
  { label: "Sign Up", href: "/signup", kw: "registrieren sign up konto erstellen" },
];

function SearchBox() {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const matches = query.trim().length > 0
    ? searchIndex.filter((i) => (i.label + " " + i.kw).toLowerCase().includes(query.toLowerCase())).slice(0, 6)
    : [];

  function go(href) {
    setQuery("");
    setOpen(false);
    router.push(href);
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (matches[0]) go(matches[0].href);
  }

  return (
    <div className="nav-search">
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Suchen…"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
        />
      </form>
      {open && matches.length > 0 && (
        <ul className="nav-search-results">
          {matches.map((m) => (
            <li key={m.href} onMouseDown={() => go(m.href)}>{m.label}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function LanguageSwitch() {
  const { lang, setLang } = useLanguage();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const current = LANGUAGES.find((l) => l.code === lang);

  useEffect(() => {
    function onClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div className="nav-lang" ref={ref}>
      <button type="button" className="nav-lang-btn" onClick={() => setOpen((v) => !v)}>
        {current.flag} {current.code.toUpperCase()}
      </button>
      {open && (
        <ul className="nav-dropdown-menu">
          {LANGUAGES.map((l) => (
            <li key={l.code}>
              <button type="button" onClick={() => { setLang(l.code); setOpen(false); }}>
                {l.flag} {l.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function AccountMenu({ session, isAdmin, onLogout }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const initial = (session.user.email || "?").charAt(0).toUpperCase();

  useEffect(() => {
    function onClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div className="nav-account" ref={ref}>
      <button type="button" className="nav-account-btn" onClick={() => setOpen((v) => !v)}>
        <span className="nav-avatar">{initial}</span>
      </button>
      {open && (
        <ul className="nav-dropdown-menu">
          <li><Link href="/konto" onClick={() => setOpen(false)}>Mein Profil</Link></li>
          <li><Link href="/konto/auftraege" onClick={() => setOpen(false)}>Meine Aufträge</Link></li>
          {isAdmin && <li><Link href="/admin" onClick={() => setOpen(false)}>Admin</Link></li>}
          <li><button type="button" onClick={onLogout}>Abmelden</button></li>
        </ul>
      )}
    </div>
  );
}

export default function Navbar() {
  const { session, loading, isAdmin } = useAuth();
  const router = useRouter();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/");
  }

  return (
    <nav className="topnav">
      <div className="nav-inner">
        <Link href="/" className="logo">
          <span className="dot" />
          Umzug<span className="plus">Plus</span>
        </Link>

        <ul className="nav-links">
          <li><Link href="/#rechner">Rechner</Link></li>
          <li><Link href="/#leistungen">Leistungen</Link></li>
          <li><Link href="/kundenstimmen">Kundenstimmen</Link></li>
          <li><Link href="/ueber-uns">Über uns</Link></li>
        </ul>

        <div className="nav-right">
          <SearchBox />
          <LanguageSwitch />

          {loading ? (
            <div style={{ width: 40 }} />
          ) : session ? (
            <AccountMenu session={session} isAdmin={isAdmin} onLogout={handleLogout} />
          ) : (
            <div className="auth-buttons">
              <Link className="nav-cta ghost" href="/login">Log In</Link>
              <Link className="nav-cta" href="/signup">Sign Up</Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}

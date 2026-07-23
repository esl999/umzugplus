"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../lib/useAuth";

export default function Navbar() {
  const { session, profile, loading, isAdmin } = useAuth();
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
          <li><a href="#footer-kontakt">Kontakt</a></li>
          {isAdmin && <li><Link href="/admin">Admin</Link></li>}
        </ul>

        {loading ? (
          <div style={{ width: 90 }} />
        ) : session ? (
          <div className="auth-buttons">
            <Link className="nav-cta" href="/konto/auftraege">Meine Aufträge</Link>
            <Link className="nav-cta ghost" href="/konto">Mein Profil</Link>
            <button className="nav-cta ghost" onClick={handleLogout}>Abmelden</button>
          </div>
        ) : (
          <div className="auth-buttons">
            <Link className="nav-cta ghost" href="/login">Log In</Link>
            <Link className="nav-cta" href="/signup">Sign Up</Link>
          </div>
        )}
      </div>
    </nav>
  );
}

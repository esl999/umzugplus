"use client";

import { useState } from "react";

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

async function geocode(query) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&addressdetails=0&q=${encodeURIComponent(
    query
  )}`;
  const res = await fetch(url, { headers: { "Accept-Language": "de" } });
  if (!res.ok) throw new Error("Geocoding fehlgeschlagen");
  const data = await res.json();
  if (!data || data.length === 0) throw new Error("not_found");
  return {
    lat: parseFloat(data[0].lat),
    lon: parseFloat(data[0].lon),
    label: data[0].display_name,
  };
}

const etagenOptions = [
  { value: "0", label: "Erdgeschoss" },
  { value: "1", label: "1. Etage" },
  { value: "2", label: "2. Etage" },
  { value: "3", label: "3. Etage" },
  { value: "4", label: "4. Etage" },
  { value: "5", label: "5. Etage" },
  { value: "6", label: "6. Etage+" },
];

export default function Home() {
  const [von, setVon] = useState("");
  const [nach, setNach] = useState("");
  const [etageVon, setEtageVon] = useState("0");
  const [etageNach, setEtageNach] = useState("0");
  const [flaeche, setFlaeche] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleCalculate(e) {
    e.preventDefault();
    setError("");
    setResult(null);

    if (!von.trim() || !nach.trim()) {
      setError("Bitte gib Start- und Zielort ein.");
      return;
    }

    setLoading(true);
    try {
      const [a, b] = await Promise.all([geocode(von), geocode(nach)]);
      const km = haversineKm(a.lat, a.lon, b.lat, b.lon);
      const etagenDiff = Math.abs(Number(etageNach) - Number(etageVon));

      setResult({
        km: km.toFixed(1),
        etagenDiff,
        flaeche: flaeche ? `${flaeche} m²` : "—",
      });
    } catch (err) {
      setError(
        "Einer der beiden Orte konnte nicht gefunden werden. Bitte prüfe die Schreibweise (z.B. „Köln” oder „Musterstraße 1, Köln”)."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <nav className="topnav">
        <div className="nav-inner">
          <div className="logo">
            <span className="dot" />
            Umzug<span className="plus">Plus</span>
          </div>
          <ul className="nav-links">
            <li><a href="#rechner">Rechner</a></li>
            <li><a href="#leistungen">Leistungen</a></li>
            <li><a href="#kontakt">Kontakt</a></li>
          </ul>
          <a className="nav-cta" href="#kontakt">Angebot anfragen</a>
        </div>
      </nav>

      <header className="hero">
        <div className="wrap">
          <span className="badge">● Kostenlos &amp; unverbindlich</span>
          <h1>
            Ihr Umzug. <span className="accent">Einfach organisiert.</span>
          </h1>
          <p className="lead">
            UmzugPlus bringt Ihren Hausstand sicher von A nach B — planen Sie
            Ihren Umzug in wenigen Klicks und erhalten Sie eine erste
            Einschätzung direkt online.
          </p>
        </div>
      </header>

      <section className="calc-section" id="rechner">
        <div className="wrap">
          <div className="calc-card">
            <div className="calc-inner">
              <div className="calc-title">Umzugsrechner</div>
              <div className="calc-sub">
                Gib Start- und Zielort ein, um Entfernung, Etagen und
                Wohnfläche zu erfassen.
              </div>

              <form onSubmit={handleCalculate}>
                <div className="calc-grid">
                  <div className="field">
                    <label htmlFor="von">Von (Stadt oder Adresse)</label>
                    <input
                      id="von"
                      type="text"
                      placeholder="z.B. Hagen"
                      value={von}
                      onChange={(e) => setVon(e.target.value)}
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="nach">Nach (Stadt oder Adresse)</label>
                    <input
                      id="nach"
                      type="text"
                      placeholder="z.B. Köln"
                      value={nach}
                      onChange={(e) => setNach(e.target.value)}
                    />
                  </div>
                </div>

                <div className="calc-row-3">
                  <div className="field">
                    <label htmlFor="etageVon">Etage (Auszug)</label>
                    <select
                      id="etageVon"
                      value={etageVon}
                      onChange={(e) => setEtageVon(e.target.value)}
                    >
                      {etagenOptions.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="field">
                    <label htmlFor="etageNach">Etage (Einzug)</label>
                    <select
                      id="etageNach"
                      value={etageNach}
                      onChange={(e) => setEtageNach(e.target.value)}
                    >
                      {etagenOptions.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="field">
                    <label htmlFor="flaeche">Wohnfläche (m²)</label>
                    <input
                      id="flaeche"
                      type="number"
                      min="0"
                      placeholder="z.B. 65"
                      value={flaeche}
                      onChange={(e) => setFlaeche(e.target.value)}
                    />
                  </div>
                </div>

                <button className="calc-submit" type="submit" disabled={loading}>
                  {loading ? "Berechne…" : "Entfernung berechnen"}
                </button>

                {error && <div className="calc-error">{error}</div>}
              </form>

              {result && (
                <div className="calc-result">
                  <div className="calc-result-head">Ihre Umzugsdaten</div>
                  <div className="calc-result-grid">
                    <div className="calc-result-item">
                      <div className="k">Entfernung</div>
                      <div className="v">{result.km} km</div>
                    </div>
                    <div className="calc-result-item">
                      <div className="k">Etagen-Differenz</div>
                      <div className="v">{result.etagenDiff}</div>
                    </div>
                    <div className="calc-result-item">
                      <div className="k">Wohnfläche</div>
                      <div className="v">{result.flaeche}</div>
                    </div>
                  </div>
                  <div className="calc-note">
                    Entfernung als Luftlinie berechnet (Kartendaten: OpenStreetMap
                    Nominatim). Für ein verbindliches Angebot inkl. Anfahrtsweg
                    melden wir uns persönlich bei Ihnen.
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="services" id="leistungen">
        <div className="wrap">
          <div className="section-title">
            <h2>Unsere Leistungen</h2>
            <p>Von der Kiste bis zum Klavier — wir kümmern uns.</p>
          </div>
          <div className="service-grid">
            <div className="service-card">
              <div className="service-icon yellow" />
              <h3>Privatumzug</h3>
              <p>Vollservice für Wohnungen und Häuser, termingerecht und sorgfältig.</p>
            </div>
            <div className="service-card">
              <div className="service-icon red" />
              <h3>Firmenumzug</h3>
              <p>Büros und Betriebe mit minimaler Ausfallzeit umziehen.</p>
            </div>
            <div className="service-card">
              <div className="service-icon yellow" />
              <h3>Möbellift</h3>
              <p>Sperrige Möbel sicher über den Balkon statt durchs Treppenhaus.</p>
            </div>
            <div className="service-card">
              <div className="service-icon red" />
              <h3>Halteverbotszone</h3>
              <p>Wir organisieren die Halteverbotszone für einen reibungslosen Start.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="cta-strip" id="kontakt">
        <div className="wrap">
          <h2>Bereit für Ihren Umzug?</h2>
          <p>Kontaktieren Sie uns für ein persönliches, unverbindliches Angebot.</p>
          <div className="btn-row">
            <a className="btn primary" href="mailto:info@umzugplus.de">
              Angebot anfragen
            </a>
            <a className="btn ghost" href="tel:+4900000000">
              Anrufen
            </a>
          </div>
        </div>
      </section>

      <footer>
        <div className="wrap">© {new Date().getFullYear()} UmzugPlus · info@umzugplus.de</div>
      </footer>
    </>
  );
}

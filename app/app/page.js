"use client";

import { useState, useRef, useEffect } from "react";
import { supabase } from "./lib/supabaseClient";

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

const moebelListe = [
  { key: "sofa", label: "Sofa / Couch" },
  { key: "sessel", label: "Sessel" },
  { key: "bettDoppel", label: "Doppelbett" },
  { key: "bettEinzel", label: "Einzelbett" },
  { key: "kleiderschrank", label: "Kleiderschrank" },
  { key: "kommode", label: "Kommode" },
  { key: "esstisch", label: "Esstisch mit Stühlen" },
  { key: "kuehlschrank", label: "Kühlschrank" },
  { key: "waschmaschine", label: "Waschmaschine" },
  { key: "kartons", label: "Umzugskartons (ca.)" },
];

function AddressField({ id, label, placeholder, value, onChange }) {
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const timerRef = useRef(null);

  function handleChange(e) {
    const val = e.target.value;
    onChange(val);

    if (timerRef.current) clearTimeout(timerRef.current);

    if (val.trim().length < 3) {
      setSuggestions([]);
      setOpen(false);
      return;
    }

    timerRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=5&countrycodes=de&q=${encodeURIComponent(
          val
        )}`;
        const res = await fetch(url, { headers: { "Accept-Language": "de" } });
        const data = await res.json();
        setSuggestions(data || []);
        setOpen(true);
      } catch {
        setSuggestions([]);
      } finally {
        setSearching(false);
      }
    }, 400);
  }

  function selectSuggestion(s) {
    onChange(s.display_name);
    setSuggestions([]);
    setOpen(false);
  }

  return (
    <div className="field address-field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={handleChange}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        autoComplete="off"
      />
      {searching && <div className="suggest-hint">Suche Adressen…</div>}
      {open && suggestions.length > 0 && (
        <ul className="suggestions">
          {suggestions.map((s) => (
            <li key={s.place_id} onMouseDown={() => selectSuggestion(s)}>
              {s.display_name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function Home() {
  const [kundentyp, setKundentyp] = useState("privat");
  const [von, setVon] = useState("");
  const [nach, setNach] = useState("");
  const [vonAufzug, setVonAufzug] = useState(false);
  const [nachAufzug, setNachAufzug] = useState(false);
  const [etageVon, setEtageVon] = useState("0");
  const [etageNach, setEtageNach] = useState("0");
  const [berechnungsart, setBerechnungsart] = useState("flaeche");
  const [flaeche, setFlaeche] = useState("");
  const [gegenstaende, setGegenstaende] = useState({});
  const [name, setName] = useState("");
  const [telefon, setTelefon] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [prices, setPrices] = useState(null);
  const [sending, setSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);
  const [sendError, setSendError] = useState("");

  useEffect(() => {
    async function loadPrices() {
      const { data } = await supabase.from("price_settings").select("*");
      if (data) {
        const map = {};
        data.forEach((row) => {
          map[row.key] = row;
        });
        setPrices(map);
      }
    }
    loadPrices();

    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user?.email) setContactEmail(data.session.user.email);
    });
  }, []);

  function computePrice() {
    if (!prices || !result) return null;
    let sum = 0;

    if (berechnungsart === "flaeche") {
      sum += (Number(flaeche) || 0) * (prices.proQm?.price || 0);
    } else {
      moebelListe.forEach((m) => {
        sum += (gegenstaende[m.key] || 0) * (prices[m.key]?.price || 0);
      });
    }

    sum += (Number(result.km) || 0) * (prices.proKm?.price || 0);
    if (!vonAufzug) sum += Number(etageVon) * (prices.proEtage?.price || 0);
    if (!nachAufzug) sum += Number(etageNach) * (prices.proEtage?.price || 0);

    return Math.round(sum);
  }

  function changeQty(key, delta) {
    setGegenstaende((prev) => {
      const current = prev[key] || 0;
      const next = Math.max(0, current + delta);
      return { ...prev, [key]: next };
    });
  }

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
      });
    } catch (err) {
      setError(
        "Einer der beiden Orte konnte nicht gefunden werden. Bitte prüfe die Schreibweise oder wähle einen Vorschlag aus der Liste."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleSendRequest() {
    setSendError("");
    setSending(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user?.id || null;

      const { error: insertError } = await supabase.from("anfragen").insert({
        user_id: userId,
        kundentyp,
        von,
        nach,
        entfernung_km: Number(result.km),
        etage_von: etageVon,
        etage_nach: etageNach,
        aufzug_von: vonAufzug,
        aufzug_nach: nachAufzug,
        berechnungsart,
        flaeche: berechnungsart === "flaeche" ? Number(flaeche) || null : null,
        gegenstaende: berechnungsart === "gegenstaende" ? gegenstaende : null,
        geschaetzter_preis: computePrice(),
        name: name || null,
        email: contactEmail || null,
        telefon: telefon || null,
      });

      if (insertError) throw insertError;
      setSendSuccess(true);
    } catch (err) {
      setSendError("Die Anfrage konnte nicht gesendet werden. Bitte versuch es erneut.");
    } finally {
      setSending(false);
    }
  }

  return (
    <>
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
                Beantworte ein paar kurze Fragen zu deinem Umzug.
              </div>

              <div className="field" style={{ marginBottom: 20 }}>
                <label>Für wen ist der Umzug?</label>
                <div className="segmented">
                  <button
                    type="button"
                    className={kundentyp === "privat" ? "active" : ""}
                    onClick={() => setKundentyp("privat")}
                  >
                    Privatkunde
                  </button>
                  <button
                    type="button"
                    className={kundentyp === "gewerbe" ? "active" : ""}
                    onClick={() => setKundentyp("gewerbe")}
                  >
                    Gewerbekunde
                  </button>
                </div>
              </div>

              <form onSubmit={handleCalculate}>
                <div className="calc-grid">
                  <AddressField
                    id="von"
                    label="Von (Straße, Ort oder PLZ)"
                    placeholder="z.B. Musterstraße 1, Hagen"
                    value={von}
                    onChange={setVon}
                  />
                  <AddressField
                    id="nach"
                    label="Nach (Straße, Ort oder PLZ)"
                    placeholder="z.B. Domplatz 1, Köln"
                    value={nach}
                    onChange={setNach}
                  />
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
                    <label className="checkbox-row">
                      <input
                        type="checkbox"
                        checked={vonAufzug}
                        onChange={(e) => setVonAufzug(e.target.checked)}
                      />
                      Aufzug vorhanden
                    </label>
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
                    <label className="checkbox-row">
                      <input
                        type="checkbox"
                        checked={nachAufzug}
                        onChange={(e) => setNachAufzug(e.target.checked)}
                      />
                      Aufzug vorhanden
                    </label>
                  </div>
                  <div className="field">
                    <label>&nbsp;</label>
                    <div className="mini-note">
                      Aufzüge verkürzen den Tragweg — hilft uns bei der Personalplanung.
                    </div>
                  </div>
                </div>

                <div className="field" style={{ marginTop: 20 }}>
                  <label>Möchtest du anhand der Wohnfläche berechnen oder einzelne Gegenstände auswählen?</label>
                  <div className="method-cards">
                    <div
                      className={"method-card" + (berechnungsart === "flaeche" ? " active" : "")}
                      onClick={() => setBerechnungsart("flaeche")}
                    >
                      <h4>Anhand der Wohnfläche</h4>
                      <p>Schnell &amp; einfach — du gibst nur die Quadratmeterzahl an.</p>
                    </div>
                    <div
                      className={"method-card" + (berechnungsart === "gegenstaende" ? " active" : "")}
                      onClick={() => setBerechnungsart("gegenstaende")}
                    >
                      <h4>Einzelne Gegenstände auswählen</h4>
                      <p>Genauer — du gibst an, welche Möbelstücke umziehen.</p>
                    </div>
                  </div>
                </div>

                {berechnungsart === "flaeche" ? (
                  <div className="field" style={{ marginTop: 16, maxWidth: 260 }}>
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
                ) : (
                  <div className="items-grid">
                    {moebelListe.map((m) => (
                      <div className="item-row" key={m.key}>
                        <span>{m.label}</span>
                        <div className="qty-control">
                          <button
                            type="button"
                            className="qty-btn"
                            onClick={() => changeQty(m.key, -1)}
                          >
                            −
                          </button>
                          <span className="qty-value">{gegenstaende[m.key] || 0}</span>
                          <button
                            type="button"
                            className="qty-btn"
                            onClick={() => changeQty(m.key, 1)}
                          >
                            +
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

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
                      <div className="k">Kundentyp</div>
                      <div className="v" style={{ fontSize: 16 }}>
                        {kundentyp === "gewerbe" ? "Gewerbe" : "Privat"}
                      </div>
                    </div>
                  </div>
                  <div className="calc-note">
                    Entfernung als Luftlinie berechnet (Kartendaten: OpenStreetMap
                    Nominatim). Für ein verbindliches Angebot inkl. Anfahrtsweg
                    melden wir uns persönlich bei Ihnen.
                  </div>

                  {prices && (
                    <div className="price-highlight">
                      <div className="k">Geschätzter Richtpreis</div>
                      <div className="v">{computePrice()} €</div>
                      <div className="note-inline">
                        Unverbindliche Schätzung, kein Festpreis.
                      </div>
                    </div>
                  )}

                  <div className="contact-box">
                    <div className="contact-title">Unverbindliche Anfrage senden</div>
                    {sendSuccess ? (
                      <div className="send-success">
                        Danke! Deine Anfrage ist bei uns eingegangen — wir melden
                        uns zeitnah bei dir.
                      </div>
                    ) : (
                      <>
                        <div className="calc-row-3">
                          <div className="field">
                            <label htmlFor="name">Name (optional)</label>
                            <input
                              id="name"
                              type="text"
                              placeholder="Dein Name"
                              value={name}
                              onChange={(e) => setName(e.target.value)}
                            />
                          </div>
                          <div className="field">
                            <label htmlFor="contactEmail">E-Mail (optional)</label>
                            <input
                              id="contactEmail"
                              type="email"
                              placeholder="Für Rückmeldung"
                              value={contactEmail}
                              onChange={(e) => setContactEmail(e.target.value)}
                            />
                          </div>
                          <div className="field">
                            <label htmlFor="telefon">Telefon (optional)</label>
                            <input
                              id="telefon"
                              type="text"
                              placeholder="Für Rückruf"
                              value={telefon}
                              onChange={(e) => setTelefon(e.target.value)}
                            />
                          </div>
                        </div>
                        <button
                          type="button"
                          className="calc-submit"
                          style={{ marginTop: 16 }}
                          disabled={sending}
                          onClick={handleSendRequest}
                        >
                          {sending ? "Sende…" : "Unverbindliche Anfrage senden"}
                        </button>
                        {sendError && <div className="calc-error">{sendError}</div>}
                      </>
                    )}
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

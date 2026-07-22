"use client";

import { useState, useRef, useEffect } from "react";
import { supabase } from "./lib/supabaseClient";
import TerminPicker from "./components/TerminPicker";

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
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`;
  const res = await fetch(url, { headers: { "Accept-Language": "de" } });
  if (!res.ok) throw new Error("Geocoding fehlgeschlagen");
  const data = await res.json();
  if (!data || data.length === 0) throw new Error("not_found");
  return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
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

function shortAddress(item) {
  const a = item.address || {};
  const road = a.road || a.pedestrian || a.footway || "";
  const houseNumber = a.house_number || "";
  const postcode = a.postcode || "";
  const city = a.city || a.town || a.village || a.municipality || a.suburb || "";
  const line1 = [road, houseNumber].filter(Boolean).join(" ");
  const line2 = [postcode, city].filter(Boolean).join(" ");
  const short = [line1, line2].filter(Boolean).join(", ");
  return short || item.display_name;
}

function AddressField({ id, label, placeholder, value, onChange }) {
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
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
      try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=5&countrycodes=de&q=${encodeURIComponent(val)}`;
        const res = await fetch(url, { headers: { "Accept-Language": "de" } });
        const data = await res.json();
        setSuggestions(data || []);
        setOpen(true);
      } catch {
        setSuggestions([]);
      }
    }, 400);
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
      {open && suggestions.length > 0 && (
        <ul className="suggestions">
          {suggestions.map((s) => (
            <li key={s.place_id} onMouseDown={() => { onChange(shortAddress(s)); setOpen(false); }}>
              {shortAddress(s)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function Home() {
  const [leistung, setLeistung] = useState("umzug");
  const [kundentyp, setKundentyp] = useState("privat");
  const [von, setVon] = useState("");
  const [nach, setNach] = useState("");
  const [objektAdresse, setObjektAdresse] = useState("");
  const [vonAufzug, setVonAufzug] = useState(false);
  const [nachAufzug, setNachAufzug] = useState(false);
  const [etageVon, setEtageVon] = useState("0");
  const [etageNach, setEtageNach] = useState("0");
  const [berechnungsart, setBerechnungsart] = useState("flaeche");
  const [flaeche, setFlaeche] = useState("");
  const [gegenstaende, setGegenstaende] = useState({});
  const [zusatz, setZusatz] = useState({ moebelAbbau: false, moebelEinbau: false, verpackungsservice: false, halteverbotszone: false });
  const [sonstiges, setSonstiges] = useState("");
  const [rabattcodeInput, setRabattcodeInput] = useState("");
  const [wunschtermin, setWunschtermin] = useState("");

  const [name, setName] = useState("");
  const [telefon, setTelefon] = useState("");
  const [contactEmail, setContactEmail] = useState("");

  const [prices, setPrices] = useState(null);
  const [katalog, setKatalog] = useState([]);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);
  const [sendError, setSendError] = useState("");

  const rechnerRef = useRef(null);

  useEffect(() => {
    async function load() {
      const [p, k] = await Promise.all([
        supabase.from("price_settings").select("*"),
        supabase.from("katalog_items").select("*").eq("aktiv", true).order("kategorie"),
      ]);
      if (p.data) {
        const map = {};
        p.data.forEach((row) => (map[row.key] = row));
        setPrices(map);
      }
      setKatalog(k.data || []);
    }
    load();

    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user?.email) setContactEmail(data.session.user.email);
    });
  }, []);

  function scrollToRechner(l) {
    setLeistung(l);
    rechnerRef.current?.scrollIntoView({ behavior: "smooth" });
  }

  function changeQty(id, delta) {
    setGegenstaende((prev) => {
      const next = Math.max(0, (prev[id] || 0) + delta);
      return { ...prev, [id]: next };
    });
  }

  function computeBreakdown() {
    if (!prices || !result) return null;

    const grundpreis = leistung === "umzug" ? prices.grundpreisUmzug.price : prices.grundpreisEntsorgung.price;
    const proQm = leistung === "umzug" ? prices.proQmUmzug.price : prices.proQmEntsorgung.price;

    let umfang = 0;
    let umfangLabel = "";
    if (berechnungsart === "flaeche") {
      umfang = (Number(flaeche) || 0) * proQm;
      umfangLabel = `Fläche: ${flaeche || 0} m² × ${proQm.toFixed(2)} €/m²`;
    } else {
      umfang = katalog.reduce((sum, item) => sum + (gegenstaende[item.id] || 0) * item.preis, 0);
      umfangLabel = "Gegenstände (einzeln ausgewählt)";
    }

    const basis = grundpreis + umfang;

    const etagenOhneAufzug = (vonAufzug ? 0 : Number(etageVon)) + (leistung === "umzug" ? (nachAufzug ? 0 : Number(etageNach)) : 0);
    const etagenzuschlag = basis * (prices.etagenzuschlag.price / 100) * etagenOhneAufzug;

    const km = leistung === "umzug" ? Number(result.km) : 0;
    const fernumzug = km > prices.fernumzugAbKm.price;
    const kmPreis = fernumzug ? prices.proKmFern.price : prices.proKm.price;
    const transport = km * kmPreis;

    let zusatzSumme = 0;
    const zusatzLabels = [];
    if (zusatz.moebelAbbau) { zusatzSumme += prices.moebelAbbau.price; zusatzLabels.push(`Möbel-Abbau (${prices.moebelAbbau.price} €)`); }
    if (zusatz.moebelEinbau) { zusatzSumme += prices.moebelEinbau.price; zusatzLabels.push(`Möbel-Einbau (${prices.moebelEinbau.price} €)`); }
    if (zusatz.verpackungsservice) { zusatzSumme += prices.verpackungsservice.price; zusatzLabels.push(`Verpackungsservice (${prices.verpackungsservice.price} €)`); }
    if (zusatz.halteverbotszone) { zusatzSumme += prices.halteverbotszone.price; zusatzLabels.push(`Halteverbotszone (${prices.halteverbotszone.price} €)`); }
    if (zusatz.transportversicherung) {
      const v = basis * (prices.transportversicherung.price / 100);
      zusatzSumme += v;
      zusatzLabels.push(`Transportversicherung (${prices.transportversicherung.price}%)`);
    }

    let netto = grundpreis + umfang + etagenzuschlag + transport + zusatzSumme;

    if (kundentyp === "gewerbe") {
      netto = netto * (1 - prices.rabattGewerbe.price / 100);
    }

    let rabattBetrag = 0;
    if (result.rabatt) {
      if (result.rabatt.typ === "prozent") rabattBetrag = netto * (result.rabatt.wert / 100);
      else rabattBetrag = result.rabatt.wert;
      netto = Math.max(0, netto - rabattBetrag);
    }

    const brutto = netto * (1 + prices.mwst.price / 100);
    const gesamt = Math.max(brutto, prices.mindestauftragswert.price);
    const anzahlung = gesamt * (prices.anzahlung.price / 100);

    return {
      grundpreis, umfang, umfangLabel, etagenOhneAufzug, etagenzuschlag,
      km, fernumzug, transport, zusatzSumme, zusatzLabels, rabattBetrag,
      netto, mwstSatz: prices.mwst.price, mwstBetrag: brutto - netto, brutto: gesamt,
      anzahlung, bezahlt: 0, offen: gesamt,
    };
  }

  async function handleCalculate(e) {
    e.preventDefault();
    setError("");
    setResult(null);

    if (leistung === "umzug" && (!von.trim() || !nach.trim())) {
      setError("Bitte gib Start- und Zielort ein.");
      return;
    }
    if (leistung === "entsorgung" && !objektAdresse.trim()) {
      setError("Bitte gib die Objekt-Adresse ein.");
      return;
    }

    setLoading(true);
    try {
      let km = 0;
      if (leistung === "umzug") {
        const [a, b] = await Promise.all([geocode(von), geocode(nach)]);
        km = haversineKm(a.lat, a.lon, b.lat, b.lon);
      }

      let rabatt = null;
      if (rabattcodeInput.trim()) {
        const { data } = await supabase
          .from("rabattcodes")
          .select("*")
          .eq("code", rabattcodeInput.trim().toUpperCase())
          .eq("aktiv", true)
          .maybeSingle();
        if (data && (!data.max_nutzungen || data.nutzungen < data.max_nutzungen)) {
          rabatt = { code: data.code, typ: data.typ, wert: data.wert };
        }
      }

      setResult({ km: km.toFixed(1), rabatt });
    } catch (err) {
      setError("Die Adresse konnte nicht gefunden werden. Bitte prüfe die Eingabe.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSendRequest() {
    setSendError("");
    setSending(true);
    try {
      const breakdown = computeBreakdown();
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user?.id || null;

      const { error: insertError } = await supabase.from("anfragen").insert({
        user_id: userId,
        kundentyp,
        leistung,
        von: leistung === "umzug" ? von : objektAdresse,
        nach: leistung === "umzug" ? nach : null,
        objekt_adresse: leistung === "entsorgung" ? objektAdresse : null,
        entfernung_km: Number(result.km),
        etage_von: etageVon,
        etage_nach: etageNach,
        aufzug_von: vonAufzug,
        aufzug_nach: nachAufzug,
        berechnungsart,
        flaeche: berechnungsart === "flaeche" ? Number(flaeche) || null : null,
        gegenstaende: berechnungsart === "gegenstaende" ? gegenstaende : null,
        zusatzleistungen: zusatz,
        wunschtermin: wunschtermin || null,
        rabattcode: result.rabatt ? result.rabatt.code : null,
        geschaetzter_preis: Math.round(breakdown.brutto * 100) / 100,
        preis_details: breakdown,
        bezahlt_betrag: 0,
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

  const breakdown = result ? computeBreakdown() : null;

  return (
    <>
      <header className="hero">
        <div className="wrap">
          <span className="badge">● Festpreis in 60 Sekunden · ohne Anmeldung</span>
          <h1>
            Umzug &amp; Entsorgung — <span className="accent">fair, transparent, sofort kalkuliert.</span>
          </h1>
          <p className="lead">
            Wähle deine Leistung, berechne online deinen Preis und erhalte dein
            Angebot direkt hier — kein Konto nötig.
          </p>

          <div className="hero-choice">
            <button className="hero-choice-btn" onClick={() => scrollToRechner("umzug")}>
              <strong>Umzug</strong>
              <span>Privat- oder Firmenumzug berechnen</span>
            </button>
            <button className="hero-choice-btn" onClick={() => scrollToRechner("entsorgung")}>
              <strong>Entsorgung</strong>
              <span>Entrümpelung &amp; Haushaltsauflösung</span>
            </button>
          </div>
        </div>
      </header>

      <section className="calc-section" id="rechner" ref={rechnerRef}>
        <div className="wrap">
          <div className="calc-card">
            <div className="calc-inner">
              <div className="calc-title">Sofort-Preis berechnen</div>
              <div className="calc-sub">Alle Preise kommen live aus unserem Katalog — transparent aufgeschlüsselt.</div>

              <div className="field" style={{ marginBottom: 20 }}>
                <label>Leistung</label>
                <div className="segmented" style={{ maxWidth: 300 }}>
                  <button type="button" className={leistung === "umzug" ? "active" : ""} onClick={() => setLeistung("umzug")}>Umzug</button>
                  <button type="button" className={leistung === "entsorgung" ? "active" : ""} onClick={() => setLeistung("entsorgung")}>Entsorgung</button>
                </div>
              </div>

              <div className="field" style={{ marginBottom: 20 }}>
                <label>Für wen?</label>
                <div className="segmented" style={{ maxWidth: 300 }}>
                  <button type="button" className={kundentyp === "privat" ? "active" : ""} onClick={() => setKundentyp("privat")}>Privat</button>
                  <button type="button" className={kundentyp === "gewerbe" ? "active" : ""} onClick={() => setKundentyp("gewerbe")}>Gewerblich</button>
                </div>
              </div>

              <form onSubmit={handleCalculate}>
                {leistung === "umzug" ? (
                  <>
                    <div className="calc-grid">
                      <AddressField id="von" label="Von (Auszug)" placeholder="z.B. Musterstraße 1, Hagen" value={von} onChange={setVon} />
                      <AddressField id="nach" label="Nach (Einzug)" placeholder="z.B. Domplatz 1, Köln" value={nach} onChange={setNach} />
                    </div>
                    <div className="calc-row-3">
                      <div className="field">
                        <label htmlFor="etageVon">Etage (Auszug)</label>
                        <select id="etageVon" value={etageVon} onChange={(e) => setEtageVon(e.target.value)}>
                          {etagenOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                        <label className="checkbox-row"><input type="checkbox" checked={vonAufzug} onChange={(e) => setVonAufzug(e.target.checked)} /> Aufzug vorhanden</label>
                      </div>
                      <div className="field">
                        <label htmlFor="etageNach">Etage (Einzug)</label>
                        <select id="etageNach" value={etageNach} onChange={(e) => setEtageNach(e.target.value)}>
                          {etagenOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                        <label className="checkbox-row"><input type="checkbox" checked={nachAufzug} onChange={(e) => setNachAufzug(e.target.checked)} /> Aufzug vorhanden</label>
                      </div>
                      <div className="field">
                        <label>&nbsp;</label>
                        <div className="mini-note">Entfernung wird automatisch berechnet, sobald beide Adressen gewählt sind.</div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="calc-grid">
                    <AddressField id="objekt" label="Objekt-Adresse" placeholder="Adresse in Deutschland suchen…" value={objektAdresse} onChange={setObjektAdresse} />
                    <div className="field">
                      <label htmlFor="etageVon">Etage (ohne Aufzug)</label>
                      <select id="etageVon" value={etageVon} onChange={(e) => setEtageVon(e.target.value)}>
                        {etagenOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                      <label className="checkbox-row"><input type="checkbox" checked={vonAufzug} onChange={(e) => setVonAufzug(e.target.checked)} /> Aufzug vorhanden</label>
                    </div>
                  </div>
                )}

                <div className="field" style={{ marginTop: 20 }}>
                  <label>Wie möchtest du berechnen?</label>
                  <div className="method-cards">
                    <div className={"method-card" + (berechnungsart === "flaeche" ? " active" : "")} onClick={() => setBerechnungsart("flaeche")}>
                      <h4>Nach Fläche (m²)</h4>
                      <p>Schnell &amp; einfach — nur die Quadratmeterzahl.</p>
                    </div>
                    <div className={"method-card" + (berechnungsart === "gegenstaende" ? " active" : "")} onClick={() => setBerechnungsart("gegenstaende")}>
                      <h4>Nach Gegenständen</h4>
                      <p>Genauer — einzelne Möbelstücke auswählen.</p>
                    </div>
                  </div>
                </div>

                {berechnungsart === "flaeche" ? (
                  <div className="field" style={{ marginTop: 16, maxWidth: 260 }}>
                    <label htmlFor="flaeche">Fläche (m²)</label>
                    <input id="flaeche" type="number" min="0" placeholder="z.B. 60" value={flaeche} onChange={(e) => setFlaeche(e.target.value)} />
                  </div>
                ) : (
                  <div className="items-grid">
                    {katalog.map((item) => (
                      <div className="item-row" key={item.id}>
                        <span>{item.name} <span className="admin-sub">({item.preis.toFixed(2)} €)</span></span>
                        <div className="qty-control">
                          <button type="button" className="qty-btn" onClick={() => changeQty(item.id, -1)}>−</button>
                          <span className="qty-value">{gegenstaende[item.id] || 0}</span>
                          <button type="button" className="qty-btn" onClick={() => changeQty(item.id, 1)}>+</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="field" style={{ marginTop: 20 }}>
                  <label>Zusatzleistungen</label>
                  <div className="items-grid">
                    {[
                      ["moebelAbbau", "Möbel-Abbau / Demontage"],
                      ["moebelEinbau", "Möbel-Einbau / Montage"],
                      ["verpackungsservice", "Verpackungsservice inkl. Material"],
                      ["halteverbotszone", "Halteverbotszone"],
                      ["transportversicherung", "Transportversicherung (erweitert)"],
                    ].map(([key, label]) => (
                      <label className="item-row" key={key} style={{ cursor: "pointer" }}>
                        <span>{label}</span>
                        <input type="checkbox" checked={zusatz[key] || false} onChange={(e) => setZusatz((z) => ({ ...z, [key]: e.target.checked }))} />
                      </label>
                    ))}
                  </div>
                </div>

                <div className="field" style={{ marginTop: 20 }}>
                  <label htmlFor="sonstiges">Sonstiges (optional)</label>
                  <textarea
                    id="sonstiges"
                    rows={2}
                    placeholder="z.B. Klavier, Tresor, Sondermüll, besondere Wünsche…"
                    value={sonstiges}
                    onChange={(e) => setSonstiges(e.target.value)}
                    style={{ width: "100%", padding: 12, borderRadius: 10, border: "1px solid var(--border)", fontFamily: "inherit" }}
                  />
                </div>

                <div className="field" style={{ marginTop: 20 }}>
                  <label>Wunschtermin</label>
                  <TerminPicker value={wunschtermin} onChange={setWunschtermin} />
                </div>

                <div className="calc-row-3" style={{ marginTop: 16 }}>
                  <div className="field">
                    <label htmlFor="rabattcode">Rabattcode (optional)</label>
                    <input id="rabattcode" type="text" placeholder="optional" value={rabattcodeInput} onChange={(e) => setRabattcodeInput(e.target.value)} />
                  </div>
                </div>

                <button className="calc-submit" type="submit" disabled={loading}>
                  {loading ? "Berechne…" : "Preis berechnen →"}
                </button>

                {error && <div className="calc-error">{error}</div>}
              </form>

              {breakdown && (
                <div className="calc-result">
                  <div className="calc-result-head">Deine Preisaufschlüsselung</div>
                  <div style={{ padding: 20 }}>
                    <div className="belegzeile"><span>Grundpreis (Fixkosten)</span><span>{breakdown.grundpreis.toFixed(2)} €</span></div>
                    <div className="belegzeile"><span>{breakdown.umfangLabel}</span><span>{breakdown.umfang.toFixed(2)} €</span></div>
                    {breakdown.etagenOhneAufzug > 0 && (
                      <div className="belegzeile"><span>Etagenzuschlag: {breakdown.etagenOhneAufzug} Etage(n) ohne Aufzug ({prices.etagenzuschlag.price}%)</span><span>{breakdown.etagenzuschlag.toFixed(2)} €</span></div>
                    )}
                    {breakdown.km > 0 && (
                      <div className="belegzeile"><span>Transport: {breakdown.km} km × {(breakdown.fernumzug ? prices.proKmFern.price : prices.proKm.price).toFixed(2)} €/km{breakdown.fernumzug ? " (Fernumzug)" : ""}</span><span>{breakdown.transport.toFixed(2)} €</span></div>
                    )}
                    {breakdown.zusatzLabels.map((l, i) => (
                      <div className="belegzeile" key={i}><span>{l}</span></div>
                    ))}
                    {breakdown.rabattBetrag > 0 && (
                      <div className="belegzeile"><span>Rabattcode</span><span>− {breakdown.rabattBetrag.toFixed(2)} €</span></div>
                    )}
                    <div className="belegzeile" style={{ borderTop: "1px solid var(--border)", marginTop: 8, paddingTop: 10 }}><span>Netto</span><span>{breakdown.netto.toFixed(2)} €</span></div>
                    <div className="belegzeile"><span>zzgl. USt ({breakdown.mwstSatz}%)</span><span>{breakdown.mwstBetrag.toFixed(2)} €</span></div>
                    <div className="belegzeile" style={{ fontWeight: 700, fontSize: 16 }}><span>Gesamt</span><span>{breakdown.brutto.toFixed(2)} €</span></div>
                    <div className="belegzeile"><span>Anzahlung ({prices.anzahlung.price}%)</span><span>{breakdown.anzahlung.toFixed(2)} €</span></div>
                  </div>
                  <div className="calc-note">
                    Unverbindliche Schätzung. Zahlungsabwicklung folgt in Kürze — aktuell melden wir uns nach deiner Anfrage persönlich bei dir.
                  </div>

                  <div className="contact-box">
                    <div className="contact-title">Unverbindliche Anfrage senden</div>
                    {sendSuccess ? (
                      <div className="send-success">Danke! Deine Anfrage ist eingegangen — wir melden uns zeitnah. Du findest sie ab sofort unter „Meine Aufträge".</div>
                    ) : (
                      <>
                        <div className="calc-row-3">
                          <div className="field">
                            <label htmlFor="name">Name (optional)</label>
                            <input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} />
                          </div>
                          <div className="field">
                            <label htmlFor="contactEmail">E-Mail (optional)</label>
                            <input id="contactEmail" type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
                          </div>
                          <div className="field">
                            <label htmlFor="telefon">Telefon (optional)</label>
                            <input id="telefon" type="text" value={telefon} onChange={(e) => setTelefon(e.target.value)} />
                          </div>
                        </div>
                        <button type="button" className="calc-submit" style={{ marginTop: 16 }} disabled={sending} onClick={handleSendRequest}>
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
            <h2>Zwei Leistungen, ein transparenter Preis</h2>
            <p>Berechne wahlweise nach Fläche (m²) oder nach einzelnen Gegenständen.</p>
          </div>
          <div className="service-grid">
            <div className="service-card">
              <div className="service-icon yellow" />
              <h3>Umzug</h3>
              <p>Privat- oder Firmenumzug — inklusive Entfernung &amp; Etagen.</p>
            </div>
            <div className="service-card">
              <div className="service-icon red" />
              <h3>Entsorgung</h3>
              <p>Entrümpelung &amp; Haushaltsauflösung, fachgerecht entsorgt.</p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}

function Footer() {
  return (
    <footer className="site-footer" id="footer-kontakt">
      <div className="wrap footer-grid">
        <div>
          <div className="foot-name">UmzugPlus</div>
          <p>Umzug &amp; Entsorgung zum transparenten Festpreis — online berechnen, online buchen.</p>
        </div>
        <div>
          <div className="foot-heading">Leistungen</div>
          <a href="#rechner">Umzug</a>
          <a href="#rechner">Entsorgung</a>
          <a href="#leistungen">So funktioniert's</a>
        </div>
        <div>
          <div className="foot-heading">Rechtliches</div>
          <a href="#">Impressum</a>
          <a href="#">Datenschutz</a>
          <a href="#">AGB &amp; Widerruf</a>
        </div>
        <div>
          <div className="foot-heading">Kontakt</div>
          <a href="mailto:info@umzugplus.de">info@umzugplus.de</a>
        </div>
      </div>
      <div className="wrap footer-bottom">
        <span>© {new Date().getFullYear()} UmzugPlus. Alle Rechte vorbehalten.</span>
        <span>Transparent · Fair · DSGVO-konform</span>
      </div>
    </footer>
  );
}

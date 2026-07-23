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
  const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=1&q=${encodeURIComponent(query)}`;
  const res = await fetch(url, { headers: { "Accept-Language": "de" } });
  if (!res.ok) throw new Error("Geocoding fehlgeschlagen");
  const data = await res.json();
  if (!data || data.length === 0) throw new Error("not_found");
  return {
    lat: parseFloat(data[0].lat),
    lon: parseFloat(data[0].lon),
    state: data[0].address?.state || "",
    country: data[0].address?.country || "",
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

const leistungLabels = { umzug: "Umzug", entsorgung: "Entsorgung", reinigung: "Reinigung" };

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
  const [selectedKategorie, setSelectedKategorie] = useState(null);
  const [zusatz, setZusatz] = useState({ moebelAbbau: false, moebelEinbau: false, verpackungsservice: false, halteverbotszone: false });
  const [mitarbeiter, setMitarbeiter] = useState(2);
  const [zweitransporter, setZweitransporter] = useState(false);
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
  const [session, setSession] = useState(undefined);
  const [crossSellTarget, setCrossSellTarget] = useState(null);

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
      setSession(data.session || null);
      if (data.session?.user?.email) setContactEmail(data.session.user.email);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_e, sess) => setSession(sess));
    return () => listener.subscription.unsubscribe();
  }, []);

  function scrollToRechner(l) {
    resetLeistungState(l);
    rechnerRef.current?.scrollIntoView({ behavior: "smooth" });
  }

  function resetLeistungState(l) {
    setLeistung(l);
    setResult(null);
    setSendSuccess(false);
    setSendError("");
    setSelectedKategorie(null);
    setError("");
  }

  function changeQty(id, delta) {
    setGegenstaende((prev) => {
      const next = Math.max(0, (prev[id] || 0) + delta);
      return { ...prev, [id]: next };
    });
  }

  const katalogForLeistung = katalog.filter((i) =>
    leistung === "reinigung" ? i.leistung_typ === "reinigung" : i.leistung_typ !== "reinigung"
  );
  const kategorien = [...new Set(katalogForLeistung.map((i) => i.kategorie))];
  const itemsInKategorie = katalogForLeistung.filter((i) => i.kategorie === selectedKategorie);
  const gegenstaendeGesamtAnzahl = Object.values(gegenstaende).reduce((s, n) => s + (n || 0), 0);

  function computeBreakdown() {
    if (!prices || !result) return null;

    const grundpreis =
      leistung === "umzug" ? prices.grundpreisUmzug.price :
      leistung === "entsorgung" ? prices.grundpreisEntsorgung.price :
      prices.grundpreisReinigung.price;
    const proQm =
      leistung === "umzug" ? prices.proQmUmzug.price :
      leistung === "entsorgung" ? prices.proQmEntsorgung.price :
      prices.proQmReinigung.price;

    let umfang = 0;
    let umfangLabel = "";
    if (berechnungsart === "flaeche") {
      umfang = (Number(flaeche) || 0) * proQm;
      umfangLabel = `Fläche: ${flaeche || 0} m² × ${proQm.toFixed(2)} €/m²`;
    } else {
      umfang = katalogForLeistung.reduce((sum, item) => sum + (gegenstaende[item.id] || 0) * item.preis, 0);
      umfangLabel = "Ausgewählte Positionen (einzeln berechnet)";
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
    if (zusatz.moebelAbbau) { zusatzSumme += prices.moebelAbbau.price; zusatzLabels.push(`Möbel-Abbau (${prices.moebelAbbau.price.toFixed(2)} €)`); }
    if (zusatz.moebelEinbau) { zusatzSumme += prices.moebelEinbau.price; zusatzLabels.push(`Möbel-Einbau (${prices.moebelEinbau.price.toFixed(2)} €)`); }
    if (zusatz.verpackungsservice) { zusatzSumme += prices.verpackungsservice.price; zusatzLabels.push(`Verpackungsservice (${prices.verpackungsservice.price.toFixed(2)} €)`); }
    if (zusatz.halteverbotszone) { zusatzSumme += prices.halteverbotszone.price; zusatzLabels.push(`Halteverbotszone (${prices.halteverbotszone.price.toFixed(2)} €)`); }
    if (zusatz.transportversicherung) {
      const v = basis * (prices.transportversicherung.price / 100);
      zusatzSumme += v;
      zusatzLabels.push(`Transportversicherung (${prices.transportversicherung.price}%)`);
    }

    const mitarbeiterAufpreis = mitarbeiter === 3 ? prices.mitarbeiter3Aufpreis.price : 0;
    const zweitransporterAufpreis = zweitransporter ? prices.zweitransporterAufpreis.price : 0;

    let netto = grundpreis + umfang + etagenzuschlag + transport + zusatzSumme + mitarbeiterAufpreis + zweitransporterAufpreis;

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
      mitarbeiterAufpreis, zweitransporterAufpreis,
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
    if (leistung !== "umzug" && !objektAdresse.trim()) {
      setError("Bitte gib die Objekt-Adresse ein.");
      return;
    }

    setLoading(true);
    try {
      let km = 0;
      if (leistung === "umzug") {
        const [a, b] = await Promise.all([geocode(von), geocode(nach)]);
        if (!a.state.includes("Nordrhein-Westfalen")) {
          setError("Der Startpunkt (Von) muss in Nordrhein-Westfalen liegen. Der Zielort kann deutschlandweit sein.");
          setLoading(false);
          return;
        }
        if (!b.country.includes("Deutschland")) {
          setError("Der Zielort (Nach) muss in Deutschland liegen.");
          setLoading(false);
          return;
        }
        km = haversineKm(a.lat, a.lon, b.lat, b.lon);
      } else {
        const obj = await geocode(objektAdresse);
        if (!obj.state.includes("Nordrhein-Westfalen")) {
          setError("Die Objekt-Adresse muss in Nordrhein-Westfalen liegen.");
          setLoading(false);
          return;
        }
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

    if (!session) {
      setSendError("Bitte logge dich ein, um ein verbindliches Angebot anzufordern.");
      return;
    }
    if (!name.trim() || !telefon.trim()) {
      setSendError("Bitte gib Name und Telefonnummer an — beides ist für die Anfrage erforderlich.");
      return;
    }

    setSending(true);
    try {
      const breakdown = computeBreakdown();

      const { error: insertError } = await supabase.from("anfragen").insert({
        user_id: session.user.id,
        kundentyp,
        leistung,
        von: leistung === "umzug" ? von : objektAdresse,
        nach: leistung === "umzug" ? nach : null,
        objekt_adresse: leistung !== "umzug" ? objektAdresse : null,
        entfernung_km: Number(result.km),
        etage_von: etageVon,
        etage_nach: etageNach,
        aufzug_von: vonAufzug,
        aufzug_nach: nachAufzug,
        berechnungsart,
        flaeche: berechnungsart === "flaeche" ? Number(flaeche) || null : null,
        gegenstaende: berechnungsart === "gegenstaende" ? gegenstaende : null,
        zusatzleistungen: zusatz,
        mitarbeiter,
        kapazitaet_bedarf: zweitransporter ? 2 : 1,
        wunschtermin: wunschtermin || null,
        rabattcode: result.rabatt ? result.rabatt.code : null,
        geschaetzter_preis: Math.round(breakdown.brutto * 100) / 100,
        preis_details: breakdown,
        bezahlt_betrag: 0,
        name: name.trim(),
        email: contactEmail || session.user.email,
        telefon: telefon.trim(),
      });

      if (insertError) throw insertError;
      setSendSuccess(true);
    } catch (err) {
      setSendError("Die Anfrage konnte nicht gesendet werden. Bitte versuch es erneut.");
    } finally {
      setSending(false);
    }
  }

  function startCrossSell(target) {
    if (leistung === "umzug") {
      setCrossSellTarget(target);
    } else {
      const addr = objektAdresse;
      resetLeistungState(target);
      if (target === "umzug") setVon(addr);
      else setObjektAdresse(addr);
      rechnerRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }

  function chooseCrossSellAddress(which) {
    const addr = which === "start" ? von : nach;
    const target = crossSellTarget;
    resetLeistungState(target);
    setObjektAdresse(addr);
    setCrossSellTarget(null);
    rechnerRef.current?.scrollIntoView({ behavior: "smooth" });
  }

  const breakdown = result ? computeBreakdown() : null;
  const otherLeistungen = ["umzug", "entsorgung", "reinigung"].filter((l) => l !== leistung);

  return (
    <>
      <header className="hero">
        <div className="wrap">
          <span className="badge">● Rechner kostenlos &amp; ohne Konto nutzbar</span>
          <h1>
            Umzug, Entsorgung &amp; Reinigung — <span className="accent">fair, transparent, sofort kalkuliert.</span>
          </h1>
          <p className="lead">
            Berechne deinen Preis in wenigen Klicks ganz ohne Konto. Für die verbindliche Anfrage eines
            Angebots meldest du dich kurz kostenlos an.
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
            <button className="hero-choice-btn" onClick={() => scrollToRechner("reinigung")}>
              <strong>Reinigung</strong>
              <span>Übergabereinigung beim Auszug</span>
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
                <div className="segmented" style={{ maxWidth: 420 }}>
                  <button type="button" className={leistung === "umzug" ? "active" : ""} onClick={() => resetLeistungState("umzug")}>Umzug</button>
                  <button type="button" className={leistung === "entsorgung" ? "active" : ""} onClick={() => resetLeistungState("entsorgung")}>Entsorgung</button>
                  <button type="button" className={leistung === "reinigung" ? "active" : ""} onClick={() => resetLeistungState("reinigung")}>Reinigung</button>
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
                    <p className="mini-note" style={{ marginBottom: 12 }}>
                      Wir starten aktuell nur aus Nordrhein-Westfalen — dein Zielort kann deutschlandweit liegen.
                    </p>
                    <div className="calc-grid">
                      <AddressField id="von" label="Von (Auszug, NRW)" placeholder="z.B. Musterstraße 1, Hagen" value={von} onChange={setVon} />
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
                    <p className="mini-note" style={{ gridColumn: "1 / -1", marginBottom: -4 }}>
                      {leistungLabels[leistung]} aktuell nur innerhalb Nordrhein-Westfalens.
                    </p>
                    <AddressField id="objekt" label={`Objekt-Adresse (NRW)`} placeholder="Adresse in Deutschland suchen…" value={objektAdresse} onChange={setObjektAdresse} />
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
                      <h4>Nach Positionen</h4>
                      <p>Genauer — einzelne Gegenstände bzw. Leistungen auswählen.</p>
                    </div>
                  </div>
                </div>

                {berechnungsart === "flaeche" ? (
                  <div className="field" style={{ marginTop: 16, maxWidth: 260 }}>
                    <label htmlFor="flaeche">Fläche (m²)</label>
                    <input id="flaeche" type="number" min="0" placeholder="z.B. 60" value={flaeche} onChange={(e) => setFlaeche(e.target.value)} />
                  </div>
                ) : (
                  <div style={{ marginTop: 16 }}>
                    <div className="kategorie-tabs">
                      {kategorien.map((k) => (
                        <button
                          type="button"
                          key={k}
                          className={"kategorie-tab" + (selectedKategorie === k ? " active" : "")}
                          onClick={() => setSelectedKategorie(k)}
                        >
                          {k}
                        </button>
                      ))}
                    </div>

                    {!selectedKategorie ? (
                      <p className="mini-note" style={{ marginTop: 10 }}>
                        Wähle oben eine Kategorie, um die passenden Positionen anzuzeigen
                        {gegenstaendeGesamtAnzahl > 0 ? ` (aktuell ${gegenstaendeGesamtAnzahl} ausgewählt).` : "."}
                      </p>
                    ) : (
                      <div className="items-grid" style={{ marginTop: 14 }}>
                        {itemsInKategorie.map((item) => (
                          <div className="item-row" key={item.id}>
                            <span>{item.name}</span>
                            <div className="qty-control">
                              <button type="button" className="qty-btn" onClick={() => changeQty(item.id, -1)}>−</button>
                              <span className="qty-value">{gegenstaende[item.id] || 0}</span>
                              <button type="button" className="qty-btn" onClick={() => changeQty(item.id, 1)}>+</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {leistung !== "reinigung" && (
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
                )}

                <div className="field" style={{ marginTop: 20 }}>
                  <label>Wie viele Mitarbeiter sollen kommen?</label>
                  <div className="segmented" style={{ maxWidth: 340 }}>
                    <button type="button" className={mitarbeiter === 2 ? "active" : ""} onClick={() => setMitarbeiter(2)}>2 Mitarbeiter</button>
                    <button type="button" className={mitarbeiter === 3 ? "active" : ""} onClick={() => setMitarbeiter(3)}>3 Mitarbeiter (schneller)</button>
                  </div>
                </div>

                {leistung === "umzug" && (
                  <div className="field" style={{ marginTop: 16 }}>
                    <label className="item-row" style={{ cursor: "pointer", maxWidth: 420 }}>
                      <span>2. Transporter (schneller — benötigt einen Tag mit 2 freien Plätzen)</span>
                      <input type="checkbox" checked={zweitransporter} onChange={(e) => { setZweitransporter(e.target.checked); setWunschtermin(""); }} />
                    </label>
                  </div>
                )}

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
                  <label>Wunschtermin{zweitransporter ? " (nur Tage mit 2 freien Plätzen wählbar)" : ""}</label>
                  <TerminPicker value={wunschtermin} onChange={setWunschtermin} requiredCapacity={zweitransporter ? 2 : 1} />
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
                    {breakdown.mitarbeiterAufpreis > 0 && (
                      <div className="belegzeile"><span>3. Mitarbeiter</span><span>{breakdown.mitarbeiterAufpreis.toFixed(2)} €</span></div>
                    )}
                    {breakdown.zweitransporterAufpreis > 0 && (
                      <div className="belegzeile"><span>2. Transporter</span><span>{breakdown.zweitransporterAufpreis.toFixed(2)} €</span></div>
                    )}
                    {breakdown.rabattBetrag > 0 && (
                      <div className="belegzeile"><span>Rabattcode</span><span>− {breakdown.rabattBetrag.toFixed(2)} €</span></div>
                    )}
                    <div className="belegzeile" style={{ borderTop: "1px solid var(--border)", marginTop: 8, paddingTop: 10 }}><span>Netto</span><span>{breakdown.netto.toFixed(2)} €</span></div>
                    <div className="belegzeile"><span>zzgl. USt ({breakdown.mwstSatz}%)</span><span>{breakdown.mwstBetrag.toFixed(2)} €</span></div>
                    <div className="belegzeile" style={{ fontWeight: 700, fontSize: 16 }}><span>Gesamt</span><span>{breakdown.brutto.toFixed(2)} €</span></div>
                    <div className="belegzeile"><span>Anzahlung ({prices.anzahlung.price}%)</span><span>{breakdown.anzahlung.toFixed(2)} €</span></div>
                  </div>
                  <div className="calc-note">
                    Unverbindliche Schätzung. Zahlungsabwicklung folgt in Kürze.
                  </div>

                  <div className="contact-box">
                    <div className="contact-title">Verbindliches Angebot anfragen</div>
                    {sendSuccess ? (
                      <>
                        <div className="send-success">Danke! Deine Anfrage ist eingegangen — du findest sie ab sofort unter „Meine Aufträge".</div>
                        <div style={{ marginTop: 18 }}>
                          <p style={{ fontSize: 13.5, marginBottom: 10 }}>Möchtest du gleich auch eine der anderen Leistungen anfragen?</p>
                          <div className="btn-row">
                            {otherLeistungen.map((l) => (
                              <button key={l} type="button" className="btn ghost" onClick={() => startCrossSell(l)}>
                                Auch {leistungLabels[l]} anfragen
                              </button>
                            ))}
                          </div>
                          {crossSellTarget && (
                            <div style={{ marginTop: 14 }}>
                              <p style={{ fontSize: 13, marginBottom: 8 }}>Welche Adresse soll für {leistungLabels[crossSellTarget]} übernommen werden?</p>
                              <div className="btn-row">
                                <button type="button" className="btn ghost" onClick={() => chooseCrossSellAddress("start")}>Startadresse übernehmen</button>
                                <button type="button" className="btn ghost" onClick={() => chooseCrossSellAddress("ziel")}>Zieladresse übernehmen</button>
                              </div>
                            </div>
                          )}
                        </div>
                      </>
                    ) : !session ? (
                      <>
                        <p style={{ fontSize: 13.5, color: "var(--text-dim)", marginBottom: 12 }}>
                          Der Rechner ist frei nutzbar — für die verbindliche Anfrage eines Angebots ist ein kostenloses Konto nötig.
                        </p>
                        <a className="calc-submit" href="/login" style={{ display: "block", textAlign: "center", textDecoration: "none" }}>
                          Jetzt einloggen, um Angebot zu erhalten
                        </a>
                      </>
                    ) : (
                      <>
                        <div className="calc-row-3">
                          <div className="field">
                            <label htmlFor="name">Name *</label>
                            <input id="name" type="text" required value={name} onChange={(e) => setName(e.target.value)} />
                          </div>
                          <div className="field">
                            <label htmlFor="contactEmail">E-Mail</label>
                            <input id="contactEmail" type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
                          </div>
                          <div className="field">
                            <label htmlFor="telefon">Telefon *</label>
                            <input id="telefon" type="text" required value={telefon} onChange={(e) => setTelefon(e.target.value)} />
                          </div>
                        </div>
                        <button type="button" className="calc-submit" style={{ marginTop: 16 }} disabled={sending} onClick={handleSendRequest}>
                          {sending ? "Sende…" : "Verbindliches Angebot anfragen"}
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

      <section className="services-stack" id="leistungen">
        <div className="wrap">
          <div className="section-title">
            <h2>Drei Leistungen, ein transparenter Preis</h2>
            <p>Berechne wahlweise nach Fläche (m²) oder nach einzelnen Positionen.</p>
          </div>
        </div>

        <div className="service-band service-band-umzug" onClick={() => scrollToRechner("umzug")}>
          <div className="wrap service-band-inner">
            <span className="service-band-icon">🚚</span>
            <h3>Umzug</h3>
            <p>Privat- oder Firmenumzug — inklusive Entfernung &amp; Etagen.</p>
            <span className="service-band-cta">Preis berechnen →</span>
          </div>
        </div>

        <div className="service-band service-band-entsorgung" onClick={() => scrollToRechner("entsorgung")}>
          <div className="wrap service-band-inner">
            <span className="service-band-icon">♻️</span>
            <h3>Entsorgung</h3>
            <p>Entrümpelung &amp; Haushaltsauflösung, fachgerecht entsorgt.</p>
            <span className="service-band-cta">Preis berechnen →</span>
          </div>
        </div>

        <div className="service-band service-band-reinigung" onClick={() => scrollToRechner("reinigung")}>
          <div className="wrap service-band-inner">
            <span className="service-band-icon">✨</span>
            <h3>Reinigung</h3>
            <p>Übergabereinigung beim Auszug — sauber und mängelfrei abgeben.</p>
            <span className="service-band-cta">Preis berechnen →</span>
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
          <p>Umzug, Entsorgung &amp; Reinigung zum transparenten Festpreis — online berechnen, online anfragen.</p>
        </div>
        <div>
          <div className="foot-heading">Leistungen</div>
          <a href="#rechner">Umzug</a>
          <a href="#rechner">Entsorgung</a>
          <a href="#rechner">Reinigung</a>
          <a href="/so-funktioniert">So funktioniert's</a>
        </div>
        <div>
          <div className="foot-heading">Rechtliches</div>
          <a href="/impressum">Impressum</a>
          <a href="/datenschutz">Datenschutz</a>
          <a href="/agb">AGB &amp; Widerruf</a>
        </div>
        <div>
          <div className="foot-heading">Kontakt</div>
          <a href="/ueber-uns">Über uns</a>
          <a href="mailto:info@umzugplus.de">info@umzugplus.de</a>
          <div className="social-row">
            <a href="https://instagram.com/umzugplus" target="_blank" rel="noreferrer" aria-label="Instagram">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><rect x="2.5" y="2.5" width="19" height="19" rx="5" stroke="currentColor" strokeWidth="1.6"/><circle cx="12" cy="12" r="4.2" stroke="currentColor" strokeWidth="1.6"/><circle cx="17.4" cy="6.6" r="1.1" fill="currentColor"/></svg>
            </a>
            <a href="https://tiktok.com/@umzugplus" target="_blank" rel="noreferrer" aria-label="TikTok">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M14 3v10.2a3.3 3.3 0 1 1-2.4-3.18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/><path d="M14 3c.4 2.4 2.2 4.2 4.6 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>
            </a>
            <a href="https://facebook.com/umzugplus" target="_blank" rel="noreferrer" aria-label="Facebook">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9.5" stroke="currentColor" strokeWidth="1.6"/><path d="M13.5 21v-6.5H16l.4-3H13.5v-1.8c0-1 .3-1.7 1.7-1.7H16V5.3c-.3 0-1.2-.1-2.2-.1-2.2 0-3.7 1.3-3.7 3.8v2.1H8v3h2.1V21" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/></svg>
            </a>
            <a href="https://youtube.com/@umzugplus" target="_blank" rel="noreferrer" aria-label="YouTube">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><rect x="2.5" y="6" width="19" height="12" rx="3.5" stroke="currentColor" strokeWidth="1.6"/><path d="M10.5 9.6v4.8l4.3-2.4-4.3-2.4Z" fill="currentColor"/></svg>
            </a>
          </div>
        </div>
      </div>
      <div className="wrap footer-bottom">
        <span>© {new Date().getFullYear()} UmzugPlus. Alle Rechte vorbehalten.</span>
        <span>Transparent · Fair · DSGVO-konform</span>
      </div>
    </footer>
  );
}

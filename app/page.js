"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { supabase } from "./lib/supabaseClient";
import TerminPicker from "./components/TerminPicker";
import { useLanguage } from "./lib/i18n";

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
  const { t } = useLanguage();
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
  const [moebelAbbauItems, setMoebelAbbauItems] = useState({});
  const [moebelEinbauItems, setMoebelEinbauItems] = useState({});
  const [mitarbeiter, setMitarbeiter] = useState(2);
  const [zweitransporter, setZweitransporter] = useState(false);
  const [sonstiges, setSonstiges] = useState("");
  const [rabattcodeInput, setRabattcodeInput] = useState("");
  const [wunschtermin, setWunschtermin] = useState("");
  const [wunschterminUhrzeit, setWunschterminUhrzeit] = useState("09:00");
  const [wunschterminTag2, setWunschterminTag2] = useState("");

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

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const l = params.get("leistung");
    if (l && ["umzug", "entsorgung", "reinigung"].includes(l)) {
      setLeistung(l);
      setTimeout(() => rechnerRef.current?.scrollIntoView({ behavior: "smooth" }), 400);
    }
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
    leistung === "reinigung" ? i.leistung_typ === "reinigung" : i.leistung_typ === "moebel"
  );
  const kategorien = [...new Set(katalogForLeistung.map((i) => i.kategorie))];
  const itemsInKategorie = katalogForLeistung.filter((i) => i.kategorie === selectedKategorie);
  const gegenstaendeGesamtAnzahl = Object.values(gegenstaende).reduce((s, n) => s + (n || 0), 0);

  function changeMontageQty(setter, id, delta) {
    setter((prev) => {
      const next = Math.max(0, (prev[id] || 0) + delta);
      return { ...prev, [id]: next };
    });
  }

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
    const gegenstandPreisFeld = leistung === "entsorgung" ? "preis_entsorgung" : "preis";
    if (berechnungsart === "flaeche") {
      umfang = (Number(flaeche) || 0) * proQm;
      umfangLabel = `Fläche: ${flaeche || 0} m² × ${proQm.toFixed(2)} €/m²`;
    } else {
      umfang = katalogForLeistung.reduce((sum, item) => sum + (gegenstaende[item.id] || 0) * (item[gegenstandPreisFeld] || 0), 0);
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
    const montageAbbauSumme = Object.entries(moebelAbbauItems).reduce((s, [id, qty]) => {
      const item = katalogForLeistung.find((m) => m.id === id);
      return s + (item ? (item.preis_abbau || 0) * qty : 0);
    }, 0);
    const montageEinbauSumme = Object.entries(moebelEinbauItems).reduce((s, [id, qty]) => {
      const item = katalogForLeistung.find((m) => m.id === id);
      return s + (item ? (item.preis_einbau || 0) * qty : 0);
    }, 0);
    if (montageAbbauSumme > 0) { zusatzSumme += montageAbbauSumme; zusatzLabels.push(`Möbel-Abbau (${montageAbbauSumme.toFixed(2)} €)`); }
    if (montageEinbauSumme > 0) { zusatzSumme += montageEinbauSumme; zusatzLabels.push(`Möbel-Einbau (${montageEinbauSumme.toFixed(2)} €)`); }
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

    let samstagAufpreisBetrag = 0;
    if (wunschtermin) {
      const terminDatum = new Date(wunschtermin + "T12:00:00");
      if (terminDatum.getDay() === 6) {
        samstagAufpreisBetrag = netto * (prices.samstagAufpreis.price / 100);
        netto += samstagAufpreisBetrag;
      }
    }

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

    // Dauer-Schätzung
    const basisstunden =
      leistung === "umzug" ? prices.basisstundenUmzug.price :
      leistung === "entsorgung" ? prices.basisstundenEntsorgung.price :
      prices.basisstundenReinigung.price;
    const umfangStunden = berechnungsart === "flaeche"
      ? (Number(flaeche) || 0) * prices.stundenProQm.price
      : gegenstaendeGesamtAnzahl * 0.15;
    const etagenStunden = etagenOhneAufzug * prices.stundenProEtageOhneAufzug.price;
    const verpackungStunden = zusatz.verpackungsservice ? prices.stundenVerpackung.price : 0;
    const montageAnzahl = Object.values(moebelAbbauItems).reduce((s, n) => s + n, 0) + Object.values(moebelEinbauItems).reduce((s, n) => s + n, 0);
    const montageStunden = montageAnzahl * 0.25;

    let geschaetzteDauerStunden = basisstunden + umfangStunden + etagenStunden + verpackungStunden + montageStunden;
    if (mitarbeiter === 3) geschaetzteDauerStunden *= 1 - prices.dreiMitarbeiterZeitfaktor.price / 100;
    if (zweitransporter) geschaetzteDauerStunden *= 1 - prices.zweiTransporterZeitfaktor.price / 100;
    geschaetzteDauerStunden = Math.round(Math.max(1, geschaetzteDauerStunden) * 10) / 10;

    return {
      grundpreis, umfang, umfangLabel, etagenOhneAufzug, etagenzuschlag,
      km, fernumzug, transport, zusatzSumme, zusatzLabels, rabattBetrag,
      mitarbeiterAufpreis, zweitransporterAufpreis, montageAbbauSumme, montageEinbauSumme, samstagAufpreisBetrag,
      netto, mwstSatz: prices.mwst.price, mwstBetrag: brutto - netto, brutto: gesamt,
      anzahlung, bezahlt: 0, offen: gesamt, geschaetzteDauerStunden,
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

  function resetCalculator() {
    setResult(null);
    setSendSuccess(false);
    setSendError("");
    setVon("");
    setNach("");
    setObjektAdresse("");
    setVonAufzug(false);
    setNachAufzug(false);
    setEtageVon("0");
    setEtageNach("0");
    setBerechnungsart("flaeche");
    setFlaeche("");
    setGegenstaende({});
    setSelectedKategorie(null);
    setZusatz({ moebelAbbau: false, moebelEinbau: false, verpackungsservice: false, halteverbotszone: false });
    setMoebelAbbauItems({});
    setMoebelEinbauItems({});
    setMitarbeiter(2);
    setZweitransporter(false);
    setSonstiges("");
    setRabattcodeInput("");
    setWunschtermin("");
    setWunschterminUhrzeit("09:00");
    setWunschterminTag2("");
    setComboExtras([]);
    setComboFormLeistung(null);
    rechnerRef.current?.scrollIntoView({ behavior: "smooth" });
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
      const primaryBreakdown = computeBreakdown();

      if (primaryBreakdown.geschaetzteDauerStunden > 8 && !wunschterminTag2) {
        setSendError("Dieser Auftrag dauert voraussichtlich mehr als 8 Stunden. Bitte wähle zusätzlich einen zweiten Tag.");
        setSending(false);
        return;
      }

      const extrasBruttoSumme = comboExtras.reduce((s, e) => s + e.brutto, 0);
      const kombinierterGesamt = Math.round((primaryBreakdown.brutto + extrasBruttoSumme) * 100) / 100;
      const kombinierteAnzahlung = Math.round(kombinierterGesamt * (prices.anzahlung.price / 100) * 100) / 100;

      const kombiniertePreisDetails = {
        ...primaryBreakdown,
        primaryLeistung: leistung,
        extras: comboExtras,
        combinedBrutto: kombinierterGesamt,
        anzahlung: kombinierteAnzahlung,
      };

      const { data: newOrder, error: insertError } = await supabase
        .from("anfragen")
        .insert({
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
          zusatzleistungen: { ...zusatz, moebelAbbauItems, moebelEinbauItems },
          mitarbeiter,
          kapazitaet_bedarf: zweitransporter ? 2 : 1,
          wunschtermin: wunschtermin || null,
          wunschtermin_uhrzeit: wunschtermin ? wunschterminUhrzeit : null,
          wunschtermin_tag2: wunschterminTag2 || null,
          geschaetzte_dauer_stunden: primaryBreakdown.geschaetzteDauerStunden,
          rabattcode: result.rabatt ? result.rabatt.code : null,
          geschaetzter_preis: kombinierterGesamt,
          preis_details: kombiniertePreisDetails,
          bezahlt_betrag: 0,
          name: name.trim(),
          email: contactEmail || session.user.email,
          telefon: telefon.trim(),
        })
        .select()
        .single();

      if (insertError) throw insertError;

      fetch("/api/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ anfrageId: newOrder.id, type: "angebot" }),
      }).catch(() => {});

      setSendSuccess(true);
    } catch (err) {
      setSendError("Die Anfrage konnte nicht gesendet werden. Bitte versuch es erneut.");
    } finally {
      setSending(false);
    }
  }

  const [comboExtras, setComboExtras] = useState([]);
  const [comboFormLeistung, setComboFormLeistung] = useState(null);
  const [comboAddressChoice, setComboAddressChoice] = useState(null);
  const [comboFormAdresse, setComboFormAdresse] = useState("");
  const [comboFormArt, setComboFormArt] = useState("flaeche");
  const [comboFormFlaeche, setComboFormFlaeche] = useState("");
  const [comboFormKategorie, setComboFormKategorie] = useState(null);
  const [comboFormItems, setComboFormItems] = useState({});
  const [comboLoading, setComboLoading] = useState(false);
  const [comboError, setComboError] = useState("");

  const leistungLabelMap = leistungLabels;

  function openComboForm(target) {
    setComboFormLeistung(target);
    setComboAddressChoice(leistung === "umzug" ? null : "auto");
    setComboFormAdresse(leistung === "umzug" ? "" : objektAdresse);
    setComboFormArt("flaeche");
    setComboFormFlaeche("");
    setComboFormKategorie(null);
    setComboFormItems({});
    setComboError("");
  }

  function chooseComboAddress(which) {
    setComboAddressChoice(which);
    setComboFormAdresse(which === "start" ? von : nach);
  }

  function changeComboItemQty(id, delta) {
    setComboFormItems((prev) => {
      const next = Math.max(0, (prev[id] || 0) + delta);
      return { ...prev, [id]: next };
    });
  }

  function computeExtraBreakdown(target, art, flaecheWert, itemsAuswahl) {
    const grundpreis = target === "entsorgung" ? prices.grundpreisEntsorgung.price : prices.grundpreisReinigung.price;
    const proQm = target === "entsorgung" ? prices.proQmEntsorgung.price : prices.proQmReinigung.price;

    let umfang = 0;
    let umfangLabel = "";
    let itemLabels = [];
    if (art === "flaeche") {
      umfang = (Number(flaecheWert) || 0) * proQm;
      umfangLabel = `Fläche: ${flaecheWert || 0} m² × ${proQm.toFixed(2)} €/m²`;
    } else {
      const relevantKatalog = katalog.filter((i) => (target === "reinigung" ? i.leistung_typ === "reinigung" : i.leistung_typ === "moebel"));
      const priceField = target === "entsorgung" ? "preis_entsorgung" : "preis";
      relevantKatalog.forEach((item) => {
        const qty = itemsAuswahl[item.id] || 0;
        if (qty > 0) {
          umfang += qty * (item[priceField] || 0);
          itemLabels.push(`${qty}× ${item.name}`);
        }
      });
      umfangLabel = itemLabels.length > 0 ? itemLabels.join(", ") : "Einzelne Positionen";
    }

    let netto = grundpreis + umfang;
    if (kundentyp === "gewerbe") netto = netto * (1 - prices.rabattGewerbe.price / 100);
    const brutto = netto * (1 + prices.mwst.price / 100);
    const gesamt = Math.max(brutto, prices.mindestauftragswert.price);
    return { leistung: target, grundpreis, umfang, umfangLabel, flaeche: art === "flaeche" ? Number(flaecheWert) || 0 : null, berechnungsart: art, netto, mwstSatz: prices.mwst.price, mwstBetrag: brutto - netto, brutto: gesamt };
  }

  async function submitComboForm() {
    setComboError("");
    if (!comboFormAdresse.trim()) {
      setComboError("Bitte eine Adresse angeben oder auswählen.");
      return;
    }
    if (comboFormArt === "flaeche" && !comboFormFlaeche) {
      setComboError("Bitte eine Fläche angeben.");
      return;
    }
    setComboLoading(true);
    try {
      const obj = await geocode(comboFormAdresse);
      if (!obj.state.includes("Nordrhein-Westfalen")) {
        setComboError("Die Adresse muss in Nordrhein-Westfalen liegen.");
        setComboLoading(false);
        return;
      }
      const extraBreakdown = computeExtraBreakdown(comboFormLeistung, comboFormArt, comboFormFlaeche, comboFormItems);
      setComboExtras((prev) => [...prev, { ...extraBreakdown, adresse: comboFormAdresse }]);
      setComboFormLeistung(null);
    } catch {
      setComboError("Die Adresse konnte nicht gefunden werden.");
    } finally {
      setComboLoading(false);
    }
  }

  function removeComboExtra(index) {
    setComboExtras((prev) => prev.filter((_, i) => i !== index));
  }

  const breakdown = result ? computeBreakdown() : null;
  const otherLeistungen = ["umzug", "entsorgung", "reinigung"].filter((l) => l !== leistung);

  return (
    <>
      <header className="hero">
        <div className="wrap">
          <span className="badge">{t("hero_badge")}</span>
          <h1>
            {t("hero_title")} <span className="accent">{t("hero_title_accent")}</span>
          </h1>
          <p className="lead">{t("hero_lead")}</p>
        </div>
      </header>

      <section className="services-stack" id="leistungen">
        <div className="wrap">
          <div className="section-title">
            <h2>{t("services_title")}</h2>
            <p>{t("services_sub")}</p>
          </div>

          <div className="service-circles">
            <Link href="/umzug" className="service-circle">
              <div className="service-circle-img service-circle-umzug">
                <span className="service-circle-label">{t("hc_umzug_t")}</span>
              </div>
              <p>{t("hc_umzug_d")}</p>
              <span className="service-band-cta-dark">Mehr erfahren →</span>
            </Link>

            <Link href="/entsorgung" className="service-circle">
              <div className="service-circle-img service-circle-entsorgung">
                <span className="service-circle-label">{t("hc_entsorgung_t")}</span>
              </div>
              <p>{t("hc_entsorgung_d")}</p>
              <span className="service-band-cta-dark">Mehr erfahren →</span>
            </Link>

            <Link href="/reinigung" className="service-circle">
              <div className="service-circle-img service-circle-reinigung">
                <span className="service-circle-label">{t("hc_reinigung_t")}</span>
              </div>
              <p>{t("hc_reinigung_d")}</p>
              <span className="service-band-cta-dark">Mehr erfahren →</span>
            </Link>
          </div>
        </div>
      </section>

      <section className="calc-section" id="rechner" ref={rechnerRef}>
        <div className="wrap">
          <div className="calc-card">
            <div className="calc-inner">
              <div className="calc-title">{t("calc_title")}</div>
              <div className="calc-sub">{t("calc_sub")}</div>

              <div className="field" style={{ marginBottom: 20 }}>
                <label>{t("label_leistung")}</label>
                <div className="segmented" style={{ maxWidth: 420 }}>
                  <button type="button" className={leistung === "umzug" ? "active" : ""} onClick={() => resetLeistungState("umzug")}>{t("hc_umzug_t")}</button>
                  <button type="button" className={leistung === "entsorgung" ? "active" : ""} onClick={() => resetLeistungState("entsorgung")}>{t("hc_entsorgung_t")}</button>
                  <button type="button" className={leistung === "reinigung" ? "active" : ""} onClick={() => resetLeistungState("reinigung")}>{t("hc_reinigung_t")}</button>
                </div>
              </div>

              <div className="field" style={{ marginBottom: 20 }}>
                <label>{t("label_fuerwen")}</label>
                <div className="segmented" style={{ maxWidth: 300 }}>
                  <button type="button" className={kundentyp === "privat" ? "active" : ""} onClick={() => setKundentyp("privat")}>{t("privat")}</button>
                  <button type="button" className={kundentyp === "gewerbe" ? "active" : ""} onClick={() => setKundentyp("gewerbe")}>{t("gewerblich")}</button>
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
                        <label htmlFor="etageVon">{t("label_etage_auszug")}</label>
                        <select id="etageVon" value={etageVon} onChange={(e) => setEtageVon(e.target.value)}>
                          {etagenOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                        <label className="checkbox-row"><input type="checkbox" checked={vonAufzug} onChange={(e) => setVonAufzug(e.target.checked)} /> {t("label_aufzug")}</label>
                      </div>
                      <div className="field">
                        <label htmlFor="etageNach">{t("label_etage_einzug")}</label>
                        <select id="etageNach" value={etageNach} onChange={(e) => setEtageNach(e.target.value)}>
                          {etagenOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                        <label className="checkbox-row"><input type="checkbox" checked={nachAufzug} onChange={(e) => setNachAufzug(e.target.checked)} /> {t("label_aufzug")}</label>
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
                      <label htmlFor="etageVon">{t("label_etage_ohne_aufzug")}</label>
                      <select id="etageVon" value={etageVon} onChange={(e) => setEtageVon(e.target.value)}>
                        {etagenOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                      <label className="checkbox-row"><input type="checkbox" checked={vonAufzug} onChange={(e) => setVonAufzug(e.target.checked)} /> {t("label_aufzug")}</label>
                    </div>
                  </div>
                )}

                <div className="field" style={{ marginTop: 20 }}>
                  <label>{t("label_berechnungsart")}</label>
                  <div className="method-cards">
                    <div className={"method-card" + (berechnungsart === "flaeche" ? " active" : "")} onClick={() => setBerechnungsart("flaeche")}>
                      <h4>{t("method_flaeche_t")}</h4>
                      <p>{t("method_flaeche_d")}</p>
                    </div>
                    <div className={"method-card" + (berechnungsart === "gegenstaende" ? " active" : "")} onClick={() => setBerechnungsart("gegenstaende")}>
                      <h4>{t("method_pos_t")}</h4>
                      <p>{t("method_pos_d")}</p>
                    </div>
                  </div>
                </div>

                {berechnungsart === "flaeche" ? (
                  <div className="field" style={{ marginTop: 16, maxWidth: 260 }}>
                    <label htmlFor="flaeche">{t("label_flaeche")}</label>
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
                    <label>{t("label_zusatzleistungen")}</label>
                    <div className="items-grid">
                      {[
                        ["moebelAbbau", t("zl_abbau")],
                        ["moebelEinbau", t("zl_einbau")],
                        ["verpackungsservice", t("zl_verpackung")],
                        ["halteverbotszone", t("zl_halteverbot")],
                        ["transportversicherung", t("zl_versicherung")],
                      ].map(([key, label]) => (
                        <label className="item-row" key={key} style={{ cursor: "pointer" }}>
                          <span>{label}</span>
                          <input type="checkbox" checked={zusatz[key] || false} onChange={(e) => setZusatz((z) => ({ ...z, [key]: e.target.checked }))} />
                        </label>
                      ))}
                    </div>

                    {zusatz.moebelAbbau && (
                      <div style={{ marginTop: 12 }}>
                        <p className="mini-note" style={{ marginBottom: 8 }}>{t("frage_abbau")}</p>
                        <div className="items-grid">
                          {katalogForLeistung.map((item) => (
                            <div className="item-row" key={item.id}>
                              <span>{item.name}</span>
                              <div className="qty-control">
                                <button type="button" className="qty-btn" onClick={() => changeMontageQty(setMoebelAbbauItems, item.id, -1)}>−</button>
                                <span className="qty-value">{moebelAbbauItems[item.id] || 0}</span>
                                <button type="button" className="qty-btn" onClick={() => changeMontageQty(setMoebelAbbauItems, item.id, 1)}>+</button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {zusatz.moebelEinbau && (
                      <div style={{ marginTop: 12 }}>
                        <p className="mini-note" style={{ marginBottom: 8 }}>{t("frage_einbau")}</p>
                        <div className="items-grid">
                          {katalogForLeistung.map((item) => (
                            <div className="item-row" key={item.id}>
                              <span>{item.name}</span>
                              <div className="qty-control">
                                <button type="button" className="qty-btn" onClick={() => changeMontageQty(setMoebelEinbauItems, item.id, -1)}>−</button>
                                <span className="qty-value">{moebelEinbauItems[item.id] || 0}</span>
                                <button type="button" className="qty-btn" onClick={() => changeMontageQty(setMoebelEinbauItems, item.id, 1)}>+</button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="field" style={{ marginTop: 20 }}>
                  <label>{t("label_mitarbeiter")}</label>
                  <div className="segmented" style={{ maxWidth: 340 }}>
                    <button type="button" className={mitarbeiter === 2 ? "active" : ""} onClick={() => setMitarbeiter(2)}>{t("mitarbeiter_2")}</button>
                    <button type="button" className={mitarbeiter === 3 ? "active" : ""} onClick={() => setMitarbeiter(3)}>{t("mitarbeiter_3")}</button>
                  </div>
                </div>

                {leistung === "umzug" && (
                  <div className="field" style={{ marginTop: 16 }}>
                    <label className="item-row" style={{ cursor: "pointer", maxWidth: 420 }}>
                      <span>{t("label_zweitransporter")}</span>
                      <input type="checkbox" checked={zweitransporter} onChange={(e) => { setZweitransporter(e.target.checked); setWunschtermin(""); }} />
                    </label>
                  </div>
                )}

                <div className="field" style={{ marginTop: 20 }}>
                  <label htmlFor="sonstiges">{t("label_sonstiges")}</label>
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
                  <label>{t("label_wunschtermin")}{zweitransporter ? " (nur Tage mit 2 freien Plätzen wählbar)" : ""}</label>
                  <TerminPicker value={wunschtermin} onChange={setWunschtermin} requiredCapacity={zweitransporter ? 2 : 1} />
                </div>

                {wunschtermin && (
                  <div className="field" style={{ marginTop: 14, maxWidth: 200 }}>
                    <label htmlFor="uhrzeit">{t("label_uhrzeit")}</label>
                    <select id="uhrzeit" value={wunschterminUhrzeit} onChange={(e) => setWunschterminUhrzeit(e.target.value)}>
                      {["07:00","08:00","09:00","10:00","11:00","12:00","13:00","14:00","15:00","16:00"].map((h) => (
                        <option key={h} value={h}>{h} Uhr</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="calc-row-3" style={{ marginTop: 16 }}>
                  <div className="field">
                    <label htmlFor="rabattcode">{t("label_rabattcode")}</label>
                    <input id="rabattcode" type="text" placeholder="optional" value={rabattcodeInput} onChange={(e) => setRabattcodeInput(e.target.value)} />
                  </div>
                </div>

                <button className="calc-submit" type="submit" disabled={loading}>
                  {loading ? t("btn_berechne") : t("btn_preis_berechnen")}
                </button>

                {error && <div className="calc-error">{error}</div>}
              </form>

              {breakdown && (
                <div className="calc-result">
                  <div className="calc-result-head">{t("result_head")}</div>
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
                    {breakdown.samstagAufpreisBetrag > 0 && (
                      <div className="belegzeile"><span>Samstagszuschlag ({prices.samstagAufpreis.price}%)</span><span>{breakdown.samstagAufpreisBetrag.toFixed(2)} €</span></div>
                    )}
                    <div className="belegzeile" style={{ borderTop: "1px solid var(--border)", marginTop: 8, paddingTop: 10 }}><span>{t("netto_label")}</span><span>{breakdown.netto.toFixed(2)} €</span></div>
                    <div className="belegzeile"><span>zzgl. USt ({breakdown.mwstSatz}%)</span><span>{breakdown.mwstBetrag.toFixed(2)} €</span></div>
                    <div className="belegzeile" style={{ fontWeight: 700, fontSize: 16 }}><span>{t("gesamt_label")}</span><span>{breakdown.brutto.toFixed(2)} €</span></div>
                    <div className="belegzeile"><span>{t("anzahlung_label")} ({prices.anzahlung.price}%)</span><span>{breakdown.anzahlung.toFixed(2)} €</span></div>
                  </div>

                  <div className="price-highlight" style={{ margin: "0 20px 20px" }}>
                    <div className="k">{t("label_dauer")}</div>
                    <div className="v" style={{ fontSize: 22 }}>{breakdown.geschaetzteDauerStunden} {t("einheit_std")}</div>
                    {breakdown.geschaetzteDauerStunden > 8 ? (
                      <div className="note-inline" style={{ color: "var(--red-dark)" }}>
                        {t("dauer_warnung")}
                      </div>
                    ) : (
                      <div className="note-inline">{t("dauer_hinweis")}</div>
                    )}
                  </div>

                  {breakdown.geschaetzteDauerStunden > 8 && (
                    <div className="field" style={{ margin: "0 20px 20px" }}>
                      <label>{t("label_tag2")}</label>
                      <TerminPicker value={wunschterminTag2} onChange={setWunschterminTag2} requiredCapacity={zweitransporter ? 2 : 1} />
                    </div>
                  )}

                  <div className="calc-note">
                    Unverbindliche Schätzung. Zahlungsabwicklung folgt in Kürze.
                  </div>

                  {!sendSuccess && (
                    <div className="combo-box">
                      <div className="combo-box-title">Weitere Leistungen dazu buchen?</div>

                      {comboExtras.length > 0 && (
                        <div className="combo-summary">
                          <div className="combo-summary-row">
                            <span>{leistungLabelMap[leistung]}</span>
                            <span>{breakdown.brutto.toFixed(2)} €</span>
                          </div>
                          {comboExtras.map((e, i) => (
                            <div className="combo-summary-row" key={i}>
                              <span>{leistungLabelMap[e.leistung]} ({e.adresse.slice(0, 28)})</span>
                              <span>
                                {e.brutto.toFixed(2)} €
                                <button type="button" className="combo-remove" onClick={() => removeComboExtra(i)}>✕</button>
                              </span>
                            </div>
                          ))}
                          <div className="combo-summary-row combo-total">
                            <span>Kombinierter Gesamtpreis</span>
                            <span>{(breakdown.brutto + comboExtras.reduce((s, e) => s + e.brutto, 0)).toFixed(2)} €</span>
                          </div>
                        </div>
                      )}

                      <div className="btn-row" style={{ marginTop: 12 }}>
                        {["umzug", "entsorgung", "reinigung"]
                          .filter((l) => l !== leistung && !comboExtras.some((e) => e.leistung === l))
                          .map((l) => (
                            <button key={l} type="button" className="btn ghost" onClick={() => openComboForm(l)}>
                              + {leistungLabelMap[l]} dazu buchen
                            </button>
                          ))}
                      </div>

                      {comboFormLeistung && (
                        <div className="combo-form">
                          <p style={{ fontSize: 13, marginBottom: 10, fontWeight: 600 }}>
                            {leistungLabelMap[comboFormLeistung]} — Details
                          </p>

                          {leistung === "umzug" && (
                            <div className="field" style={{ marginBottom: 12 }}>
                              <label>Welche Adresse soll verwendet werden?</label>
                              <div className="btn-row">
                                <button type="button" className={"btn ghost" + (comboAddressChoice === "start" ? " active-outline" : "")} onClick={() => chooseComboAddress("start")}>{t("btn_start")}</button>
                                <button type="button" className={"btn ghost" + (comboAddressChoice === "ziel" ? " active-outline" : "")} onClick={() => chooseComboAddress("ziel")}>{t("btn_ziel")}</button>
                                <button type="button" className={"btn ghost" + (comboAddressChoice === "neu" ? " active-outline" : "")} onClick={() => { setComboAddressChoice("neu"); setComboFormAdresse(""); }}>Andere Adresse</button>
                              </div>
                            </div>
                          )}

                          <div className="field" style={{ marginBottom: 12 }}>
                            <label>Objekt-Adresse (NRW)</label>
                            <input type="text" value={comboFormAdresse} onChange={(e) => setComboFormAdresse(e.target.value)} placeholder="Adresse eingeben" />
                          </div>

                          <div className="field" style={{ marginBottom: 12 }}>
                            <label>Wie möchtest du berechnen?</label>
                            <div className="segmented" style={{ maxWidth: 320 }}>
                              <button type="button" className={comboFormArt === "flaeche" ? "active" : ""} onClick={() => setComboFormArt("flaeche")}>Gesamtfläche</button>
                              <button type="button" className={comboFormArt === "positionen" ? "active" : ""} onClick={() => setComboFormArt("positionen")}>Einzeln</button>
                            </div>
                          </div>

                          {comboFormArt === "flaeche" ? (
                            <div className="field" style={{ maxWidth: 200, marginBottom: 12 }}>
                              <label>Fläche (m²)</label>
                              <input type="number" min="0" value={comboFormFlaeche} onChange={(e) => setComboFormFlaeche(e.target.value)} />
                            </div>
                          ) : (
                            <div style={{ marginBottom: 12 }}>
                              <div className="kategorie-tabs" style={{ marginBottom: 10 }}>
                                {[...new Set(katalog.filter((i) => (comboFormLeistung === "reinigung" ? i.leistung_typ === "reinigung" : i.leistung_typ === "moebel")).map((i) => i.kategorie))].map((k) => (
                                  <button type="button" key={k} className={"kategorie-tab" + (comboFormKategorie === k ? " active" : "")} onClick={() => setComboFormKategorie(k)}>{k}</button>
                                ))}
                              </div>
                              {comboFormKategorie && (
                                <div className="items-grid">
                                  {katalog.filter((i) => i.kategorie === comboFormKategorie && (comboFormLeistung === "reinigung" ? i.leistung_typ === "reinigung" : i.leistung_typ === "moebel")).map((item) => (
                                    <div className="item-row" key={item.id}>
                                      <span>{item.name}</span>
                                      <div className="qty-control">
                                        <button type="button" className="qty-btn" onClick={() => changeComboItemQty(item.id, -1)}>−</button>
                                        <span className="qty-value">{comboFormItems[item.id] || 0}</span>
                                        <button type="button" className="qty-btn" onClick={() => changeComboItemQty(item.id, 1)}>+</button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}

                          <div className="btn-row" style={{ marginTop: 10 }}>
                            <button type="button" className="btn primary" disabled={comboLoading} onClick={submitComboForm}>
                              {comboLoading ? "Berechne…" : "Preis hinzufügen"}
                            </button>
                            <button type="button" className="btn ghost" onClick={() => setComboFormLeistung(null)}>Abbrechen</button>
                          </div>
                          {comboError && <div className="calc-error">{comboError}</div>}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="contact-box">
                    <div className="contact-title">{t("contact_title")}</div>
                    {sendSuccess ? (
                      <div>
                        <div className="send-success">
                          Danke! Deine Anfrage{comboExtras.length > 0 ? "n sind" : " ist"} eingegangen — du findest{comboExtras.length > 0 ? " sie" : " sie"} ab sofort unter „Meine Aufträge".
                        </div>
                        <button type="button" className="btn primary" style={{ marginTop: 14 }} onClick={resetCalculator}>
                          Neue Berechnung starten
                        </button>
                      </div>
                    ) : !session ? (
                      <>
                        <p style={{ fontSize: 13.5, color: "var(--text-dim)", marginBottom: 12 }}>
                          {t("contact_login_prompt")}
                        </p>
                        <a className="calc-submit" href="/login" style={{ display: "block", textAlign: "center", textDecoration: "none" }}>
                          {t("contact_login_btn")}
                        </a>
                      </>
                    ) : (
                      <>
                        <div className="calc-row-3">
                          <div className="field">
                            <label htmlFor="name">{t("label_name")} *</label>
                            <input id="name" type="text" required value={name} onChange={(e) => setName(e.target.value)} />
                          </div>
                          <div className="field">
                            <label htmlFor="contactEmail">{t("label_email")}</label>
                            <input id="contactEmail" type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
                          </div>
                          <div className="field">
                            <label htmlFor="telefon">{t("label_telefon")} *</label>
                            <input id="telefon" type="text" required value={telefon} onChange={(e) => setTelefon(e.target.value)} />
                          </div>
                        </div>
                        <button type="button" className="calc-submit" style={{ marginTop: 16 }} disabled={sending} onClick={handleSendRequest}>
                          {sending ? t("contact_sending") : comboExtras.length > 0 ? `Alle ${comboExtras.length + 1} Leistungen anfragen` : t("contact_submit")}
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

      <FaqSection />
      <Footer />
    </>
  );
}

function FaqSection() {
  const { t } = useLanguage();
  const [faqs, setFaqs] = useState([]);
  const [openId, setOpenId] = useState(null);

  useEffect(() => {
    supabase.from("faq").select("*").order("reihenfolge").then(({ data }) => setFaqs(data || []));
  }, []);

  if (faqs.length === 0) return null;

  return (
    <section className="faq-section">
      <div className="wrap">
        <div className="section-title">
          <h2>{t("faq_title")}</h2>
        </div>
        <div className="faq-list">
          {faqs.map((f) => (
            <div key={f.id} className="faq-item">
              <button type="button" className="faq-question" onClick={() => setOpenId(openId === f.id ? null : f.id)}>
                <span>{f.frage}</span>
                <span>{openId === f.id ? "−" : "+"}</span>
              </button>
              {openId === f.id && <div className="faq-answer">{f.antwort}</div>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Footer() {
  const { t } = useLanguage();
  return (
    <footer className="site-footer" id="footer-kontakt">
      <div className="wrap footer-grid">
        <div>
          <div className="foot-name">UmzugPlus</div>
          <p>{t("footer_tagline")}</p>
        </div>
        <div>
          <div className="foot-heading">{t("footer_leistungen")}</div>
          <a href="/umzug">{t("hc_umzug_t")}</a>
          <a href="/entsorgung">{t("hc_entsorgung_t")}</a>
          <a href="/reinigung">{t("hc_reinigung_t")}</a>
          <a href="/so-funktioniert">So funktioniert's</a>
        </div>
        <div>
          <div className="foot-heading">{t("footer_rechtliches")}</div>
          <a href="/impressum">Impressum</a>
          <a href="/datenschutz">Datenschutz</a>
          <a href="/agb">AGB &amp; Widerruf</a>
        </div>
        <div>
          <div className="foot-heading">{t("footer_kontakt")}</div>
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
        <span>© {new Date().getFullYear()} UmzugPlus. {t("footer_rights")}</span>
        <span>Transparent · Fair · DSGVO-konform</span>
      </div>
    </footer>
  );
}

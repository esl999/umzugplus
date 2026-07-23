"use client";

import { createContext, useContext, useEffect, useState } from "react";

const translations = {
  de: {
    nav_rechner: "Rechner", nav_leistungen: "Leistungen", nav_kundenstimmen: "Kundenstimmen",
    nav_ueberuns: "Über uns", nav_kontakt: "Kontakt", nav_admin: "Admin",
    nav_profil: "Mein Profil", nav_auftraege: "Meine Aufträge", nav_logout: "Abmelden",
    nav_login: "Log In", nav_signup: "Sign Up", search_placeholder: "Suchen…",
    hero_badge: "● Rechner kostenlos & ohne Konto nutzbar",
    hero_title: "Umzug, Entsorgung & Reinigung —",
    hero_title_accent: "fair, transparent, sofort kalkuliert.",
    hero_lead: "Berechne deinen Preis in wenigen Klicks ganz ohne Konto. Für die verbindliche Anfrage eines Angebots meldest du dich kurz kostenlos an.",
    hc_umzug_t: "Umzug", hc_umzug_d: "Privat- oder Firmenumzug berechnen",
    hc_entsorgung_t: "Entsorgung", hc_entsorgung_d: "Entrümpelung & Haushaltsauflösung",
    hc_reinigung_t: "Reinigung", hc_reinigung_d: "Übergabereinigung beim Auszug",
    services_title: "Drei Leistungen, ein transparenter Preis",
    services_sub: "Berechne wahlweise nach Fläche (m²) oder nach einzelnen Positionen.",
    service_cta: "Preis berechnen →",
    footer_tagline: "Umzug, Entsorgung & Reinigung zum transparenten Festpreis — online berechnen, online anfragen.",
    footer_leistungen: "Leistungen", footer_rechtliches: "Rechtliches", footer_kontakt: "Kontakt",
    footer_rights: "Alle Rechte vorbehalten.",
    calc_title: "Sofort-Preis berechnen",
    calc_sub: "Alle Preise kommen live aus unserem Katalog — transparent aufgeschlüsselt.",
    label_leistung: "Leistung",
    label_fuerwen: "Für wen?",
    privat: "Privat", gewerblich: "Gewerblich",
    label_berechnungsart: "Wie möchtest du berechnen?",
    method_flaeche_t: "Nach Fläche (m²)", method_flaeche_d: "Schnell & einfach — nur die Quadratmeterzahl.",
    method_pos_t: "Nach Positionen", method_pos_d: "Genauer — einzelne Gegenstände bzw. Leistungen auswählen.",
    btn_preis_berechnen: "Preis berechnen →", btn_berechne: "Berechne…",
    result_head: "Deine Preisaufschlüsselung",
    netto_label: "Netto", gesamt_label: "Gesamt", anzahlung_label: "Anzahlung",
    contact_title: "Verbindliches Angebot anfragen",
    contact_login_prompt: "Der Rechner ist frei nutzbar — für die verbindliche Anfrage eines Angebots ist ein kostenloses Konto nötig.",
    contact_login_btn: "Jetzt einloggen, um Angebot zu erhalten",
    contact_submit: "Verbindliches Angebot anfragen", contact_sending: "Sende…",
  },
  en: {
    nav_rechner: "Calculator", nav_leistungen: "Services", nav_kundenstimmen: "Reviews",
    nav_ueberuns: "About us", nav_kontakt: "Contact", nav_admin: "Admin",
    nav_profil: "My Profile", nav_auftraege: "My Orders", nav_logout: "Log out",
    nav_login: "Log In", nav_signup: "Sign Up", search_placeholder: "Search…",
    hero_badge: "● Free calculator, no account needed",
    hero_title: "Moving, Disposal & Cleaning —",
    hero_title_accent: "fair, transparent, calculated instantly.",
    hero_lead: "Calculate your price in a few clicks, no account required. To submit a binding request, you'll create a free account.",
    hc_umzug_t: "Moving", hc_umzug_d: "Calculate private or business moves",
    hc_entsorgung_t: "Disposal", hc_entsorgung_d: "Decluttering & house clearance",
    hc_reinigung_t: "Cleaning", hc_reinigung_d: "Move-out handover cleaning",
    services_title: "Three services, one transparent price",
    services_sub: "Calculate by area (m²) or by individual items.",
    service_cta: "Calculate price →",
    footer_tagline: "Moving, disposal & cleaning at a transparent fixed price — calculate online, request online.",
    footer_leistungen: "Services", footer_rechtliches: "Legal", footer_kontakt: "Contact",
    footer_rights: "All rights reserved.",
    calc_title: "Calculate your instant price",
    calc_sub: "All prices come live from our catalog — transparently broken down.",
    label_leistung: "Service",
    label_fuerwen: "For whom?",
    privat: "Private", gewerblich: "Business",
    label_berechnungsart: "How would you like to calculate?",
    method_flaeche_t: "By area (m²)", method_flaeche_d: "Fast & simple — just the square meters.",
    method_pos_t: "By items", method_pos_d: "More precise — select individual items or services.",
    btn_preis_berechnen: "Calculate price →", btn_berechne: "Calculating…",
    result_head: "Your price breakdown",
    netto_label: "Net", gesamt_label: "Total", anzahlung_label: "Deposit",
    contact_title: "Request a binding quote",
    contact_login_prompt: "The calculator is free to use — a free account is required to submit a binding quote request.",
    contact_login_btn: "Log in to get a quote",
    contact_submit: "Request a binding quote", contact_sending: "Sending…",
  },
  ar: {
    nav_rechner: "الحاسبة", nav_leistungen: "الخدمات", nav_kundenstimmen: "آراء العملاء",
    nav_ueberuns: "من نحن", nav_kontakt: "اتصل بنا", nav_admin: "الإدارة",
    nav_profil: "ملفي الشخصي", nav_auftraege: "طلباتي", nav_logout: "تسجيل الخروج",
    nav_login: "تسجيل الدخول", nav_signup: "إنشاء حساب", search_placeholder: "بحث…",
    hero_badge: "● الحاسبة مجانية ولا تحتاج حساب",
    hero_title: "نقل، تخلص من الأثاث، وتنظيف —",
    hero_title_accent: "عادل، شفاف، يُحسب فورًا.",
    hero_lead: "احسب السعر خلال ثوانٍ بدون حساب. لإرسال طلب ملزم، تحتاج فقط لإنشاء حساب مجاني.",
    hc_umzug_t: "نقل", hc_umzug_d: "احسب نقل منزلي أو تجاري",
    hc_entsorgung_t: "تخلص من الأثاث", hc_entsorgung_d: "إفراغ وتصفية المنزل",
    hc_reinigung_t: "تنظيف", hc_reinigung_d: "تنظيف تسليم الشقة عند الخروج",
    services_title: "ثلاث خدمات، سعر واحد شفاف",
    services_sub: "احسب حسب المساحة (م²) أو حسب العناصر الفردية.",
    service_cta: "احسب السعر ←",
    footer_tagline: "نقل، تخلص من الأثاث، وتنظيف بسعر ثابت وشفاف — احسب واطلب أونلاين.",
    footer_leistungen: "الخدمات", footer_rechtliches: "قانوني", footer_kontakt: "اتصل بنا",
    footer_rights: "جميع الحقوق محفوظة.",
    calc_title: "احسب سعرك الفوري",
    calc_sub: "جميع الأسعار مباشرة من الكتالوج — موضحة بشفافية.",
    label_leistung: "الخدمة",
    label_fuerwen: "لمن؟",
    privat: "شخصي", gewerblich: "تجاري",
    label_berechnungsart: "كيف تريد الحساب؟",
    method_flaeche_t: "حسب المساحة (م²)", method_flaeche_d: "سريع وبسيط — فقط عدد الأمتار المربعة.",
    method_pos_t: "حسب العناصر", method_pos_d: "أدق — اختر العناصر أو الخدمات الفردية.",
    btn_preis_berechnen: "احسب السعر ←", btn_berechne: "جارٍ الحساب…",
    result_head: "تفاصيل السعر",
    netto_label: "صافي", gesamt_label: "الإجمالي", anzahlung_label: "الدفعة المقدمة",
    contact_title: "طلب عرض سعر ملزم",
    contact_login_prompt: "الحاسبة مجانية الاستخدام — يلزم حساب مجاني لإرسال طلب عرض سعر ملزم.",
    contact_login_btn: "سجّل الدخول للحصول على عرض سعر",
    contact_submit: "طلب عرض سعر ملزم", contact_sending: "جارٍ الإرسال…",
  },
  tr: {
    nav_rechner: "Hesaplayıcı", nav_leistungen: "Hizmetler", nav_kundenstimmen: "Yorumlar",
    nav_ueberuns: "Hakkımızda", nav_kontakt: "İletişim", nav_admin: "Yönetim",
    nav_profil: "Profilim", nav_auftraege: "Siparişlerim", nav_logout: "Çıkış yap",
    nav_login: "Giriş yap", nav_signup: "Kayıt ol", search_placeholder: "Ara…",
    hero_badge: "● Hesaplayıcı ücretsiz, hesap gerekmez",
    hero_title: "Nakliye, Tasfiye & Temizlik —",
    hero_title_accent: "adil, şeffaf, anında hesaplanır.",
    hero_lead: "Fiyatını birkaç tıkla, hesap açmadan hesapla. Bağlayıcı bir teklif için sadece ücretsiz bir hesap gerekir.",
    hc_umzug_t: "Nakliye", hc_umzug_d: "Ev veya ofis taşımasını hesapla",
    hc_entsorgung_t: "Tasfiye", hc_entsorgung_d: "Eşya boşaltma ve tasfiye",
    hc_reinigung_t: "Temizlik", hc_reinigung_d: "Çıkış teslim temizliği",
    services_title: "Üç hizmet, tek şeffaf fiyat",
    services_sub: "Alana (m²) göre veya tek tek kalemlere göre hesapla.",
    service_cta: "Fiyat hesapla →",
    footer_tagline: "Şeffaf sabit fiyatla nakliye, tasfiye ve temizlik — online hesapla, online talep et.",
    footer_leistungen: "Hizmetler", footer_rechtliches: "Yasal", footer_kontakt: "İletişim",
    footer_rights: "Tüm hakları saklıdır.",
    calc_title: "Anında fiyatını hesapla",
    calc_sub: "Tüm fiyatlar katalogdan canlı gelir — şeffaf şekilde ayrıntılı.",
    label_leistung: "Hizmet",
    label_fuerwen: "Kimin için?",
    privat: "Bireysel", gewerblich: "Ticari",
    label_berechnungsart: "Nasıl hesaplamak istersin?",
    method_flaeche_t: "Alana göre (m²)", method_flaeche_d: "Hızlı & basit — sadece metrekare.",
    method_pos_t: "Kalemlere göre", method_pos_d: "Daha kesin — tek tek eşya veya hizmet seç.",
    btn_preis_berechnen: "Fiyat hesapla →", btn_berechne: "Hesaplanıyor…",
    result_head: "Fiyat dökümün",
    netto_label: "Net", gesamt_label: "Toplam", anzahlung_label: "Kapora",
    contact_title: "Bağlayıcı teklif iste",
    contact_login_prompt: "Hesaplayıcı ücretsizdir — bağlayıcı bir teklif göndermek için ücretsiz hesap gerekir.",
    contact_login_btn: "Teklif almak için giriş yap",
    contact_submit: "Bağlayıcı teklif iste", contact_sending: "Gönderiliyor…",
  },
};

export const LANGUAGES = [
  { code: "de", label: "Deutsch", flag: "🇩🇪" },
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "ar", label: "العربية", flag: "🇸🇦" },
  { code: "tr", label: "Türkçe", flag: "🇹🇷" },
];

const LanguageContext = createContext({ lang: "de", setLang: () => {}, t: (k) => k });

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState("de");

  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("umzugplus_lang") : null;
    if (saved && translations[saved]) setLangState(saved);
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  }, [lang]);

  function setLang(l) {
    setLangState(l);
    if (typeof window !== "undefined") localStorage.setItem("umzugplus_lang", l);
  }

  function t(key) {
    return translations[lang]?.[key] ?? translations.de[key] ?? key;
  }

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}

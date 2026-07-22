"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "./supabaseClient";

export const WEEKDAYS = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
export const MONTHS = [
  "Januar", "Februar", "März", "April", "Mai", "Juni",
  "Juli", "August", "September", "Oktober", "November", "Dezember",
];

// Gesetzliche Feiertage Nordrhein-Westfalen 2026
export const NRW_FEIERTAGE_2026 = new Set([
  "2026-01-01", // Neujahr
  "2026-04-03", // Karfreitag
  "2026-04-06", // Ostermontag
  "2026-05-01", // Tag der Arbeit
  "2026-05-14", // Christi Himmelfahrt
  "2026-05-25", // Pfingstmontag
  "2026-06-04", // Fronleichnam
  "2026-10-03", // Tag der Deutschen Einheit
  "2026-11-01", // Allerheiligen
  "2026-12-25", // 1. Weihnachtstag
  "2026-12-26", // 2. Weihnachtstag
]);

function toISO(d) {
  return d.toISOString().slice(0, 10);
}

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function useAvailability(month) {
  const [loading, setLoading] = useState(true);
  const [maxPerDay, setMaxPerDay] = useState(2);
  const [closedWeekday, setClosedWeekday] = useState(0);
  const [blocked, setBlocked] = useState(new Set());
  const [counts, setCounts] = useState({});

  const monthStart = new Date(month.getFullYear(), month.getMonth(), 1);
  const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0);

  const load = useCallback(async () => {
    setLoading(true);
    const [cfgRes, blockedRes, anfragenRes] = await Promise.all([
      supabase.from("capacity_config").select("*").eq("id", "default").single(),
      supabase.from("blocked_days").select("day").gte("day", toISO(monthStart)).lte("day", toISO(monthEnd)),
      supabase
        .from("anfragen")
        .select("wunschtermin")
        .neq("status", "storniert")
        .gte("wunschtermin", toISO(monthStart))
        .lte("wunschtermin", toISO(monthEnd)),
    ]);

    if (cfgRes.data) {
      setMaxPerDay(cfgRes.data.max_per_day);
      setClosedWeekday(cfgRes.data.closed_weekday);
    }
    setBlocked(new Set((blockedRes.data || []).map((r) => r.day)));

    const c = {};
    (anfragenRes.data || []).forEach((r) => {
      if (!r.wunschtermin) return;
      c[r.wunschtermin] = (c[r.wunschtermin] || 0) + 1;
    });
    setCounts(c);
    setLoading(false);
  }, [monthStart.getTime(), monthEnd.getTime()]);

  useEffect(() => {
    load();
  }, [load]);

  const days = [];
  for (let i = 1; i <= monthEnd.getDate(); i++) {
    days.push(new Date(month.getFullYear(), month.getMonth(), i));
  }

  function statusFor(date) {
    const iso = toISO(date);
    const today = startOfDay(new Date());
    if (startOfDay(date) < today) return "past";
    if (NRW_FEIERTAGE_2026.has(iso)) return "holiday";
    if (date.getDay() === closedWeekday) return "closed";
    if (blocked.has(iso)) return "blocked";
    const count = counts[iso] || 0;
    if (count >= maxPerDay) return "full";
    return "free";
  }

  return { loading, days, maxPerDay, counts, statusFor, blocked, reload: load, toISO };
}

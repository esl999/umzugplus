"use client";

import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

function toISO(d) {
  return d.toISOString().slice(0, 10);
}

export function useAvailability(daysAhead = 28) {
  const [loading, setLoading] = useState(true);
  const [maxPerDay, setMaxPerDay] = useState(2);
  const [closedWeekday, setClosedWeekday] = useState(0);
  const [blocked, setBlocked] = useState(new Set());
  const [counts, setCounts] = useState({});
  const [days, setDays] = useState([]);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    const start = new Date();
    const end = new Date();
    end.setDate(end.getDate() + daysAhead);

    const [cfgRes, blockedRes, anfragenRes] = await Promise.all([
      supabase.from("capacity_config").select("*").eq("id", "default").single(),
      supabase.from("blocked_days").select("day").gte("day", toISO(start)).lte("day", toISO(end)),
      supabase
        .from("anfragen")
        .select("wunschtermin")
        .neq("status", "storniert")
        .gte("wunschtermin", toISO(start))
        .lte("wunschtermin", toISO(end)),
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

    const list = [];
    for (let i = 0; i < daysAhead; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      list.push(d);
    }
    setDays(list);
    setLoading(false);
  }

  function statusFor(date) {
    const iso = toISO(date);
    if (date.getDay() === closedWeekday) return "closed";
    if (blocked.has(iso)) return "blocked";
    const count = counts[iso] || 0;
    if (count >= maxPerDay) return "full";
    return "free";
  }

  return { loading, days, maxPerDay, counts, statusFor, blocked, reload: load, toISO };
}

export const WEEKDAYS = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];

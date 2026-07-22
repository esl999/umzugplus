"use client";

import { useState } from "react";
import { useAvailability, WEEKDAYS, MONTHS } from "../lib/availability";

export default function TerminPicker({ value, onChange, requiredCapacity = 1 }) {
  const [month, setMonth] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });
  const { loading, days, maxPerDay, counts, statusFor, toISO } = useAvailability(month, requiredCapacity);

  const firstWeekday = days.length > 0 ? days[0].getDay() : 0;
  const leadingBlanks = firstWeekday;

  function prevMonth() {
    const d = new Date(month);
    d.setMonth(d.getMonth() - 1);
    const today = new Date();
    if (d.getFullYear() < today.getFullYear() || (d.getFullYear() === today.getFullYear() && d.getMonth() < today.getMonth())) return;
    setMonth(d);
  }

  function nextMonth() {
    const d = new Date(month);
    d.setMonth(d.getMonth() + 1);
    if (d.getFullYear() > 2026) return;
    setMonth(d);
  }

  return (
    <div>
      <div className="termin-nav">
        <button type="button" className="small-btn" onClick={prevMonth}>←</button>
        <strong>{MONTHS[month.getMonth()]} {month.getFullYear()}</strong>
        <button type="button" className="small-btn" onClick={nextMonth}>→</button>
      </div>

      {loading ? (
        <div className="mini-note">Lade Verfügbarkeit…</div>
      ) : (
        <div className="termin-grid termin-grid-month">
          {WEEKDAYS.map((wd) => (
            <div key={wd} className="termin-wd-head">{wd}</div>
          ))}
          {Array.from({ length: leadingBlanks }).map((_, i) => (
            <div key={"blank" + i} />
          ))}
          {days.map((d) => {
            const iso = toISO(d);
            const status = statusFor(d);
            const disabled = status !== "free";
            const selected = value === iso;
            const count = counts[iso] || 0;
            return (
              <button
                type="button"
                key={iso}
                disabled={disabled}
                onClick={() => onChange(iso)}
                className={
                  "termin-day" +
                  (selected ? " selected" : "") +
                  (status === "free" ? " free" : "") +
                  (status === "full" || status === "blocked" ? " full" : "") +
                  (status === "closed" || status === "past" ? " closed" : "") +
                  (status === "holiday" ? " holiday" : "")
                }
                title={status === "holiday" ? "Feiertag NRW" : status === "closed" ? "Sonntag geschlossen" : ""}
              >
                <span className="termin-dm">{d.getDate()}</span>
                {status === "free" && <span className="termin-count">{count}/{maxPerDay}</span>}
                {status === "holiday" && <span className="termin-count">Feiertag</span>}
                {status === "closed" && <span className="termin-count">zu</span>}
                {(status === "full" || status === "blocked") && <span className="termin-count">belegt</span>}
              </button>
            );
          })}
        </div>
      )}

      <div className="termin-legend">
        <span><i className="dot free" /> frei</span>
        <span><i className="dot full" /> belegt / gesperrt</span>
        <span><i className="dot closed" /> geschlossen / Feiertag</span>
      </div>
    </div>
  );
}

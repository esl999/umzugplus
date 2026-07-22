"use client";

import { useAvailability, WEEKDAYS } from "../lib/availability";

export default function TerminPicker({ value, onChange }) {
  const { loading, days, maxPerDay, counts, statusFor, toISO } = useAvailability(28);

  if (loading) return <div className="mini-note">Lade Verfügbarkeit…</div>;

  return (
    <div>
      <div className="termin-grid">
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
                (status === "full" ? " full" : "") +
                (status === "blocked" ? " full" : "") +
                (status === "closed" ? " closed" : "")
              }
            >
              <span className="termin-wd">{WEEKDAYS[d.getDay()]}</span>
              <span className="termin-dm">{d.getDate()}.{d.getMonth() + 1}.</span>
              {status === "free" && <span className="termin-count">{count}/{maxPerDay}</span>}
              {status === "closed" && <span className="termin-count">zu</span>}
              {(status === "full" || status === "blocked") && <span className="termin-count">belegt</span>}
            </button>
          );
        })}
      </div>
      <div className="termin-legend">
        <span><i className="dot free" /> frei</span>
        <span><i className="dot full" /> belegt / gesperrt</span>
        <span><i className="dot closed" /> geschlossen</span>
      </div>
    </div>
  );
}

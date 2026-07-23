import Link from "next/link";

export default function ServiceOverviewPage({ data, slug }) {
  return (
    <div className="service-overview">
      <header className="service-hero">
        <div className="wrap">
          <span className="badge">{data.badge}</span>
          <h1>{data.title}</h1>
          {data.intro.map((p, i) => (
            <p key={i} className="service-lead">{p}</p>
          ))}
          <Link className="btn primary" href={`/?leistung=${slug}#rechner`}>
            Kostenloses Angebot anfordern
          </Link>
        </div>
      </header>

      <section className="service-section">
        <div className="wrap">
          <h2>Warum wir?</h2>
          <div className="service-warum-grid">
            {data.warumWir.map((w, i) => (
              <div key={i} className="service-warum-item">
                <span className="service-check">✓</span>
                <span>{w}</span>
              </div>
            ))}
          </div>
          <p className="service-schluss">{data.schluss}</p>
        </div>
      </section>

      <section className="service-section alt">
        <div className="wrap">
          <h2>So funktioniert's</h2>
          <p className="service-sub">Ihr Auftrag in 3 einfachen Schritten — schnell, klar und stressfrei.</p>
          <div className="service-steps">
            {data.schritte.map((s) => (
              <div key={s.n} className="service-step">
                <span className="service-step-n">{s.n}</span>
                <span>{s.t}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="service-section">
        <div className="wrap">
          <h2>Leistungen im Überblick</h2>
          <ul className="service-list">
            {data.leistungen.map((l, i) => (
              <li key={i}>{l}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="service-section alt">
        <div className="wrap">
          <h2>Einsatzgebiete</h2>
          <p className="service-sub">Wir bieten unsere {data.title.toLowerCase()}sservices in folgenden Regionen an:</p>
          <div className="service-gebiete">
            {data.gebiete.map((g, i) => (
              <span key={i} className="service-gebiet-tag">{g}</span>
            ))}
          </div>
        </div>
      </section>

      <section className="service-section">
        <div className="wrap" style={{ textAlign: "center" }}>
          <Link className="btn primary" href={`/?leistung=${slug}#rechner`}>
            Jetzt Preis berechnen
          </Link>
        </div>
      </section>
    </div>
  );
}

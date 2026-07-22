import "./globals.css";
import Navbar from "./components/Navbar";
import ChatWidget from "./components/ChatWidget";

export const metadata = {
  title: "UmzugPlus — Ihr Umzug. Einfach organisiert.",
  description:
    "UmzugPlus ist Ihr Partner für Privat- und Firmenumzüge. Entfernung, Etagen und Wohnfläche direkt online berechnen und unverbindlich anfragen.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="de">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="true"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Outfit:wght@500;600;700;800&family=Inter:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <Navbar />
        {children}
        <ChatWidget />
      </body>
    </html>
  );
}

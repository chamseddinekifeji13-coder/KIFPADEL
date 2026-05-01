import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { RegisterServiceWorker } from "@/modules/pwa/register-sw";

import "@/styles/globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE_URL = "https://www.kifpadel.tn";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Kifpadel — Réservez et jouez au Padel en Tunisie",
    template: "%s · Kifpadel",
  },
  description:
    "Kifpadel est la plateforme n°1 en Tunisie pour réserver un terrain de padel, trouver des partenaires et rejoindre des matchs ouverts dans les meilleurs clubs.",
  applicationName: "Kifpadel",
  manifest: "/manifest.webmanifest",
  alternates: {
    canonical: "/",
    languages: {
      fr: "/fr",
      en: "/en",
    },
  },
  openGraph: {
    type: "website",
    siteName: "Kifpadel",
    title: "Kifpadel — Réservez et jouez au Padel en Tunisie",
    description:
      "Réservez un terrain, trouvez des partenaires et rejoignez des matchs ouverts dans les meilleurs clubs de padel de Tunisie.",
    url: "/",
    locale: "fr_FR",
  },
  twitter: {
    card: "summary_large_image",
    title: "Kifpadel — Réservez et jouez au Padel en Tunisie",
    description:
      "Réservez un terrain, trouvez des partenaires et rejoignez des matchs ouverts dans les meilleurs clubs de padel de Tunisie.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <RegisterServiceWorker />
        {children}
      </body>
    </html>
  );
}

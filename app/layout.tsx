import type { Metadata } from "next";
import { IBM_Plex_Mono, Newsreader, Public_Sans } from "next/font/google";
import { LanguageProvider } from "./components/LanguageProvider";
import "./globals.css";

const publicSans = Public_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "500", "600", "700"],
});

const newsreader = Newsreader({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "500", "600", "700"],
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-tag",
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "HealthGuard — Bilingual Health Risk Assessment",
  description:
    "A bilingual (English/Tagalog) health risk assessment for rural communities. " +
    "Describe your symptoms and get a clear urgency guide. Not a medical diagnosis.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${publicSans.variable} ${newsreader.variable} ${ibmPlexMono.variable} h-full antialiased`}
    >
      <body className="premium-page flex min-h-full flex-col font-sans text-base leading-relaxed text-ink xl:text-lg">
        <LanguageProvider>{children}</LanguageProvider>
      </body>
    </html>
  );
}

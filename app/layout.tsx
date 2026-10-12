import type { Metadata } from "next";
import { IBM_Plex_Mono, Inter, Sora } from "next/font/google";
import { LanguageProvider } from "./components/LanguageProvider";
import SystemToast from "./components/SystemToast";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "500", "600", "700", "800"],
});

const sora = Sora({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "500", "600", "700", "800"],
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
      className={`${inter.variable} ${sora.variable} ${ibmPlexMono.variable} h-full antialiased`}
    >
      <body className="premium-page flex min-h-full flex-col font-sans text-base leading-relaxed text-ink xl:text-lg">
        <LanguageProvider>
          {children}
          <SystemToast />
        </LanguageProvider>
      </body>
    </html>
  );
}

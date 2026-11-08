import type { Metadata } from "next";
import { LanguageProvider } from "./components/LanguageProvider";
import SystemToast from "./components/SystemToast";
import "./globals.css";

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
    <html lang="en" className="h-full antialiased">
      <body className="premium-page flex min-h-full flex-col font-sans text-base leading-relaxed text-ink xl:text-lg">
        <LanguageProvider>
          {children}
          <SystemToast />
        </LanguageProvider>
      </body>
    </html>
  );
}

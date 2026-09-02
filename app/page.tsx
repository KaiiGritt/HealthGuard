"use client";

import Link from "next/link";
import { IconChat, IconPhone, IconSearch } from "@/app/components/ui/icons";
import { IconCircle, TagBadge } from "@/app/components/ui/primitives";
import { useInterfaceLanguage } from "@/app/components/LanguageProvider";
import Disclaimer from "./components/Disclaimer";
import PageHeader from "./components/PageHeader";

const STEPS = [
  {
    n: "01",
    title: "Describe how you feel",
    body: "Type in English or Tagalog, or tap the symptoms that match after signing in.",
  },
  {
    n: "02",
    title: "Rules check what you entered",
    body: "A transparent rule-based system compares your answers against known symptom patterns — no black box, no diagnosis.",
  },
  {
    n: "03",
    title: "Get your tag: green, yellow, or red",
    body: "The same colors health workers use, with one plain instruction for what to do next.",
  },
];

const FEATURES = [
  {
    icon: <IconChat size={22} />,
    title: "Speaks Tagalog and English",
    body: "Type the words you'd actually use at home — walang kunwari, tapat lang.",
  },
  {
    icon: <IconPhone size={22} />,
    title: "Built for simple phones",
    body: "Big buttons, short screens, and it stays usable on a slow connection.",
  },
  {
    icon: <IconSearch size={22} />,
    title: "Shows its reasoning",
    body: "Every result lists exactly which symptoms and rules led to your tag.",
  },
];

function TriageTag() {
  return (
    <div className="mx-auto w-full max-w-[260px] rotate-[-5deg] sm:max-w-[300px] lg:max-w-[340px] xl:max-w-[360px]">
      <svg viewBox="0 0 260 360" className="w-full">
        <path
          d="M130 4 L96 40 L96 44 L98 46 L162 46 L164 44 L164 40 Z"
          fill="none"
          stroke="#7C7F6E"
          strokeWidth="2"
        />
        <line x1="130" y1="4" x2="130" y2="46" stroke="#7C7F6E" strokeWidth="2" />
        <circle cx="130" cy="30" r="5" fill="none" stroke="#7C7F6E" strokeWidth="2" />

        <rect x="20" y="46" width="220" height="300" rx="6" fill="#FBF9F2" stroke="#1B2B22" strokeWidth="2" />
        <line x1="20" y1="46" x2="20" y2="346" stroke="#B9C0AC" strokeWidth="2" strokeDasharray="2 6" />

        <text x="46" y="80" fontFamily="var(--font-tag)" fontSize="12" fill="#7C7F6E" letterSpacing="1">
          FACED-TRIAGE
        </text>
        <text x="46" y="98" fontFamily="var(--font-tag)" fontSize="11" fill="#7C7F6E">
          NO. 000241
        </text>
        <line x1="46" y1="112" x2="214" y2="112" stroke="#DEDFD1" strokeWidth="1.5" />

        <text x="46" y="140" fontFamily="var(--font-display)" fontStyle="italic" fontSize="22" fill="#1B2B22">
          Your result
        </text>
        <text x="46" y="162" fontFamily="var(--font-body)" fontSize="12" fill="#5B5F52">
          will look like this tag
        </text>

        <rect x="46" y="190" width="168" height="34" fill="#3E8E41" />
        <text
          x="60"
          y="212"
          fontFamily="var(--font-tag)"
          fontSize="10.5"
          fill="#F1F4EC"
          textLength="134"
          lengthAdjust="spacingAndGlyphs"
        >
          GREEN — monitor at home
        </text>

        <g>
          <rect x="46" y="228" width="168" height="34" fill="#D98A2B" />
          <text
            x="60"
            y="250"
            fontFamily="var(--font-tag)"
            fontSize="10"
            fill="#4A3410"
            textLength="136"
            lengthAdjust="spacingAndGlyphs"
          >
            YELLOW — see a health worker
          </text>
        </g>

        <rect x="46" y="266" width="168" height="34" fill="#C0432B" />
        <text
          x="60"
          y="288"
          fontFamily="var(--font-tag)"
          fontSize="10.5"
          fill="#F1F4EC"
          textLength="128"
          lengthAdjust="spacingAndGlyphs"
        >
          RED — seek care now
        </text>

        <path
          d="M130 30 C 40 90, 210 140, 60 320"
          fill="none"
          stroke="#7C7F6E"
          strokeWidth="1.5"
          strokeDasharray="1 5"
        />
      </svg>
    </div>
  );
}

export default function Home() {
  const { language } = useInterfaceLanguage();
  const strings = {
    tag: "Para sa Irosin, Sorsogon",
    heading:
      language === "fil"
        ? "Hindi mo alam kung oras na bang pumunta sa health center?"
        : language === "both"
          ? "Not sure if it’s time to go to the health center? / Hindi mo alam kung oras na bang pumunta sa health center?"
          : "Not sure if it’s time to go to the health center?",
    subhead:
      language === "fil"
        ? "Ilarawan ang iyong mga sintomas sa Ingles o Tagalog. Makakakuha ka ng malinaw na tag — green, yellow, o red — at isang simpleng gabay kung ano ang susunod."
        : language === "both"
          ? "Describe your symptoms in English or Tagalog. You’ll get a clear tag — green, yellow, or red — and one plain instruction for what to do next. / Ilarawan ang iyong mga sintomas sa Ingles o Tagalog. Makakakuha ka ng malinaw na tag — green, yellow, o red — at isang simpleng gabay kung ano ang susunod."
          : "Describe your symptoms in English or Tagalog. You’ll get a clear tag — green, yellow, or red — and one plain instruction for what to do next.",
    cta:
      language === "fil"
        ? "Mag-log in para simulan"
        : language === "both"
          ? "Log in to start / Mag-log in para simulan"
          : "Log in to start",
    helper:
      language === "fil"
        ? "Mag-log in muna para i-save ang iyong health history"
        : language === "both"
          ? "Sign in first to save your health history / Mag-log in muna para i-save ang iyong health history"
          : "Sign in first to save your health history",
  } as const;

  return (
    <>
      <PageHeader />
      <main className="premium-page flex-1 text-ink">
        <section className="border-b border-border">
          <div className="mx-auto grid w-full max-w-[1600px] gap-8 px-5 py-14 sm:px-7 sm:py-18 md:grid-cols-[1.12fr_0.88fr] md:items-center lg:gap-12 lg:px-10 lg:py-24 xl:px-14 xl:py-28 2xl:px-20">
            <div className="relative overflow-hidden rounded-[28px] border border-[#DDE7DB] bg-[linear-gradient(135deg,rgba(255,255,255,0.94)_0%,rgba(251,252,249,0.9)_62%,rgba(241,245,238,0.88)_100%)] p-5 shadow-[0_24px_56px_rgba(24,38,25,0.09)] backdrop-blur-sm sm:p-7 lg:p-9 xl:p-10">
              <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-[#183D2D] via-[#2E6A52] to-[#C7B37A]" aria-hidden="true" />
              <TagBadge>{strings.tag}</TagBadge>
              <h1 className="mt-5 max-w-[16ch] font-sans font-semibold tracking-[-0.04em] text-[2.1rem] leading-[1.04] text-ink sm:text-[2.6rem] lg:text-[3.6rem] xl:text-[3.1rem] xl:leading-[1.08]">
                {strings.heading}
              </h1>
              <p className="mt-5 max-w-md text-[0.98rem] leading-relaxed text-ink-secondary sm:text-lg lg:max-w-lg lg:text-xl">
                {strings.subhead}
              </p>
              <div className="mt-6 flex items-center gap-2 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-faint" aria-label="Three-level triage guidance">
                <span className="h-2 w-2 rounded-full bg-triage-green" />
                <span className="h-2 w-2 rounded-full bg-triage-yellow" />
                <span className="h-2 w-2 rounded-full bg-triage-red" />
                <span className="ml-1">Clear triage guidance</span>
              </div>
              <div className="mt-8 flex flex-col items-start gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                <Link
                  href="/login?next=/assessment"
                  className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-brand/15 bg-gradient-to-r from-brand to-brand-light px-5 text-base font-semibold tracking-[0.01em] text-brand-foreground shadow-[0_12px_28px_rgba(47,107,79,0.18)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_32px_rgba(47,107,79,0.22)] sm:w-auto sm:min-h-[3.2rem] sm:px-7 sm:text-lg lg:min-h-[3.45rem] lg:px-8 lg:text-xl"
                >
                  {strings.cta}
                </Link>
                <span className="text-xs font-medium text-ink-muted sm:text-sm lg:text-base">{strings.helper}</span>
              </div>
            </div>
            <div className="flex justify-center md:justify-end">
              <TriageTag />
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-[1600px] px-5 py-16 sm:px-7 lg:px-10 lg:py-24 xl:px-14 2xl:px-20">
          <h2 className="font-display text-2xl lg:text-3xl">How it works</h2>
          <div className="mt-8 grid gap-5 md:grid-cols-3 lg:mt-12 lg:gap-8">
            {STEPS.map((s) => (
              <div key={s.n} className="group relative rounded-2xl border border-[#DDE7DB] bg-[linear-gradient(180deg,#FFFFFF_0%,#F7FAF4_100%)] p-6 pt-8 shadow-[0_12px_28px_rgba(24,38,25,0.045)] transition duration-200 hover:-translate-y-0.5 hover:border-brand/25 hover:shadow-[0_18px_34px_rgba(31,74,54,0.09)] lg:p-8 lg:pt-10">
                <span className="absolute -top-3 left-6 rounded-sm bg-ink px-2 py-0.5 font-mono text-xs text-brand-foreground">
                  {s.n}
                </span>
                <h3 className="mt-3 text-xl font-medium lg:text-2xl">{s.title}</h3>
                <p className="mt-3 text-base leading-relaxed text-ink-muted lg:text-lg">{s.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="border-y border-[#D8E2D3] bg-[linear-gradient(180deg,rgba(255,255,255,0.72)_0%,rgba(241,245,238,0.82)_100%)]">
          <div className="mx-auto grid w-full max-w-[1600px] gap-4 px-5 py-12 sm:grid-cols-3 sm:gap-5 lg:gap-6 lg:px-10 lg:py-20 xl:px-14 2xl:px-20">
            {FEATURES.map((f, index) => (
              <div key={f.title} className="group relative rounded-2xl border border-[#DDE7DB] bg-white/75 p-5 shadow-[0_12px_28px_rgba(24,38,25,0.04)] backdrop-blur-sm transition duration-200 hover:-translate-y-0.5 hover:border-brand/25 hover:bg-white hover:shadow-[0_18px_34px_rgba(31,74,54,0.09)] lg:p-7">
                <div className="absolute inset-x-0 top-0 h-1 rounded-t-2xl bg-gradient-to-r from-[#183D2D] via-[#2E6A52] to-[#C7B37A] opacity-70" aria-hidden="true" />
                <div className="flex items-center justify-between gap-3">
                  <IconCircle>{f.icon}</IconCircle>
                  <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-faint">0{index + 1}</span>
                </div>
                <h3 className="mt-5 text-lg font-semibold text-ink lg:text-xl">{f.title}</h3>
                <p className="mt-2 text-base leading-relaxed text-ink-muted lg:text-lg">{f.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto w-full max-w-[1600px] px-5 py-14 sm:px-7 lg:px-10 lg:py-20 xl:px-14 2xl:px-20">
          <Disclaimer />
        </section>
      </main>

      <footer className="border-t border-border bg-surface py-6 text-center text-sm text-ink-muted lg:py-8 lg:text-base">
        HealthGuard — a health decision-support tool. Not a substitute for professional care.
      </footer>
    </>
  );
}

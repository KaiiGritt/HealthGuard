"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { IconChat, IconPhone, IconSearch } from "@/app/components/ui/icons";
import { IconCircle, TagBadge } from "@/app/components/ui/primitives";
import { localizedText, useInterfaceLanguage } from "@/app/components/LanguageProvider";
import { getMe } from "@/lib/api";
import Disclaimer from "./components/Disclaimer";
import PageHeader from "./components/PageHeader";

const STEPS = [
  {
    n: "01",
    title: "Describe how you feel",
    titleFil: "Ilarawan ang iyong nararamdaman",
    body: "Type in English, Tagalog, or Bikol, or tap the symptoms that match after signing in.",
    bodyFil: "Mag-type sa Ingles, Tagalog, o Bikol, o piliin ang mga sintomas na tumutugma pagkatapos mag-sign in.",
  },
  {
    n: "02",
    title: "Rules check what you entered",
    titleFil: "Sinusuri ng mga tuntunin ang iyong inilagay",
    body: "A transparent rule-based system compares your answers against known symptom patterns — no black box, no diagnosis.",
    bodyFil: "Inihahambing ng malinaw na sistemang nakabatay sa mga tuntunin ang iyong sagot sa mga pattern ng sintomas — walang black box at walang diagnosis.",
  },
  {
    n: "03",
    title: "Get your tag: green, yellow, or red",
    titleFil: "Alamin ang iyong gabay: berde, dilaw, o pula",
    body: "The same colors health workers use, with one plain instruction for what to do next.",
    bodyFil: "Gamit ang mga kulay na gabay, makakakita ka ng malinaw na susunod na hakbang.",
  },
];

const FEATURES = [
  {
    icon: <IconChat size={22} />,
    title: "Speaks Tagalog and English",
    titleFil: "May Tagalog at Ingles",
    body: "Type the words you'd actually use at home — walang kunwari, tapat lang.",
    bodyFil: "I-type ang mga salitang karaniwan mong ginagamit sa bahay — simple at malinaw.",
  },
  {
    icon: <IconPhone size={22} />,
    title: "Built for simple phones",
    titleFil: "Dinisenyo para sa mga karaniwang telepono",
    body: "Big buttons, short screens, and it stays usable on a slow connection.",
    bodyFil: "Malalaking button, maiikling screen, at madaling gamitin kahit mabagal ang koneksyon.",
  },
  {
    icon: <IconSearch size={22} />,
    title: "Shows its reasoning",
    titleFil: "Ipinapakita kung paano nabuo ang resulta",
    body: "Every result lists exactly which symptoms and rules led to your tag.",
    bodyFil: "Makikita sa bawat resulta kung aling mga sintomas at tuntunin ang ginamit sa pag-uuri.",
  },
];

function TriageTag({ language }: { language: "en" | "fil" | "both" }) {
  const text = (english: string, filipino: string) => localizedText(language, english, filipino);

  return (
    <div className="hero-visual-enter relative mx-auto w-full max-w-[440px] px-3 py-5 sm:px-7 sm:py-8 lg:ml-auto lg:max-w-[500px]">
      <div className="absolute inset-5 rounded-[2.5rem] bg-[#2F6B4F]/10 blur-2xl sm:inset-8" aria-hidden="true" />
      <div className="absolute right-8 top-2 h-24 w-24 rounded-full border border-[#C7B37A]/35 sm:right-12 sm:top-4 sm:h-32 sm:w-32" aria-hidden="true" />
      <div className="absolute bottom-8 left-0 h-20 w-20 rounded-full border border-[#2F6B4F]/15 sm:bottom-10 sm:left-3 sm:h-28 sm:w-28" aria-hidden="true" />

      <div
        role="img"
        aria-label={text(
          "Example HealthGuard result showing green, yellow, and red care guidance",
          "Halimbawa ng resulta ng HealthGuard na nagpapakita ng gabay na berde, dilaw, at pula",
        )}
        className="hero-result-card relative overflow-hidden rounded-[1.75rem] border border-white/80 bg-white/95 p-5 shadow-[0_32px_80px_rgba(24,38,25,0.16)] ring-1 ring-[#D8E2D3]/70 backdrop-blur sm:rounded-[2rem] sm:p-7"
      >
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#2F6B4F] via-[#80A88A] to-[#C7B37A]" aria-hidden="true" />
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#EDF5EE] text-[#2F6B4F]">
              <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
                <path d="M12 3.5 19 6v5.3c0 4.1-2.7 7.6-7 9.2-4.3-1.6-7-5.1-7-9.2V6l7-2.5Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
                <path d="m9 12 2 2 4-4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <div>
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-faint">HealthGuard</p>
              <p className="mt-0.5 text-xs font-medium text-ink-muted">{text("Assessment preview", "Halimbawa ng resulta")}</p>
            </div>
          </div>
          <span className="rounded-full border border-[#E5E8DF] bg-[#F8FAF6] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-muted">{text("Example", "Halimbawa")}</span>
        </div>

        <div className="my-6 h-px bg-[#E8ECE5] sm:my-7" />
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-ink-muted">{text("Your care guide", "Gabay sa pangangalaga")}</p>
            <h2 className="mt-1 font-display text-2xl font-semibold tracking-[-0.04em] text-ink sm:text-[1.75rem]">{text("A clear next step.", "Malinaw ang susunod na hakbang.")}</h2>
          </div>
          <span className="mt-1 inline-flex items-center gap-1.5 rounded-full border border-[#CFE5D4] bg-[#F0F8F1] px-3 py-1.5 text-xs font-bold tracking-[0.08em] text-[#25633B]">
            <span className="hero-status-indicator h-1.5 w-1.5 rounded-full bg-[#3E8E41]" />
            {text("GREEN", "BERDE")}
          </span>
        </div>

        <div className="mt-5 rounded-2xl border border-[#CFE5D4] bg-[linear-gradient(135deg,#F4FAF4_0%,#EBF5EC_100%)] p-4 sm:p-5">
          <p className="text-base font-semibold text-[#214E31]">{text("Monitor at home", "Mag-monitor sa bahay")}</p>
          <p className="mt-1 text-sm leading-relaxed text-[#4F6652]">{text("Simple guidance helps you decide what to do next.", "Makakatulong ang gabay na ito sa pagpapasya kung ano ang susunod na gagawin.")}</p>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-2">
          {[
            { color: "bg-[#3E8E41]", text: text("Monitor", "Mag-monitor") },
            { color: "bg-[#D98A2B]", text: text("Consult", "Kumonsulta") },
            { color: "bg-[#C0432B]", text: text("Urgent care", "Agarang pangangalaga") },
          ].map((level) => (
            <div key={level.text} className="flex min-h-[3.25rem] items-center justify-center gap-1.5 rounded-xl border border-[#E7EBE4] bg-white px-2 py-2 text-center">
              <span className={`h-2 w-2 shrink-0 rounded-full ${level.color}`} aria-hidden="true" />
              <span className="text-[11px] font-medium leading-tight text-ink-secondary sm:text-xs">{level.text}</span>
            </div>
          ))}
        </div>
        <p className="mt-4 text-center text-[11px] leading-relaxed text-ink-faint">{text("Preliminary guidance only · Not a medical diagnosis", "Paunang gabay lamang · Hindi ito medikal na diagnosis")}</p>
      </div>

      <div className="hero-result-notification absolute -left-1 bottom-2 hidden items-center gap-2 rounded-2xl border border-white bg-white/95 px-4 py-3 text-xs font-medium text-ink-secondary shadow-[0_12px_30px_rgba(24,38,25,0.12)] sm:flex">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#F2F6EF] text-[#2F6B4F]">
          <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden="true">
            <path d="M10 2.5 16 4.6v4.5c0 3.5-2.3 6.5-6 7.9-3.7-1.4-6-4.4-6-7.9V4.6l6-2.1Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
            <path d="m7.5 9.8 1.7 1.7 3.5-3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        {text("Clear, transparent guidance", "Malinaw at transparent na gabay")}
      </div>
    </div>
  );
}

export default function Home() {
  const router = useRouter();
  const { language } = useInterfaceLanguage();

  useEffect(() => {
    let active = true;
    getMe().then((currentUser) => {
      if (!active) return;
      if (currentUser?.role === "admin") {
        router.replace("/admin");
        return;
      }
      if (currentUser?.role === "mho") {
        router.replace("/dashboard");
        return;
      }
    }).catch(() => {
    });
    return () => {
      active = false;
    };
  }, [router]);

  const strings = {
    tag: localizedText(language, "Irosin community health guide", "Gabay pangkalusugan ng komunidad ng Irosin"),
    heading: localizedText(language, "Know what to do next.", "Alamin ang susunod na dapat gawin."),
    subhead: localizedText(
      language,
      "Describe your symptoms in English, Tagalog, or Bikol. Get a clear next step: monitor, consult, or seek urgent help.",
      "Ilarawan ang iyong mga sintomas sa Ingles, Tagalog, o Bikol. Alamin kung dapat mag-monitor, kumonsulta, o humingi agad ng tulong.",
    ),
    cta: localizedText(language, "Start Assessment", "Simulan ang pagsusuri"),
    helper: localizedText(
      language,
      "Start without an account. Save your result later if you choose.",
      "Magsimula nang walang account. Maaari mong i-save ang resulta kapag pinili mo.",
    ),
    triage: localizedText(language, "Three-level triage guidance", "Tatlong antas ng gabay sa pangangalaga"),
    process: localizedText(language, "A simple process", "Isang simpleng proseso"),
    howItWorks: localizedText(language, "How it works", "Paano ito gumagana"),
    processDescription: localizedText(
      language,
      "A few clear steps to help you choose what to do next.",
      "Ilang malinaw na hakbang upang matulungan kang magpasya kung ano ang susunod na gagawin.",
    ),
    footer: localizedText(
      language,
      "a health decision-support tool. Not a substitute for professional care.",
      "isang kasangkapan sa paggabay sa pagpapasya tungkol sa kalusugan. Hindi kapalit ng propesyonal na pangangalaga.",
    ),
  } as const;

  return (
    <>
      <PageHeader />
      <main className="premium-page flex-1 text-ink">
        <section className="relative isolate overflow-hidden border-b border-[#D8E2D3] bg-[linear-gradient(135deg,rgba(250,252,248,0.96)_0%,rgba(241,247,240,0.92)_52%,rgba(234,242,233,0.92)_100%)]">
          <div className="pointer-events-none absolute -left-40 top-0 h-[34rem] w-[34rem] rounded-full bg-[#D9E9D9]/40 blur-3xl" aria-hidden="true" />
          <div className="pointer-events-none absolute right-[-8rem] top-[-7rem] h-[28rem] w-[28rem] rounded-full bg-[#E7DFC9]/35 blur-3xl" aria-hidden="true" />
          <div className="relative mx-auto grid w-full max-w-[1600px] gap-5 px-5 pb-12 pt-12 sm:px-7 sm:pb-16 sm:pt-16 md:grid-cols-[1.05fr_0.95fr] md:items-center lg:gap-10 lg:px-10 lg:py-20 xl:gap-16 xl:px-14 xl:py-24 2xl:px-20">
            <div className="relative z-10 py-3 sm:py-5 lg:py-8">
              <TagBadge>{strings.tag}</TagBadge>
              <h1 className="brand-wordmark mt-6 max-w-[13ch] text-[2.65rem] text-ink sm:text-[3.4rem] lg:text-[4.25rem] xl:text-[4.7rem] xl:leading-[1.02]">
                {strings.heading}
              </h1>
              <p className="mt-6 max-w-xl text-base leading-relaxed text-ink-secondary sm:text-lg lg:mt-7 lg:text-xl lg:leading-[1.75]">
                {strings.subhead}
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs font-medium text-ink-muted sm:mt-7 sm:text-sm" aria-label={strings.triage}>
                <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-triage-green ring-4 ring-[#3E8E41]/10" />{localizedText(language, "Monitor", "Mag-monitor")}</span>
                <span className="h-4 w-px bg-[#CBD7C9]" aria-hidden="true" />
                <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-triage-yellow ring-4 ring-[#D98A2B]/10" />{localizedText(language, "Consult", "Kumonsulta")}</span>
                <span className="h-4 w-px bg-[#CBD7C9]" aria-hidden="true" />
                <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-triage-red ring-4 ring-[#C0432B]/10" />{localizedText(language, "Urgent care", "Agarang pangangalaga")}</span>
              </div>
              <div className="mt-8 flex flex-col items-start gap-4 sm:mt-9 sm:flex-row sm:flex-wrap sm:items-center">
                <Link
                  href="/assessment"
                  className="group relative inline-flex min-h-12 w-full items-center justify-center overflow-hidden rounded-2xl border border-[#2F6B4F]/20 bg-[linear-gradient(135deg,#285D45_0%,#2F6B4F_38%,#3B7B5A_100%)] px-6 text-base font-semibold tracking-[0.01em] text-brand-foreground shadow-[0_16px_34px_rgba(47,107,79,0.22)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_20px_40px_rgba(47,107,79,0.28)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#2F6B4F]/20 sm:w-auto sm:min-h-[3.35rem] sm:px-7 sm:text-lg"
                >
                  <span className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.28),transparent_42%)] opacity-90" aria-hidden="true" />
                  <span className="relative inline-flex items-center gap-2">
                    <span>{strings.cta}</span>
                    <svg
                      viewBox="0 0 20 20"
                      aria-hidden="true"
                      className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M4.166 10h11.668" />
                      <path d="M10 4.167 15.833 10 10 15.833" />
                    </svg>
                  </span>
                </Link>
                <span className="max-w-[18rem] text-xs leading-relaxed text-ink-muted sm:text-sm">{strings.helper}</span>
              </div>
            </div>
            <div className="relative flex justify-center md:justify-end">
              <TriageTag language={language} />
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-[1600px] px-5 py-16 sm:px-7 lg:px-10 lg:py-24 xl:px-14 2xl:px-20">
          <div className="mb-9 flex flex-wrap items-end justify-between gap-4 lg:mb-12">
            <div>
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-brand">{strings.process}</p>
              <h2 className="mt-2 font-display text-2xl font-semibold tracking-[-0.035em] text-ink lg:text-3xl">{strings.howItWorks}</h2>
            </div>
            <p className="max-w-sm text-sm leading-relaxed text-ink-muted lg:text-base">{strings.processDescription}</p>
          </div>
          <div className="mt-8 grid gap-5 md:grid-cols-3 lg:mt-12 lg:gap-8">
            {STEPS.map((s) => (
              <div key={s.n} className="group relative rounded-[1.5rem] border border-[#DDE7DB] bg-[linear-gradient(180deg,#FFFFFF_0%,#F7FAF4_100%)] p-6 shadow-[0_14px_34px_rgba(24,38,25,0.055)] transition duration-200 hover:-translate-y-1 hover:border-brand/25 hover:shadow-[0_22px_42px_rgba(31,74,54,0.1)] lg:p-8">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[#DCE8DC] bg-[#F1F7F1] font-mono text-xs font-semibold tracking-wide text-brand">
                  {s.n}
                </span>
                <h3 className="mt-5 text-lg font-semibold tracking-[-0.02em] text-ink lg:text-xl">{localizedText(language, s.title, s.titleFil)}</h3>
                <p className="mt-3 text-sm leading-relaxed text-ink-muted lg:text-base">{localizedText(language, s.body, s.bodyFil)}</p>
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
                <h3 className="mt-5 text-lg font-semibold text-ink lg:text-xl">{localizedText(language, f.title, f.titleFil)}</h3>
                <p className="mt-2 text-base leading-relaxed text-ink-muted lg:text-lg">{localizedText(language, f.body, f.bodyFil)}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto w-full max-w-[1600px] px-5 py-14 sm:px-7 lg:px-10 lg:py-20 xl:px-14 2xl:px-20">
          <Disclaimer />
        </section>
      </main>

      <footer className="border-t border-border bg-[linear-gradient(180deg,#F4F7F0_0%,#EEF3EA_100%)] py-6 text-center text-sm text-ink-muted lg:py-8 lg:text-base">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-center gap-2 px-5 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#DDE7DB] bg-white/75 px-2.5 py-1 shadow-[0_8px_22px_rgba(31,74,54,0.06)] backdrop-blur-sm">
            <span className="h-2.5 w-2.5 rounded-full bg-[linear-gradient(135deg,#183D2D_0%,#2E6A52_45%,#C3B27A_100%)] shadow-[0_0_0_3px_rgba(46,106,82,0.12)]" aria-hidden="true" />
            <span className="font-semibold tracking-[0.08em] text-ink-secondary uppercase">HealthGuard</span>
          </span>
          <span className="hidden text-ink-faint sm:inline">•</span>
          <span className="text-ink-muted">{strings.footer}</span>
        </div>
      </footer>
    </>
  );
}

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
import HeroCard3D from "./components/HeroCard3D";

const STEPS = [
  {
    n: "01",
    title: "Describe how you feel",
    titleFil: "Ilarawan ang iyong nararamdaman",
    body: "Choose the symptoms that match, add when they started, or describe them in your own words.",
    bodyFil: "Piliin ang mga sintomas, ilagay kung kailan nagsimula, o ilarawan ito sa sarili mong mga salita.",
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
  return <HeroCard3D language={language} />;
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
      "No account needed to begin.",
      "Hindi kailangan ng account para magsimula.",
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
      <main id="main-content" className="premium-page flex-1 text-ink">
        <section className="relative isolate overflow-hidden border-b border-[#D8E2D3] bg-[linear-gradient(135deg,rgba(250,252,248,0.96)_0%,rgba(241,247,240,0.92)_52%,rgba(234,242,233,0.92)_100%)]">
          <div className="pointer-events-none absolute -left-40 top-0 h-[34rem] w-[34rem] rounded-full bg-[#D9E9D9]/40 blur-3xl" aria-hidden="true" />
          <div className="pointer-events-none absolute right-[-8rem] top-[-7rem] h-[28rem] w-[28rem] rounded-full bg-[#E7DFC9]/35 blur-3xl" aria-hidden="true" />
          <div className="relative mx-auto grid w-full max-w-[1600px] gap-7 px-5 pb-12 pt-10 sm:gap-9 sm:px-7 sm:pb-16 sm:pt-14 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-10 lg:px-10 lg:py-20 xl:gap-16 xl:px-14 xl:py-24 2xl:px-20">
            <div className="relative z-10 py-3 sm:py-5 lg:py-8">
              <TagBadge>{strings.tag}</TagBadge>
              <h1 className="brand-wordmark mt-6 max-w-[13ch] text-[2.65rem] text-ink sm:text-[3.4rem] lg:text-[4.25rem] xl:text-[4.7rem] xl:leading-[1.02]">
                {strings.heading}
              </h1>
              <p className="mt-6 max-w-xl text-base leading-relaxed text-ink-secondary sm:text-lg lg:mt-7 lg:text-xl lg:leading-[1.75]">
                {strings.subhead}
              </p>
              <div className="mt-6 max-w-xl sm:mt-7" aria-label={strings.triage}>
                <div className="mb-2.5 flex items-center justify-between gap-3">
                  <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-ink-muted">
                    {localizedText(language, "Care guidance", "Gabay sa pangangalaga")}
                  </p>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-[#DDE7DB] bg-white/70 px-2.5 py-1 text-[10px] font-medium text-ink-faint shadow-[0_3px_10px_rgba(24,38,25,0.035)]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#2F6B4F]" aria-hidden="true" />
                    {localizedText(language, "3 clear levels", "3 antas ng gabay")}
                  </span>
                </div>
                <ul className="grid grid-cols-3 gap-2" aria-label={strings.triage}>
                  {[
                    {
                      number: "01",
                      title: localizedText(language, "Monitor", "Mag-monitor"),
                      description: localizedText(language, "At home", "Sa bahay"),
                      color: "border-[#D7E7D7] bg-[linear-gradient(145deg,#F7FBF6,#EEF6EE)]",
                      accent: "bg-[#3E8E41]",
                      halo: "ring-[#3E8E41]/10",
                    },
                    {
                      number: "02",
                      title: localizedText(language, "Consult", "Kumonsulta"),
                      description: localizedText(language, "Health worker", "Health worker"),
                      color: "border-[#EEE3CD] bg-[linear-gradient(145deg,#FCFAF4,#F8F1E3)]",
                      accent: "bg-[#D98A2B]",
                      halo: "ring-[#D98A2B]/10",
                    },
                    {
                      number: "03",
                      title: localizedText(language, "Urgent care", "Agarang tulong"),
                      description: localizedText(language, "Get help now", "Humingi ng tulong"),
                      color: "border-[#EBD8D3] bg-[linear-gradient(145deg,#FCF7F5,#F8ECE8)]",
                      accent: "bg-[#C0432B]",
                      halo: "ring-[#C0432B]/10",
                    },
                  ].map((level) => (
                    <li
                      key={level.number}
                      className={`relative min-w-0 overflow-hidden rounded-xl border px-2.5 py-2.5 shadow-[0_5px_15px_rgba(24,38,25,0.035),inset_0_1px_0_rgba(255,255,255,0.8)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_10px_20px_rgba(24,38,25,0.07)] sm:rounded-2xl sm:px-3 sm:py-3 ${level.color}`}
                    >
                      <span className={`absolute inset-x-0 top-0 h-[2px] ${level.accent}`} aria-hidden="true" />
                      <div className="flex items-center justify-between gap-1">
                        <span className={`h-2 w-2 shrink-0 rounded-full ${level.accent} ring-4 ${level.halo}`} aria-hidden="true" />
                        <span className="font-mono text-[9px] font-semibold tracking-[0.08em] text-ink-faint/80">{level.number}</span>
                      </div>
                      <p className="mt-2 truncate text-[11px] font-semibold leading-tight text-ink sm:text-xs">
                        {level.title}
                      </p>
                      <p className="mt-0.5 break-words text-[9px] leading-snug text-ink-muted sm:text-[10px]">
                        {level.description}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mt-7 flex flex-col items-start gap-3 sm:mt-9 sm:flex-row sm:flex-wrap sm:items-center">
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
                <span className="inline-flex max-w-[18rem] items-center gap-2 text-xs font-medium leading-relaxed text-ink-muted sm:text-sm">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[#D7E5D7] bg-white/80 text-brand shadow-[0_3px_8px_rgba(47,107,79,0.07)]" aria-hidden="true">
                    <svg viewBox="0 0 20 20" fill="none" className="h-3.5 w-3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m5 10 3.2 3.2L15.5 6" />
                    </svg>
                  </span>
                  {strings.helper}
                </span>
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
          <div className="relative mt-8 grid gap-5 md:grid-cols-3 lg:mt-12 lg:gap-8 before:absolute before:left-[16%] before:right-[16%] before:top-[43px] before:hidden before:h-px before:bg-gradient-to-r before:from-[#D8E5D6] before:via-[#AFC9B1] before:to-[#D8E5D6] before:content-[''] md:before:block">
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

        <section className="relative overflow-hidden border-b border-[#D8E2D3] bg-[linear-gradient(135deg,#F7FAF5_0%,#EEF4EC_55%,#F5F2E9_100%)]" aria-labelledby="trust-heading">
          <div className="pointer-events-none absolute -right-20 top-0 h-64 w-64 rounded-full bg-[#D9E9D9]/40 blur-3xl" aria-hidden="true" />
          <div className="relative mx-auto w-full max-w-[1600px] px-5 py-12 sm:px-7 lg:px-10 lg:py-16 xl:px-14 2xl:px-20">
            <div className="max-w-2xl">
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-brand">
                {localizedText(language, "Designed for clarity", "Dinisenyo para maging malinaw")}
              </p>
              <h2 id="trust-heading" className="mt-2 font-display text-2xl font-semibold tracking-[-0.035em] text-ink lg:text-3xl">
                {localizedText(language, "Clear guidance, with honest limits.", "Malinaw na gabay, may tapat na hangganan.")}
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-ink-muted sm:text-base">
                {localizedText(language, "HealthGuard supports your next-step decision. It does not replace a health worker or provide a medical diagnosis.", "Tumutulong ang HealthGuard sa pagpapasya ng susunod na hakbang. Hindi ito kapalit ng health worker o medikal na diagnosis.")}
              </p>
            </div>
            <div className="mt-7 grid gap-3 sm:grid-cols-3 sm:gap-4">
              {[
                {
                  number: "01",
                  title: localizedText(language, "Rule-based guidance", "Gabay na batay sa tuntunin"),
                  body: localizedText(language, "Your answers are checked against defined symptom guidance rules.", "Inihahambing ang iyong mga sagot sa mga itinakdang tuntunin para sa mga sintomas."),
                  icon: "M12 3.5 19 6v5.3c0 4.1-2.7 7.6-7 9.2-4.3-1.6-7-5.1-7-9.2V6l7-2.5Z",
                },
                {
                  number: "02",
                  title: localizedText(language, "A preliminary guide", "Paunang gabay"),
                  body: localizedText(language, "The result is a starting point for deciding what to do next—not a diagnosis.", "Panimulang gabay ang resulta sa pagpapasya ng susunod na hakbang—hindi diagnosis."),
                  icon: "M12 8v4l2.5 2.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
                },
                {
                  number: "03",
                  title: localizedText(language, "People come first", "Unahin ang kaligtasan"),
                  body: localizedText(language, "If symptoms are severe or getting worse, contact a qualified health worker.", "Kung malubha o lumalala ang sintomas, makipag-ugnayan sa kwalipikadong health worker."),
                  icon: "M12 3.5 19 6v5.3c0 4.1-2.7 7.6-7 9.2-4.3-1.6-7-5.1-7-9.2V6l7-2.5Z",
                },
              ].map((item) => (
                <article key={item.number} className="rounded-2xl border border-[#DDE7DB] bg-white/80 p-4 shadow-[0_10px_26px_rgba(24,38,25,0.045)] backdrop-blur-sm sm:p-5">
                  <div className="flex items-center justify-between gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#DCE8DC] bg-[#F1F7F1] text-brand">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
                        <path d={item.icon} />
                      </svg>
                    </span>
                    <span className="font-mono text-[10px] font-semibold tracking-[0.14em] text-ink-faint">{item.number}</span>
                  </div>
                  <h3 className="mt-4 text-sm font-semibold tracking-[-0.01em] text-ink sm:text-base">{item.title}</h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-ink-muted sm:text-sm">{item.body}</p>
                </article>
              ))}
            </div>
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

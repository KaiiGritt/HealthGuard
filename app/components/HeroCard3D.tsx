"use client";

import { useEffect, useState } from "react";
import styles from "./HeroCard3D.module.css";
import { SYMPTOMS } from "../assessment/symptoms";
import { localizedText, type InterfaceLanguage } from "./LanguageProvider";

type Scene = {
  lang: string;
  tag: "green" | "yellow" | "red";
  level: number;
  text: string;
  selectedSymptoms: string[];
  duration: string;
  reasons: string[];
  title: string;
  sub: string;
};

const SCENES: Scene[] = [
  {
    lang: "EN",
    tag: "green",
    level: 0,
    text: "Mild headache and runny nose since this morning, no fever.",
    selectedSymptoms: ["headache", "colds / rhinitis"],
    duration: "Less than 24 hours ago",
    reasons: ["Symptoms are mild", "No fever or breathing trouble", "Started less than 1 day ago"],
    title: "Monitor at home",
    sub: "Rest and drink fluids. Check again if it gets worse.",
  },
  {
    lang: "TL",
    tag: "yellow",
    level: 1,
    text: "Mataas ang lagnat ng anak ko at may ubo na 3 araw na.",
    selectedSymptoms: ["fever", "cough"],
    duration: "3–7 days ago",
    reasons: ["Fever lasting 3 days", "Cough with fever", "Patient is a child"],
    title: "Consult a health worker",
    sub: "Visit your barangay health center within 24 hours.",
  },
  {
    lang: "BIK",
    tag: "red",
    level: 2,
    text: "Hinihingal ako asin masakit an dughan ko.",
    selectedSymptoms: ["difficulty breathing"],
    duration: "Less than 24 hours ago",
    reasons: ["Difficulty breathing", "Chest pain", "Matches an emergency rule"],
    title: "Seek urgent care now",
    sub: "Go to the nearest hospital or call for emergency help.",
  },
];

const PILLS = ["Monitor", "Consult", "Urgent care"];
const PREVIEW_SYMPTOMS = [
  "fever",
  "cough",
  "headache",
  "colds / rhinitis",
  "difficulty breathing",
  "abdominal pain",
];
const DURATION_OPTIONS = ["Less than 24 hours ago", "1–2 days ago", "3–7 days ago"];
const TYPE_DELAY = 34;
const CHIP_DELAY = 430;
const RESULT_DELAY = 4300;

export default function HeroCard3D({ language }: { language: InterfaceLanguage }) {
  const text = (english: string, filipino: string) => localizedText(language, english, filipino);
  const [sceneIndex, setSceneIndex] = useState(0);
  const [typed, setTyped] = useState("");
  const [visibleReasons, setVisibleReasons] = useState(0);
  const [phase, setPhase] = useState<"typing" | "checking" | "result">("typing");

  const scene = SCENES[sceneIndex];

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    let cancelled = false;

    const schedule = (callback: () => void, delay: number) => {
      timer = setTimeout(() => {
        if (!cancelled) callback();
      }, delay);
    };

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      schedule(() => {
        setTyped(SCENES[0].text);
        setVisibleReasons(SCENES[0].reasons.length);
        setPhase("result");
      }, 0);
      return () => {
        cancelled = true;
        clearTimeout(timer);
      };
    }

    const typeText = (index: number, character: number) => {
      if (cancelled) return;
      const current = SCENES[index];
      setTyped(current.text.slice(0, character));

      if (character < current.text.length) {
        schedule(() => typeText(index, character + 1), TYPE_DELAY);
        return;
      }

      setPhase("checking");
      revealReason(index, 0);
    };

    const revealReason = (index: number, count: number) => {
      if (cancelled) return;
      setVisibleReasons(count);

      if (count < SCENES[index].reasons.length) {
        schedule(() => revealReason(index, count + 1), CHIP_DELAY);
        return;
      }

      schedule(() => {
        setPhase("result");
        schedule(() => {
          const nextIndex = (index + 1) % SCENES.length;
          setSceneIndex(nextIndex);
          setTyped("");
          setVisibleReasons(0);
          setPhase("typing");
          schedule(() => typeText(nextIndex, 1), 650);
        }, RESULT_DELAY);
      }, 500);
    };

    schedule(() => typeText(0, 1), 650);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  return (
    <div className={styles.stage}>
      <div className={styles.float}>
        <article
          className={styles.card}
          data-tag={scene.tag}
          aria-label={text("Sample assessment preview, not your personal result", "Halimbawa lamang ng pagsusuri, hindi ito ang iyong personal na resulta")}
        >
          <div className={styles.accent} aria-hidden="true" />
          <div className={styles.top}>
            <div className={styles.brand}>
              <span className={styles.brandIcon} aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none">
                  <path d="M12 3.5 19 6v5.3c0 4.1-2.7 7.6-7 9.2-4.3-1.6-7-5.1-7-9.2V6l7-2.5Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
                  <path d="m9 12 2 2 4-4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <div>
                <p className={styles.brandName}>HealthGuard</p>
                <p className={styles.eyebrow}>Assessment preview</p>
              </div>
            </div>
            <div className={styles.headerBadges}>
              <span className={styles.demoBadge}>{text("Sample", "Halimbawa")}</span>
              <span className={styles.lang}>{scene.lang}</span>
            </div>
          </div>

          <div className={styles.divider} />

          <div className={styles.titleRow}>
            <div>
              <p className={styles.kicker}>{text("Your care guide", "Gabay sa pangangalaga")}</p>
              <h2>{text("A clear next step.", "Malinaw ang susunod na hakbang.")}</h2>
            </div>
            <span className={styles.badge}>
              <i className={styles.dot} aria-hidden="true" />
              {text(scene.tag, scene.tag === "green" ? "Berde" : scene.tag === "yellow" ? "Dilaw" : "Pula")}
            </span>
          </div>

          <div className={styles.symptomStep}>
            <div className={styles.stepHeading}>
              <span className={styles.stepNumber}>1</span>
              <div>
                <p className={styles.stepEyebrow}>{text("Step 1", "Hakbang 1")}</p>
                <h3 className={styles.stepTitle}>{text("Select Your Symptoms", "Piliin ang iyong mga sintomas")}</h3>
                <p className={styles.stepHint}>{text("Tap what you’re feeling, then choose when it started.", "Piliin ang nararamdaman mo at kung kailan ito nagsimula.")}</p>
              </div>
            </div>
            <div className={styles.symptomChoices} aria-label={text("Example symptoms from the assessment", "Mga halimbawang sintomas sa pagsusuri")}>
              {PREVIEW_SYMPTOMS.map((value) => {
                const symptom = SYMPTOMS.find((option) => option.value === value);
                if (!symptom) return null;
                const selected = scene.selectedSymptoms.includes(value);
                const label = scene.lang === "TL" ? symptom.tl : symptom.en;
                return (
                  <span className={`${styles.symptomChoice} ${selected ? styles.symptomSelected : ""}`} key={value}>
                    <span className={styles.choiceCheck} aria-hidden="true">{selected ? "✓" : "+"}</span>
                    {label}
                  </span>
                );
              })}
            </div>
            <div className={styles.duration}>
              <span className={styles.durationLabel}>{text("When did it start?", "Kailan ito nagsimula?")}</span>
              <div className={styles.durationChoices}>
                {DURATION_OPTIONS.map((option) => (
                  <span className={`${styles.durationChoice} ${scene.duration === option ? styles.durationSelected : ""}`} key={option}>
                    {language === "en" ? option : option === "Less than 24 hours ago" ? text(option, "Wala pang 24 oras") : option === "1–2 days ago" ? text(option, "1–2 araw na") : text(option, "3–7 araw na")}
                  </span>
                ))}
              </div>
            </div>
            <div className={styles.optionalText}>
              <span className={styles.optionalIcon} aria-hidden="true">Aa</span>
              <span>
                <span className={styles.optionalLabel}>{text("Optional", "Opsyonal")}</span>
                <span className={styles.optionalTitle}>{text("Describe symptoms in your own words", "Ilarawan ang mga sintomas sa sarili mong salita")}</span>
              </span>
              <span className={styles.optionalAction} aria-hidden="true">＋</span>
            </div>
            <div className={styles.sampleText}>
              <span className={styles.sampleTextLabel}>{text("Sample description", "Halimbawang paglalarawan")}</span>
              <span className={styles.sampleTextValue}>
                {typed}
                {phase === "typing" && <i className={styles.caret} aria-hidden="true" />}
              </span>
            </div>
          </div>

          <div className={styles.checking} role="status" aria-live="polite">
            <span className={phase === "typing" ? styles.stepDot : styles.stepDone} aria-hidden="true">
              {phase === "typing" ? "1" : "✓"}
            </span>
            <span>{phase === "typing" ? text("Adding an optional description", "Nagdaragdag ng opsyonal na paglalarawan") : phase === "checking" ? text("Reviewing selected symptoms…", "Sinusuri ang mga napiling sintomas…") : text("Sample selection ready", "Handa na ang halimbawang pagpili")}</span>
            {phase === "checking" && <span className={styles.spinner} aria-hidden="true" />}
          </div>

          <div className={styles.reasons}>
            {scene.reasons.slice(0, visibleReasons).map((reason) => (
              <span className={styles.reasonChip} key={reason}>
                <b aria-hidden="true">✓</b>{reason}
              </span>
            ))}
          </div>

          <div className={`${styles.result} ${phase === "result" ? styles.resultVisible : ""}`}>
            <div className={styles.resultIcon} aria-hidden="true">✓</div>
            <p className={styles.msg}>
              {text(scene.title, scene.tag === "green" ? "Mag-monitor sa bahay" : scene.tag === "yellow" ? "Kumonsulta sa health worker" : "Humingi agad ng agarang pangangalaga")}
              <span className={styles.sub}>{text(scene.sub, scene.tag === "green" ? "Magpahinga at uminom ng tubig. Suriin muli kung lumala." : scene.tag === "yellow" ? "Bumisita sa barangay health center sa loob ng 24 oras." : "Pumunta sa pinakamalapit na ospital o tumawag para sa agarang tulong.")}</span>
            </p>
          </div>

          <div className={styles.steps} aria-label={text("Care guidance levels", "Mga antas ng gabay sa pangangalaga")}>
            {PILLS.map((pill, index) => (
              <span key={pill} className={index === scene.level ? styles.on : ""}>
                <i className={styles.pillDot} aria-hidden="true" />
                {text(pill, ["Mag-monitor", "Kumonsulta", "Agarang tulong"][index])}
              </span>
            ))}
          </div>

          <p className={styles.foot}>{text("Preliminary sample only · Not a medical diagnosis", "Paunang halimbawa lamang · Hindi medikal na diagnosis")}</p>
        </article>
      </div>
    </div>
  );
}

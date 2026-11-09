"use client";

import ResultText from "@/app/components/ResultText";
import type { RiskLevel, TriggeredRule } from "@/lib/api";
import { TriageBadge } from "@/app/components/ui/primitives";

const STYLES: Record<
  RiskLevel,
  { border: string; bg: string; text: string; label: string }
> = {
  GREEN: {
    border: "border-triage-green",
    bg: "bg-green-tint",
    text: "text-triage-green",
    label: "Low Risk",
  },
  YELLOW: {
    border: "border-triage-yellow",
    bg: "bg-yellow-tint",
    text: "text-triage-yellow",
    label: "Moderate Risk",
  },
  RED: {
    border: "border-triage-red",
    bg: "bg-red-tint",
    text: "text-triage-red",
    label: "High Risk — Urgent",
  },
};

export default function RiskCard({
  level,
  message,
  recommendation,
  triggeredRules,
  detectedSymptoms,
}: {
  level: RiskLevel;
  message: string;
  recommendation: string;
  triggeredRules: TriggeredRule[];
  detectedSymptoms: string[];
}) {
  const s = STYLES[level];
  const labels: Record<RiskLevel, { en: string; fil: string }> = {
    GREEN: { en: "Low Risk", fil: "Mababang Panganib" },
    YELLOW: { en: "Moderate Risk", fil: "Katamtamang Panganib" },
    RED: { en: "High Risk — Urgent", fil: "Mataas na Panganib — Agaran" },
  };
  const nextSteps: Record<RiskLevel, { en: string; fil: string }> = {
    GREEN: { en: "Home care and monitoring", fil: "Pangangalaga sa bahay at pagmamasid" },
    YELLOW: { en: "See a Barangay Health Worker or visit the RHU", fil: "Kumonsulta sa Barangay Health Worker o pumunta sa RHU" },
    RED: { en: "Go to the nearest hospital now", fil: "Pumunta agad sa pinakamalapit na ospital" },
  };
  const messages: Record<RiskLevel, { en: string; fil: string }> = {
    GREEN: { en: "Your symptoms appear mild.", fil: "Mukhang banayad ang iyong mga sintomas." },
    YELLOW: { en: "You may need a consultation.", fil: "Maaaring kailangan mong kumonsulta." },
    RED: { en: "Seek immediate medical attention.", fil: "Humingi agad ng tulong medikal." },
  };
  const recommendations: Record<RiskLevel, { en: string; fil: string }> = {
    GREEN: {
      en: "Rest, stay hydrated, and monitor your symptoms. Seek help if they worsen.",
      fil: "Magpahinga, uminom ng sapat na tubig, at obserbahan ang mga sintomas. Humingi ng tulong kung lumala ang mga ito.",
    },
    YELLOW: {
      en: "Contact your Barangay Health Worker or visit the Rural Health Unit (RHU).",
      fil: "Makipag-ugnayan sa Barangay Health Worker o pumunta sa Rural Health Unit (RHU).",
    },
    RED: {
      en: "Go to the nearest hospital or call emergency services now. Do not delay.",
      fil: "Pumunta agad sa pinakamalapit na ospital o tumawag sa emergency services. Huwag magpatumpik-tumpik.",
    },
  };
  const criticalSymptoms = triggeredRules
    .filter((rule) => rule.name.startsWith("critical:"))
    .map((rule) => rule.name.slice("critical:".length));
  const scoreRule = triggeredRules.find((rule) => rule.name === "high-severity-score");
  const score = scoreRule?.description.match(/severity \((\d+)\)/)?.[1];
  const symptomLabels: Record<string, { en: string; fil: string }> = {
    "abdominal pain": { en: "abdominal pain", fil: "pananakit ng tiyan" },
    "altered consciousness": { en: "altered consciousness", fil: "pagbabago ng kamalayan" },
    "active bleeding": { en: "active bleeding", fil: "aktibong pagdurugo" },
    "blood in vomit": { en: "blood in vomit", fil: "dugo sa suka" },
    "body pain": { en: "body pain", fil: "pananakit ng katawan" },
    "chest pain": { en: "chest pain", fil: "pananakit ng dibdib" },
    "chest tightness": { en: "chest tightness", fil: "paninikip ng dibdib" },
    "coffee-ground vomit": { en: "coffee-ground-like vomit", fil: "sukang kulay latak ng kape" },
    cough: { en: "cough", fil: "ubo" },
    "difficulty breathing": { en: "difficulty breathing", fil: "hirap sa paghinga" },
    diarrhea: { en: "diarrhea", fil: "pagtatae" },
    dizziness: { en: "dizziness", fil: "pagkahilo" },
    dehydration: { en: "dehydration", fil: "kakulangan ng tubig sa katawan" },
    fatigue: { en: "fatigue", fil: "pagkapagod" },
    fever: { en: "fever", fil: "lagnat" },
    headache: { en: "headache", fil: "sakit ng ulo" },
    "generalized weakness": { en: "generalized weakness", fil: "panghihina ng katawan" },
    "neurologic emergency": { en: "neurological warning sign", fil: "babala sa sistemang nerbiyos" },
    "pregnancy warning sign": { en: "pregnancy-related warning sign", fil: "babala kaugnay ng pagbubuntis" },
    "colds / rhinitis": { en: "colds / runny nose", fil: "sipon" },
    rash: { en: "rash", fil: "pantal" },
    "shortness of breath": { en: "shortness of breath", fil: "hirap sa paghinga" },
    "thunderclap headache": { en: "sudden, severe headache", fil: "biglaan at matinding sakit ng ulo" },
    "unable to drink": { en: "unable to drink", fil: "hindi makainom" },
    "vomits everything": { en: "vomiting everything", fil: "isinusuka ang lahat ng iniinom o kinakain" },
    "black stool": { en: "black stool", fil: "itim na dumi" },
    "green vomit": { en: "green vomit", fil: "berdeng suka" },
  };
  const labeledCriticalSymptoms = criticalSymptoms.map(
    (symptom) =>
      symptomLabels[symptom] ?? {
        en: symptom,
        fil: symptom,
      },
  );
  const listedSymptoms = detectedSymptoms
    .map((symptom) => symptomLabels[symptom] ?? { en: symptom, fil: symptom })
    .filter((symptom) => symptom.en);
  const urgentReasons = triggeredRules.filter((rule) =>
    [
      "prolonged-fever-emergency",
      "young-infant-fever-referral",
      "older-adult-fever-weakness-override",
    ].includes(rule.name),
  );
  const scoreModifiers = triggeredRules.filter((rule) =>
    ["duration-score", "age-risk-modifier", "pregnancy-fever-review"].includes(rule.name),
  );
  return (
    <div className={`${level === "RED" ? "relative overflow-hidden rounded-3xl border border-[#B53B2A] bg-[linear-gradient(135deg,#B53B2A_0%,#8E2F24_58%,#6F211C_100%)] p-4 text-white shadow-[0_18px_42px_rgba(142,47,36,0.2)] sm:p-6" : `relative overflow-hidden rounded-3xl border ${s.border} ${s.bg} p-4 shadow-[0_14px_34px_rgba(24,38,25,0.07)] sm:p-6`}`}>
      <div className={`absolute inset-x-0 top-0 h-1 ${level === "RED" ? "bg-[#FFD2C8]" : level === "YELLOW" ? "bg-[#D98A2B]" : "bg-[#3E8E41]"}`} aria-hidden="true" />
      <div className="relative flex min-w-0 items-start gap-3 sm:gap-4">
        <span className={level === "RED" ? "shrink-0 rounded-xl bg-white p-2 shadow-sm sm:p-2.5" : "shrink-0 rounded-xl border border-black/5 bg-white/75 p-2 shadow-[0_3px_10px_rgba(24,38,25,0.06)] sm:p-2.5"}>
          <TriageBadge level={level} />
        </span>
        <div className="min-w-0 flex-1">
          <ResultText as="p" className={`font-mono text-[10px] font-semibold uppercase tracking-[0.14em] sm:text-xs ${level === "RED" ? "text-red-100" : s.text}`} english={level === "RED" ? "Urgent — prompt medical assessment" : labels[level].en} filipino={level === "RED" ? "Agaran — magpasuri agad" : labels[level].fil} />
          <ResultText as="h2" className={`mt-1.5 font-display text-xl font-semibold leading-snug sm:mt-2 sm:text-2xl lg:text-3xl ${level === "RED" ? "text-white" : "text-ink"}`} english={level === "RED" ? "The assessment found a warning sign or score that needs prompt attention." : messages[level]?.en ?? message} filipino={level === "RED" ? "May natukoy ang pagsusuri na babala o markang nangangailangan ng agarang atensyon." : messages[level]?.fil ?? message} />
        </div>
      </div>
      {level === "RED" && (
        <div className="relative mt-5 rounded-2xl border border-white/25 bg-white/10 px-4 py-4 sm:mt-6 sm:px-5 sm:py-5">
          <ResultText as="p" className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-red-100 sm:text-xs" english="Why this is urgent" filipino="Bakit agaran ito" />
          <ul className="mt-2 space-y-2 text-sm leading-relaxed text-white sm:text-base">
            {labeledCriticalSymptoms.length > 0 && (
              <li>
                <ResultText
                  english={`Warning sign(s) identified: ${labeledCriticalSymptoms.map((symptom) => symptom.en).join(", ")}.`}
                  filipino={`Natukoy na babala: ${labeledCriticalSymptoms.map((symptom) => symptom.fil).join(", ")}.`}
                />
              </li>
            )}
            {scoreRule && (
              <li>
                <ResultText
                  english={`The combined score${score ? ` (${score})` : ""} reached the RED threshold of 8. Symptoms counted include ${listedSymptoms.map((symptom) => symptom.en).join(", ") || "the recognized symptoms"}.`}
                  filipino={`Umabot sa PULANG threshold na 8 ang pinagsamang marka${score ? ` (${score})` : ""}. Kabilang sa mga sintomas na binilang ang ${listedSymptoms.map((symptom) => symptom.fil).join(", ") || "mga nakilalang sintomas"}.`}
                />
              </li>
            )}
            {scoreModifiers.map((rule) => {
              const duration = rule.description.match(/lasting ([\d.]+) day\(s\) contribute (\d+) duration point/);
              const detail: Record<string, { en: string; fil: string }> = {
                "age-risk-modifier": {
                  en: "Age-related health context also added to the score.",
                  fil: "Isinaalang-alang din sa marka ang kalagayang pangkalusugan na kaugnay ng edad.",
                },
                "pregnancy-fever-review": {
                  en: "Fever during pregnancy also affected the urgency assessment.",
                  fil: "Nakaapekto rin sa antas ng pangangailangan ang lagnat habang buntis.",
                },
              };
              return (
                <li key={rule.name}>
                  <ResultText
                    english={duration ? `The reported symptom duration was ${duration[1]} day(s), adding ${duration[2]} point(s) to the score.` : detail[rule.name]?.en ?? rule.description}
                    filipino={duration ? `Ang iniulat na tagal ng sintomas ay ${duration[1]} araw at nagdagdag ito ng ${duration[2]} puntos sa marka.` : detail[rule.name]?.fil ?? rule.description}
                  />
                </li>
              );
            })}
            {urgentReasons.map((rule) => {
              const reason = {
                "prolonged-fever-emergency": {
                  en: "Fever lasting five days or longer needs urgent assessment.",
                  fil: "Kailangan ng agarang pagsusuri ang lagnat na tumatagal nang limang araw o higit pa.",
                },
                "young-infant-fever-referral": {
                  en: "Fever in a very young infant needs urgent hospital assessment.",
                  fil: "Kailangan ng agarang pagsusuri sa ospital ang lagnat sa napakabatang sanggol.",
                },
                "older-adult-fever-weakness-override": {
                  en: "Fever with weakness in an adult over 65 needs urgent assessment.",
                  fil: "Kailangan ng agarang pagsusuri ang lagnat at panghihina sa taong lampas 65 taong gulang.",
                },
              }[rule.name] ?? { en: rule.description, fil: rule.description };
              return (
                <li key={rule.name}>
                  <ResultText english={reason.en} filipino={reason.fil} />
                </li>
              );
            })}
            {labeledCriticalSymptoms.length === 0 && !scoreRule && urgentReasons.length === 0 && (
              <li>
                <ResultText
                  english={`The assessment reached an urgent result based on: ${listedSymptoms.map((symptom) => symptom.en).join(", ") || "the reported symptoms and context"}.`}
                  filipino={`Nagtakda ng agarang resulta ang pagsusuri batay sa: ${listedSymptoms.map((symptom) => symptom.fil).join(", ") || "mga iniulat na sintomas at kalagayan"}.`}
                />
              </li>
            )}
          </ul>
          <ResultText
            as="p"
            className="mt-3 border-t border-white/20 pt-3 text-xs leading-relaxed text-red-100 sm:text-sm"
            english="Fever, cough, and vomiting together do not automatically mean an emergency. The warning sign, score, duration, and context above determine this result."
            filipino="Ang lagnat, ubo, at pagsusuka nang magkakasama ay hindi awtomatikong nangangahulugan ng emergency. Ang babala, marka, tagal, at kalagayang nakalista sa itaas ang batayan ng resultang ito."
          />
        </div>
      )}
      <div className={`relative mt-5 rounded-2xl px-4 py-4 sm:mt-6 sm:px-5 sm:py-5 ${level === "RED" ? "border border-white/30 bg-black/10" : "border border-black/5 bg-white/80 shadow-[0_5px_16px_rgba(24,38,25,0.04)]"}`}>
        <ResultText as="p" className={`font-mono text-[10px] font-semibold uppercase tracking-[0.12em] sm:text-xs ${level === "RED" ? "text-red-100" : "text-ink-muted"}`} english="What to do next" filipino="Ano ang susunod na gagawin" />
        <ResultText as="p" className={`mt-2 text-base font-semibold leading-relaxed sm:text-lg ${level === "RED" ? "text-white" : "text-ink-secondary"}`} english={level === "RED" ? "Seek prompt medical assessment today through your RHU or nearest hospital." : nextSteps[level].en} filipino={level === "RED" ? "Magpasuri agad ngayong araw sa RHU o pinakamalapit na ospital." : nextSteps[level].fil} />
        {level === "RED" ? (
          <ResultText
            as="p"
            className="mt-3 border-t border-white/20 pt-3 text-sm leading-relaxed text-red-100 sm:text-base"
            english="Call 911 or go to the nearest emergency department now for difficulty breathing, severe chest pain, fainting or confusion, a seizure, heavy bleeding, or inability to keep fluids down."
            filipino="Tumawag sa 911 o pumunta agad sa pinakamalapit na emergency department kung hirap huminga, matindi ang pananakit ng dibdib, nahihimatay o nalilito, nagkukumbulsyon, malakas ang pagdurugo, o hindi mapanatili ang iniinom."
          />
        ) : (
          <ResultText as="p" className="mt-2 border-t border-border/60 pt-2 text-sm leading-relaxed text-ink-muted sm:mt-3 sm:pt-3 sm:text-base" english={recommendation || recommendations[level].en} filipino={recommendations[level].fil} />
        )}
      </div>
    </div>
  );
}

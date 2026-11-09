import ResultText from "@/app/components/ResultText";
import type { RiskLevel, TriggeredRule } from "@/lib/api";
import { translateSymptomList } from "./resultTranslations";

const WARNING_COPY: Record<string, { en: string; fil: string }> = {
  "difficulty-breathing-override": {
    en: "Difficulty breathing was reported. This can need urgent care.",
    fil: "Iniulat ang hirap sa paghinga. Maaaring kailanganin nito ng agarang pangangalaga.",
  },
  "prolonged-fever-emergency": {
    en: "Fever lasting five days or longer was reported.",
    fil: "Iniulat ang lagnat na tumatagal nang limang araw o higit pa.",
  },
  "young-infant-fever-referral": {
    en: "Fever in a very young infant was reported and needs urgent assessment.",
    fil: "Iniulat ang lagnat sa napakabatang sanggol at kailangan itong masuri agad.",
  },
  "older-adult-fever-weakness-override": {
    en: "Fever with weakness in an adult over 65 was reported.",
    fil: "Iniulat ang lagnat na may kasamang panghihina sa taong lampas 65 taong gulang.",
  },
  "cannot-retain-fluids-review": {
    en: "Difficulty keeping fluids down was reported.",
    fil: "Iniulat na hindi napapanatili ang iniinom na likido.",
  },
  "dehydration-risk-review": {
    en: "Possible signs of dehydration were reported.",
    fil: "May iniulat na posibleng mga palatandaan ng kakulangan sa tubig sa katawan.",
  },
  "blood-in-stool-health-worker-review": {
    en: "Blood in the stool was reported.",
    fil: "May iniulat na dugo sa dumi.",
  },
  "pregnancy-fever-review": {
    en: "Fever during pregnancy was reported.",
    fil: "Iniulat ang lagnat habang buntis.",
  },
  "high-stool-frequency-review": {
    en: "Frequent loose stools were reported.",
    fil: "Iniulat ang madalas na malambot na pagdumi.",
  },
  "first-cluster-like-headache-review": {
    en: "A first or new severe cluster-like headache was reported. This is not a diagnosis.",
    fil: "Iniulat ang una o bagong matinding kumpol-kumpol na sakit ng ulo. Hindi ito diagnosis.",
  },
  "headache-triggered-by-activity-review": {
    en: "A headache that worsens with activity, coughing, or straining was reported.",
    fil: "Iniulat ang sakit ng ulo na lumalala sa aktibidad, pag-ubo, o pag-iri.",
  },
  "persistent-fever": {
    en: "Fever lasting longer than expected was reported.",
    fil: "Iniulat ang lagnat na mas matagal kaysa inaasahan.",
  },
  "persistent-cough": {
    en: "A cough lasting longer than expected was reported.",
    fil: "Iniulat ang ubo na mas matagal kaysa inaasahan.",
  },
  "persistent-diarrhea": {
    en: "Diarrhea lasting longer than expected was reported.",
    fil: "Iniulat ang pagtatae na mas matagal kaysa inaasahan.",
  },
  "worsening-symptoms": {
    en: "Worsening symptoms were reported.",
    fil: "Iniulat na lumalala ang mga sintomas.",
  },
  "severe-or-worsening-language": {
    en: "The description included severe or rapidly worsening symptoms.",
    fil: "Inilarawan ang mga sintomas bilang malubha o mabilis na lumalala.",
  },
};

const NEXT_STEPS: Record<RiskLevel, { en: string; fil: string }> = {
  GREEN: {
    en: "Rest, drink fluids if you can, and monitor how you feel. Contact a health worker if symptoms worsen or do not improve.",
    fil: "Magpahinga, uminom ng likido kung kaya, at obserbahan ang iyong kalagayan. Makipag-ugnayan sa health worker kung lumala o hindi bumuti ang mga sintomas.",
  },
  YELLOW: {
    en: "Contact your Barangay Health Worker or visit the Rural Health Unit (RHU) for advice. Seek help sooner if symptoms worsen.",
    fil: "Makipag-ugnayan sa Barangay Health Worker o pumunta sa Rural Health Unit (RHU) para magtanong. Humingi agad ng tulong kung lumala ang mga sintomas.",
  },
  RED: {
    en: "Seek urgent medical care now at the nearest hospital or emergency department. Call 911 if you cannot get there safely.",
    fil: "Humingi agad ng tulong medikal sa pinakamalapit na ospital o emergency department. Tumawag sa 911 kung hindi ka ligtas na makakapunta roon.",
  },
};

const SYMPTOM_COPY: Record<string, { en: string; fil: string }> = {
  "altered consciousness": { en: "confusion or difficulty waking", fil: "pagkalito o hirap magising" },
  "active bleeding": { en: "active bleeding", fil: "patuloy na pagdurugo" },
  "blood in vomit": { en: "blood in vomit", fil: "dugo sa suka" },
  "chest pain": { en: "chest pain", fil: "pananakit ng dibdib" },
  "chest tightness": { en: "chest tightness", fil: "paninikip ng dibdib" },
  "coffee-ground vomit": { en: "dark vomit that looks like coffee grounds", fil: "maitim na suka na parang latak ng kape" },
  "neurologic emergency": { en: "a serious brain or nerve problem", fil: "seryosong problema sa utak o nerbiyos" },
  "pregnancy warning sign": { en: "a pregnancy-related warning sign", fil: "babala kaugnay ng pagbubuntis" },
  "shortness of breath": { en: "difficulty breathing", fil: "hirap huminga" },
  "thunderclap headache": { en: "a sudden, extremely severe headache", fil: "biglaan at napakatinding sakit ng ulo" },
  "unable to drink": { en: "unable to drink", fil: "hindi makainom" },
  "vomits everything": { en: "vomiting everything they try to eat or drink", fil: "pagsusuka sa lahat ng kinakain o iniinom" },
  "black stool": { en: "black stool", fil: "itim na dumi" },
  "green vomit": { en: "green vomit", fil: "berdeng suka" },
};

function symptomCopy(symptom: string) {
  return SYMPTOM_COPY[symptom.toLowerCase()] ?? {
    en: symptom,
    fil: translateSymptomList(symptom),
  };
}

function getWarningCopy(rule: TriggeredRule) {
  if (rule.name.startsWith("critical:")) {
    const symptom = rule.name.slice("critical:".length);
    const label = symptomCopy(symptom);
    return {
      en: `Reported warning sign: ${label.en}.`,
      fil: `Iniulat na babalang sintomas: ${label.fil}.`,
    };
  }
  return WARNING_COPY[rule.name];
}

export default function ClinicalExplanation({
  level,
  reason,
  recommendation,
  triggeredRules,
  detectedSymptoms,
}: {
  level: RiskLevel;
  reason: string;
  recommendation: string;
  triggeredRules: TriggeredRule[];
  detectedSymptoms: string[];
}) {
  const ruleNames = new Set(triggeredRules.map((rule) => rule.name));
  const warningRules = triggeredRules
    .filter((rule) => {
      if (rule.name === "persistent-fever" && ruleNames.has("prolonged-fever-emergency")) return false;
      if (rule.name === "difficulty-breathing-override" && ruleNames.has("critical:difficulty breathing")) return false;
      return true;
    })
    .map((rule) => ({ rule, copy: getWarningCopy(rule) }))
    .filter((item): item is { rule: TriggeredRule; copy: { en: string; fil: string } } => Boolean(item.copy));
  const symptoms = detectedSymptoms.map(symptomCopy);
  const symptomList = symptoms.map((symptom) => symptom.en).join(", ");
  const filipinoSymptomList = symptoms.map((symptom) => symptom.fil).join(", ");
  const duration = reason.match(/reported duration of ([\d.]+) days/i)?.[1];
  const durationWasNotProvided = triggeredRules.some((rule) => rule.name === "duration-not-provided");
  const hasRule = (name: string) => triggeredRules.some((rule) => rule.name === name);
  const riskExplanation: Record<RiskLevel, { en: string; fil: string }> = {
    GREEN: {
      en: "The symptoms recognized stayed below this tool's level for recommending a consultation.",
      fil: "Mas mababa sa antas na nangangailangan ng konsultasyon ang mga sintomas na nakilala ng tool na ito.",
    },
    YELLOW: !detectedSymptoms.length
      ? {
          en: "No supported symptom was recognized, so the tool recommends a health-worker review rather than treating this as low risk.",
          fil: "Walang suportadong sintomas na nakilala kaya inirerekomenda ng tool na suriin ito ng health worker sa halip na ituring na mababang panganib.",
        }
      : hasRule("moderate-severity-score")
        ? {
            en: "The combined severity of the recognized symptoms reached this tool's level for recommending a consultation.",
            fil: "Umabot sa antas na nangangailangan ng konsultasyon ang pinagsamang tindi ng mga nakilalang sintomas.",
          }
        : {
            en: "A reported symptom or detail suggests that a health worker should review your condition.",
            fil: "Ipinapahiwatig ng iniulat na sintomas o detalye na dapat suriin ng health worker ang iyong kalagayan.",
          },
    RED: {
      en: [
        warningRules.length > 0 && "A possible warning sign listed below contributed to the urgent result.",
        hasRule("high-severity-score") && "The combined severity of your symptoms reached this tool's urgent-care level.",
        hasRule("four-symptom-override") && "Four or more symptoms were reported together, which prompts urgent review.",
      ].filter(Boolean).join(" ") || "The reported symptoms or details reached this tool's urgent-care level.",
      fil: [
        warningRules.length > 0 && "Nakatulong sa agarang resulta ang posibleng babalang nakalista sa ibaba.",
        hasRule("high-severity-score") && "Umabot sa antas ng agarang pangangalaga ang pinagsamang tindi ng mga sintomas.",
        hasRule("four-symptom-override") && "Apat o higit pang sintomas ang iniulat nang sabay-sabay kaya kailangan ng agarang pagsusuri.",
      ].filter(Boolean).join(" ") || "Umabot sa antas ng agarang pangangalaga ang mga iniulat na sintomas o detalye.",
    },
  };

  return (
    <div className="mt-4 space-y-4 border-t border-[#e4ebe1] pt-4">
      <section>
        <ResultText as="h3" className="text-sm font-semibold text-ink sm:text-base" english="Why this risk level?" filipino="Bakit ganito ang antas ng panganib?" />
        <ResultText
          as="p"
          className="mt-1 text-sm leading-6 text-ink-secondary sm:text-base sm:leading-7"
          english={`${riskExplanation[level].en} The assessment considers the symptoms you reported, how long they have lasted when known, and any warning signs listed below.`}
          filipino={`${riskExplanation[level].fil} Isinasaalang-alang ng pagsusuri ang mga iniulat mong sintomas, kung gaano na katagal ang mga ito kung alam, at ang anumang babala sa ibaba.`}
        />
        {duration && (
          <ResultText
            as="p"
            className="mt-2 text-sm leading-6 text-ink-secondary"
            english={`You reported symptoms lasting ${duration} day(s); their duration was included in this result.`}
            filipino={`Iniulat mong tumagal nang ${duration} araw ang mga sintomas; isinama sa resultang ito ang tagal ng mga ito.`}
          />
        )}
        {durationWasNotProvided && (
          <ResultText
            as="p"
            className="mt-2 text-sm leading-6 text-ink-secondary"
            english="The duration was not provided, so it could not be included in this result."
            filipino="Hindi naibigay ang tagal ng mga sintomas kaya hindi ito naisama sa resulta."
          />
        )}
      </section>

      <section>
        <ResultText as="h3" className="text-sm font-semibold text-ink sm:text-base" english="Symptoms counted in this result" filipino="Mga sintomas na isinaalang-alang sa resultang ito" />
        {detectedSymptoms.length > 0 ? (
          <ResultText
            as="p"
            className="mt-1 text-sm leading-6 text-ink-secondary sm:text-base"
            english={symptomList}
            filipino={filipinoSymptomList}
          />
        ) : (
          <ResultText
            as="p"
            className="mt-1 text-sm leading-6 text-ink-secondary sm:text-base"
            english="The tool did not recognize a supported symptom in the information provided."
            filipino="Walang suportadong sintomas na nakilala ang tool mula sa impormasyong ibinigay."
          />
        )}
      </section>

      <section>
        <ResultText as="h3" className="text-sm font-semibold text-ink sm:text-base" english="Possible warning signs in your answers" filipino="Mga posibleng babala sa iyong mga sagot" />
        {warningRules.length > 0 ? (
          <ul className="mt-1 list-disc space-y-1 pl-5 text-sm leading-6 text-ink-secondary sm:text-base">
            {warningRules.map(({ rule, copy }) => (
              <li key={rule.name}>
                <ResultText english={copy.en} filipino={copy.fil} />
              </li>
            ))}
          </ul>
        ) : (
          <ResultText
            as="p"
            className="mt-1 text-sm leading-6 text-ink-secondary sm:text-base"
            english="No specific warning sign was recognized by the tool. This does not rule out a serious problem."
            filipino="Walang partikular na babala ang nakilala ng tool. Hindi nito inaalis ang posibilidad ng malubhang problema."
          />
        )}
      </section>

      <section>
        <ResultText as="h3" className="text-sm font-semibold text-ink sm:text-base" english="What to do next" filipino="Ano ang susunod na gagawin" />
        <ResultText
          as="p"
          className="mt-1 text-sm leading-6 text-ink-secondary sm:text-base sm:leading-7"
          english={recommendation || NEXT_STEPS[level].en}
          filipino={NEXT_STEPS[level].fil}
        />
      </section>

      <section className="rounded-xl border border-[#e2e9de] bg-white/80 px-3.5 py-3">
        <ResultText as="h3" className="text-sm font-semibold text-ink sm:text-base" english="Limits of this assessment" filipino="Mga limitasyon ng pagsusuring ito" />
        <ResultText
          as="p"
          className="mt-1 text-sm leading-6 text-ink-secondary"
          english="This is a symptom check, not a diagnosis or a substitute for a health worker. It uses only the information you provided and may misunderstand or miss symptoms. A low-risk result does not guarantee that you are well. Get medical help if you are worried or your symptoms worsen."
          filipino="Pagsusuri lamang ito ng mga sintomas, hindi diagnosis o kapalit ng health worker. Impormasyong ibinigay mo lamang ang ginagamit nito at maaari nitong hindi maunawaan o mapansin ang ilang sintomas. Hindi garantiya ng mabuting kalusugan ang mababang panganib na resulta. Humingi ng tulong medikal kung nag-aalala ka o lumala ang mga sintomas."
        />
      </section>
    </div>
  );
}

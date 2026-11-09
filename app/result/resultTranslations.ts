const SYMPTOMS_FILIPINO: Record<string, string> = {
  "abdominal pain": "pananakit ng tiyan",
  "body pain": "pananakit ng katawan",
  cough: "ubo",
  "difficulty breathing": "hirap sa paghinga",
  diarrhea: "pagtatae",
  dizziness: "pagkahilo",
  fever: "lagnat",
  headache: "sakit ng ulo",
  "neurologic emergency": "emerhensiyang problemang neurologic",
  "altered consciousness": "pagbabago ng kamalayan",
  "generalized weakness": "panghihina ng katawan",
  dehydration: "kakulangan ng tubig sa katawan",
  fatigue: "pagkapagod",
  rash: "pantal",
  "colds / rhinitis": "sipon",
  vomiting: "pagsusuka",
};

const RULE_TITLES_FILIPINO: Record<string, string> = {
  "age-risk-modifier": "Isinaalang-alang ang edad sa antas ng panganib",
  "blood-in-stool-health-worker-review": "Kailangan ng pagsusuri ng health worker kapag may dugo sa dumi",
  "cannot-retain-fluids-review": "Kailangan ng pagsusuri kung hindi mapanatili ang iniinom",
  "dehydration-risk-review": "Kailangan ng pagsusuri dahil sa mga palatandaan ng dehydration",
  "duration-score": "Tagal ng mga sintomas",
  "high-severity-score": "Nangangailangan ng agarang pangangalaga ang kabuuang marka",
  "moderate-severity-score": "Kailangan ng konsultasyon ang iyong mga sintomas",
  "mild-severity-score": "Kasalukuyang banayad ang iyong mga sintomas",
  "difficulty-breathing-override": "Kailangan ng agarang atensyon ang hirap sa paghinga",
  "four-symptom-override": "Sabay-sabay na iniulat ang ilang sintomas",
  "symptom-count-escalation": "Nagpataas sa antas ng pangangailangan ang dami ng sintomas",
  "symptom-combination-score": "Sabay-sabay na sinuri ang mga sintomas",
  "weighted-symptom-score": "Kinuwenta ang marka ng iyong mga sintomas",
  "unclear-symptoms-floor": "Hindi lubos na naunawaan ang mga sintomas",
  "repeat-assessment-escalation": "Muling iniulat ang parehong mga sintomas",
  "persistent-fever": "Mas matagal kaysa inaasahan ang lagnat",
  "persistent-cough": "Mas matagal kaysa inaasahan ang ubo",
  "persistent-diarrhea": "Mas matagal kaysa inaasahan ang pagtatae",
  "pregnancy-fever-review": "Kailangan ng pagsusuri ng health worker kapag may lagnat habang buntis",
  "high-stool-frequency-review": "Kailangan ng pagsusuri dahil sa madalas na pagdumi",
  "first-cluster-like-headache-review": "Kailangan ng pagsusuri ang unang matinding kumpol-kumpol na sakit ng ulo",
  "prolonged-fever-emergency": "Kailangan ng agarang pagsusuri dahil sa matagal na lagnat",
  "young-infant-fever-referral": "Kailangan ng agarang pagsusuri ang lagnat sa sanggol",
  "older-adult-fever-weakness-override": "Kailangan ng agarang pagsusuri ang lagnat at panghihina sa nakatatanda",
  "headache-triggered-by-activity-review": "Kailangan ng pagsusuri ang sakit ng ulo na napapalala ng aktibidad",
  "relative-onset-needs-review": "Kailangan ng masusing pagsusuri ang naiulat na pagsisimula ng sintomas",
  "worsening-symptoms": "Iniulat na lumalala ang mga sintomas",
  "severe-or-worsening-language": "May iniulat na malubha o lumalalang sintomas",
  "short-cough-duration-cap": "Isinaalang-alang ang maikling tagal ng ubo",
  "duration-not-provided": "Hindi ibinigay ang tagal ng mga sintomas",
};

const RULE_DESCRIPTIONS_FILIPINO: Record<string, string> = {
  "age-risk-modifier": "Ang edad ay wala sa karaniwang saklaw ng mababang panganib para sa nasa hustong gulang, kaya mas kailangang masuri ang mga sintomas.",
  "blood-in-stool-health-worker-review": "Iniulat ang dugo sa dumi; kailangan itong masuri ng health worker.",
  "cannot-retain-fluids-review": "Iniulat na hindi napapanatili ang iniinom. Humingi agad ng payo sa health worker; uminom lamang ng paunti-unti kung kaya.",
  "dehydration-risk-review": "May iniulat na posibleng palatandaan ng dehydration. Agad na makipag-ugnayan sa health worker; hindi matutukoy ng pagsusuring ito ang tindi ng dehydration.",
  "difficulty-breathing-override": "Nagdaragdag ng anim na puntos ang hirap sa paghinga kaya pumapasok ito sa PULANG antas kahit mag-isa lamang itong iniulat.",
  "duration-not-provided": "Walang ibinigay na tagal ng sintomas kaya ginamit ang panimulang berdeng antas batay lamang sa sintomas. Piliin kung kailan nagsimula ang mga sintomas upang maisama ang tagal.",
  "first-cluster-like-headache-review": "Iniulat ang una o bagong matinding kumpol-kumpol na sakit ng ulo. Magpa-iskedyul ng pagsusuri sa clinician; hindi ito kumpirmadong diagnosis.",
  "four-symptom-override": "Nangangailangan ng agarang pagsusuri ng clinician ang apat o higit pang iniulat na sintomas anuman ang pinagsamang marka.",
  "headache-triggered-by-activity-review": "Iniulat ang sakit ng ulo na napapalala ng pag-ubo, pag-iri, pagbahing, o ehersisyo. Makipag-ugnayan sa health worker para sa pagsusuri.",
  "high-stool-frequency-review": "Iniulat ang anim o higit pang malambot na pagdumi sa isang araw. Makipag-ugnayan sa health worker para sa klinikal na payo.",
  "persistent-fever": "Ang lagnat na tumatagal nang higit sa tatlong araw ay dapat ipasuri sa health worker.",
  "persistent-cough": "Ang ubo na tumatagal nang higit sa 30 araw ay nangangailangan ng karagdagang pagsusuri.",
  "persistent-diarrhea": "Ang pagtatae na tumatagal nang 14 na araw o higit pa ay nangangailangan ng pagsusuri.",
  "pregnancy-fever-review": "Iniulat na may lagnat habang buntis; kailangan itong masuri ng health worker.",
  "prolonged-fever-emergency": "Ang lagnat na tumatagal nang limang araw o higit pa ay nangangailangan ng agarang pagsusuri.",
  "relative-onset-needs-review": "Iniulat ang pagsisimula sa isang araw ng linggo ngunit hindi matukoy ang eksaktong tagal.",
  "severe-or-worsening-language": "May paglalarawang malubha o biglaan at hindi ito dapat ituring na banayad.",
  "short-cough-duration-cap": "Ang ubo na tumatagal nang tatlong araw o mas maikli, kung nag-iisa, ay hindi sapat upang mangailangan ng konsultasyon batay lamang sa tagal.",
  "symptom-combination-score": "Sabay-sabay na sinuri ang mga sintomas; nakaaapekto ang pinagsamang marka sa antas ng pangangailangan.",
  "unclear-symptoms-floor": "Walang kinilalang suportadong sintomas kaya kailangan ng pagsusuri ng health worker sa halip na ituring itong berdeng antas.",
  "worsening-symptoms": "Ang lumalalang mga sintomas ay nangangailangan ng maagap na pagsusuri ng health worker.",
  "young-infant-fever-referral": "Nangangailangan ng agarang referral sa ospital ang lagnat sa sanggol na hanggang dalawang buwan ang edad.",
  "high-severity-score": "Ang kabuuang klinikal na marka ay 6 o higit pa. Nasa PULA na antas ito at nangangailangan ng agarang tulong medikal.",
  "mild-severity-score": "Mas mababa sa markang nangangailangan ng konsultasyon ang mga kinilalang sintomas. Patuloy na magmasid at humingi ng tulong kung lumala ang mga ito.",
};

export function translateSymptomList(symptoms: string) {
  return symptoms
    .split(",")
    .map((symptom) => SYMPTOMS_FILIPINO[symptom.trim().toLowerCase()] ?? symptom.trim())
    .join(", ");
}

export function translatedRuleTitle(name: string, englishTitle: string) {
  if (name.startsWith("critical:")) {
    const term = name.slice("critical:".length);
    return `May natukoy na babalang pang-emergency: ${translateSymptomList(term)}`;
  }
  return RULE_TITLES_FILIPINO[name] ?? englishTitle;
}

export function translatedRuleDescription(name: string, description: string) {
  if (name === "duration-score") {
    const match = description.match(/lasting ([\d.]+) day\(s\) contribute (\d+) duration point/);
    return match
      ? `Iniulat na tumagal nang ${match[1]} araw ang mga sintomas at nagdagdag ito ng ${match[2]} puntos sa klinikal na marka.`
      : "Isinama sa klinikal na marka ang tagal ng mga sintomas.";
  }
  if (name === "weighted-symptom-score") {
    const score = description.match(/final score of (\d+)/)?.[1] ?? "kabuuang naitala";
    return `Nakatulong ang mga kinilalang sintomas sa pinagsamang klinikal na markang ${score}.`;
  }
  if (name === "symptom-combination-score") {
    const score = description.match(/final urgency level \((\d+)\)/)?.[1] ?? "naitala";
    return `Sabay-sabay na sinuri ang mga sintomas. Ang pinagsamang marka ay ${score} at nakaaapekto ito sa antas ng pangangailangan.`;
  }
  if (name === "high-severity-score") {
    const score = description.match(/severity \((\d+)\)/)?.[1] ?? "6";
    return `Ang kabuuang klinikal na marka ay ${score}. Nasa PULANG antas ito at nangangailangan ng agarang tulong medikal.`;
  }
  if (name === "moderate-severity-score") {
    const score = description.match(/severity \((\d+)\)/)?.[1] ?? "nasa antas ng konsultasyon";
    return `Ang pinagsamang marka ng sintomas ay ${score}. Ang markang 3 hanggang 7 ay DILAW na antas; makipag-ugnayan sa health worker o pumunta sa RHU.`;
  }
  if (name === "mild-severity-score") {
    const score = description.match(/severity \((\d+)\)/)?.[1] ?? "mababa";
    const threshold = description.match(/threshold \((\d+)\)/)?.[1] ?? "konsultasyon";
    return `Ang pinagsamang marka ng sintomas ay ${score}, mas mababa sa ${threshold} na markang nangangailangan ng konsultasyon. Patuloy na magmasid at humingi ng tulong kung lumala ang mga ito.`;
  }
  if (name.startsWith("critical:")) {
    return `Ang ${translateSymptomList(name.slice("critical:".length))} ay isang babalang sintomas na nangangailangan ng agarang pangangalaga.`;
  }
  return RULE_DESCRIPTIONS_FILIPINO[name] ?? description;
}

export function translatedAssessmentReason(reason: string, riskLevel: string) {
  if (reason.startsWith("No recognizable symptoms were detected.")) {
    return "Walang nakilalang sintomas sa impormasyong ibinigay. Dapat suriin ng health worker ang alalahanin.";
  }

  const match = reason.match(
    /^The assessment identified (.*?)\.(?: The reported duration of ([\d.]+) days added (\d+) point\(s\)\.)? The combined clinical score is (\d+)\./,
  );
  if (!match) return reason;

  const [, symptomList, duration, durationPoints, score] = match;
  const levelAdvice: Record<string, string> = {
    GREEN: "Kasalukuyang nasa berdeng antas ito. Obserbahan ang mga sintomas at sundin ang payo sa pangangalaga.",
    YELLOW: "Nasa dilaw na antas ito. Magpa-iskedyul ng konsultasyon sa health worker o pumunta sa RHU.",
    RED: "Nasa pulang antas ito. Humingi agad ng tulong medikal.",
  };
  const durationText = duration
    ? ` Iniulat na tumagal nang ${duration} araw ang mga sintomas at nagdagdag ito ng ${durationPoints} puntos.`
    : "";
  return `Natukoy sa pagsusuri ang ${translateSymptomList(symptomList)}.${durationText} Ang pinagsamang klinikal na marka ay ${score}. ${levelAdvice[riskLevel] ?? ""}`.trim();
}

const SCORE_CONTRIBUTING_RULES = new Set([
  "age-risk-modifier",
  "duration-score",
  "pregnancy-fever-review",
  "short-cough-duration-cap",
  "symptom-combination-score",
  "weighted-symptom-score",
]);

const RISK_DECISION_RULES: Record<string, Set<string>> = {
  RED: new Set([
    "difficulty-breathing-override",
    "high-severity-score",
    "older-adult-fever-weakness-override",
    "prolonged-fever-emergency",
    "repeat-assessment-escalation",
    "symptom-count-escalation",
    "young-infant-fever-referral",
  ]),
  YELLOW: new Set([
    "blood-in-stool-health-worker-review",
    "cannot-retain-fluids-review",
    "dehydration-risk-review",
    "first-cluster-like-headache-review",
    "headache-triggered-by-activity-review",
    "high-stool-frequency-review",
    "moderate-severity-score",
    "relative-onset-needs-review",
    "repeat-assessment-escalation",
    "symptom-count-escalation",
    "unclear-symptoms-floor",
  ]),
  GREEN: new Set(["duration-not-provided", "mild-severity-score"]),
};

export function ruleContributedToRisk(name: string, riskLevel: string) {
  if (SCORE_CONTRIBUTING_RULES.has(name)) return true;
  if (name.startsWith("critical:")) return riskLevel === "RED";
  return RISK_DECISION_RULES[riskLevel]?.has(name) ?? false;
}

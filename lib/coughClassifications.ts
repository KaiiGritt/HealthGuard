export interface SymptomClassification {
  en: string;
  tl: string;
  description: string;
  aliases: string[];
  categoryLabel: string;
}

export const COUGH_CLASSIFICATIONS: SymptomClassification[] = [
  {
    en: "Productive cough",
    tl: "Ubo na may plema",
    description: "Produces mucus or phlegm.",
    aliases: ["productive cough", "wet cough"],
    categoryLabel: "Cough type",
  },
  {
    en: "Non-productive cough",
    tl: "Tuyong ubo",
    description: "Occurs without mucus or phlegm.",
    aliases: ["non-productive cough", "dry cough"],
    categoryLabel: "Cough type",
  },
  {
    en: "Cough with phlegm",
    tl: "Ubo na may plema",
    description: "Accompanied by mucus secretion.",
    aliases: ["cough with phlegm", "with phlegm", "cough with sputum"],
    categoryLabel: "Cough type",
  },
  {
    en: "Persistent cough",
    tl: "Matagal na ubo",
    description: "Lasts more than 8 weeks in adults.",
    aliases: ["persistent cough", "chronic cough", "chronic"],
    categoryLabel: "Cough type",
  },
  {
    en: "Acute cough",
    tl: "Biglaang ubo",
    description: "Lasts less than 3 weeks.",
    aliases: ["acute cough", "acute"],
    categoryLabel: "Cough type",
  },
  {
    en: "Subacute cough",
    tl: "Ubo na tumatagal nang ilang linggo",
    description: "Lasts 3–8 weeks.",
    aliases: ["subacute cough", "subacute"],
    categoryLabel: "Cough type",
  },
  {
    en: "Nocturnal cough",
    tl: "Ubo sa gabi",
    description: "Occurs or becomes worse at night.",
    aliases: ["nocturnal cough", "nighttime cough", "night cough"],
    categoryLabel: "Cough type",
  },
  {
    en: "Allergic cough",
    tl: "Ubo na may kaugnayan sa allergy",
    description: "Associated with allergens or allergic irritation.",
    aliases: ["allergic cough", "allergy-related cough"],
    categoryLabel: "Cough type",
  },
];

export const FEVER_CLASSIFICATIONS: SymptomClassification[] = [
  {
    en: "Continuous fever",
    tl: "Laging mataas ang lagnat",
    description: "Temperature remains elevated with little variation.",
    aliases: ["continuous fever"],
    categoryLabel: "Fever pattern",
  },
  {
    en: "Intermittent fever",
    tl: "Pabalik-balik na lagnat",
    description: "Temperature rises and returns to normal periodically.",
    aliases: ["intermittent fever"],
    categoryLabel: "Fever pattern",
  },
  {
    en: "Remittent fever",
    tl: "Pabagu-bagong lagnat",
    description: "Temperature fluctuates but does not return to normal.",
    aliases: ["remittent fever"],
    categoryLabel: "Fever pattern",
  },
  {
    en: "Relapsing fever",
    tl: "Lagnat na nawawala at bumabalik",
    description: "Fever episodes alternate with periods without fever.",
    aliases: ["relapsing fever"],
    categoryLabel: "Fever pattern",
  },
  {
    en: "Recurrent fever",
    tl: "Paulit-ulit na mga episode ng lagnat",
    description: "Multiple separate episodes of fever.",
    aliases: ["recurrent fever"],
    categoryLabel: "Fever pattern",
  },
];

export const HEADACHE_CLASSIFICATIONS: SymptomClassification[] = [
  {
    en: "Tension headache",
    tl: "Sakit ng ulo na parang naiipit o naninikip",
    description: "Pressure or tightness around the head.",
    aliases: ["tension headache", "tension-type headache", "tension-type"],
    categoryLabel: "Headache type",
  },
  {
    en: "Migraine",
    tl: "Migraine",
    description: "Often throbbing pain, sometimes with nausea or sensitivity to light.",
    aliases: ["migraine", "migraine headache", "migraine-type"],
    categoryLabel: "Headache type",
  },
  {
    en: "Cluster headache",
    tl: "Matinding sakit ng ulo sa paligid ng isang mata",
    description: "Severe pain, usually around one eye.",
    aliases: ["cluster headache"],
    categoryLabel: "Headache type",
  },
  {
    en: "Sinus headache",
    tl: "Sakit ng ulo na may pressure sa mukha",
    description: "Facial pressure associated with sinus inflammation.",
    aliases: ["sinus headache"],
    categoryLabel: "Headache type",
  },
  {
    en: "Rebound headache",
    tl: "Sakit ng ulo na kaugnay ng madalas na pag-inom ng gamot sa sakit",
    description: "Headache associated with frequent use of pain medicines.",
    aliases: ["rebound headache", "medication-overuse headache"],
    categoryLabel: "Headache type",
  },
  {
    en: "Neck-related headache",
    tl: "Sakit ng ulo na nagmumula sa leeg",
    description: "Headache that originates from the neck.",
    aliases: ["neck-related headache", "cervicogenic headache"],
    categoryLabel: "Headache type",
  },
  {
    en: "Exercise-triggered headache",
    tl: "Sakit ng ulo na nagsisimula sa pisikal na aktibidad",
    description: "Headache triggered by physical activity.",
    aliases: ["exercise-triggered headache", "exertional headache"],
    categoryLabel: "Headache type",
  },
];

export const ABDOMINAL_PAIN_CLASSIFICATIONS: SymptomClassification[] = [
  {
    en: "Cramping pain",
    tl: "Pananakit na parang pinupulikat",
    description: "Pain that comes and goes in waves.",
    aliases: ["cramping pain", "colicky pain", "cramping / wave-like"],
    categoryLabel: "Abdominal pain type",
  },
  {
    en: "Burning pain",
    tl: "Mahapding pananakit",
    description: "A burning sensation, often in the upper abdomen.",
    aliases: ["burning pain", "burning abdominal pain", "burning"],
    categoryLabel: "Abdominal pain type",
  },
  {
    en: "Sharp pain",
    tl: "Matulis at biglaang pananakit",
    description: "Sudden, stabbing discomfort.",
    aliases: ["sharp pain", "acute sharp pain", "sharp / stabbing"],
    categoryLabel: "Abdominal pain type",
  },
  {
    en: "Dull pain",
    tl: "Mapurol na pananakit",
    description: "A persistent aching sensation.",
    aliases: ["dull pain", "dull abdominal pain", "dull / achy"],
    categoryLabel: "Abdominal pain type",
  },
  {
    en: "Stabbing pain",
    tl: "Matindi at tumutusok na pananakit",
    description: "Intense, piercing pain.",
    aliases: ["stabbing pain", "lancinating pain"],
    categoryLabel: "Abdominal pain type",
  },
  {
    en: "Bloating discomfort",
    tl: "Hindi komportableng pakiramdam dahil sa kabag o paglobo",
    description: "Fullness or pressure from gas or distension.",
    aliases: ["bloating discomfort", "bloating pain", "abdominal distension discomfort"],
    categoryLabel: "Abdominal pain type",
  },
  {
    en: "Gnawing pain",
    tl: "Patuloy na parang kinakagat o nginangatngat na pananakit",
    description: "A persistent, biting or aching sensation.",
    aliases: ["gnawing pain", "gnawing abdominal pain"],
    categoryLabel: "Abdominal pain type",
  },
];

export const BODY_PAIN_CLASSIFICATIONS: SymptomClassification[] = [
  {
    en: "Localized myalgia",
    tl: "Pananakit sa iisang kalamnan o bahagi ng katawan",
    description: "Pain in one specific muscle or body area.",
    aliases: ["localized myalgia", "localized muscle pain", "localised muscle pain"],
    categoryLabel: "Body pain pattern",
  },
  {
    en: "Generalized myalgia",
    tl: "Pananakit na nakakaapekto sa maraming bahagi ng katawan",
    description: "Pain affecting several areas or the whole body.",
    aliases: ["generalized myalgia", "generalized body pain", "widespread body pain"],
    categoryLabel: "Body pain pattern",
  },
  {
    en: "Acute body pain",
    tl: "Maikling panahon ng pananakit ng katawan",
    description: "Short-term pain, usually lasting days.",
    aliases: ["acute body pain", "acute muscle pain"],
    categoryLabel: "Body pain duration",
  },
  {
    en: "Subacute body pain",
    tl: "Pananakit ng katawan na tumatagal ng ilang linggo",
    description: "Pain lasting several weeks.",
    aliases: ["subacute body pain", "subacute muscle pain"],
    categoryLabel: "Body pain duration",
  },
  {
    en: "Chronic body pain",
    tl: "Matagal o paulit-ulit na pananakit ng katawan",
    description: "Persistent or recurring pain over months.",
    aliases: ["chronic body pain", "chronic muscle pain"],
    categoryLabel: "Body pain duration",
  },
  {
    en: "Intermittent pain",
    tl: "Pananakit na pansamantalang umaalis at bumabalik",
    description: "Pain that comes and goes.",
    aliases: ["intermittent pain", "intermittent body pain"],
    categoryLabel: "Body pain pattern",
  },
  {
    en: "Constant pain",
    tl: "Patuloy na pananakit",
    description: "Pain that remains present.",
    aliases: ["constant pain", "constant body pain"],
    categoryLabel: "Body pain pattern",
  },
  {
    en: "Muscle soreness",
    tl: "Pagkahapdi o pagkapagod ng kalamnan",
    description: "Tenderness or stiffness, often after physical activity.",
    aliases: ["muscle soreness", "soreness", "muscle stiffness"],
    categoryLabel: "Body pain type",
  },
];

export const DIARRHEA_CLASSIFICATIONS: SymptomClassification[] = [
  {
    en: "Watery diarrhea",
    tl: "Matubig na pagtatae",
    description: "Loose, liquid-like stools with little or no solid content.",
    aliases: ["watery diarrhea"],
    categoryLabel: "Stool appearance",
  },
  {
    en: "Mushy diarrhea",
    tl: "Malambot at malabnaw na pagtatae",
    description: "Soft, fluffy stools with ragged edges.",
    aliases: ["mushy diarrhea"],
    categoryLabel: "Stool appearance",
  },
  {
    en: "Mucus-containing diarrhea",
    tl: "Pagtatae na may uhog",
    description: "Loose stools containing visible mucus.",
    aliases: ["mucus-containing diarrhea"],
    categoryLabel: "Stool appearance",
  },
  {
    en: "Bloody diarrhea (dysentery)",
    tl: "Pagtatae na may dugo",
    description: "Loose stools containing visible blood, sometimes with mucus.",
    aliases: ["bloody diarrhea (dysentery)"],
    categoryLabel: "Stool appearance",
  },
  {
    en: "Acute diarrhea",
    tl: "Biglaang pagtatae",
    description: "Lasts less than 14 days; sudden onset of frequent loose or watery stools.",
    aliases: ["acute diarrhea"],
    categoryLabel: "Diarrhea classification",
  },
  {
    en: "Persistent diarrhea",
    tl: "Pagtatae nang 14 na araw o higit pa",
    description: "Continues for 14 days or longer.",
    aliases: ["persistent diarrhea"],
    categoryLabel: "Diarrhea classification",
  },
  {
    en: "Chronic diarrhea",
    tl: "Matagal o pabalik-balik na pagtatae",
    description: "Loose stools that last more than 4 weeks or recur over a long period.",
    aliases: ["chronic diarrhea"],
    categoryLabel: "Diarrhea classification",
  },
];

export const RASH_CLASSIFICATIONS: SymptomClassification[] = [
  {
    en: "Skin rash",
    tl: "Pantal sa balat",
    description: "A visible change in the skin that may have many causes.",
    aliases: ["skin rash", "rash"],
    categoryLabel: "Rash classification",
  },
  {
    en: "Redness of skin",
    tl: "Pamumula ng balat",
    description: "Red or irritated-looking skin; redness alone does not identify the cause.",
    aliases: ["redness of skin", "skin redness", "red skin"],
    categoryLabel: "Rash classification",
  },
  {
    en: "Itchiness",
    tl: "Kati",
    description: "An itchy feeling; antihistamines may help some allergic itching or hives, but not every rash.",
    aliases: ["itchiness", "itching", "itchy", "pruritus", "kati"],
    categoryLabel: "Rash classification",
  },
];

export const VOMITING_CLASSIFICATIONS: SymptomClassification[] = [
  {
    en: "Acute vomiting",
    tl: "Biglaang pagsusuka",
    description: "Sudden onset of vomiting lasting less than 7 days.",
    aliases: ["acute vomiting"],
    categoryLabel: "Vomiting duration",
  },
  {
    en: "Persistent vomiting",
    tl: "Patuloy na pagsusuka",
    description: "Vomiting that continues for 7 days or longer.",
    aliases: ["persistent vomiting"],
    categoryLabel: "Vomiting duration",
  },
  {
    en: "Chronic vomiting",
    tl: "Pabalik-balik o matagal na pagsusuka",
    description: "Recurrent or prolonged vomiting over weeks or longer.",
    aliases: ["chronic vomiting"],
    categoryLabel: "Vomiting duration",
  },
  {
    en: "Clear vomiting",
    tl: "Pagsusuka ng malinaw na likido",
    description: "Vomit containing clear fluid, saliva, or gastric secretions.",
    aliases: ["clear vomiting"],
    categoryLabel: "Vomit appearance",
  },
  {
    en: "Bilious vomiting",
    tl: "Pagsusuka ng apdo",
    description: "Yellow or green vomit that may contain bile. Green vomiting, particularly in children, requires urgent medical assessment.",
    aliases: ["bilious vomiting"],
    categoryLabel: "Vomit appearance",
  },
  {
    en: "Food-containing vomiting",
    tl: "Pagsusuka ng pagkain",
    description: "Vomit containing partially digested or undigested food.",
    aliases: ["food-containing vomiting"],
    categoryLabel: "Vomit appearance",
  },
  {
    en: "Coffee-ground vomiting",
    tl: "Pagsusuka ng maitim na butil-butil",
    description: "Dark brown or black granular material that may indicate digested blood.",
    aliases: ["coffee-ground vomiting"],
    categoryLabel: "Vomit appearance",
  },
  {
    en: "Hematemesis (bloody vomiting)",
    tl: "Pagsusuka ng dugo",
    description: "Vomit containing fresh red blood or blood clots; seek emergency medical care.",
    aliases: ["hematemesis (bloody vomiting)"],
    categoryLabel: "Vomit appearance",
  },
];

export const COLD_SYMPTOM_CLASSIFICATIONS: SymptomClassification[] = [
  {
    en: "Sore throat",
    tl: "Masakit ang lalamunan",
    description: "Pain or irritation in the throat.",
    aliases: ["sore throat"],
    categoryLabel: "Cold and allergy symptoms",
  },
  {
    en: "Runny nose",
    tl: "Tumutulong sipon",
    description: "Excessive nasal discharge.",
    aliases: ["runny nose"],
    categoryLabel: "Cold and allergy symptoms",
  },
  {
    en: "Sneezing",
    tl: "Pagbahing",
    description: "Sudden expulsion of air through the nose.",
    aliases: ["sneezing"],
    categoryLabel: "Cold and allergy symptoms",
  },
  {
    en: "Stuffy nose",
    tl: "Baradong ilong",
    description: "Blocked nasal passages.",
    aliases: ["stuffy nose"],
    categoryLabel: "Cold and allergy symptoms",
  },
  {
    en: "Watery eyes",
    tl: "Matubig ang mga mata",
    description: "Excessive tearing.",
    aliases: ["watery eyes"],
    categoryLabel: "Cold and allergy symptoms",
  },
  {
    en: "Nasal itching",
    tl: "Makati ang loob ng ilong",
    description: "Itching inside the nose.",
    aliases: ["nasal itching"],
    categoryLabel: "Cold and allergy symptoms",
  },
  {
    en: "Postnasal drip",
    tl: "Pag-agos ng sipon sa likod ng lalamunan",
    description: "Mucus dripping down the back of the throat.",
    aliases: ["postnasal drip"],
    categoryLabel: "Cold and allergy symptoms",
  },
];

export function getReportedSymptomClassifications(
  symptom: string,
  inputText: string,
): SymptomClassification[] {
  const normalizedSymptom = symptom.trim().toLowerCase();
  const classifications =
    normalizedSymptom === "cough"
      ? COUGH_CLASSIFICATIONS
      : normalizedSymptom === "fever"
        ? FEVER_CLASSIFICATIONS
        : normalizedSymptom === "headache"
          ? HEADACHE_CLASSIFICATIONS
            : normalizedSymptom === "abdominal pain"
              ? ABDOMINAL_PAIN_CLASSIFICATIONS
              : normalizedSymptom === "diarrhea"
                ? DIARRHEA_CLASSIFICATIONS
                : normalizedSymptom === "vomiting"
                  ? VOMITING_CLASSIFICATIONS
                  : normalizedSymptom === "colds / rhinitis"
                    ? COLD_SYMPTOM_CLASSIFICATIONS
                    : normalizedSymptom === "muscle ache / body soreness" || normalizedSymptom === "body pain"
                      ? BODY_PAIN_CLASSIFICATIONS
                      : normalizedSymptom === "rash"
                        ? RASH_CLASSIFICATIONS
                    : [];
  if (classifications.length === 0) return [];

  const parsedTypes = [
    ...inputText.matchAll(
      /\b(?:Cough type|Selected symptom types|Additional symptom details):\s*([^.]*)/gi,
    ),
  ].flatMap((match) => match[1].split(",").map((type) => type.trim().toLowerCase()));

  const found = new Set<SymptomClassification>();
  for (const classification of classifications) {
    if (classification.aliases.some((alias) => parsedTypes.includes(alias))) {
      found.add(classification);
    }
  }

  if (found.size > 0) return [...found];

  for (const classification of classifications) {
    if (classification.aliases.some((alias) => new RegExp(`\\b${alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(inputText))) {
      found.add(classification);
    }
  }

  return [...found];
}

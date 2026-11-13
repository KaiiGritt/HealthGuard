import { localizedText, type InterfaceLanguage } from "../components/LanguageProvider";

export const SYMPTOM_DETAIL_DESCRIPTIONS: Record<
  string,
  { en: string; tl: string }
> = {
  "Thunderclap headache": {
    en: "A sudden, severe headache that reaches its worst within seconds or minutes.",
    tl: "Biglaan at matinding sakit ng ulo na agad lumalala sa loob ng ilang segundo o minuto.",
  },
  Nausea: {
    en: "A queasy feeling or the sensation that you may vomit.",
    tl: "Hindi komportableng pakiramdam sa tiyan o pakiramdam na maaaring sumuka.",
  },
  Retching: {
    en: "Repeated heaving as if vomiting, but little or nothing comes up.",
    tl: "Paulit-ulit na pag-iri o pag-uurong-suka ngunit kaunti o walang nailalabas.",
  },
  Vomiting: {
    en: "Bringing food or fluid up from the stomach through the mouth.",
    tl: "Paglabas ng pagkain o likido mula sa tiyan sa pamamagitan ng pagsusuka.",
  },
  "Frequent stool": {
    en: "Passing stools more often than is usual for the person.",
    tl: "Mas madalas na pagdumi kaysa sa karaniwan para sa tao.",
  },
  "Shortness of breath": {
    en: "A feeling of not getting enough air or being unable to breathe comfortably.",
    tl: "Pakiramdam na kulang ang hangin o hindi komportableng paghinga.",
  },
  Wheezing: {
    en: "A whistling sound while breathing.",
    tl: "Parang sipol na tunog habang humihinga.",
  },
  "Chest tightness": {
    en: "A squeezing, pressure, or tight feeling in the chest.",
    tl: "Pakiramdam ng pagpiga, bigat, o paninikip sa dibdib.",
  },
  "Chest pain": {
    en: "Any pain or discomfort felt in the chest.",
    tl: "Anumang sakit o hindi komportableng pakiramdam sa dibdib.",
  },
  "Cannot breathe deeply": {
    en: "Being unable to take a full, deep breath.",
    tl: "Hindi makalanghap nang buo at malalim.",
  },
  "Continuous fever": {
    en: "Temperature remains elevated with little variation.",
    tl: "Nananatiling mataas ang temperatura at kaunti lamang ang pagbabago.",
  },
  "Intermittent fever": {
    en: "Temperature rises and returns to normal periodically.",
    tl: "Pana-panahong tumataas ang temperatura at bumabalik sa normal.",
  },
  "Remittent fever": {
    en: "Temperature fluctuates but does not return to normal.",
    tl: "Pabagu-bago ang temperatura ngunit hindi bumabalik sa normal.",
  },
  "Relapsing fever": {
    en: "Fever episodes alternate with periods without fever.",
    tl: "Salit-salitan ang mga panahon ng lagnat at walang lagnat.",
  },
  "Recurrent fever": {
    en: "Multiple separate episodes of fever.",
    tl: "Maraming magkakahiwalay na pag-ulit ng lagnat.",
  },
  "Productive cough": {
    en: "Produces mucus or phlegm.",
    tl: "May inilalabas na uhog o plema.",
  },
  "Non-productive cough": {
    en: "Occurs without mucus or phlegm.",
    tl: "Walang inilalabas na uhog o plema.",
  },
  "Cough with phlegm": {
    en: "Accompanied by mucus secretion.",
    tl: "May kasamang paglabas ng uhog o plema.",
  },
  "Persistent cough": {
    en: "Lasts more than 8 weeks in adults.",
    tl: "Tumatagal nang higit sa 8 linggo sa mga nasa hustong gulang.",
  },
  "Acute cough": {
    en: "Lasts less than 3 weeks.",
    tl: "Tumatagal nang wala pang 3 linggo.",
  },
  "Subacute cough": {
    en: "Lasts 3–8 weeks.",
    tl: "Tumatagal nang 3–8 linggo.",
  },
  "Nocturnal cough": {
    en: "Occurs or becomes worse at night.",
    tl: "Nangyayari o lumalala sa gabi.",
  },
  "Allergic cough": {
    en: "Associated with allergens or allergic irritation.",
    tl: "May kaugnayan sa mga allergen o iritasyong dulot ng allergy.",
  },
  "Tension headache": {
    en: "Pressure or tightness around the head.",
    tl: "Pakiramdam ng pressure o paninikip sa paligid ng ulo.",
  },
  Migraine: {
    en: "Often throbbing pain, sometimes with nausea or sensitivity to light.",
    tl: "Madalas na pumipintig na sakit, kung minsan ay may pagduduwal o pagiging sensitibo sa liwanag.",
  },
  "Cluster headache": {
    en: "Severe pain, usually around one eye.",
    tl: "Matinding sakit, karaniwan sa paligid ng isang mata.",
  },
  "Sinus headache": {
    en: "Facial pressure associated with sinus inflammation.",
    tl: "Pressure sa mukha na may kaugnayan sa pamamaga ng sinus.",
  },
  "Rebound headache": {
    en: "Headache associated with frequent use of pain medicines.",
    tl: "Sakit ng ulo na may kaugnayan sa madalas na paggamit ng gamot sa pananakit.",
  },
  "Neck-related headache": {
    en: "Headache that originates from the neck.",
    tl: "Sakit ng ulo na nagmumula sa leeg.",
  },
  "Exercise-triggered headache": {
    en: "Headache triggered by physical activity.",
    tl: "Sakit ng ulo na nagsisimula dahil sa pisikal na aktibidad.",
  },
  "Cramping pain": {
    en: "Pain that comes and goes in waves.",
    tl: "Pananakit na dumarating at nawawala nang paulit-ulit.",
  },
  "Burning pain": {
    en: "A burning sensation, often in the upper abdomen.",
    tl: "Mahapding pakiramdam, kadalasan sa itaas na bahagi ng tiyan.",
  },
  "Sharp pain": {
    en: "Sudden, stabbing discomfort.",
    tl: "Biglaan at matalim na pananakit.",
  },
  "Dull pain": {
    en: "A persistent aching sensation.",
    tl: "Patuloy at mapurol na pananakit.",
  },
  "Stabbing pain": {
    en: "Intense, piercing pain.",
    tl: "Matindi at tumutusok na pananakit.",
  },
  "Bloating discomfort": {
    en: "Fullness or pressure from gas or distension.",
    tl: "Pakiramdam ng kabusugan o pressure dahil sa kabag o paglobo.",
  },
  "Gnawing pain": {
    en: "A persistent, biting or aching sensation.",
    tl: "Patuloy na pananakit na parang kinakagat o nginangatngat.",
  },
  "Localized myalgia": {
    en: "Pain in one specific muscle or body area.",
    tl: "Pananakit sa isang partikular na kalamnan o bahagi ng katawan.",
  },
  "Generalized myalgia": {
    en: "Pain affecting several areas or the whole body.",
    tl: "Pananakit na nakaaapekto sa ilang bahagi o sa buong katawan.",
  },
  "Acute body pain": {
    en: "Short-term pain, usually lasting days.",
    tl: "Panandaliang pananakit na karaniwang tumatagal nang ilang araw.",
  },
  "Subacute body pain": {
    en: "Pain lasting several weeks.",
    tl: "Pananakit na tumatagal nang ilang linggo.",
  },
  "Chronic body pain": {
    en: "Persistent or recurring pain over months.",
    tl: "Patuloy o pabalik-balik na pananakit sa loob ng ilang buwan.",
  },
  "Intermittent pain": {
    en: "Pain that comes and goes.",
    tl: "Pananakit na dumarating at nawawala.",
  },
  "Constant pain": {
    en: "Pain that remains present.",
    tl: "Pananakit na hindi nawawala.",
  },
  "Muscle soreness": {
    en: "Tenderness or stiffness, often after physical activity.",
    tl: "Lambot, kirot, o paninigas ng kalamnan, kadalasan pagkatapos ng pisikal na aktibidad.",
  },
  "Watery diarrhea": {
    en: "Loose, liquid-like stools with little or no solid content.",
    tl: "Malabnaw at matubig na dumi na kaunti o walang buo-buong laman.",
  },
  "Mushy diarrhea": {
    en: "Soft, fluffy stools with ragged edges.",
    tl: "Malambot at malabnaw na dumi na hindi pantay ang mga gilid.",
  },
  "Mucus-containing diarrhea": {
    en: "Loose stools containing visible mucus.",
    tl: "Malabnaw na dumi na may nakikitang uhog.",
  },
  "Bloody diarrhea (dysentery)": {
    en: "Loose stools containing visible blood, sometimes with mucus.",
    tl: "Malabnaw na dumi na may nakikitang dugo, kung minsan ay may uhog din.",
  },
  "Acute diarrhea": {
    en: "Lasts less than 14 days; sudden onset of frequent loose or watery stools.",
    tl: "Wala pang 14 na araw; biglaang madalas na pagdumi ng malabnaw o matubig na dumi.",
  },
  "Persistent diarrhea": {
    en: "Continues for 14 days or longer.",
    tl: "Tumatagal nang 14 na araw o higit pa.",
  },
  "Chronic diarrhea": {
    en: "Loose stools that last more than 4 weeks or recur over a long period.",
    tl: "Malabnaw na dumi na tumatagal nang higit 4 na linggo o bumabalik sa mahabang panahon.",
  },
  "Skin rash": {
    en: "A visible change in the skin that may have many causes.",
    tl: "Nakikitang pagbabago sa balat na maaaring magkaroon ng iba't ibang sanhi.",
  },
  "Redness of skin": {
    en: "Red or irritated-looking skin; redness alone does not identify the cause.",
    tl: "Namumula o mukhang naiiritang balat; hindi sapat ang pamumula lamang upang malaman ang sanhi.",
  },
  Itchiness: {
    en: "An itchy feeling; antihistamines may help some allergic itching or hives, but not every rash.",
    tl: "Pakiramdam ng pangangati; maaaring makatulong ang antihistamine sa ilang pangangating dulot ng allergy o pantal na nakaumbok, ngunit hindi sa lahat ng pantal.",
  },
  "Acute vomiting": {
    en: "Sudden onset of vomiting lasting less than 7 days.",
    tl: "Biglaang pagsusuka na tumatagal nang wala pang 7 araw.",
  },
  "Persistent vomiting": {
    en: "Vomiting that continues for 7 days or longer.",
    tl: "Pagsusukang nagpapatuloy nang 7 araw o higit pa.",
  },
  "Chronic vomiting": {
    en: "Recurrent or prolonged vomiting over weeks or longer.",
    tl: "Pabalik-balik o matagal na pagsusuka sa loob ng ilang linggo o higit pa.",
  },
  "Clear vomiting": {
    en: "Vomit containing clear fluid, saliva, or gastric secretions.",
    tl: "Sukang may malinaw na likido, laway, o likidong mula sa tiyan.",
  },
  "Bilious vomiting": {
    en: "Yellow or green vomit that may contain bile. Green vomiting, particularly in children, requires urgent medical assessment.",
    tl: "Dilaw o berdeng suka na maaaring may apdo. Ang berdeng pagsusuka, lalo na sa bata, ay nangangailangan ng agarang pagpapasuri.",
  },
  "Food-containing vomiting": {
    en: "Vomit containing partially digested or undigested food.",
    tl: "Sukang may bahagyang natunaw o hindi pa natunaw na pagkain.",
  },
  "Coffee-ground vomiting": {
    en: "Dark brown or black granular material that may indicate digested blood.",
    tl: "Maitim na kayumanggi o itim na butil-butil na maaaring senyales ng natunaw na dugo.",
  },
  "Hematemesis (bloody vomiting)": {
    en: "Vomit containing fresh red blood or blood clots; seek emergency medical care.",
    tl: "Sukang may sariwang pulang dugo o namuong dugo; humingi agad ng emergency na pangangalagang medikal.",
  },
  "Sore throat": {
    en: "Pain or irritation in the throat.",
    tl: "Sakit o iritasyon sa lalamunan.",
  },
  "Runny nose": {
    en: "Excessive nasal discharge.",
    tl: "Sobrang pag-agos ng sipon mula sa ilong.",
  },
  Sneezing: {
    en: "Sudden expulsion of air through the nose.",
    tl: "Biglaang pagbuga ng hangin sa pamamagitan ng ilong.",
  },
  "Stuffy nose": {
    en: "Blocked nasal passages.",
    tl: "Baradong daanan ng hangin sa ilong.",
  },
  "Watery eyes": {
    en: "Excessive tearing.",
    tl: "Sobrang pagluha ng mga mata.",
  },
  "Nasal itching": {
    en: "Itching inside the nose.",
    tl: "Pangangati sa loob ng ilong.",
  },
  "Postnasal drip": {
    en: "Mucus dripping down the back of the throat.",
    tl: "Pag-agos ng uhog mula sa ilong papunta sa likod ng lalamunan.",
  },
};

export function getSymptomDetailDescription(
  language: InterfaceLanguage,
  label: string,
  englishFallback?: string,
) {
  const description = SYMPTOM_DETAIL_DESCRIPTIONS[label];
  if (!description) return englishFallback;
  return localizedText(language, englishFallback ?? description.en, description.tl);
}

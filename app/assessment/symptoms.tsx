import {
  IconBrain,
  IconDroplets,
  IconLungs,
  IconStomach,
  IconThermometer,
} from "../components/ui/icons";

// Keep symptom choices and category order shared between both assessment modes.
export const SYMPTOMS = [
  { value: "fever", category: "general", en: "Fever", tl: "Lagnat", icon: <IconThermometer size={18} /> },
  { value: "generalized weakness", category: "general", en: "General weakness", tl: "Pangkalahatang kahinaan", icon: <IconBrain size={18} /> },
  { value: "dehydration", category: "general", en: "Dehydration", tl: "Kakulangan ng tubig sa katawan", icon: <IconDroplets size={18} /> },
  { value: "fatigue", category: "general", en: "Fatigue", tl: "Pagkapagod", icon: <IconBrain size={18} /> },
  { value: "cough", category: "respiratory", en: "Cough", tl: "Ubo", icon: <IconLungs size={18} /> },
  { value: "headache", category: "pain", en: "Headache", tl: "Sakit ng ulo", icon: <IconBrain size={18} /> },
  { value: "abdominal pain", category: "digestive", en: "Abdominal pain", tl: "Pananakit ng tiyan", icon: <IconStomach size={18} /> },
  { value: "vomiting", category: "digestive", en: "Vomiting", tl: "Pagsusuka", icon: <IconDroplets size={18} /> },
  { value: "diarrhea", category: "digestive", en: "Diarrhea", tl: "Pagtatae", icon: <IconDroplets size={18} /> },
  { value: "rash", category: "skin", en: "Rashes", tl: "Pantal", icon: <IconDroplets size={18} /> },
  { value: "colds / rhinitis", category: "respiratory", en: "Cold", tl: "Sipon", icon: <IconLungs size={18} /> },
  { value: "muscle ache / body soreness", category: "pain", en: "Body pain", tl: "Pananakit ng katawan", icon: <IconStomach size={18} /> },
  { value: "difficulty breathing", category: "respiratory", en: "Breathing difficulty", tl: "Hirap huminga", icon: <IconLungs size={18} /> },
] as const;

export const SYMPTOM_CATEGORIES = [
  { key: "general", en: "General", tl: "Pangkalahatan" },
  { key: "respiratory", en: "Respiratory", tl: "Paghinga" },
  { key: "digestive", en: "Digestive", tl: "Pantunaw" },
  { key: "pain", en: "Pain", tl: "Pananakit" },
  { key: "skin", en: "Skin", tl: "Balat" },
] as const;

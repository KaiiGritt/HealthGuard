import { IconCheck } from "@/app/components/ui/icons";
import type { SymptomClassification } from "@/lib/coughClassifications";
import { getMedicalTerm } from "../assessment/medicalTerms";
import MedicalTermLabel from "./MedicalTermLabel";
import ResultText from "./ResultText";

const SYMPTOM_TRANSLATIONS: Record<string, string> = {
  fever: "Lagnat",
  "generalized weakness": "Pangkalahatang panghihina",
  dehydration: "Kakulangan ng tubig sa katawan",
  fatigue: "Pagkapagod",
  cough: "Ubo",
  headache: "Sakit ng ulo",
  "abdominal pain": "Pananakit ng tiyan",
  vomiting: "Pagsusuka",
  diarrhea: "Pagtatae",
  rash: "Pantal",
  "colds / rhinitis": "Sipon",
  "muscle ache / body soreness": "Pananakit ng katawan",
  "difficulty breathing": "Hirap huminga",
};

const CLASSIFICATION_CATEGORY_TRANSLATIONS: Record<string, string> = {
  "Cough type": "Uri ng ubo",
  "Fever type": "Uri ng lagnat",
  "Headache type": "Uri ng sakit ng ulo",
  "Cold and allergy symptoms": "Mga sintomas ng sipon at allergy",
};

interface SymptomSummaryChipProps {
  symptom: string;
  reportedTypes?: SymptomClassification[];
  confidence?: number;
}

export default function SymptomSummaryChip({
  symptom,
  reportedTypes = [],
  confidence,
}: SymptomSummaryChipProps) {
  const filipinoSymptom = SYMPTOM_TRANSLATIONS[symptom.toLowerCase()] ?? symptom;
  const medicalTerm = getMedicalTerm(symptom);
  const confidenceLevel =
    confidence === undefined ? null : confidence >= 0.85 ? "High" : confidence >= 0.65 ? "Medium" : "Low";
  const confidenceFilipino = confidenceLevel === "High" ? "Mataas" : confidenceLevel === "Medium" ? "Katamtaman" : "Mababa";

  return (
    <li className="group inline-flex max-w-full flex-col items-start gap-2 rounded-2xl border border-[#D5E3D2] bg-[linear-gradient(145deg,#FFFFFF_0%,#F3F8F0_100%)] p-3 shadow-[0_5px_16px_rgba(31,74,54,0.055),inset_0_1px_0_rgba(255,255,255,0.9)] transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-[#B9D0B7] hover:shadow-[0_10px_22px_rgba(31,74,54,0.09)]">
      <div className="flex max-w-full flex-wrap items-center gap-2">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[#D3E5D3] bg-white text-[#1D6B4D] shadow-sm" aria-hidden="true">
          <IconCheck size={12} />
        </span>
        <span className="min-w-0 break-words text-sm font-semibold capitalize tracking-[0.01em] text-[#1F4B3D]">
          <ResultText english={symptom} filipino={filipinoSymptom} />
        </span>
        {confidence !== undefined && confidenceLevel && (
          <span
            aria-label={`Text-match confidence: ${confidenceLevel}, ${Math.round(confidence * 100)} percent`}
            className="rounded-full border border-[#DCE7D8] bg-white/90 px-2 py-1 font-mono text-[9px] font-semibold uppercase tracking-[0.08em] text-[#51664F]"
          >
            <ResultText english={`${confidenceLevel} match · ${Math.round(confidence * 100)}%`} filipino={`${confidenceFilipino} · ${Math.round(confidence * 100)}%`} />
          </span>
        )}
      </div>
      {medicalTerm && <MedicalTermLabel term={medicalTerm} />}
      {reportedTypes.map((type) => {
        const typeMedicalTerm = getMedicalTerm(type.en);
        return (
          <div key={type.en} className="flex max-w-full flex-col gap-1 border-t border-[#DCE7D8] pl-1 pt-2">
            <span className="font-mono text-[9px] font-semibold uppercase tracking-[0.12em] text-ink-muted">
              <ResultText
                english={type.categoryLabel}
                filipino={CLASSIFICATION_CATEGORY_TRANSLATIONS[type.categoryLabel] ?? type.categoryLabel}
              />
            </span>
            <span className="min-w-0 break-words text-xs font-semibold text-brand-dark">
              <ResultText english={type.en} filipino={type.tl} />
            </span>
            {typeMedicalTerm && <MedicalTermLabel term={typeMedicalTerm} />}
            <span className="min-w-0 break-words text-xs leading-relaxed text-ink-secondary">
              {type.description}
            </span>
          </div>
        );
      })}
    </li>
  );
}

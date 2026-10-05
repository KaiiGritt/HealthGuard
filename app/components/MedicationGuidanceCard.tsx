import { IconPill } from "@/app/components/ui/icons";

interface MedicationInfo {
  drugName: string;
  dosage: string;
  contraindications: string[];
  sideEffects: string[];
  precautions: string[];
  note: string;
}

interface MedicationGuidanceCardProps {
  riskLevel?: "GREEN" | "YELLOW" | "RED";
  detectedSymptoms?: string[];
  inputText?: string;
  guidance?: MedicationInfo;
}

function validatedMedicationName(detectedSymptoms: string[], inputText: string): string | null {
  const context = `${detectedSymptoms.join(" ")} ${inputText}`.toLowerCase();
  if (context.includes("dry cough")) return "Dextromethorphan or Butamirate";
  if (context.includes("phlegm") || context.includes("productive") || context.includes("with phlegm")) {
    return "Carbocisteine, Ambroxol, or Guaifenesin";
  }
  if (context.includes("heartburn") || context.includes("acid") || context.includes("burning pain")) {
    return "Antacids (Aluminum hydroxide and Magnesium hydroxide)";
  }
  if (context.includes("gas") || context.includes("flatulence")) return "Simethicone";
  if (context.includes("diarrhea") || context.includes("pagtatae")) return "Loperamide or Oral Rehydration Solution (ORS)";
  if (context.includes("vomiting") || context.includes("pagsusuka")) return "Oral Rehydration Solution (ORS)";
  if (context.includes("fever") || context.includes("lagnat") || context.includes("headache") || context.includes("sakit ng ulo")) {
    return "Paracetamol";
  }
  return null;
}

const buildGuidance = (riskLevel: string, detectedSymptoms: string[] = []): MedicationInfo => {
  const normalized = (riskLevel || "GREEN").toUpperCase();
  const hasFever = detectedSymptoms.some((symptom) => symptom.toLowerCase().includes("fever") || symptom.toLowerCase().includes("lagnat"));
  const hasCough = detectedSymptoms.some((symptom) => symptom.toLowerCase().includes("cough") || symptom.toLowerCase().includes("ubo"));

  if (normalized === "YELLOW") {
    return {
      drugName: "Paracetamol (Biogesic / Tempra / Calpol)",
      dosage: "Common adult dose is 500 mg every 4 to 6 hours as needed. Use the lowest effective dose and avoid exceeding the label instructions.",
      contraindications: [
        "Severe liver disease",
        "Known allergy to paracetamol",
        "Taking another medicine that also contains acetaminophen",
      ],
      sideEffects: ["Nausea or stomach upset", "Drowsiness", "Rash in some people"],
      precautions: [
        "Use only as directed and do not continue longer than needed",
        "Avoid alcohol while taking it",
        "Seek advice from a pharmacist or doctor if you are pregnant, breastfeeding, or have kidney or liver issues",
      ],
      note: hasFever
        ? "Good for mild fever and body aches when used according to the label. Follow-up evaluation is still recommended."
        : hasCough
          ? "Useful for low-grade discomfort and fever, but persistent cough should still be evaluated by a health worker."
          : "This is a general supportive option for mild discomfort and low-risk cases; a health worker should still review your symptoms.",
    };
  }

  return {
    drugName: "General Symptom Support",
    dosage: "Follow the product label for the specific medicine you choose, and limit use to the lowest effective dose for the shortest time needed.",
    contraindications: [
      "Known allergy to any ingredient in the medicine",
      "Use with another medicine that has the same active ingredient without professional advice",
      "Severe underlying medical conditions that require clinician review",
    ],
    sideEffects: ["Drowsiness", "Dry mouth", "Mild stomach discomfort"],
    precautions: [
      "Rest and stay hydrated while monitoring symptoms",
      "Avoid driving if it causes drowsiness",
      "Seek assessment if symptoms persist, worsen, or are accompanied by breathing difficulty or severe pain",
    ],
    note: "This is a general supportive recommendation for non-specific symptoms. A clinician should still review unclear or worsening symptoms.",
  };
};

function SectionBlock({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-2xl border border-[#E3E7DC] bg-[#FBFCF9] p-3 shadow-[0_6px_16px_rgba(24,38,25,0.035)] sm:p-4 lg:p-5">
      <h4 className="font-mono text-xs font-semibold uppercase tracking-[0.1em] text-ink-secondary lg:text-sm">{title}</h4>
      <ul className="mt-2 space-y-2 text-[13px] leading-5 text-ink-secondary sm:mt-3 sm:space-y-2.5 sm:text-sm sm:leading-relaxed lg:text-base">
        {items.map((item) => (
          <li key={item} className="flex gap-2">
            <span className="mt-0.5 text-brand" aria-hidden="true">•</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function MedicationCard({ item }: { item: MedicationInfo }) {
  return (
    <article className="rounded-2xl border border-[#DDE7DB] bg-white p-3 shadow-[0_12px_28px_rgba(24,38,25,0.06)] sm:p-4 lg:p-5">
      <div className="flex items-start gap-3 rounded-2xl border border-brand/15 bg-brand-tint/55 p-3 sm:p-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand text-brand-foreground shadow-sm"><IconPill size={18} /></span>
        <div>
          <p className="font-display text-base font-semibold leading-snug text-brand-dark sm:text-lg lg:text-xl">{item.drugName}</p>
        </div>
      </div>
      <div className="mt-3 grid gap-2.5 sm:mt-4 sm:gap-3 lg:grid-cols-2">
        <SectionBlock title="Side effects" items={item.sideEffects} />
        <SectionBlock title="Precautions" items={item.precautions} />
      </div>
    </article>
  );
}

export default function MedicationGuidanceCard({
  riskLevel = "GREEN",
  detectedSymptoms = [],
  inputText = "",
  guidance,
}: MedicationGuidanceCardProps) {
  const computedGuidance = guidance ?? buildGuidance(riskLevel, detectedSymptoms);

  if ((riskLevel || "").toUpperCase() === "RED") {
    return null;
  }

  return (
    <div className="mt-3 space-y-3">
      <MedicationCard item={computedGuidance} />
      <div className="rounded-2xl border border-[#E4C77C] bg-white/55 px-3 py-3 sm:px-4 sm:py-3.5 lg:px-5">
        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-[#966719] lg:text-xs">Important note</p>
        <p className="mt-1 text-xs leading-5 text-ink-muted sm:mt-1.5 sm:leading-relaxed lg:text-sm">
          Check with a pharmacist, doctor, or qualified health worker before taking any medicine. This guide is not a substitute for a proper diagnosis.
        </p>
      </div>
    </div>
  );
}

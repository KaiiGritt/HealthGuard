import { IconPill, IconShield } from "@/app/components/ui/icons";

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
  guidance?: MedicationInfo;
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
    <div className="rounded-2xl border border-[#E3E7DC] bg-[#FBFCF9] p-4 shadow-[0_6px_16px_rgba(24,38,25,0.035)] lg:p-5">
      <h4 className="font-mono text-xs font-semibold uppercase tracking-[0.1em] text-ink-secondary lg:text-sm">{title}</h4>
      <ul className="mt-3 space-y-2.5 text-sm leading-relaxed text-ink-secondary lg:text-base">
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
    <article className="rounded-2xl border border-[#DDE7DB] bg-white p-4 shadow-[0_12px_28px_rgba(24,38,25,0.06)] lg:p-5">
      <div className="flex items-start gap-3 rounded-2xl border border-brand/15 bg-brand-tint/55 p-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand text-brand-foreground shadow-sm"><IconPill size={18} /></span>
        <div>
          <p className="font-display text-lg font-semibold text-brand-dark lg:text-xl">{item.drugName}</p>
          <p className="mt-1 text-sm leading-relaxed text-ink-secondary lg:text-base">{item.dosage}</p>
        </div>
      </div>
      <p className="mt-4 rounded-xl border-l-2 border-brand/50 bg-surface-alt px-4 py-3 text-sm leading-relaxed text-ink-secondary lg:text-base">{item.note}</p>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <SectionBlock title="Contraindications" items={item.contraindications} />
        <SectionBlock title="Side effects" items={item.sideEffects} />
      </div>
      <div className="mt-3">
        <SectionBlock title="Precautions" items={item.precautions} />
      </div>
    </article>
  );
}

export default function MedicationGuidanceCard({
  riskLevel = "GREEN",
  detectedSymptoms = [],
  guidance,
}: MedicationGuidanceCardProps) {
  const computedGuidance = guidance ?? buildGuidance(riskLevel, detectedSymptoms);

  if ((riskLevel || "").toUpperCase() === "RED") {
    return null;
  }

  return (
    <section className="relative mt-6 overflow-hidden rounded-[24px] border border-[#E4C77C] bg-[linear-gradient(135deg,#FFFDF2_0%,#FFF8DC_58%,#FFF4C8_100%)] p-5 shadow-[0_16px_36px_rgba(151,105,22,0.1)] sm:p-6">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#B87A18] via-[#E6B84F] to-[#F3D98D]" aria-hidden="true" />
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[#DDB65B] bg-white/70 text-[#966719] shadow-sm">
          <IconShield size={19} />
        </div>
        <div>
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.13em] text-[#966719]">Use with care</p>
          <h3 className="mt-1 font-display text-xl font-semibold text-ink lg:text-2xl">Pre-medication guidance</h3>
          <p className="mt-1 text-sm leading-relaxed text-ink-secondary lg:text-base">
            Simple safety information for common over-the-counter medicines often used in the Philippines.
          </p>
        </div>
      </div>

      <div className="mt-4">
        <MedicationCard item={computedGuidance} />
      </div>

      <p className="mt-4 text-xs leading-relaxed text-ink-muted lg:text-sm">
        For medical advice, always check with a pharmacist, doctor, or qualified health worker before taking any medicine.
        This guide is not a substitute for a proper diagnosis.
      </p>
    </section>
  );
}

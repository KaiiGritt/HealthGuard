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
    <div className="rounded-md border border-border bg-card p-4 lg:p-5">
      <h4 className="text-base font-semibold text-ink lg:text-lg">{title}</h4>
      <ul className="mt-2 space-y-2 text-base text-ink-muted lg:text-lg">
        {items.map((item) => (
          <li key={item} className="flex gap-2">
            <span className="mt-0.5 text-brand">•</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function MedicationCard({ item }: { item: MedicationInfo }) {
  return (
    <article className="rounded-md border border-border bg-card p-4 lg:p-5">
      <p className="text-base font-semibold text-brand lg:text-xl">{item.drugName}</p>
      <p className="mt-2 text-base text-ink-secondary lg:text-lg">{item.dosage}</p>
      <p className="mt-3 text-base text-ink-muted lg:text-lg">{item.note}</p>
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
    <section className="mt-6 rounded-md border border-triage-yellow/40 bg-yellow-tint p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-full border border-triage-yellow/30 bg-card text-brand">
          <span className="font-mono text-sm lg:text-base">Rx</span>
        </div>
        <div>
          <h3 className="font-display text-xl text-ink lg:text-2xl">Pre-medication guidance</h3>
          <p className="mt-1 text-base text-ink-muted lg:text-lg">
            Simple safety information for common over-the-counter medicines often used in the Philippines.
          </p>
        </div>
      </div>

      <div className="mt-4">
        <MedicationCard item={computedGuidance} />
      </div>

      <p className="mt-4 text-sm leading-relaxed text-ink-faint lg:text-base">
        For medical advice, always check with a pharmacist, doctor, or qualified health worker before taking any medicine.
        This guide is not a substitute for a proper diagnosis.
      </p>
    </section>
  );
}

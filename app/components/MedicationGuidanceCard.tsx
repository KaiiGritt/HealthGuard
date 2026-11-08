"use client";

import { type ReactNode, useEffect, useState } from "react";
import { IconPill } from "@/app/components/ui/icons";
import {
  getAbdominalSupportMedicationCatalog,
  getColdMedicationCatalog,
  getDiarrheaMedicationCatalog,
  getDryCoughMedicationCatalog,
  getHeadacheMedicationCatalog,
  getMedicationCatalogEntry,
  getProductiveCoughMedicationCatalog,
  getRashMedicationCatalog,
  getVomitingMedicationCatalog,
  type MedicationCatalogEntry,
} from "@/lib/api";

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

function MedicationProfileDisclosure({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <details className="mt-3 overflow-hidden rounded-2xl border border-[#DDE7DB] bg-white shadow-[0_6px_18px_rgba(31,74,54,0.045)] sm:mt-4">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-3 text-sm font-semibold text-brand-dark outline-none transition-colors hover:bg-[#FBFCF9] focus-visible:ring-4 focus-visible:ring-brand/15 sm:px-4">
        <span>{title}</span>
        <span className="shrink-0 rounded-full border border-[#D3E2D0] bg-[#F3F8F0] px-2.5 py-1 font-mono text-[9px] font-semibold uppercase tracking-[0.1em] text-brand-dark">
          View details
        </span>
      </summary>
      <div className="space-y-3 border-t border-[#E3E7DC] bg-[#FCFDFB] p-3 sm:space-y-4 sm:p-4 lg:p-5">
        {children}
      </div>
    </details>
  );
}

function MedicationIdentityDetails({
  kind,
  classification,
  commonUse,
}: {
  kind: string;
  classification: string;
  commonUse: string;
}) {
  return (
    <div className="relative mt-3 overflow-hidden rounded-2xl border border-[#D8E5D5] bg-[linear-gradient(145deg,#FFFFFF_0%,#F5F9F1_100%)] p-3 shadow-[0_8px_22px_rgba(31,74,54,0.06)] sm:mt-4 sm:p-4">
      <div className="absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-[#9AB99A] to-transparent" aria-hidden="true" />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-secondary sm:text-xs">Medicine details</h4>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[#CFE0CF] bg-white/85 px-2.5 py-1 font-mono text-[9px] font-semibold uppercase tracking-[0.1em] text-brand-dark shadow-[0_2px_8px_rgba(47,107,79,0.05)] sm:text-[10px]">
          <span className="h-1.5 w-1.5 rounded-full bg-brand" aria-hidden="true" />
          {kind}
        </span>
      </div>
      <dl className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div className="min-w-0 rounded-xl border border-[#E1E9DD] bg-white/85 px-3 py-2.5">
          <dt className="font-mono text-[9px] font-semibold uppercase tracking-[0.1em] text-ink-muted">Guidance type</dt>
          <dd className="mt-0.5 break-words text-sm font-semibold text-ink">{kind}</dd>
        </div>
        <div className="min-w-0 rounded-xl border border-[#CFE0CF] bg-[#F3F8F0] px-3 py-2.5">
          <dt className="font-mono text-[9px] font-semibold uppercase tracking-[0.1em] text-brand-dark">Classification</dt>
          <dd className="mt-0.5 break-words text-sm font-semibold text-brand-dark">{classification}</dd>
        </div>
        <div className="min-w-0 rounded-xl border border-[#E1E9DD] bg-white/85 px-3 py-2.5 sm:col-span-2">
          <dt className="font-mono text-[9px] font-semibold uppercase tracking-[0.1em] text-ink-muted">Common use</dt>
          <dd className="mt-0.5 break-words text-sm leading-relaxed text-ink-secondary">{commonUse}</dd>
        </div>
      </dl>
    </div>
  );
}

function ParacetamolMedicineDetails({ medicine }: { medicine: MedicationCatalogEntry }) {
  return (
    <div className="relative mt-3 overflow-hidden rounded-2xl border border-[#D8E5D5] bg-[linear-gradient(145deg,#FFFFFF_0%,#F5F9F1_100%)] p-3 shadow-[0_8px_22px_rgba(31,74,54,0.06)] sm:mt-4 sm:p-4">
      <div className="absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-[#9AB99A] to-transparent" aria-hidden="true" />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-secondary sm:text-xs">Medicine details</h4>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[#CFE0CF] bg-white/85 px-2.5 py-1 font-mono text-[9px] font-semibold uppercase tracking-[0.1em] text-brand-dark shadow-[0_2px_8px_rgba(47,107,79,0.05)] sm:text-[10px]">
          <span className="h-1.5 w-1.5 rounded-full bg-brand" aria-hidden="true" />
          OTC medicine
        </span>
      </div>
      <dl className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div className="min-w-0 rounded-xl border border-[#E1E9DD] bg-white/85 px-3 py-2.5">
          <dt className="font-mono text-[9px] font-semibold uppercase tracking-[0.1em] text-ink-muted">Generic name</dt>
          <dd className="mt-0.5 break-words text-sm font-semibold text-ink">{medicine.generic_name}</dd>
        </div>
        <div className="min-w-0 rounded-xl border border-[#E1E9DD] bg-white/85 px-3 py-2.5">
          <dt className="font-mono text-[9px] font-semibold uppercase tracking-[0.1em] text-ink-muted">Also known as</dt>
          <dd className="mt-0.5 break-words text-sm font-semibold text-ink">{medicine.alternative_name}</dd>
        </div>
        <div className="min-w-0 rounded-xl border border-[#E1E9DD] bg-white/85 px-3 py-2.5">
          <dt className="font-mono text-[9px] font-semibold uppercase tracking-[0.1em] text-ink-muted">Common brands</dt>
          <dd className="mt-0.5 break-words text-sm font-semibold text-ink">{medicine.common_brands.join(", ")}</dd>
        </div>
        <div className="min-w-0 rounded-xl border border-[#CFE0CF] bg-[#F3F8F0] px-3 py-2.5">
          <dt className="font-mono text-[9px] font-semibold uppercase tracking-[0.1em] text-brand-dark">Drug classification</dt>
          <dd className="mt-0.5 break-words text-sm font-semibold text-brand-dark">{medicine.classification}</dd>
        </div>
      </dl>
    </div>
  );
}

function ParacetamolProfile({ medicine }: { medicine: MedicationCatalogEntry }) {
  return (
    <MedicationProfileDisclosure title="Paracetamol medication information">
        <SectionBlock title="Medical uses / indications" items={medicine.indications} />
        <SectionBlock title="Adult dosage guidance (general)" items={medicine.dosage_guidance} />
        {medicine.medicine_specific_precautions.length > 0 && (
          <SectionBlock title="Medicine-specific precautions" items={medicine.medicine_specific_precautions} />
        )}

        <div className="grid gap-3 lg:grid-cols-2">
          <SectionBlock title="Possible side effects" items={medicine.side_effects} />
          <SectionBlock title="Precautions and warnings" items={medicine.precautions} />
        </div>

        <div className="rounded-xl border border-[#E4C77C] bg-[#FFFDF2] p-3 sm:p-4">
          <h4 className="font-mono text-xs font-semibold uppercase tracking-[0.1em] text-[#966719]">Rare but serious reactions</h4>
          <ul className="mt-2 space-y-2 text-[13px] leading-5 text-ink-secondary sm:text-sm sm:leading-relaxed">
            {medicine.serious_reactions.map((item) => (
              <li key={item} className="flex gap-2">
                <span className="mt-0.5 text-[#966719]" aria-hidden="true">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs leading-relaxed text-ink-secondary sm:text-sm">
            Stop taking it and seek urgent medical attention if a severe allergic or skin reaction occurs.
          </p>
        </div>

        <div className="rounded-xl border border-[#E9B7AD] bg-[#FFF6F4] p-3 sm:p-4">
          <h4 className="font-mono text-xs font-semibold uppercase tracking-[0.1em] text-[#9B3528]">Suspected overdose — get emergency medical help now</h4>
          <ul className="mt-2 space-y-2 text-[13px] leading-5 text-ink-secondary sm:text-sm sm:leading-relaxed">
            {medicine.overdose_guidance.map((item) => (
              <li key={item} className="flex gap-2">
                <span className="mt-0.5 text-[#9B3528]" aria-hidden="true">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
    </MedicationProfileDisclosure>
  );
}

function ProductiveCoughProfile({ medicines }: { medicines: MedicationCatalogEntry[] }) {
  const sharedGuidance = medicines[0];
  if (!sharedGuidance) return null;

  return (
    <MedicationProfileDisclosure title="Productive-cough medicine information">
        <div className="rounded-xl border border-[#D8E5D5] bg-[linear-gradient(145deg,#FFFFFF_0%,#F5F9F1_100%)] p-3 sm:p-4">
          <p className="text-sm font-semibold text-brand-dark">Informational options, not a combination regimen</p>
          <p className="mt-1 text-xs leading-relaxed text-ink-secondary sm:text-sm">
            These medicines are alternatives to discuss with a pharmacist or healthcare professional. Do not start or combine them based on this list alone.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-[#D3E2D0] bg-[#F3F8F0] p-3 sm:p-4">
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-brand-dark">Expectorant</p>
            <p className="mt-1 text-xs leading-relaxed text-ink-secondary sm:text-sm">Helps loosen mucus so it can be coughed out more easily.</p>
          </div>
          <div className="rounded-xl border border-[#DCE5D8] bg-[#FBFCF9] p-3 sm:p-4">
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-secondary">Mucolytic</p>
            <p className="mt-1 text-xs leading-relaxed text-ink-secondary sm:text-sm">Helps make thick mucus thinner and less sticky.</p>
          </div>
        </div>

        <section>
          <h4 className="mb-2 font-mono text-xs font-semibold uppercase tracking-[0.1em] text-ink-secondary">Medicine options</h4>
          <div className="space-y-2">
            {medicines.map((medicine) => (
              <details key={medicine.generic_name} className="group/medicine overflow-hidden rounded-xl border border-[#DDE7DB] bg-white">
                <summary className="cursor-pointer list-none p-3 outline-none transition-colors hover:bg-[#FBFCF9] focus-visible:ring-4 focus-visible:ring-brand/15 sm:p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-display text-sm font-semibold text-ink sm:text-base">{medicine.generic_name}</span>
                    <span className="rounded-full border border-[#D3E2D0] bg-[#F3F8F0] px-2.5 py-1 text-[10px] font-semibold text-brand-dark">{medicine.classification}</span>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-ink-secondary sm:text-sm">{medicine.common_use}</p>
                </summary>
                <div className="grid gap-3 border-t border-[#E3E7DC] bg-[#FCFDFB] p-3 sm:grid-cols-2 sm:p-4">
                  <SectionBlock title="Common dosage forms" items={medicine.dosage_forms} />
                  <SectionBlock title="Possible side effects" items={medicine.side_effects} />
                  <div className="sm:col-span-2">
                    <SectionBlock title="Adult dosage guidance (general)" items={medicine.dosage_guidance} />
                  </div>
                </div>
              </details>
            ))}
          </div>
        </section>

        <SectionBlock title="Medical uses / indications" items={sharedGuidance.indications} />
        <SectionBlock title="Precautions and warnings" items={sharedGuidance.precautions} />

        <div className="rounded-xl border border-[#E4C77C] bg-[#FFFDF2] p-3 sm:p-4">
          <h4 className="font-mono text-xs font-semibold uppercase tracking-[0.1em] text-[#966719]">Rare but serious reactions</h4>
          <ul className="mt-2 space-y-2 text-[13px] leading-5 text-ink-secondary sm:text-sm sm:leading-relaxed">
            {sharedGuidance.serious_reactions.map((item) => (
              <li key={item} className="flex gap-2">
                <span className="mt-0.5 text-[#966719]" aria-hidden="true">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border border-[#E9B7AD] bg-[#FFF6F4] p-3 sm:p-4">
          <h4 className="font-mono text-xs font-semibold uppercase tracking-[0.1em] text-[#9B3528]">Overdose or serious reaction</h4>
          <ul className="mt-2 space-y-2 text-[13px] leading-5 text-ink-secondary sm:text-sm sm:leading-relaxed">
            {sharedGuidance.overdose_guidance.map((item) => (
              <li key={item} className="flex gap-2">
                <span className="mt-0.5 text-[#9B3528]" aria-hidden="true">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
    </MedicationProfileDisclosure>
  );
}

function DryCoughProfile({ medicines }: { medicines: MedicationCatalogEntry[] }) {
  return (
    <MedicationProfileDisclosure title="Dry-cough and allergy medicine information">
      <div className="rounded-xl border border-[#D8E5D5] bg-[linear-gradient(145deg,#FFFFFF_0%,#F5F9F1_100%)] p-3 sm:p-4">
        <p className="text-sm font-semibold text-brand-dark">Informational options, not a combination regimen</p>
        <p className="mt-1 text-xs leading-relaxed text-ink-secondary sm:text-sm">
          These medicines have different uses and are alternatives to discuss with a pharmacist or healthcare professional. Do not start or combine them based on this list alone. OTC status, brands, and formulations vary by product and location.
        </p>
      </div>

      <section>
        <h4 className="mb-2 font-mono text-xs font-semibold uppercase tracking-[0.1em] text-ink-secondary">Medicine options</h4>
        <div className="space-y-2">
          {medicines.map((medicine) => (
            <details key={medicine.generic_name} className="group/medicine overflow-hidden rounded-xl border border-[#DDE7DB] bg-white">
              <summary className="cursor-pointer list-none p-3 outline-none transition-colors hover:bg-[#FBFCF9] focus-visible:ring-4 focus-visible:ring-brand/15 sm:p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-display text-sm font-semibold text-ink sm:text-base">{medicine.generic_name}</span>
                  <span className="rounded-full border border-[#D3E2D0] bg-[#F3F8F0] px-2.5 py-1 text-[10px] font-semibold text-brand-dark">{medicine.classification}</span>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-ink-secondary sm:text-sm">{medicine.common_use}</p>
              </summary>
              <div className="space-y-3 border-t border-[#E3E7DC] bg-[#FCFDFB] p-3 sm:p-4">
                <dl className="grid gap-2 sm:grid-cols-2">
                  <div className="rounded-xl border border-[#E1E9DD] bg-white/85 px-3 py-2.5">
                    <dt className="font-mono text-[9px] font-semibold uppercase tracking-[0.1em] text-ink-muted">Alternative name</dt>
                    <dd className="mt-0.5 text-sm font-medium text-ink-secondary">{medicine.alternative_name || "—"}</dd>
                  </div>
                  <div className="rounded-xl border border-[#E1E9DD] bg-white/85 px-3 py-2.5">
                    <dt className="font-mono text-[9px] font-semibold uppercase tracking-[0.1em] text-ink-muted">Common brand examples</dt>
                    <dd className="mt-0.5 text-sm font-medium text-ink-secondary">{medicine.common_brands.join(", ") || "Varies by product"}</dd>
                  </div>
                </dl>
                <SectionBlock title="Medical uses / indications" items={medicine.indications} />
                <SectionBlock title="Common dosage forms" items={medicine.dosage_forms} />
                <SectionBlock title="Adult dosage guidance (general)" items={medicine.dosage_guidance} />
                <SectionBlock title="Possible side effects" items={medicine.side_effects} />
                <SectionBlock title="Medicine-specific precautions" items={medicine.medicine_specific_precautions} />
                <SectionBlock title="Precautions and warnings" items={medicine.precautions} />
                <SectionBlock title="Rare but serious reactions" items={medicine.serious_reactions} />
                <SectionBlock title="Overdose or emergency guidance" items={medicine.overdose_guidance} />
              </div>
            </details>
          ))}
        </div>
      </section>
    </MedicationProfileDisclosure>
  );
}

function DiarrheaProfile({
  medicines,
  includeOptions,
}: {
  medicines: MedicationCatalogEntry[];
  includeOptions: boolean;
}) {
  const displayedMedicines = includeOptions
    ? medicines
    : medicines.filter((medicine) => medicine.generic_name === "Oral Rehydration Salts (ORS)");

  if (displayedMedicines.length === 0) return null;

  return (
    <MedicationProfileDisclosure title="Diarrhea care and medicine information">
      <div className="rounded-xl border border-[#D8E5D5] bg-[linear-gradient(145deg,#FFFFFF_0%,#F5F9F1_100%)] p-3 sm:p-4">
        <p className="text-sm font-semibold text-brand-dark">ORS is the first-line supportive option</p>
        <p className="mt-1 text-xs leading-relaxed text-ink-secondary sm:text-sm">
          These profiles are for information, not a combined treatment plan. Use oral rehydration salts according to the exact product instructions. Other products are not suitable for everyone and should not delay medical care.
        </p>
      </div>
      <section>
        <h4 className="mb-2 font-mono text-xs font-semibold uppercase tracking-[0.1em] text-ink-secondary">
          {includeOptions ? "Supportive care and medicine references" : "Oral rehydration"}
        </h4>
        <div className="space-y-2">
          {displayedMedicines.map((medicine) => (
            <details key={medicine.generic_name} className="group/medicine overflow-hidden rounded-xl border border-[#DDE7DB] bg-white">
              <summary className="cursor-pointer list-none p-3 outline-none transition-colors hover:bg-[#FBFCF9] focus-visible:ring-4 focus-visible:ring-brand/15 sm:p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-display text-sm font-semibold text-ink sm:text-base">{medicine.generic_name}</span>
                  <span className="rounded-full border border-[#D3E2D0] bg-[#F3F8F0] px-2.5 py-1 text-[10px] font-semibold text-brand-dark">{medicine.classification}</span>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-ink-secondary sm:text-sm">{medicine.common_use}</p>
              </summary>
              <div className="space-y-3 border-t border-[#E3E7DC] bg-[#FCFDFB] p-3 sm:p-4">
                <SectionBlock title="Medical uses / indications" items={medicine.indications} />
                <SectionBlock title="Dosage and administration" items={medicine.dosage_guidance} />
                <SectionBlock title="Common dosage forms" items={medicine.dosage_forms} />
                <div className="grid gap-3 lg:grid-cols-2">
                  <SectionBlock title="Possible side effects" items={medicine.side_effects} />
                  <SectionBlock title="Precautions and warnings" items={medicine.precautions} />
                </div>
                {medicine.medicine_specific_precautions.length > 0 && (
                  <SectionBlock title="Medicine-specific precautions" items={medicine.medicine_specific_precautions} />
                )}
                {medicine.serious_reactions.length > 0 && (
                  <SectionBlock title="Serious reactions" items={medicine.serious_reactions} />
                )}
                {medicine.overdose_guidance.length > 0 && (
                  <SectionBlock title="Overdose or unexpected reaction" items={medicine.overdose_guidance} />
                )}
              </div>
            </details>
          ))}
        </div>
      </section>
      <div className="rounded-xl border border-[#E9B7AD] bg-[#FFF6F4] p-3 sm:p-4">
        <h4 className="font-mono text-xs font-semibold uppercase tracking-[0.1em] text-[#9B3528]">When not to self-medicate</h4>
        <ul className="mt-2 space-y-2 text-[13px] leading-5 text-ink-secondary sm:text-sm sm:leading-relaxed">
          {[
            "Seek medical attention for bloody or black, tarry stools, high fever, severe abdominal pain, persistent vomiting, signs of dehydration, very little or no urine, severe weakness or dizziness.",
            "Seek medical assessment if diarrhea lasts more than 48 hours without improvement.",
            "Do not use loperamide for bloody diarrhea, high fever, or persistent diarrhea unless specifically directed by a clinician.",
          ].map((item) => (
            <li key={item} className="flex gap-2">
              <span className="mt-0.5 text-[#9B3528]" aria-hidden="true">•</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </MedicationProfileDisclosure>
  );
}

function VomitingProfile({
  medicines,
  includeMotionSicknessOption,
}: {
  medicines: MedicationCatalogEntry[];
  includeMotionSicknessOption: boolean;
}) {
  const displayedMedicines = includeMotionSicknessOption
    ? medicines
    : medicines.filter((medicine) => medicine.generic_name === "Oral Rehydration Salts (ORS)");

  if (displayedMedicines.length === 0) return null;

  return (
    <MedicationProfileDisclosure title="Vomiting support and medicine information">
      <div className="rounded-xl border border-[#D8E5D5] bg-[linear-gradient(145deg,#FFFFFF_0%,#F5F9F1_100%)] p-3 sm:p-4">
        <p className="text-sm font-semibold text-brand-dark">ORS supports fluid replacement</p>
        <p className="mt-1 text-xs leading-relaxed text-ink-secondary sm:text-sm">
          Meclizine is included only as pharmacist-guided information for adult motion sickness. It is not a treatment for every cause of vomiting and is not selected automatically.
        </p>
      </div>
      <section>
        <h4 className="mb-2 font-mono text-xs font-semibold uppercase tracking-[0.1em] text-ink-secondary">
          {includeMotionSicknessOption ? "Rehydration and motion-sickness information" : "Oral rehydration"}
        </h4>
        <div className="space-y-2">
          {displayedMedicines.map((medicine) => (
            <details key={medicine.generic_name} className="group/medicine overflow-hidden rounded-xl border border-[#DDE7DB] bg-white">
              <summary className="cursor-pointer list-none p-3 outline-none transition-colors hover:bg-[#FBFCF9] focus-visible:ring-4 focus-visible:ring-brand/15 sm:p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-display text-sm font-semibold text-ink sm:text-base">{medicine.generic_name}</span>
                  <span className="rounded-full border border-[#D3E2D0] bg-[#F3F8F0] px-2.5 py-1 text-[10px] font-semibold text-brand-dark">{medicine.classification}</span>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-ink-secondary sm:text-sm">{medicine.common_use}</p>
              </summary>
              <div className="space-y-3 border-t border-[#E3E7DC] bg-[#FCFDFB] p-3 sm:p-4">
                <SectionBlock title="Medical uses / indications" items={medicine.indications} />
                <SectionBlock title="Common dosage forms" items={medicine.dosage_forms} />
                <SectionBlock title="Dosage and administration" items={medicine.dosage_guidance} />
                <div className="grid gap-3 lg:grid-cols-2">
                  <SectionBlock title="Possible side effects" items={medicine.side_effects} />
                  <SectionBlock title="Precautions and warnings" items={medicine.precautions} />
                </div>
                {medicine.medicine_specific_precautions.length > 0 && (
                  <SectionBlock title="Medicine-specific precautions" items={medicine.medicine_specific_precautions} />
                )}
                {medicine.serious_reactions.length > 0 && (
                  <SectionBlock title="Serious reactions" items={medicine.serious_reactions} />
                )}
                {medicine.overdose_guidance.length > 0 && (
                  <SectionBlock title="Overdose or emergency guidance" items={medicine.overdose_guidance} />
                )}
              </div>
            </details>
          ))}
        </div>
      </section>
      <div className="rounded-xl border border-[#E9B7AD] bg-[#FFF6F4] p-3 sm:p-4">
        <h4 className="font-mono text-xs font-semibold uppercase tracking-[0.1em] text-[#9B3528]">Seek urgent medical assessment</h4>
        <ul className="mt-2 space-y-2 text-[13px] leading-5 text-ink-secondary sm:text-sm sm:leading-relaxed">
          {[
            "Green or bloody vomit, or dark coffee-ground-like material.",
            "Inability to retain fluids, signs of dehydration, severe abdominal pain, or worsening symptoms.",
          ].map((item) => (
            <li key={item} className="flex gap-2">
              <span className="mt-0.5 text-[#9B3528]" aria-hidden="true">•</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </MedicationProfileDisclosure>
  );
}

function ColdMedicationProfile({
  medicines,
  detectedSymptoms,
  inputText,
}: {
  medicines: MedicationCatalogEntry[];
  detectedSymptoms: string[];
  inputText: string;
}) {
  const context = inputText.toLowerCase();
  const symptoms = new Set(detectedSymptoms.map((symptom) => symptom.trim().toLowerCase()));
  const hasCongestion = /\b(?:stuffy nose|nasal congestion|blocked nose)\b/.test(context);
  const hasAllergySymptoms = /\b(?:runny nose|sneezing|watery eyes|nasal itching)\b/.test(context);
  const hasFeverPain = ["fever", "headache", "sore throat"].some((symptom) => symptoms.has(symptom))
    || /\b(?:mild fever|sore throat|headache)\b/.test(context);
  const hasDryCough = symptoms.has("cough") && /\b(?:dry cough|non-productive cough)\b/.test(context);
  const hasProductiveCough = symptoms.has("cough") && /\b(?:productive cough|wet cough|cough with phlegm|cough with sputum)\b/.test(context);
  const ageMatch = context.match(/\baged\s+(\d+)\s+(months?|years?)\b/);
  const isPediatric = ageMatch !== null
    && (ageMatch[2].startsWith("month") ? Number(ageMatch[1]) < 216 : Number(ageMatch[1]) < 18);

  const congestionOptions = new Set(["Pseudoephedrine", "Oxymetazoline", "Xylometazoline", "Phenylephrine"]);
  const allergyOptions = new Set(["Cetirizine", "Loratadine", "Chlorpheniramine"]);
  const displayedMedicines = medicines.filter((medicine) => {
    if (congestionOptions.has(medicine.generic_name)) return hasCongestion;
    if (allergyOptions.has(medicine.generic_name)) return hasAllergySymptoms;
    if (medicine.generic_name === "Paracetamol") return hasFeverPain;
    if (medicine.generic_name === "Dextromethorphan") return hasDryCough;
    if (medicine.generic_name === "Guaifenesin") return hasProductiveCough;
    return false;
  });

  return (
    <MedicationProfileDisclosure title="Cold symptom medicine information">
      <div className="rounded-xl border border-[#D8E5D5] bg-[linear-gradient(145deg,#FFFFFF_0%,#F5F9F1_100%)] p-3 sm:p-4">
        <p className="text-sm font-semibold text-brand-dark">Informational options, not a combination regimen</p>
        <p className="mt-1 text-xs leading-relaxed text-ink-secondary sm:text-sm">
          Only options relevant to the selected symptoms are shown. Adult dose references are not pediatric dosing instructions. Check with a pharmacist about suitability, product formulation, and local registration before use.
        </p>
      </div>
      {displayedMedicines.length > 0 ? (
        <section>
          <h4 className="mb-2 font-mono text-xs font-semibold uppercase tracking-[0.1em] text-ink-secondary">
            {isPediatric ? "Symptom-matched medicine information" : "Adult reference information"}
          </h4>
          <div className="space-y-2">
            {displayedMedicines.map((medicine) => (
              <details key={medicine.generic_name} className="group/medicine overflow-hidden rounded-xl border border-[#DDE7DB] bg-white">
                <summary className="cursor-pointer list-none p-3 outline-none transition-colors hover:bg-[#FBFCF9] focus-visible:ring-4 focus-visible:ring-brand/15 sm:p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-display text-sm font-semibold text-ink sm:text-base">{medicine.generic_name}</span>
                    <span className="rounded-full border border-[#D3E2D0] bg-[#F3F8F0] px-2.5 py-1 text-[10px] font-semibold text-brand-dark">{medicine.classification}</span>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-ink-secondary sm:text-sm">{medicine.common_use}</p>
                </summary>
                <div className="space-y-3 border-t border-[#E3E7DC] bg-[#FCFDFB] p-3 sm:p-4">
                  <SectionBlock title="Medical uses / indications" items={medicine.indications} />
                  <SectionBlock title="Common dosage forms" items={medicine.dosage_forms} />
                  {isPediatric ? (
                    <SectionBlock
                      title="Dosage"
                      items={["Adult dosage information is not shown for a person under 18. Ask a healthcare professional for age- and product-specific advice."]}
                    />
                  ) : (
                    <SectionBlock title="Adult dosage guidance (general)" items={medicine.dosage_guidance} />
                  )}
                  <div className="grid gap-3 lg:grid-cols-2">
                    <SectionBlock title="Possible side effects" items={medicine.side_effects} />
                    <SectionBlock title="Precautions and warnings" items={medicine.precautions} />
                  </div>
                  {medicine.medicine_specific_precautions.length > 0 && (
                    <SectionBlock title="Medicine-specific precautions" items={medicine.medicine_specific_precautions} />
                  )}
                  {medicine.serious_reactions.length > 0 && (
                    <SectionBlock title="Serious reactions" items={medicine.serious_reactions} />
                  )}
                </div>
              </details>
            ))}
          </div>
        </section>
      ) : (
        <p className="rounded-xl border border-[#E3E7DC] bg-[#FBFCF9] p-3 text-sm text-ink-secondary">
          Select a specific cold symptom, such as a stuffy nose, runny nose, fever, or a cough type, to view relevant information. No medicine is selected automatically.
        </p>
      )}
      <SectionBlock
        title="Important safety reminders"
        items={[
          "Do not combine cold products without checking for duplicate paracetamol, antihistamines, or decongestants.",
          "Pseudoephedrine product classification varies; confirm current Philippine registration and availability with a pharmacist.",
          "Oral phenylephrine effectiveness for nasal congestion is uncertain.",
          "Use nasal decongestant sprays only for the product-specific maximum duration to avoid rebound congestion.",
          "Seek medical advice for severe, persistent, or worsening symptoms.",
        ]}
      />
    </MedicationProfileDisclosure>
  );
}

function HeadacheMedicationProfile({
  medicines,
  inputText,
}: {
  medicines: MedicationCatalogEntry[];
  inputText: string;
}) {
  const context = inputText.toLowerCase();
  const ageMatch = context.match(/\baged\s+(\d+)\s+(months?|years?)\b/);
  const isPediatric = ageMatch !== null
    && (ageMatch[2].startsWith("month") ? Number(ageMatch[1]) < 216 : Number(ageMatch[1]) < 18);

  return (
    <MedicationProfileDisclosure title="Headache medicine information">
      <div className="rounded-xl border border-[#D8E5D5] bg-[linear-gradient(145deg,#FFFFFF_0%,#F5F9F1_100%)] p-3 sm:p-4">
        <p className="text-sm font-semibold text-brand-dark">Informational options, not a combination regimen</p>
        <p className="mt-1 text-xs leading-relaxed text-ink-secondary sm:text-sm">
          No medicine is selected automatically. These references are for adults; ask a pharmacist or healthcare professional which option, if any, is suitable.
        </p>
      </div>
      <section>
        <h4 className="mb-2 font-mono text-xs font-semibold uppercase tracking-[0.1em] text-ink-secondary">
          {isPediatric ? "Headache medicine information" : "Adult reference information"}
        </h4>
        <div className="space-y-2">
          {medicines.map((medicine) => (
            <details key={medicine.generic_name} className="group/medicine overflow-hidden rounded-xl border border-[#DDE7DB] bg-white">
              <summary className="cursor-pointer list-none p-3 outline-none transition-colors hover:bg-[#FBFCF9] focus-visible:ring-4 focus-visible:ring-brand/15 sm:p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-display text-sm font-semibold text-ink sm:text-base">{medicine.generic_name}</span>
                  <span className="rounded-full border border-[#D3E2D0] bg-[#F3F8F0] px-2.5 py-1 text-[10px] font-semibold text-brand-dark">{medicine.classification}</span>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-ink-secondary sm:text-sm">{medicine.common_use}</p>
              </summary>
              <div className="space-y-3 border-t border-[#E3E7DC] bg-[#FCFDFB] p-3 sm:p-4">
                <SectionBlock title="Medical uses / indications" items={medicine.indications} />
                <SectionBlock title="Common dosage forms" items={medicine.dosage_forms} />
                {isPediatric ? (
                  <SectionBlock
                    title="Dosage"
                    items={["Adult dosage information is not shown for a person under 18. Ask a healthcare professional for age- and product-specific advice."]}
                  />
                ) : (
                  <SectionBlock title="Adult dosage guidance (general)" items={medicine.dosage_guidance} />
                )}
                <div className="grid gap-3 lg:grid-cols-2">
                  <SectionBlock title="Possible side effects" items={medicine.side_effects} />
                  <SectionBlock title="Precautions and warnings" items={medicine.precautions} />
                </div>
                {medicine.medicine_specific_precautions.length > 0 && (
                  <SectionBlock title="Medicine-specific precautions" items={medicine.medicine_specific_precautions} />
                )}
                {medicine.serious_reactions.length > 0 && (
                  <SectionBlock title="Serious reactions" items={medicine.serious_reactions} />
                )}
              </div>
            </details>
          ))}
        </div>
      </section>
      <SectionBlock
        title="Important safety reminders"
        items={[
          "Do not combine ibuprofen, naproxen, aspirin, or other NSAIDs.",
          "Avoid aspirin in children and teenagers with viral illness and if dengue is suspected.",
          "Seek urgent care for a sudden severe headache, weakness, confusion, vision changes, stiff neck, or repeated vomiting.",
        ]}
      />
    </MedicationProfileDisclosure>
  );
}

function RashMedicationProfile({
  item,
  medicines,
  isItchyRash,
  isSystemicRashReview,
  isUrgentRashReview,
  medicineError,
  inputText,
}: {
  item: MedicationInfo;
  medicines: MedicationCatalogEntry[] | null;
  isItchyRash: boolean;
  isSystemicRashReview: boolean;
  isUrgentRashReview: boolean;
  medicineError: string | null;
  inputText: string;
}) {
  const ageMatch = inputText.toLowerCase().match(/\baged\s+(\d+)\s+(months?|years?)\b/);
  const isPediatric = ageMatch !== null
    && (ageMatch[2].startsWith("month") ? Number(ageMatch[1]) < 216 : Number(ageMatch[1]) < 18);

  return (
    <MedicationProfileDisclosure title="Rash care and medicine information">
      <div className={`rounded-xl border p-3 sm:p-4 ${isSystemicRashReview || isUrgentRashReview ? "border-[#E9B7AD] bg-[linear-gradient(145deg,#FFF9F7_0%,#FFF1ED_100%)]" : "border-[#D8E5D5] bg-[linear-gradient(145deg,#FFFFFF_0%,#F5F9F1_100%)]"}`}>
        <p className={`text-sm font-semibold ${isSystemicRashReview || isUrgentRashReview ? "text-[#913B2D]" : "text-brand-dark"}`}>
          {isUrgentRashReview
            ? "Urgent warning signs reported — seek emergency care now"
            : isSystemicRashReview
              ? "Rash with other symptoms needs medical assessment"
              : "Care depends on the rash type; no medicine is selected automatically"}
        </p>
        <p className="mt-1 text-xs leading-relaxed text-ink-secondary sm:text-sm">{item.note}</p>
      </div>

      {isItchyRash && !isSystemicRashReview && !isUrgentRashReview && medicines && (
        <section>
          <h4 className="mb-2 font-mono text-xs font-semibold uppercase tracking-[0.1em] text-ink-secondary">
            {isPediatric ? "Pharmacist discussion references" : "Adult reference information"}
          </h4>
          <p className="mb-2 text-xs leading-relaxed text-ink-muted">
            These are alternatives for some allergy-related itching or hives, not a combined regimen or treatment for every rash. Ask a pharmacist whether either is appropriate.
          </p>
          <div className="space-y-2">
            {medicines.map((medicine) => (
              <details key={medicine.generic_name} className="group/medicine overflow-hidden rounded-xl border border-[#DDE7DB] bg-white">
                <summary className="cursor-pointer list-none p-3 outline-none transition-colors hover:bg-[#FBFCF9] focus-visible:ring-4 focus-visible:ring-brand/15 sm:p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-display text-sm font-semibold text-ink sm:text-base">{medicine.generic_name}</span>
                    <span className="rounded-full border border-[#D3E2D0] bg-[#F3F8F0] px-2.5 py-1 text-[10px] font-semibold text-brand-dark">{medicine.classification}</span>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-ink-secondary sm:text-sm">{medicine.common_use}</p>
                </summary>
                <div className="space-y-3 border-t border-[#E3E7DC] bg-[#FCFDFB] p-3 sm:p-4">
                  <SectionBlock title="Medical uses / indications" items={medicine.indications} />
                  <SectionBlock title="Common dosage forms" items={medicine.dosage_forms} />
                  {isPediatric ? (
                    <SectionBlock
                      title="Dosage"
                      items={["Adult dosage information is not shown for a person under 18. Ask a healthcare professional for age- and product-specific advice."]}
                    />
                  ) : (
                    <SectionBlock title="Adult dosage guidance (general)" items={medicine.dosage_guidance} />
                  )}
                  <div className="grid gap-3 lg:grid-cols-2">
                    <SectionBlock title="Possible side effects" items={medicine.side_effects} />
                    <SectionBlock title="Precautions and warnings" items={medicine.precautions} />
                  </div>
                  {medicine.medicine_specific_precautions.length > 0 && (
                    <SectionBlock title="Medicine-specific precautions" items={medicine.medicine_specific_precautions} />
                  )}
                  {medicine.serious_reactions.length > 0 && (
                    <SectionBlock title="Serious reactions" items={medicine.serious_reactions} />
                  )}
                </div>
              </details>
            ))}
          </div>
        </section>
      )}
      {isItchyRash && !isSystemicRashReview && !isUrgentRashReview && !medicines && (
        medicineError ? (
          <p className="rounded-xl border border-[#E9B7AD] bg-[#FFF6F4] p-3 text-xs text-[#9B3528]" role="alert">{medicineError}</p>
        ) : (
          <p className="rounded-xl border border-[#E3E7DC] bg-[#FBFCF9] p-3 text-xs text-ink-muted" role="status">
            Loading antihistamine references…
          </p>
        )
      )}
      <SectionBlock title="Precautions, home care and warning signs" items={item.precautions} />
    </MedicationProfileDisclosure>
  );
}

function GeneralMedicationProfile({
  item,
  isDryCough,
}: {
  item: MedicationInfo;
  isDryCough: boolean;
}) {
  return (
    <MedicationProfileDisclosure title={`${item.drugName} information`}>
      <SectionBlock title="Dose and administration" items={[item.dosage]} />
      {item.contraindications.length > 0 && (
        <SectionBlock title="Contraindications" items={item.contraindications} />
      )}
      {item.sideEffects.length > 0 && (
        <SectionBlock title="Possible side effects" items={item.sideEffects} />
      )}
      {item.precautions.length > 0 && (
        <SectionBlock title="Precautions and warnings" items={item.precautions} />
      )}
      {isDryCough && item.note && <SectionBlock title="Medicine options" items={item.note.split("\n")} />}
    </MedicationProfileDisclosure>
  );
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

function AbdominalSupportProfile({ medicines }: { medicines: MedicationCatalogEntry[] }) {
  return (
    <MedicationProfileDisclosure title="Abdominal-support and symptom relief information">
      <div className="space-y-2">
        {medicines.map((medicine) => (
          <details key={medicine.generic_name} className="group/medicine overflow-hidden rounded-xl border border-[#DDE7DB] bg-white">
            <summary className="cursor-pointer list-none p-3 outline-none transition-colors hover:bg-[#FBFCF9] focus-visible:ring-4 focus-visible:ring-brand/15 sm:p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-display text-sm font-semibold text-ink sm:text-base">{medicine.generic_name}</span>
                <span className="rounded-full border border-[#D3E2D0] bg-[#F3F8F0] px-2.5 py-1 text-[10px] font-semibold text-brand-dark">{medicine.classification}</span>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-ink-secondary sm:text-sm">{medicine.common_use}</p>
            </summary>
            <div className="space-y-3 border-t border-[#E3E7DC] bg-[#FCFDFB] p-3 sm:p-4">
              <SectionBlock title="Medical uses / indications" items={medicine.indications} />
              <SectionBlock title="Dosage and administration" items={medicine.dosage_guidance} />
              <SectionBlock title="Common dosage forms" items={medicine.dosage_forms} />
              <div className="grid gap-3 lg:grid-cols-2">
                <SectionBlock title="Possible side effects" items={medicine.side_effects} />
                <SectionBlock title="Precautions and warnings" items={medicine.precautions} />
              </div>
              {medicine.medicine_specific_precautions.length > 0 && (
                <SectionBlock title="Medicine-specific precautions" items={medicine.medicine_specific_precautions} />
              )}
              {medicine.serious_reactions.length > 0 && (
                <SectionBlock title="Serious reactions" items={medicine.serious_reactions} />
              )}
              {medicine.overdose_guidance.length > 0 && (
                <SectionBlock title="Overdose or unexpected reaction" items={medicine.overdose_guidance} />
              )}
            </div>
          </details>
        ))}
      </div>
    </MedicationProfileDisclosure>
  );
}

function MedicationCard({
  item,
  detectedSymptoms = [],
  inputText = "",
}: {
  item: MedicationInfo;
  detectedSymptoms?: string[];
  inputText?: string;
}) {
  const isParacetamol = item.drugName.toLowerCase().includes("paracetamol");
  const isProductiveCough = item.drugName.toLowerCase().includes("productive cough");
  const isDryCough = item.drugName.toLowerCase().includes("dry cough");
  const isMotionSicknessSupport = item.drugName.toLowerCase().includes("motion sickness vomiting support");
  const isColdCare = item.drugName.toLowerCase().includes("cold symptom self-care");
  const isHeadacheCare = item.drugName.toLowerCase().includes("headache symptom self-care");
  const isRashCare = item.drugName.toLowerCase().includes("rash")
    || item.drugName.toLowerCase().includes("itchy skin");
  const isItchyRash = item.drugName.toLowerCase().includes("pharmacist advice for itchy skin");
  const isSystemicRashReview = item.drugName.toLowerCase().includes("rash with systemic symptoms");
  const isUrgentRashReview = item.drugName.toLowerCase().includes("rash warning signs");
  const isAbdominalSupport = item.drugName.toLowerCase().includes("antacids") || item.drugName.toLowerCase().includes("simethicone") || item.drugName.toLowerCase().includes("abdominal") || item.drugName.toLowerCase().includes("heartburn") || item.drugName.toLowerCase().includes("gas");
  const isDiarrheaSupport = item.drugName.toLowerCase().includes("diarrhea supportive care");
  const isOralRehydration = item.drugName.toLowerCase().includes("oral rehydration solution");
  const hasVomiting = detectedSymptoms.some((symptom) => symptom.trim().toLowerCase() === "vomiting");
  const hasDiarrhea = detectedSymptoms.some((symptom) => symptom.trim().toLowerCase() === "diarrhea");
  const isVomiting = isMotionSicknessSupport || (isOralRehydration && hasVomiting);
  const isDiarrhea = isDiarrheaSupport || (isOralRehydration && hasDiarrhea);
  const hasCatalogProfile = isParacetamol || isProductiveCough || isDryCough || isDiarrhea || isVomiting || isColdCare || isHeadacheCare || isAbdominalSupport || isRashCare;
  const classification = isDryCough
    ? "Antitussive / antihistamine options"
    : isProductiveCough
      ? "Expectorant / mucolytic options"
      : isDiarrhea || isVomiting
        ? "Oral rehydration and diarrhea support"
        : isColdCare
          ? "Cold-symptom options"
          : isHeadacheCare
            ? "Headache medicine information"
            : isRashCare
              ? isItchyRash ? "Conditional antihistamine information" : "Non-drug skin care"
            : isAbdominalSupport
              ? "Abdominal-support options"
              : isParacetamol
                ? "Analgesic / antipyretic"
                : "Supportive care";
  const guidanceKind = isDryCough || isProductiveCough
    ? "Medicine options"
    : isDiarrhea || isVomiting
      ? "Supportive care"
      : isColdCare
        ? "Symptom-matched information"
        : isHeadacheCare
          ? "Informational options"
          : isRashCare
            ? "Classification-based rash guidance"
          : isAbdominalSupport
            ? "Abdominal support"
            : isParacetamol
              ? "OTC medicine"
              : "Symptom guidance";
  const commonUse = isDryCough
    ? "Options to discuss for dry cough; these are not a combined regimen."
    : isProductiveCough
      ? "Options to discuss for cough with phlegm; these are not a combined regimen."
      : isDiarrhea || isVomiting
        ? "ORS is the priority; additional products require individual suitability checks."
        : isColdCare
          ? "References matched to reported symptoms; no medicine is chosen automatically."
          : isHeadacheCare
            ? "Adult headache medicine references; no medicine is chosen automatically."
            : isRashCare
              ? "Care depends on the reported rash classification; no medicine is chosen automatically."
          : item.note || "Supportive information based on the reported symptoms.";
  const [medicine, setMedicine] = useState<MedicationCatalogEntry | null>(null);
  const [medicineError, setMedicineError] = useState<string | null>(null);
  const [coughMedicines, setCoughMedicines] = useState<MedicationCatalogEntry[] | null>(null);
  const [coughMedicineError, setCoughMedicineError] = useState<string | null>(null);
  const [dryCoughMedicines, setDryCoughMedicines] = useState<MedicationCatalogEntry[] | null>(null);
  const [dryCoughMedicineError, setDryCoughMedicineError] = useState<string | null>(null);
  const [diarrheaMedicines, setDiarrheaMedicines] = useState<MedicationCatalogEntry[] | null>(null);
  const [diarrheaMedicineError, setDiarrheaMedicineError] = useState<string | null>(null);
  const [vomitingMedicines, setVomitingMedicines] = useState<MedicationCatalogEntry[] | null>(null);
  const [vomitingMedicineError, setVomitingMedicineError] = useState<string | null>(null);
  const [coldMedicines, setColdMedicines] = useState<MedicationCatalogEntry[] | null>(null);
  const [coldMedicineError, setColdMedicineError] = useState<string | null>(null);
  const [headacheMedicines, setHeadacheMedicines] = useState<MedicationCatalogEntry[] | null>(null);
  const [headacheMedicineError, setHeadacheMedicineError] = useState<string | null>(null);
  const [abdominalMedicines, setAbdominalMedicines] = useState<MedicationCatalogEntry[] | null>(null);
  const [abdominalMedicineError, setAbdominalMedicineError] = useState<string | null>(null);
  const [rashMedicines, setRashMedicines] = useState<MedicationCatalogEntry[] | null>(null);
  const [rashMedicineError, setRashMedicineError] = useState<string | null>(null);

  useEffect(() => {
    if (!isParacetamol) return;

    let active = true;
    getMedicationCatalogEntry("Paracetamol").then((entry) => {
      if (active) setMedicine(entry);
    }).catch(() => {
      if (active) setMedicineError("Medication details could not be loaded from the database. Please try again later.");
    });

    return () => {
      active = false;
    };
  }, [isParacetamol]);

  useEffect(() => {
    if (!isProductiveCough) return;

    let active = true;
    getProductiveCoughMedicationCatalog().then((entries) => {
      if (active) setCoughMedicines(entries);
    }).catch(() => {
      if (active) setCoughMedicineError("Productive-cough medicine details could not be loaded. Please try again later.");
    });

    return () => {
      active = false;
    };
  }, [isProductiveCough]);

  useEffect(() => {
    if (!isDryCough) return;

    let active = true;
    getDryCoughMedicationCatalog().then((entries) => {
      if (active) setDryCoughMedicines(entries);
    }).catch(() => {
      if (active) setDryCoughMedicineError("Dry-cough medicine details could not be loaded. Please try again later.");
    });

    return () => {
      active = false;
    };
  }, [isDryCough]);

  useEffect(() => {
    if (!isDiarrhea) return;

    let active = true;
    getDiarrheaMedicationCatalog().then((entries) => {
      if (active) setDiarrheaMedicines(entries);
    }).catch(() => {
      if (active) setDiarrheaMedicineError("Diarrhea medicine information could not be loaded. Please try again later.");
    });

    return () => {
      active = false;
    };
  }, [isDiarrhea]);

  useEffect(() => {
    if (!isVomiting) return;

    let active = true;
    getVomitingMedicationCatalog().then((entries) => {
      if (active) setVomitingMedicines(entries);
    }).catch(() => {
      if (active) setVomitingMedicineError("Vomiting medicine information could not be loaded. Please try again later.");
    });

    return () => {
      active = false;
    };
  }, [isVomiting]);

  useEffect(() => {
    if (!isColdCare) return;

    let active = true;
    getColdMedicationCatalog().then((entries) => {
      if (active) setColdMedicines(entries);
    }).catch(() => {
      if (active) setColdMedicineError("Cold medicine information could not be loaded. Please try again later.");
    });

    return () => {
      active = false;
    };
  }, [isColdCare]);

  useEffect(() => {
    if (!isHeadacheCare) return;

    let active = true;
    getHeadacheMedicationCatalog().then((entries) => {
      if (active) setHeadacheMedicines(entries);
    }).catch(() => {
      if (active) setHeadacheMedicineError("Headache medicine information could not be loaded. Please try again later.");
    });

    return () => {
      active = false;
    };
  }, [isHeadacheCare]);

  useEffect(() => {
    if (!isAbdominalSupport) return;

    let active = true;
    getAbdominalSupportMedicationCatalog().then((entries) => {
      if (active) setAbdominalMedicines(entries);
    }).catch(() => {
      if (active) setAbdominalMedicineError("Abdominal-support medicine information could not be loaded. Please try again later.");
    });

    return () => {
      active = false;
    };
  }, [isAbdominalSupport]);

  useEffect(() => {
    if (!isItchyRash || isSystemicRashReview || isUrgentRashReview) return;

    let active = true;
    getRashMedicationCatalog().then((entries) => {
      if (active) setRashMedicines(entries);
    }).catch(() => {
      if (active) setRashMedicineError("Antihistamine references could not be loaded. Please try again later.");
    });

    return () => {
      active = false;
    };
  }, [isItchyRash, isSystemicRashReview, isUrgentRashReview]);

  return (
    <article className="rounded-2xl border border-[#DDE7DB] bg-white p-3 shadow-[0_12px_28px_rgba(24,38,25,0.06)] sm:p-4 lg:p-5">
      <div className="relative flex min-w-0 items-start gap-3 overflow-hidden rounded-2xl border border-[#D3E2D0] bg-[linear-gradient(135deg,#F5F9F1_0%,#EAF3E8_100%)] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] sm:gap-4 sm:p-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/70 bg-brand text-brand-foreground shadow-[0_6px_14px_rgba(31,74,54,0.18)] sm:h-12 sm:w-12"><IconPill size={19} /></span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-display text-base font-semibold leading-snug text-brand-dark sm:text-lg lg:text-xl">{item.drugName}</p>
            {isParacetamol && <span className="rounded-full border border-[#CFE0CF] bg-white/75 px-2 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-[0.1em] text-brand-dark">Analgesic · Antipyretic</span>}
            {isProductiveCough && <span className="rounded-full border border-[#CFE0CF] bg-white/75 px-2 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-[0.1em] text-brand-dark">Productive cough</span>}
            {isDryCough && <span className="rounded-full border border-[#CFE0CF] bg-white/75 px-2 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-[0.1em] text-brand-dark">Dry cough</span>}
            {isDiarrhea && <span className="rounded-full border border-[#CFE0CF] bg-white/75 px-2 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-[0.1em] text-brand-dark">Diarrhea support</span>}
            {isVomiting && <span className="rounded-full border border-[#CFE0CF] bg-white/75 px-2 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-[0.1em] text-brand-dark">Vomiting support</span>}
            {isColdCare && <span className="rounded-full border border-[#CFE0CF] bg-white/75 px-2 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-[0.1em] text-brand-dark">Cold symptoms</span>}
            {isHeadacheCare && <span className="rounded-full border border-[#CFE0CF] bg-white/75 px-2 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-[0.1em] text-brand-dark">Headache</span>}
            {isAbdominalSupport && <span className="rounded-full border border-[#CFE0CF] bg-white/75 px-2 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-[0.1em] text-brand-dark">Abdominal support</span>}
            {isRashCare && <span className="rounded-full border border-[#CFE0CF] bg-white/75 px-2 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-[0.1em] text-brand-dark">Rash care</span>}
          </div>
          {isParacetamol && medicine && <ParacetamolMedicineDetails medicine={medicine} />}
          {(isProductiveCough || isDryCough || isDiarrhea || isColdCare || isHeadacheCare || isRashCare) && (
            <MedicationIdentityDetails
              kind={guidanceKind}
              classification={classification}
              commonUse={commonUse}
            />
          )}
          {!hasCatalogProfile && (
            <MedicationIdentityDetails
              kind={guidanceKind}
              classification={classification}
              commonUse={commonUse}
            />
          )}
          {isParacetamol && !medicine && !medicineError && (
            <p className="mt-2 text-xs text-ink-muted" role="status">Loading medicine details…</p>
          )}
          {isParacetamol && medicineError && (
            <p className="mt-2 text-xs text-[#9B3528]" role="alert">{medicineError}</p>
          )}
        </div>
      </div>
      {item.note && isParacetamol && (
        <div className="mt-3 rounded-2xl border border-[#E3E7DC] bg-[#FBFCF9] p-3 sm:mt-4 sm:p-4 lg:p-5">
          <h4 className="font-mono text-xs font-semibold uppercase tracking-[0.1em] text-ink-secondary lg:text-sm">
            Guidance
          </h4>
          <p className="mt-2 whitespace-pre-line text-[13px] leading-5 text-ink-secondary sm:text-sm sm:leading-relaxed lg:text-base">{item.note}</p>
        </div>
      )}
      {isParacetamol && medicine && <ParacetamolProfile medicine={medicine} />}
      {isProductiveCough && coughMedicines && <ProductiveCoughProfile medicines={coughMedicines} />}
      {isProductiveCough && !coughMedicines && !coughMedicineError && (
        <p className="mt-3 text-xs text-ink-muted" role="status">Loading medicine information…</p>
      )}
      {isProductiveCough && coughMedicineError && (
        <p className="mt-3 text-xs text-[#9B3528]" role="alert">{coughMedicineError}</p>
      )}
      {isDryCough && dryCoughMedicines && <DryCoughProfile medicines={dryCoughMedicines} />}
      {isDryCough && !dryCoughMedicines && !dryCoughMedicineError && (
        <p className="mt-3 text-xs text-ink-muted" role="status">Loading medicine information…</p>
      )}
      {isDryCough && dryCoughMedicineError && (
        <p className="mt-3 text-xs text-[#9B3528]" role="alert">{dryCoughMedicineError}</p>
      )}
      {isDiarrhea && diarrheaMedicines && (
        <DiarrheaProfile medicines={diarrheaMedicines} includeOptions={isDiarrheaSupport} />
      )}
      {isDiarrhea && !diarrheaMedicines && !diarrheaMedicineError && (
        <p className="mt-3 text-xs text-ink-muted" role="status">Loading diarrhea care information…</p>
      )}
      {isDiarrhea && diarrheaMedicineError && (
        <p className="mt-3 text-xs text-[#9B3528]" role="alert">{diarrheaMedicineError}</p>
      )}
      {isVomiting && vomitingMedicines && (
        <VomitingProfile medicines={vomitingMedicines} includeMotionSicknessOption={isMotionSicknessSupport} />
      )}
      {isVomiting && !vomitingMedicines && !vomitingMedicineError && (
        <p className="mt-3 text-xs text-ink-muted" role="status">Loading vomiting care information…</p>
      )}
      {isVomiting && vomitingMedicineError && (
        <p className="mt-3 text-xs text-[#9B3528]" role="alert">{vomitingMedicineError}</p>
      )}
      {isColdCare && coldMedicines && (
        <ColdMedicationProfile
          medicines={coldMedicines}
          detectedSymptoms={detectedSymptoms}
          inputText={inputText}
        />
      )}
      {isColdCare && !coldMedicines && !coldMedicineError && (
        <p className="mt-3 text-xs text-ink-muted" role="status">Loading cold symptom information…</p>
      )}
      {isColdCare && coldMedicineError && (
        <p className="mt-3 text-xs text-[#9B3528]" role="alert">{coldMedicineError}</p>
      )}
      {isHeadacheCare && headacheMedicines && (
        <HeadacheMedicationProfile medicines={headacheMedicines} inputText={inputText} />
      )}
      {isHeadacheCare && !headacheMedicines && !headacheMedicineError && (
        <p className="mt-3 text-xs text-ink-muted" role="status">Loading headache medicine information…</p>
      )}
      {isHeadacheCare && headacheMedicineError && (
        <p className="mt-3 text-xs text-[#9B3528]" role="alert">{headacheMedicineError}</p>
      )}
      {isRashCare && (
        <RashMedicationProfile
          item={item}
          medicines={rashMedicines}
          isItchyRash={isItchyRash}
          isSystemicRashReview={isSystemicRashReview}
          isUrgentRashReview={isUrgentRashReview}
          medicineError={rashMedicineError}
          inputText={inputText}
        />
      )}
      {!hasCatalogProfile && <GeneralMedicationProfile item={item} isDryCough={isDryCough} />}
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
      <MedicationCard
        item={computedGuidance}
        detectedSymptoms={detectedSymptoms}
        inputText={inputText}
      />
      <div className="rounded-2xl border border-[#E4C77C] bg-white/55 px-3 py-3 sm:px-4 sm:py-3.5 lg:px-5">
        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-[#966719] lg:text-xs">Important note</p>
        <p className="mt-1 text-xs leading-5 text-ink-muted sm:mt-1.5 sm:leading-relaxed lg:text-sm">
          Check with a pharmacist, doctor, or qualified health worker before taking any medicine. This guide is not a substitute for a proper diagnosis.
        </p>
      </div>
    </div>
  );
}

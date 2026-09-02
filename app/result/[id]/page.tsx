import Link from "next/link";
import { notFound } from "next/navigation";
import { IconCheck } from "@/app/components/ui/icons";
import {
  Card,
  PageMain,
  PrimaryLink,
} from "@/app/components/ui/primitives";
import { getAssessment } from "@/lib/api";
import Disclaimer from "../../components/Disclaimer";
import MedicationGuidanceCard from "../../components/MedicationGuidanceCard";
import PageHeader from "../../components/PageHeader";
import RiskCard from "../../components/RiskCard";

const MESSAGES: Record<string, string> = {
  GREEN: "Your symptoms appear mild. / Mukhang banayad ang iyong mga sintomas.",
  YELLOW: "You may need a consultation. / Maaaring kailangan mong kumonsulta.",
  RED: "Go to the nearest hospital now. / Pumunta agad sa pinakamalapit na ospital.",
};

export default async function ResultPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let record;
  try {
    record = await getAssessment(id);
  } catch {
    notFound();
  }

  const created = new Date(record.created_at).toLocaleString();

  return (
    <>
      <PageHeader />
      <PageMain narrow className="max-w-5xl">
        <div className="mb-6 border-b border-border pb-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-brand">HealthGuard clinical summary</p>
              <h1 className="mt-2 font-display text-3xl font-semibold leading-tight text-ink sm:text-4xl">Assessment result</h1>
            </div>
            <div className="text-left sm:text-right">
              <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-faint">Recorded</p>
              <p className="mt-1 text-sm text-ink-muted">{created}</p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
          <Card className="overflow-hidden rounded-[24px] border border-[#dfe7dc] bg-[linear-gradient(180deg,#ffffff_0%,#f8faf5_100%)] p-4 shadow-[0_20px_55px_rgba(15,23,42,0.06)] sm:p-6 lg:p-7">
            <div className="mt-0">
              <RiskCard
                level={record.risk_level}
                message={MESSAGES[record.risk_level] ?? ""}
                recommendation={record.recommendation}
              />
            </div>

            <section className="mt-6 rounded-[18px] border border-[#e2e8db] bg-white/80 p-4 sm:p-5">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-mono text-xs font-semibold uppercase tracking-[0.1em] text-ink-faint lg:text-sm">Condition summary</h3>
                <span className="text-xs text-ink-muted">{record.detected_symptoms.length} noted</span>
              </div>
              {record.detected_symptoms.length > 0 ? (
                <ul className="mt-4 flex flex-wrap gap-2">
                  {record.detected_symptoms.map((s) => (
                    <li
                      key={s}
                      className="flex items-center gap-1.5 rounded-md border border-[#c9d8cb] bg-[#f1f7f0] px-3 py-2 text-sm font-semibold capitalize text-brand-dark"
                    >
                      <IconCheck size={16} />
                      {s}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-sm leading-relaxed text-ink-muted">No recognized symptoms were found in the information provided.</p>
              )}
            </section>

            <section className="mt-4 rounded-[18px] border border-[#e2e8db] bg-white/80 p-4 sm:p-5">
              <h3 className="font-mono text-xs font-semibold uppercase tracking-[0.1em] text-ink-faint lg:text-sm">Clinical explanation</h3>
              <p className="mt-3 text-base leading-7 text-ink-secondary">{record.reason}</p>
              {record.input_text && (
                <p className="mt-4 border-t border-border/70 pt-3 text-sm leading-relaxed text-ink-faint">
                  Reported information: <span className="italic text-ink-muted">“{record.input_text}”</span>
                </p>
              )}
            </section>

            {record.risk_level !== "RED" && (
              <MedicationGuidanceCard
                riskLevel={record.risk_level}
                detectedSymptoms={record.detected_symptoms}
                guidance={
                  record.pre_medication
                    ? {
                        drugName: record.pre_medication.medication_name,
                        dosage: record.pre_medication.dosage,
                        contraindications: record.pre_medication.contraindications,
                        sideEffects: record.pre_medication.side_effects,
                        precautions: record.pre_medication.precautions,
                        note: record.pre_medication.note,
                      }
                    : undefined
                }
              />
            )}

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <PrimaryLink href="/assessment" className="min-h-12 flex-1 rounded-xl shadow-[0_12px_28px_rgba(47,107,79,0.15)]">
                New assessment
              </PrimaryLink>
              <Link
                href="/history"
                className="flex min-h-12 flex-1 items-center justify-center rounded-xl border border-[#dfe7dc] bg-white font-medium text-ink-secondary transition hover:border-brand/50 hover:bg-brand-tint"
              >
                View history
              </Link>
            </div>

            <Disclaimer className="mt-6" />
          </Card>

          <aside className="space-y-6">
            <div className="overflow-hidden rounded-[28px] border border-[#dfe7dc] bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.16),_transparent_28%),linear-gradient(135deg,#183D2D_0%,#1F4A36_42%,#2E6A52_100%)] p-6 text-brand-foreground shadow-[0_22px_60px_rgba(26,93,82,0.24)]">
              <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-brand-muted">Irosin emergency</p>
              <h2 className="mt-3 font-display text-2xl font-semibold leading-tight">Call if symptoms worsen</h2>
              <div className="mt-5 space-y-3">
                <div className="rounded-2xl border border-white/20 bg-white/5 p-3">
                  <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-brand-muted">Emergency hotline</p>
                  <p className="mt-1 text-xl font-semibold">911</p>
                </div>
                <div className="rounded-2xl border border-white/20 bg-white/5 p-3">
                  <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-brand-muted">Ambulance / rescue</p>
                  <p className="mt-1 text-xl font-semibold">117</p>
                </div>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-brand-foreground/80">
                For Irosin residents, these available response channels are the fastest route for urgent transfer and emergency assistance.
              </p>
            </div>

            <div className="rounded-[28px] border border-[#dfe7dc] bg-[linear-gradient(180deg,#ffffff_0%,#f8faf5_100%)] p-6 shadow-[0_18px_40px_rgba(15,23,42,0.04)]">
              <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-faint">What to do now</p>
              <ul className="mt-4 space-y-3 text-sm leading-relaxed text-ink-secondary">
                <li className="flex gap-3">
                  <span className="mt-1 h-2.5 w-2.5 rounded-full bg-brand" />
                  Rest, hydrate, and monitor your symptoms closely.
                </li>
                <li className="flex gap-3">
                  <span className="mt-1 h-2.5 w-2.5 rounded-full bg-yellow-500" />
                  Follow-up with a barangay health worker or clinic if symptoms remain active.
                </li>
                <li className="flex gap-3">
                  <span className="mt-1 h-2.5 w-2.5 rounded-full bg-red-500" />
                  If breathing is difficult, chest pain is severe, or you feel faint, call emergency services immediately.
                </li>
              </ul>
            </div>
          </aside>
        </div>
      </PageMain>
    </>
  );
}

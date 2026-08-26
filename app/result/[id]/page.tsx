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
  GREEN: "Your symptoms appear mild. Continue monitoring your condition.",
  YELLOW: "You may need a consultation.",
  RED: "Seek immediate medical attention.",
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
      <PageMain narrow className="max-w-4xl">
        <Card>
          <p className="font-mono text-sm uppercase tracking-wide text-ink-faint lg:text-base">Assessment result · {created}</p>

          <div className="mt-5">
            <RiskCard
              level={record.risk_level}
              message={MESSAGES[record.risk_level] ?? ""}
              recommendation={record.recommendation}
            />
          </div>

          <section className="mt-6 rounded-md border border-border bg-surface p-5 lg:p-6">
            <h3 className="font-mono text-xs uppercase tracking-wide text-ink-faint lg:text-sm">Detected symptoms</h3>
            {record.detected_symptoms.length > 0 ? (
              <ul className="mt-3 flex flex-wrap gap-2.5">
                {record.detected_symptoms.map((s) => (
                  <li
                    key={s}
                    className="flex items-center gap-1.5 rounded-sm bg-brand/10 px-3 py-1.5 text-base font-medium capitalize text-brand lg:text-lg"
                  >
                    <IconCheck size={16} />
                    {s}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-base text-ink-muted lg:text-lg">No known symptoms were recognized in your input.</p>
            )}
          </section>

          <section className="mt-4 rounded-md border border-border bg-surface p-5 lg:p-6">
            <h3 className="font-mono text-xs uppercase tracking-wide text-ink-faint lg:text-sm">Why this result</h3>
            <p className="mt-2 text-base leading-relaxed text-ink-secondary lg:text-lg">{record.reason}</p>
            {record.input_text && (
              <p className="mt-3 text-base text-ink-faint lg:text-lg">
                You entered: <span className="italic text-ink-muted">“{record.input_text}”</span>
              </p>
            )}
          </section>

          {record.risk_level !== "RED" && <MedicationGuidanceCard />}

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <PrimaryLink href="/assessment" className="min-h-12 flex-1">
              New assessment
            </PrimaryLink>
            <Link
              href="/history"
              className="flex min-h-12 flex-1 items-center justify-center rounded-sm border border-border font-medium text-ink-secondary transition hover:border-brand/50 hover:bg-brand-tint"
            >
              View history
            </Link>
          </div>

          <Disclaimer className="mt-6" />
        </Card>
      </PageMain>
    </>
  );
}

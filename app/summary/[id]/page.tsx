import { notFound } from "next/navigation";
import { Card, PageMain, TriageBadge } from "@/app/components/ui/primitives";
import { formatAssessmentRecordNumber, getAssessment, type AssessmentOut } from "@/lib/api";
import PageHeader from "@/app/components/PageHeader";

function formatSubmittedAt(value: string) {
	const normalized = /(?:Z|[+-]\d{2}:?\d{2})$/.test(value) ? value : `${value}Z`;
	return new Date(normalized).toLocaleString();
}

export default async function SummaryPage({ params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;
	let record: AssessmentOut;

	try {
		record = await getAssessment(id);
	} catch {
		notFound();
	}

	return (
		<>
			<PageHeader />
			<div className="premium-page min-h-screen">
				<PageMain narrow className="max-w-3xl">
					<Card className="overflow-hidden rounded-[24px] border border-[#dfe7dc] bg-[linear-gradient(180deg,#ffffff_0%,#f8faf5_100%)] p-5 shadow-[0_20px_55px_rgba(15,23,42,0.06)] sm:p-7">
						<div className="border-b border-[#e2e9dd] pb-5">
							<p className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-brand">HealthGuard summary</p>
							<h1 className="mt-2 font-display text-3xl font-semibold leading-tight text-ink">{record.resident_name ?? "Resident assessment"}</h1>
							<p className="mt-2 font-mono text-xs font-semibold uppercase tracking-[0.12em] text-ink-faint">Record no. {formatAssessmentRecordNumber(record.id)}</p>
						</div>

						<div className="mt-5 flex items-center justify-between gap-3 rounded-2xl border border-border-soft bg-white/80 px-4 py-3">
							<span className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-faint">Risk level</span>
							<span><TriageBadge level={record.risk_level} /></span>
						</div>

						<dl className="mt-5 grid gap-4 border-b border-[#e2e9dd] pb-5 sm:grid-cols-2">
							<div>
								<dt className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-faint">Location</dt>
								<dd className="mt-1 text-sm font-medium text-ink-secondary">{record.barangay ?? "Not provided"}</dd>
							</div>
							<div>
								<dt className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-faint">Mobile number</dt>
								<dd className="mt-1 text-sm font-medium text-ink-secondary">{record.phone_number ?? "Not provided"}</dd>
							</div>
						</dl>

						<div className="mt-5 space-y-5">
							<div>
								<p className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-faint">Symptoms recognized</p>
								<p className="mt-1 text-sm font-medium capitalize text-ink-secondary">{record.detected_symptoms.length > 0 ? record.detected_symptoms.join(", ") : "Not recorded"}</p>
							</div>
							<div>
								<p className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-faint">Submitted details</p>
								<p className="mt-1 text-sm leading-relaxed text-ink-secondary">{record.input_text || "No details provided."}</p>
							</div>
							<div>
								<p className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-faint">Submitted</p>
								<p className="mt-1 text-sm text-ink-secondary">{formatSubmittedAt(record.created_at)}</p>
							</div>
						</div>
					</Card>
				</PageMain>
			</div>
		</>
	);
}

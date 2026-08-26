import Link from "next/link";
import { getHistory } from "@/lib/api";
import {
  Card,
  ErrorAlert,
  PageMain,
  PageTitle,
  PrimaryLink,
  TriageBadge,
} from "@/app/components/ui/primitives";
import PageHeader from "../components/PageHeader";

export default async function HistoryPage() {
  let rows;
  try {
    rows = await getHistory();
  } catch {
    rows = null;
  }

  return (
    <>
      <PageHeader />
      <PageMain narrow>
        <Card>
          <PageTitle subtitle="Your recent symptom checks and their results.">Assessment history</PageTitle>

          {rows === null ? (
            <div className="mt-8">
              <ErrorAlert>Could not load history. Is the backend running?</ErrorAlert>
            </div>
          ) : rows.length === 0 ? (
            <div className="mt-8 rounded-md border border-dashed border-border bg-surface p-8 text-center">
              <p className="text-ink-muted">No assessments yet.</p>
              <PrimaryLink href="/assessment" className="mt-4">
                Start your first assessment
              </PrimaryLink>
            </div>
          ) : (
            <>
            <div className="mt-8 hidden overflow-hidden rounded-md border border-border bg-card md:block">
              <table className="w-full text-left text-base lg:text-lg">
                <thead className="bg-surface font-mono text-sm uppercase tracking-wide text-ink-muted">
                  <tr>
                    <th className="px-5 py-4">Date</th>
                    <th className="px-5 py-4">Symptoms</th>
                    <th className="px-5 py-4">Risk</th>
                    <th className="px-5 py-4">Result</th>
                    <th className="px-5 py-4">Recommendation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rows.map((r) => (
                    <tr key={r.id} className="hover:bg-surface">
                      <td className="whitespace-nowrap px-5 py-4 text-ink-muted">
                        {new Date(r.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-4 capitalize text-ink-secondary">
                        {r.detected_symptoms.length ? r.detected_symptoms.join(", ") : "—"}
                      </td>
                      <td className="px-5 py-4">
                        <TriageBadge level={r.risk_level} />
                      </td>
                      <td className="px-5 py-4">
                        <Link
                          href={`/result/${r.id}`}
                          className="inline-flex items-center rounded-sm border border-brand/30 bg-brand/5 px-3 py-2 text-sm font-medium text-brand transition hover:bg-brand/10"
                        >
                          View result
                        </Link>
                      </td>
                      <td className="px-5 py-4 text-ink-muted">{r.recommendation}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-8 space-y-3 md:hidden">
              {rows.map((r) => (
                <Link key={r.id} href={`/result/${r.id}`} className="block rounded-md border border-border bg-surface p-4 transition hover:border-brand/40">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-mono text-xs uppercase tracking-wide text-ink-muted">{new Date(r.created_at).toLocaleDateString()}</p>
                      <p className="mt-2 text-base font-medium capitalize text-ink">{r.detected_symptoms.length ? r.detected_symptoms.join(", ") : "No known symptoms"}</p>
                    </div>
                    <TriageBadge level={r.risk_level} />
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-ink-muted">{r.recommendation}</p>
                  <p className="mt-3 font-mono text-xs uppercase tracking-wide text-brand">Open full result →</p>
                </Link>
              ))}
            </div>
            </>
          )}
        </Card>
      </PageMain>
    </>
  );
}

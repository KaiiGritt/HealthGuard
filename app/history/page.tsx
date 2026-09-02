import Link from "next/link";
import { getHistory, getMe } from "@/lib/api";
import { redirect } from "next/navigation";
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
  const user = await getMe();
  if (!user) redirect("/login?next=/history");
  if (user.role !== "resident") redirect(user.role === "admin" ? "/admin" : "/dashboard");

  let rows;
  try {
    rows = await getHistory();
  } catch {
    rows = null;
  }

  return (
    <div className="premium-page min-h-screen">
      <PageHeader />
      <PageMain narrow>
        <Card className="relative overflow-hidden rounded-[28px] border border-[#DDE7DB] bg-[linear-gradient(135deg,#FFFFFF_0%,#FBFCF9_58%,#F1F5EE_100%)] p-5 shadow-[0_24px_60px_rgba(15,23,42,0.07)] sm:p-7 lg:p-9">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#183D2D] via-[#2E6A52] to-[#C7B37A]" aria-hidden="true" />
          <div className="flex flex-wrap items-end justify-between gap-4">
            <PageTitle subtitle="Your recent symptom checks and their results.">Assessment history</PageTitle>
            {rows && rows.length > 0 ? <span className="rounded-full border border-brand/20 bg-brand-tint px-3 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-brand-dark">{rows.length} {rows.length === 1 ? "record" : "records"}</span> : null}
          </div>

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
            <div className="mt-8 hidden overflow-hidden rounded-2xl border border-[#DDE7DB] bg-white shadow-[0_12px_28px_rgba(24,38,25,0.05)] md:block">
              <table className="w-full text-left text-base lg:text-lg">
                <thead className="bg-[#F1F5EE] font-mono text-xs uppercase tracking-[0.1em] text-ink-muted">
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
                    <tr key={r.id} className="group border-t border-border transition-colors hover:bg-brand-tint/40">
                      <td className="whitespace-nowrap px-5 py-5 text-sm text-ink-muted">
                        {new Date(r.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-5 capitalize text-ink-secondary">
                        {r.detected_symptoms.length ? r.detected_symptoms.join(", ") : "—"}
                      </td>
                      <td className="px-5 py-5">
                        <TriageBadge level={r.risk_level} />
                      </td>
                      <td className="px-5 py-5">
                        <Link
                          href={`/result/${r.id}`}
                          className="inline-flex items-center rounded-xl border border-brand/25 bg-brand-tint px-3.5 py-2 text-sm font-semibold text-brand-dark shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-brand/45 hover:bg-white hover:shadow-[0_8px_18px_rgba(47,107,79,0.12)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/15"
                        >
                          View result
                        </Link>
                      </td>
                      <td className="max-w-sm px-5 py-5 text-sm leading-relaxed text-ink-muted">{r.recommendation}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-8 space-y-3 md:hidden">
              {rows.map((r) => (
                <Link key={r.id} href={`/result/${r.id}`} className="group block rounded-2xl border border-[#DDE7DB] bg-[linear-gradient(135deg,#F8FAF6_0%,#F1F5EE_100%)] p-4 shadow-[0_8px_20px_rgba(24,38,25,0.04)] outline-none transition-all duration-200 hover:-translate-y-0.5 hover:border-brand/30 hover:bg-white hover:shadow-[0_14px_28px_rgba(47,107,79,0.1)] focus-visible:ring-4 focus-visible:ring-brand/15">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-mono text-xs uppercase tracking-wide text-ink-muted">{new Date(r.created_at).toLocaleDateString()}</p>
                      <p className="mt-2 text-base font-medium capitalize text-ink">{r.detected_symptoms.length ? r.detected_symptoms.join(", ") : "No known symptoms"}</p>
                    </div>
                    <TriageBadge level={r.risk_level} />
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-ink-muted">{r.recommendation}</p>
                  <p className="mt-3 flex items-center justify-between font-mono text-xs uppercase tracking-[0.1em] text-brand"><span>Open full result</span><span className="transition-transform duration-200 group-hover:translate-x-1" aria-hidden="true">→</span></p>
                </Link>
              ))}
            </div>
            </>
          )}
        </Card>
      </PageMain>
    </div>
  );
}

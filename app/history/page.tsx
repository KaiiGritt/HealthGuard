import Link from "next/link";
import { getHistory, getMe } from "@/lib/api";
import { redirect } from "next/navigation";
import {
  Card,
  ErrorAlert,
  PageMain,
  PrimaryLink,
  TriageBadge,
} from "@/app/components/ui/primitives";
import { IconHistory } from "@/app/components/ui/icons";
import PageHeader from "../components/PageHeader";

const HISTORY_PAGE_SIZE = 5;

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await searchParams;
  const requestedPage = Number.parseInt(params.page ?? "1", 10);
  const page = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const user = await getMe();
  if (!user) redirect("/login?next=/history");
  if (user.role !== "resident") redirect(user.role === "admin" ? "/admin" : "/dashboard");

  let rows;
  try {
    rows = await getHistory();
  } catch {
    rows = null;
  }

  const totalPages = rows ? Math.max(1, Math.ceil(rows.length / HISTORY_PAGE_SIZE)) : 1;
  const currentPage = Math.min(page, totalPages);
  const pageRows = rows?.slice((currentPage - 1) * HISTORY_PAGE_SIZE, currentPage * HISTORY_PAGE_SIZE) ?? [];
  const startRecord = rows && rows.length > 0 ? (currentPage - 1) * HISTORY_PAGE_SIZE + 1 : 0;
  const endRecord = rows ? Math.min(currentPage * HISTORY_PAGE_SIZE, rows.length) : 0;

  return (
    <div className="premium-page min-h-screen">
      <PageHeader />
      <PageMain narrow>
        <Card className="relative overflow-hidden rounded-[28px] border border-[#DDE7DB] bg-[linear-gradient(135deg,#FFFFFF_0%,#FBFCF9_58%,#F1F5EE_100%)] p-4 shadow-[0_24px_60px_rgba(15,23,42,0.07)] sm:p-7 lg:p-9">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#183D2D] via-[#2E6A52] to-[#C7B37A]" aria-hidden="true" />
          <div className="flex flex-col gap-5 border-b border-[#E1E9DE] pb-6 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:pb-7">
            <div className="flex min-w-0 items-start gap-3 sm:gap-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-brand/15 bg-brand-tint text-brand-dark shadow-[0_4px_12px_rgba(47,107,79,0.08)] sm:h-14 sm:w-14">
                <IconHistory size={24} aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-brand-dark sm:text-[11px]">Your health journey</p>
                <h1 className="mt-1 font-display text-2xl font-semibold leading-tight text-ink sm:text-4xl">Assessment history</h1>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-secondary sm:text-base">Review previous symptom checks, recommendations, and risk levels in one place.</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
              {rows && rows.length > 0 ? (
                <span className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#DDE7DB] bg-white/80 px-3.5 font-mono text-xs font-semibold text-ink-secondary shadow-sm">
                  <span className="flex h-6 min-w-6 items-center justify-center rounded-lg bg-brand-tint px-1.5 text-brand-dark">{rows.length}</span>
                  {rows.length === 1 ? "assessment" : "assessments"}
                </span>
              ) : null}
              <PrimaryLink href="/assessment" className="min-h-10 rounded-xl px-4 text-sm">New assessment</PrimaryLink>
            </div>
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
            <div className="mt-7 hidden overflow-x-auto rounded-2xl border border-[#DDE7DB] bg-white shadow-[0_12px_28px_rgba(24,38,25,0.05)] md:block">
              <table className="w-full min-w-[900px] text-left text-sm lg:text-base">
                <thead className="bg-[linear-gradient(180deg,#F6F9F3_0%,#EDF3E9_100%)] font-mono text-[10px] uppercase tracking-[0.14em] text-ink-muted">
                  <tr>
                    <th className="px-5 py-4">Assessment date</th>
                    <th className="px-5 py-4">Reported symptoms</th>
                    <th className="px-5 py-4">Risk level</th>
                    <th className="px-5 py-4">Summary</th>
                    <th className="px-5 py-4">Recommendation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8EEE5]">
                  {pageRows.map((r) => (
                    <tr key={r.id} className="group transition-colors hover:bg-[#F7FAF5]">
                      <td className="whitespace-nowrap px-5 py-5 text-sm font-medium text-ink-secondary">
                        <span className="block">{new Date(r.created_at).toLocaleDateString()}</span>
                        <span className="mt-1 block font-mono text-[10px] uppercase tracking-[0.1em] text-ink-faint">Record #{r.id}</span>
                      </td>
                      <td className="max-w-xs px-5 py-5 capitalize leading-relaxed text-ink-secondary">
                        {r.detected_symptoms.length ? r.detected_symptoms.join(", ") : "—"}
                      </td>
                      <td className="px-5 py-5">
                        <TriageBadge level={r.risk_level} />
                      </td>
                      <td className="px-5 py-5">
                        <Link
                          href={`/result/${r.id}`}
                          className="inline-flex items-center whitespace-nowrap rounded-xl border border-brand/25 bg-brand-tint px-3.5 py-2 text-sm font-semibold text-brand-dark shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-brand/45 hover:bg-white hover:shadow-[0_8px_18px_rgba(47,107,79,0.12)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/15"
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
            <div className="mt-6 space-y-3 md:hidden">
              {pageRows.map((r) => (
                <Link key={r.id} href={`/result/${r.id}`} className="group relative block overflow-hidden rounded-2xl border border-[#DDE7DB] bg-[linear-gradient(135deg,#FFFFFF_0%,#F6F9F3_100%)] p-4 shadow-[0_8px_20px_rgba(24,38,25,0.04)] outline-none transition-all duration-200 hover:-translate-y-0.5 hover:border-brand/30 hover:bg-white hover:shadow-[0_14px_28px_rgba(47,107,79,0.1)] focus-visible:ring-4 focus-visible:ring-brand/15 sm:p-5">
                  <span className={`absolute inset-y-0 left-0 w-1 ${r.risk_level === "RED" ? "bg-triage-red" : r.risk_level === "YELLOW" ? "bg-triage-yellow" : "bg-brand"}`} aria-hidden="true" />
                  <div className="flex items-start justify-between gap-3 pl-1">
                    <div className="min-w-0">
                      <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-muted">{new Date(r.created_at).toLocaleDateString()} <span className="px-1 text-[#B6C2B2]">·</span> Record #{r.id}</p>
                      <p className="mt-2 text-base font-semibold capitalize leading-snug text-ink sm:text-lg">{r.detected_symptoms.length ? r.detected_symptoms.join(", ") : "No known symptoms"}</p>
                    </div>
                    <span className="shrink-0 pt-0.5"><TriageBadge level={r.risk_level} /></span>
                  </div>
                  <p className="mt-3 border-t border-[#E7EEE4] pt-3 text-sm leading-relaxed text-ink-muted">{r.recommendation}</p>
                  <p className="mt-3 flex items-center justify-between font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-brand"><span>View assessment details</span><span className="transition-transform duration-200 group-hover:translate-x-1" aria-hidden="true">→</span></p>
                </Link>
              ))}
            </div>
            <div className="mt-6 flex flex-col gap-4 border-t border-[#E1E9DE] pt-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-ink-muted">Showing <span className="font-semibold text-ink-secondary">{startRecord}–{endRecord}</span> of <span className="font-semibold text-ink-secondary">{rows.length}</span> records</p>
              <div className="flex items-center justify-between gap-2 sm:justify-end">
                <Link
                  href={currentPage > 1 ? `/history?page=${currentPage - 1}` : "/history?page=1"}
                  aria-disabled={currentPage === 1}
                  className={`rounded-xl border border-[#DDE7DB] bg-white px-4 py-2.5 text-xs font-semibold text-ink-secondary shadow-sm transition hover:border-brand/40 hover:text-brand-dark ${currentPage === 1 ? "pointer-events-none opacity-40" : ""}`}
                >
                  Previous
                </Link>
                <span className="min-w-20 text-center font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-muted">Page {currentPage} / {totalPages}</span>
                <Link
                  href={currentPage < totalPages ? `/history?page=${currentPage + 1}` : `/history?page=${totalPages}`}
                  aria-disabled={currentPage === totalPages}
                  className={`rounded-xl border border-[#DDE7DB] bg-white px-4 py-2.5 text-xs font-semibold text-ink-secondary shadow-sm transition hover:border-brand/40 hover:text-brand-dark ${currentPage === totalPages ? "pointer-events-none opacity-40" : ""}`}
                >
                  Next
                </Link>
              </div>
            </div>
            </>
          )}
        </Card>
      </PageMain>
    </div>
  );
}

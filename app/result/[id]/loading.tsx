import PageHeader from "../../components/PageHeader";
import { PageMain } from "../../components/ui/primitives";

export default function ResultLoading() {
  return (
    <>
      <PageHeader />
      <div className="premium-page min-h-screen">
        <PageMain narrow className="max-w-5xl" aria-busy="true" aria-label="Loading assessment result">
          <div className="premium-skeleton relative mb-6 overflow-hidden rounded-3xl border border-[#DDE7DB] p-5 sm:p-7">
            <div className="flex flex-wrap items-end justify-between gap-5">
              <div className="space-y-3">
                <div className="h-3 w-44 rounded bg-white/60" />
                <div className="h-10 w-64 rounded bg-white/60" />
              </div>
              <div className="space-y-2 sm:text-right">
                <div className="ml-auto h-3 w-20 rounded bg-white/60" />
                <div className="ml-auto h-4 w-32 rounded bg-white/60" />
                <div className="ml-auto h-3 w-24 rounded bg-white/60" />
              </div>
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
            <section className="rounded-3xl border border-[#DDE7DB] bg-card p-4 shadow-[0_20px_55px_rgba(15,23,42,0.06)] sm:p-6 lg:p-7">
              <div className="premium-skeleton h-36 rounded-[20px]" />
              <div className="mt-6 rounded-[20px] border border-[#DDE7DB] p-4 sm:p-5">
                <div className="flex items-center justify-between gap-3 border-b border-[#e6eee1] pb-3">
                  <div className="premium-skeleton h-4 w-36 rounded" />
                  <div className="premium-skeleton h-6 w-20 rounded-full" />
                </div>
                <div className="mt-4 flex flex-wrap gap-2.5">
                  <div className="premium-skeleton h-9 w-24 rounded-full" />
                  <div className="premium-skeleton h-9 w-32 rounded-full" />
                  <div className="premium-skeleton h-9 w-28 rounded-full" />
                </div>
              </div>
              <div className="mt-4 rounded-xl border border-[#e2e8db] p-4 sm:p-5">
                <div className="premium-skeleton h-4 w-40 rounded" />
                <div className="mt-4 space-y-2">
                  <div className="premium-skeleton h-4 w-full rounded" />
                  <div className="premium-skeleton h-4 w-11/12 rounded" />
                  <div className="premium-skeleton h-4 w-3/4 rounded" />
                </div>
              </div>
              <div className="mt-4 rounded-xl border border-[#d8e2d3] p-4 sm:p-5">
                <div className="premium-skeleton h-4 w-24 rounded" />
                <div className="mt-4 space-y-3">
                  <div className="premium-skeleton h-16 rounded-xl" />
                  <div className="premium-skeleton h-16 rounded-xl" />
                </div>
              </div>
            </section>

            <aside className="space-y-6">
              <div className="premium-skeleton h-72 rounded-3xl" />
              <div className="premium-skeleton h-56 rounded-3xl" />
            </aside>
          </div>
        </PageMain>
      </div>
    </>
  );
}

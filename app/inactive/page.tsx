import Link from "next/link";

export default function InactivePage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f5f7fb] px-6 py-12">
      <div className="pointer-events-none absolute -top-20 left-1/2 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-gradient-to-br from-sky-200/70 via-emerald-200/40 to-amber-200/60 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-[320px] w-[320px] translate-x-1/3 translate-y-1/3 rounded-full bg-gradient-to-br from-slate-200/60 to-sky-200/60 blur-3xl" />
      <div className="relative mx-auto flex min-h-[calc(100vh-6rem)] w-full max-w-3xl items-center">
        <div className="w-full">
        <div className="rounded-3xl border border-white/70 bg-white/80 shadow-[0_30px_80px_rgba(15,23,42,0.08)] backdrop-blur">
          <div className="grid gap-8 p-8 sm:grid-cols-[120px_1fr] sm:p-10">
            <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-900 to-slate-700 text-white shadow-lg">
              <span className="material-symbols-outlined text-[32px]">lock_clock</span>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                Access pending
              </p>
              <h1 className="mt-3 text-3xl font-display font-semibold text-slate-900">
                Your account is inactive
              </h1>
              <p className="mt-3 text-sm text-slate-600 leading-relaxed">
                An administrator needs to activate your access before you can use
                HedgeLens. We&apos;ll unlock your workspace as soon as your account is approved.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/signin"
                  className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
                >
                  <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                  Back to sign in
                </Link>
                <Link
                  href="/"
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300"
                >
                  <span className="material-symbols-outlined text-[18px]">refresh</span>
                  Try again
                </Link>
              </div>
            </div>
          </div>
          <div className="grid gap-4 border-t border-white/60 bg-white/60 px-8 py-6 sm:grid-cols-3 sm:px-10">
            <div className="rounded-2xl border border-slate-100 bg-white px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                What happens next
              </p>
              <p className="mt-2 text-sm font-semibold text-slate-800">
                Admin review
              </p>
              <p className="mt-1 text-xs text-slate-500">
                We verify your account and enable access.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-white px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                Estimated time
              </p>
              <p className="mt-2 text-sm font-semibold text-slate-800">Same day</p>
              <p className="mt-1 text-xs text-slate-500">
                Most requests are handled within a few hours.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-white px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                Need help?
              </p>
              <p className="mt-2 text-sm font-semibold text-slate-800">
                Share your email
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Include the address you used to sign in.
              </p>
            </div>
          </div>
        </div>
        <p className="mt-6 text-center text-[11px] text-slate-400">
          HedgeLens security keeps inactive accounts locked until verified.
        </p>
        </div>
      </div>
    </main>
  );
}

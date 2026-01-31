"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";

export default function SignInPage() {
  const [error, setError] = useState<string | null>(null);

  async function handleGitHub() {
    setError(null);
    try {
      await signIn("github", { callbackUrl: "/dashboard" });
    } catch {
      setError("Login fehlgeschlagen. Bitte versuche es erneut.");
    }
  }

  return (
    <main
      className="relative min-h-screen overflow-hidden bg-slate-50 px-6 py-12"
      style={{ "--accent": "#0ea5e9", "--ink": "#0f172a" } as React.CSSProperties}
    >
      <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-sky-200/40 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-slate-200/60 blur-3xl" />

      <div className="mx-auto flex w-full max-w-5xl flex-col gap-10 lg:grid lg:grid-cols-2 lg:items-center">
        <div className="space-y-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.35em] text-slate-400"
          >
            HedgeLens
          </Link>
          <h1 className="text-4xl font-display font-semibold text-slate-900 leading-tight">
            Clarity for complex
            <span className="block text-[color:var(--accent)]">strategy portfolios.</span>
          </h1>
          <p className="text-sm text-slate-500 max-w-md">
            Sign in to access your projects, pricing tools, and risk analytics in one
            focused workspace.
          </p>
          <div className="flex flex-wrap gap-2 text-[11px] uppercase tracking-wider text-slate-500">
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1">
              Scenario analysis
            </span>
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1">
              Warrant pricing
            </span>
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1">
              Risk score
            </span>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200/80 bg-white/90 p-8 shadow-xl backdrop-blur">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Sign in</h2>
            <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
              Secure
            </span>
          </div>
          <p className="mt-2 text-sm text-slate-500">
            Continue with GitHub to access your HedgeLens workspace.
          </p>
          {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
          <button
            type="button"
            onClick={handleGitHub}
            className="mt-6 w-full rounded-xl bg-[color:var(--ink)] px-4 py-3 text-sm font-semibold text-white hover:bg-slate-900"
          >
            Continue with GitHub
          </button>
          <p className="mt-4 text-xs text-slate-400">
            New providers can be enabled via Auth.js configuration.
          </p>
        </div>
      </div>
    </main>
  );
}

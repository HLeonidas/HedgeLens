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
    <main className="min-h-screen bg-slate-100 overflow-hidden">
      <div className="relative flex min-h-screen items-center justify-center px-6 py-10">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-blue-200/40 blur-3xl" />
          <div className="absolute -bottom-24 -left-24 h-80 w-80 rounded-full bg-slate-200/60 blur-3xl" />
        </div>
        <div className="relative w-full max-w-5xl overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl">
          <div className="grid min-h-[620px] grid-cols-1 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-900 p-12 text-white">
              <div className="absolute inset-0 opacity-20">
                <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-blue-500/60 blur-3xl" />
                <div className="absolute -bottom-24 -left-24 h-80 w-80 rounded-full bg-slate-600/70 blur-3xl" />
              </div>
              <div className="relative z-10 flex h-full flex-col justify-between">
                <div className="flex items-center gap-3 text-sm font-semibold tracking-wide">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/20 text-blue-200">
                    <span className="material-symbols-outlined text-2xl">insights</span>
                  </span>
                  HedgeLens Analytics
                </div>
                <div className="space-y-5">
                  <h1 className="text-3xl font-semibold leading-tight">
                    Empowering your
                    <span className="block text-blue-200">financial future.</span>
                  </h1>
                  <p className="text-sm text-blue-100/75 max-w-sm">
                    Access project tracking, scenario analysis and risk insights through a secure
                    workspace.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-[11px] text-blue-100/60">
                  <div className="inline-flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm">verified_user</span>
                    Enterprise Grade Security
                  </div>
                  <span className="h-1 w-1 rounded-full bg-blue-100/40" />
                  <span>Hobby project for personal use.</span>
                </div>
              </div>
            </div>
            <div className="flex flex-col justify-center px-10 py-12 lg:px-14">
              <div className="mb-8 text-center">
                <h2 className="text-3xl font-semibold text-slate-900">Welcome Back</h2>
                <p className="mt-2 text-sm text-slate-500">
                  Sign in with GitHub to access your dashboard.
                </p>
              </div>
              {error ? <p className="mb-4 text-sm text-red-600 text-center">{error}</p> : null}
              <button
                type="button"
                onClick={handleGitHub}
                className="mx-auto flex h-11 w-full max-w-[320px] items-center justify-center gap-2 rounded-lg bg-blue-700 text-sm font-semibold text-white shadow-lg shadow-blue-700/25 hover:bg-blue-800"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="currentColor"
                    d="M12 .5a12 12 0 0 0-3.79 23.4c.6.1.82-.26.82-.58v-2.1c-3.34.73-4.04-1.61-4.04-1.61-.55-1.4-1.35-1.77-1.35-1.77-1.1-.75.08-.74.08-.74 1.22.09 1.86 1.25 1.86 1.25 1.08 1.86 2.82 1.32 3.5 1 .11-.79.42-1.32.76-1.62-2.66-.3-5.46-1.33-5.46-5.92 0-1.31.47-2.39 1.24-3.23-.13-.31-.54-1.55.12-3.23 0 0 1.01-.32 3.3 1.23a11.4 11.4 0 0 1 6 0c2.29-1.55 3.3-1.23 3.3-1.23.66 1.68.25 2.92.12 3.23.77.84 1.24 1.92 1.24 3.23 0 4.6-2.8 5.61-5.47 5.91.43.37.82 1.1.82 2.22v3.29c0 .32.22.69.83.58A12 12 0 0 0 12 .5z"
                  />
                </svg>
                Continue with GitHub
              </button>
              <div className="mt-6 flex items-center justify-center gap-4 text-[11px] uppercase text-slate-400 tracking-widest">
                <span className="h-px w-12 bg-slate-200" />
                Locked Access
                <span className="h-px w-12 bg-slate-200" />
              </div>
              <p className="mt-6 text-center text-xs text-slate-400">
                Don&apos;t have access?{" "}
                <Link href="#" className="text-blue-600 hover:underline">
                  Contact your administrator
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

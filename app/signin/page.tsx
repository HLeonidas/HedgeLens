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
    <main className="min-h-screen bg-background-light px-6 py-12">
      <div className="mx-auto w-full max-w-md rounded-3xl bg-white p-8 shadow-xl border border-border-light">
        <Link href="/" className="text-xs uppercase tracking-[0.4em] text-slate-400">
          HedgeLens
        </Link>
        <h1 className="mt-4 text-2xl font-display font-semibold text-slate-900">
          Sign in
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Melde dich mit GitHub an. Für andere Provider passe die Auth.js
          Konfiguration an.
        </p>
        {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
        <button
          type="button"
          onClick={handleGitHub}
          className="mt-6 w-full rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent/90"
        >
          Continue with GitHub
        </button>
      </div>
    </main>
  );
}

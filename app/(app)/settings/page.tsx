"use client";

import { signOut } from "next-auth/react";

export default function SettingsPage() {
  return (
    <div className="h-full overflow-y-auto custom-scrollbar p-4 sm:p-6 lg:p-8 flex flex-col gap-6 bg-white">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-900">Settings</h2>
          <p className="text-sm text-slate-500">Manage your account and session.</p>
        </div>
      </div>

      <div className="p-6 rounded-2xl border border-border-light bg-white shadow-sm max-w-xl">
        <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4">
          Session
        </h3>
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/signin" })}
          className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-bold hover:bg-slate-800"
        >
          Logout
        </button>
      </div>
    </div>
  );
}
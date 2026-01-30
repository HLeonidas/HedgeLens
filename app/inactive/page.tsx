export default function InactivePage() {
  return (
    <main className="min-h-screen bg-background-light px-6 py-12">
      <div className="mx-auto w-full max-w-md rounded-3xl bg-white p-8 shadow-xl border border-border-light">
        <h1 className="text-2xl font-display font-semibold text-slate-900">
          Account inactive
        </h1>
        <p className="mt-3 text-sm text-slate-500">
          Your account is currently inactive. An administrator must activate
          your access before you can use HedgeLens.
        </p>
      </div>
    </main>
  );
}

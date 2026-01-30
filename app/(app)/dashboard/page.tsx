export default function DashboardPage() {
  return (
    <div className="h-full overflow-y-auto custom-scrollbar p-4 sm:p-6 lg:p-8 flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Dashboard</h2>
          <p className="text-sm text-slate-500 mt-1">
            Snapshot of portfolios, scenarios, and signals.
          </p>
        </div>
        <button className="px-4 py-2 rounded-lg bg-accent text-white text-sm font-bold shadow-sm hover:bg-accent/90">
          New Project
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-border-light bg-slate-50">
          <span className="text-xs font-bold text-slate-400 uppercase">Tracked ISINs</span>
          <div className="mt-3 text-2xl font-black text-slate-900">18</div>
          <div className="text-xs text-emerald-600 font-bold mt-1">+2 this week</div>
        </div>
        <div className="p-4 rounded-xl border border-border-light bg-slate-50">
          <span className="text-xs font-bold text-slate-400 uppercase">Open Scenarios</span>
          <div className="mt-3 text-2xl font-black text-slate-900">6</div>
          <div className="text-xs text-slate-500 font-semibold mt-1">3 running</div>
        </div>
        <div className="p-4 rounded-xl border border-border-light bg-slate-50">
          <span className="text-xs font-bold text-slate-400 uppercase">Total Exposure</span>
          <div className="mt-3 text-2xl font-black text-slate-900">€124,500</div>
          <div className="text-xs text-emerald-600 font-bold mt-1">+4.2% MTD</div>
        </div>
        <div className="p-4 rounded-xl border border-border-light bg-slate-50">
          <span className="text-xs font-bold text-slate-400 uppercase">Crypto Allocation</span>
          <div className="mt-3 text-2xl font-black text-slate-900">12%</div>
          <div className="text-xs text-red-500 font-bold mt-1">-1.1% 24h</div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 p-6 rounded-2xl border border-border-light bg-white shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
              Time Value Trend
            </h3>
            <span className="text-xs font-semibold text-slate-500">Last 90 days</span>
          </div>
          <div className="h-52 rounded-xl bg-slate-100 border border-dashed border-slate-200 flex items-center justify-center text-sm text-slate-400">
            Highcharts Area Placeholder
          </div>
        </div>

        <div className="p-6 rounded-2xl border border-border-light bg-white shadow-sm">
          <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4">
            Next Actions
          </h3>
          <div className="flex flex-col gap-3">
            <div className="p-3 rounded-lg bg-slate-50 border border-border-light">
              <div className="text-sm font-bold text-slate-900">Refresh ISIN prices</div>
              <p className="text-xs text-slate-500">3 positions need updates</p>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 border border-border-light">
              <div className="text-sm font-bold text-slate-900">Run scenario pack</div>
              <p className="text-xs text-slate-500">Bear/Base/Bull update</p>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 border border-border-light">
              <div className="text-sm font-bold text-slate-900">
                Review ratio optimization
              </div>
              <p className="text-xs text-slate-500">Put/Call ratio hit threshold</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

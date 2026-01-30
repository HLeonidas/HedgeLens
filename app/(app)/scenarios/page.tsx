export default function ScenariosPage() {
  return (
    <div className="h-full overflow-y-auto custom-scrollbar p-4 sm:p-6 lg:p-8 flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-900">Scenario Simulation</h2>
          <p className="text-sm text-slate-500">
            Run bear/base/bull simulations across tracked positions.
          </p>
        </div>
        <button className="px-4 py-2 rounded-lg bg-accent text-white text-sm font-bold">
          Run Simulation
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 p-6 rounded-2xl border border-border-light bg-white shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
              Scenario Outcomes
            </h3>
            <span className="text-xs font-semibold text-slate-500">90-day horizon</span>
          </div>
          <div className="h-64 rounded-xl bg-slate-100 border border-dashed border-slate-200 flex items-center justify-center text-sm text-slate-400">
            Highcharts Bar/Line Placeholder
          </div>
        </div>

        <div className="p-6 rounded-2xl border border-border-light bg-slate-50">
          <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4">Inputs</h3>
          <div className="flex flex-col gap-4">
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase">Volatility</label>
              <input
                className="mt-2 w-full"
                type="range"
                min="0.1"
                max="0.6"
                step="0.01"
                defaultValue="0.25"
              />
              <div className="text-xs text-slate-500 mt-1">25% IV</div>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase">Drift</label>
              <input
                className="mt-2 w-full"
                type="range"
                min="-0.1"
                max="0.1"
                step="0.01"
                defaultValue="0.04"
              />
              <div className="text-xs text-slate-500 mt-1">4% annual</div>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase">Horizon</label>
              <select className="mt-2 w-full rounded-lg border border-border-light px-3 py-2 text-sm" defaultValue="90">
                <option value="30">30 days</option>
                <option value="90">90 days</option>
                <option value="180">180 days</option>
              </select>
            </div>
            <button className="mt-2 w-full rounded-lg bg-slate-900 text-white text-sm font-bold py-2">
              Save Scenario
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

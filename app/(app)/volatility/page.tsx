export default function VolatilityPage() {
  return (
    <div className="h-full overflow-y-auto custom-scrollbar p-4 sm:p-6 lg:p-8 flex flex-col gap-6 bg-white">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-900">Volatility Surface</h2>
          <p className="text-sm text-slate-500">Slice implied volatility by tenor and strike.</p>
        </div>
        <button className="px-4 py-2 rounded-lg bg-slate-900 text-white text-xs font-bold">
          Run Surface
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 p-6 rounded-2xl border border-border-light bg-white shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Surface Plot</h3>
            <span className="text-xs font-semibold text-slate-500">Updated 2m ago</span>
          </div>
          <div className="h-72 rounded-xl bg-slate-100 border border-dashed border-slate-200 flex items-center justify-center text-sm text-slate-400">
            Highcharts 3D Surface Placeholder
          </div>
        </div>

        <div className="p-6 rounded-2xl border border-border-light bg-slate-50">
          <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4">Filters</h3>
          <div className="flex flex-col gap-4">
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase">ISIN</label>
              <input
                className="mt-2 w-full rounded-lg border border-border-light px-3 py-2 text-sm"
                placeholder="US88160R1014"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase">Tenor</label>
              <input className="mt-2 w-full" type="range" min="7" max="180" defaultValue="45" />
              <div className="text-xs text-slate-500 mt-1">45 days</div>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase">Strike Range</label>
              <div className="mt-2 flex gap-2">
                <input
                  className="w-full rounded-lg border border-border-light px-3 py-2 text-sm"
                  placeholder="220"
                />
                <input
                  className="w-full rounded-lg border border-border-light px-3 py-2 text-sm"
                  placeholder="280"
                />
              </div>
            </div>
            <button className="mt-2 w-full rounded-lg bg-accent text-white text-sm font-bold py-2">
              Apply
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
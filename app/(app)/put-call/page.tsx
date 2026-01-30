export default function PutCallPage() {
  return (
    <div className="h-full overflow-y-auto custom-scrollbar p-4 sm:p-6 lg:p-8 flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-900">Put-Call Ratio</h2>
          <p className="text-sm text-slate-500">Monitor sentiment shifts and ratio alerts.</p>
        </div>
        <div className="flex gap-2">
          <button className="px-3 py-2 rounded-lg border border-border-light text-xs font-bold text-slate-600">
            Export
          </button>
          <button className="px-3 py-2 rounded-lg bg-accent text-white text-xs font-bold">
            New Alert
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 p-6 rounded-2xl border border-border-light bg-white shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Ratio Curve</h3>
            <span className="text-xs font-semibold text-slate-500">Rolling 30d</span>
          </div>
          <div className="h-64 rounded-xl bg-slate-100 border border-dashed border-slate-200 flex items-center justify-center text-sm text-slate-400">
            Highcharts Line Placeholder
          </div>
        </div>

        <div className="p-6 rounded-2xl border border-border-light bg-slate-50">
          <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4">
            Signal Summary
          </h3>
          <div className="flex flex-col gap-4">
            <div className="p-4 rounded-xl bg-white border border-border-light">
              <div className="text-xs text-slate-400 font-bold uppercase">Current Ratio</div>
              <div className="text-2xl font-black text-slate-900 mt-2">0.72</div>
              <div className="text-xs font-bold text-emerald-600 mt-1">Bullish bias</div>
            </div>
            <div className="p-4 rounded-xl bg-white border border-border-light">
              <div className="text-xs text-slate-400 font-bold uppercase">Alert Level</div>
              <div className="text-lg font-black text-slate-900 mt-2">0.85</div>
              <div className="text-xs text-slate-500 mt-1">Last triggered 12d ago</div>
            </div>
            <div className="p-4 rounded-xl bg-white border border-border-light">
              <div className="text-xs text-slate-400 font-bold uppercase">Top ISIN</div>
              <div className="text-sm font-bold text-slate-900 mt-2">US88160R1014</div>
              <div className="text-xs text-slate-500 mt-1">Ratio 0.64</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

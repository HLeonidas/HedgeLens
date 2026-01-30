export default function ComparisonPage() {
  return (
    <div className="h-full flex flex-col xl:flex-row min-h-0 overflow-hidden">
      <div className="flex-1 p-4 sm:p-6 lg:p-8 flex flex-col gap-6 overflow-y-auto custom-scrollbar min-h-0">
        <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-end">
          <div className="flex flex-col gap-1">
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">
              Dual-Curve Overlay
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Comparative decay of time-value between two selected strike prices
            </p>
          </div>
          <div className="flex gap-2 p-1 bg-slate-100 rounded-xl border border-border-light w-fit">
            <button className="px-4 py-1.5 rounded-lg bg-white shadow-sm text-xs font-bold text-slate-900 transition-all">
              Linear
            </button>
            <button className="px-4 py-1.5 rounded-lg text-xs font-bold text-slate-500 hover:text-slate-800 transition-all">
              Log
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4 p-4 bg-slate-50 rounded-xl border border-border-light">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-curve-a"></div>
            <span className="text-sm font-bold text-slate-700">US88160R1014 (C 250)</span>
          </div>
          <div className="hidden sm:block h-4 w-px bg-slate-200"></div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-curve-b"></div>
            <span className="text-sm font-bold text-slate-700">US0378331005 (P 185)</span>
          </div>
        </div>

        <div className="flex-1 bg-white rounded-2xl border border-border-light p-8 flex flex-col relative overflow-hidden shadow-sm">
          <div className="flex-1 flex flex-col min-h-[320px] sm:min-h-[400px]">
            <div className="flex-1 relative">
              <div className="absolute inset-0 grid grid-cols-6 grid-rows-4 pointer-events-none">
                <div className="border-r border-b border-slate-100"></div>
                <div className="border-r border-b border-slate-100"></div>
                <div className="border-r border-b border-slate-100"></div>
                <div className="border-r border-b border-slate-100"></div>
                <div className="border-r border-b border-slate-100"></div>
                <div className="border-b border-slate-100"></div>
                <div className="border-r border-b border-slate-100"></div>
                <div className="border-r border-b border-slate-100"></div>
                <div className="border-r border-b border-slate-100"></div>
                <div className="border-r border-b border-slate-100"></div>
                <div className="border-r border-b border-slate-100"></div>
                <div className="border-b border-slate-100"></div>
                <div className="border-r border-b border-slate-100"></div>
                <div className="border-r border-b border-slate-100"></div>
                <div className="border-r border-b border-slate-100"></div>
                <div className="border-r border-b border-slate-100"></div>
                <div className="border-r border-b border-slate-100"></div>
                <div className="border-b border-slate-100"></div>
                <div className="border-r border-slate-100"></div>
                <div className="border-r border-slate-100"></div>
                <div className="border-r border-slate-100"></div>
                <div className="border-r border-slate-100"></div>
                <div className="border-r border-slate-100"></div>
                <div></div>
              </div>
              <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none" viewBox="0 0 1000 300">
                <path
                  d="M0,50 Q250,60 500,120 T1000,280"
                  fill="none"
                  stroke="#2563eb"
                  strokeLinecap="round"
                  strokeWidth="2.5"
                ></path>
                <path
                  d="M0,40 Q250,55 500,160 T1000,295"
                  fill="none"
                  stroke="#9333ea"
                  strokeDasharray="0"
                  strokeLinecap="round"
                  strokeWidth="2.5"
                ></path>
                <line
                  stroke="#e2e8f0"
                  strokeDasharray="4"
                  strokeWidth="2"
                  x1="500"
                  x2="500"
                  y1="0"
                  y2="300"
                ></line>
                <circle cx="500" cy="120" fill="#2563eb" r="5" stroke="white" strokeWidth="2"></circle>
                <circle cx="500" cy="160" fill="#9333ea" r="5" stroke="white" strokeWidth="2"></circle>
              </svg>

              <div className="absolute top-4 left-4 sm:top-[80px] sm:left-[520px] bg-white border border-border-light p-4 rounded-xl shadow-2xl z-10 w-56">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter mb-2">
                  45 Days to Expiration
                </div>
                <div className="flex flex-col gap-3">
                  <div className="flex justify-between items-center border-l-2 border-curve-a pl-2">
                    <div className="flex flex-col">
                      <span className="text-[9px] text-slate-400 font-bold uppercase">Option A</span>
                      <span className="text-xs font-bold text-slate-900">$2,105.20</span>
                    </div>
                    <span className="text-[10px] font-mono font-bold text-red-500">-$42.10</span>
                  </div>
                  <div className="flex justify-between items-center border-l-2 border-curve-b pl-2">
                    <div className="flex flex-col">
                      <span className="text-[9px] text-slate-400 font-bold uppercase">Option B</span>
                      <span className="text-xs font-bold text-slate-900">$1,842.50</span>
                    </div>
                    <span className="text-[10px] font-mono font-bold text-red-500">-$68.30</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-between px-2 pt-6 border-t border-slate-100">
              <span className="text-slate-400 text-[11px] font-bold uppercase tracking-wider">90d</span>
              <span className="text-slate-400 text-[11px] font-bold uppercase tracking-wider">75d</span>
              <span className="text-slate-400 text-[11px] font-bold uppercase tracking-wider">60d</span>
              <span className="text-accent text-[11px] font-black uppercase tracking-wider underline underline-offset-8">
                45d (Current)
              </span>
              <span className="text-slate-400 text-[11px] font-bold uppercase tracking-wider">30d</span>
              <span className="text-slate-400 text-[11px] font-bold uppercase tracking-wider">15d</span>
              <span className="text-slate-400 text-[11px] font-bold uppercase tracking-wider font-black">EXP</span>
            </div>
          </div>
        </div>

        <div className="bg-surface-grey rounded-2xl border border-border-light p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
              Scenario Comparative Stress Test
            </h3>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-500">Dual Sync</span>
              <button className="w-8 h-4 rounded-full bg-accent relative">
                <div className="absolute right-0.5 top-0.5 size-3 rounded-full bg-white shadow-sm"></div>
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
            <div className="flex flex-col gap-3">
              <div className="flex justify-between text-xs font-bold text-slate-500">
                <span>Volatility (IV) Shift</span>
                <span className="text-accent">+3.5% (Applied)</span>
              </div>
              <input
                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-accent"
                max="10"
                min="-10"
                type="range"
                defaultValue="3.5"
              />
            </div>
            <div className="flex flex-col gap-3">
              <div className="flex justify-between text-xs font-bold text-slate-500">
                <span>Time Forward (Days)</span>
                <span className="text-accent">12 Days</span>
              </div>
              <input
                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-accent"
                max="30"
                min="0"
                type="range"
                defaultValue="12"
              />
            </div>
          </div>
        </div>
      </div>

      <aside className="w-full xl:w-[420px] border-t xl:border-t-0 xl:border-l border-border-light bg-surface-grey overflow-y-auto custom-scrollbar p-4 sm:p-6 flex flex-col gap-6 shrink-0 min-h-0">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900">Comparative Greeks</h3>
          <button className="text-accent text-xs font-bold hover:underline">Download Report</button>
        </div>

        <div className="bg-white rounded-xl overflow-x-auto border border-border-light shadow-sm">
          <table className="w-full min-w-[360px] text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-border-light">
                <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Greek</th>
                <th className="p-4 text-[10px] font-black text-curve-a uppercase tracking-widest text-right">
                  Option A
                </th>
                <th className="p-4 text-[10px] font-black text-curve-b uppercase tracking-widest text-right">
                  Option B
                </th>
                <th className="p-4 text-[10px] font-black text-slate-900 uppercase tracking-widest text-right">
                  Spread
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr className="hover:bg-slate-50/50">
                <td className="p-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm text-emerald-500">change_history</span>
                  <span className="text-sm font-bold text-slate-700">Delta</span>
                </td>
                <td className="p-4 text-sm font-mono text-right text-slate-900">0.542</td>
                <td className="p-4 text-sm font-mono text-right text-slate-900">0.312</td>
                <td className="p-4 text-sm font-mono text-right font-bold text-emerald-600">+0.230</td>
              </tr>
              <tr className="bg-red-50/20">
                <td className="p-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm text-red-500">timer</span>
                  <span className="text-sm font-bold text-slate-700">Theta</span>
                </td>
                <td className="p-4 text-sm font-mono text-right text-slate-900">-124.5</td>
                <td className="p-4 text-sm font-mono text-right text-slate-900">-188.2</td>
                <td className="p-4 text-sm font-mono text-right font-bold text-red-600">+63.7</td>
              </tr>
              <tr className="hover:bg-slate-50/50">
                <td className="p-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm text-blue-500">grain</span>
                  <span className="text-sm font-bold text-slate-700">Gamma</span>
                </td>
                <td className="p-4 text-sm font-mono text-right text-slate-900">0.023</td>
                <td className="p-4 text-sm font-mono text-right text-slate-900">0.041</td>
                <td className="p-4 text-sm font-mono text-right font-bold text-slate-900">-0.018</td>
              </tr>
              <tr className="hover:bg-slate-50/50">
                <td className="p-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm text-purple-500">speed</span>
                  <span className="text-sm font-bold text-slate-700">Vega</span>
                </td>
                <td className="p-4 text-sm font-mono text-right text-slate-900">0.450</td>
                <td className="p-4 text-sm font-mono text-right text-slate-900">0.285</td>
                <td className="p-4 text-sm font-mono text-right font-bold text-emerald-600">+0.165</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-4">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block px-1">
            Extrinsic Exposure Comparison
          </span>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-white rounded-xl border border-border-light">
              <span className="text-[9px] font-bold text-slate-400 uppercase block mb-1">
                A: Time Value
              </span>
              <span className="text-lg font-black text-curve-a">$2,105</span>
              <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2">
                <div className="bg-curve-a h-1.5 rounded-full" style={{ width: "65%" }}></div>
              </div>
            </div>
            <div className="p-4 bg-white rounded-xl border border-border-light">
              <span className="text-[9px] font-bold text-slate-400 uppercase block mb-1">
                B: Time Value
              </span>
              <span className="text-lg font-black text-curve-b">$1,842</span>
              <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2">
                <div className="bg-curve-b h-1.5 rounded-full" style={{ width: "48%" }}></div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-auto border-t border-border-light pt-6">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-3">
            Comparison Insight
          </span>
          <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-100 flex flex-col gap-2">
            <div className="flex items-center gap-2 text-indigo-600">
              <span className="material-symbols-outlined text-sm font-bold">compare_arrows</span>
              <span className="text-xs font-bold uppercase tracking-tight">Decay Efficiency</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              <span className="font-bold text-slate-900">Option B</span> exhibits{" "}
              <span className="font-bold text-red-600">34% higher</span> theta burn rate relative
              to premium. Optimal for short-term premium selling strategies compared to Option A.
            </p>
          </div>
        </div>
      </aside>
    </div>
  );
}

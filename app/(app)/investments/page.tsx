export default function InvestmentsPage() {
  return (
    <div className="h-full overflow-y-auto custom-scrollbar p-4 sm:p-6 lg:p-8 flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-900">Investments</h2>
          <p className="text-sm text-slate-500">
            Track buy-in, shares, and expected targets by ISIN.
          </p>
        </div>
        <button className="px-4 py-2 rounded-lg bg-accent text-white text-sm font-bold">
          Add Position
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 p-6 rounded-2xl border border-border-light bg-white shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Positions</h3>
            <span className="text-xs font-semibold text-slate-500">Auto-synced prices</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-border-light">
                  <th className="p-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Name</th>
                  <th className="p-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">ISIN</th>
                  <th className="p-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">
                    Shares
                  </th>
                  <th className="p-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">
                    Buy-in
                  </th>
                  <th className="p-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">
                    Current
                  </th>
                  <th className="p-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">
                    Expected
                  </th>
                  <th className="p-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">
                    P/L
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr className="hover:bg-slate-50/50">
                  <td className="p-3 text-sm font-bold text-slate-900">Tesla</td>
                  <td className="p-3 text-xs font-mono text-slate-500">US88160R1014</td>
                  <td className="p-3 text-sm font-mono text-right">72</td>
                  <td className="p-3 text-sm font-mono text-right">$182.40</td>
                  <td className="p-3 text-sm font-mono text-right">$201.80</td>
                  <td className="p-3 text-sm font-mono text-right">$240.00</td>
                  <td className="p-3 text-sm font-bold text-right text-emerald-600">+$1,396</td>
                </tr>
                <tr className="hover:bg-slate-50/50">
                  <td className="p-3 text-sm font-bold text-slate-900">Apple</td>
                  <td className="p-3 text-xs font-mono text-slate-500">US0378331005</td>
                  <td className="p-3 text-sm font-mono text-right">45</td>
                  <td className="p-3 text-sm font-mono text-right">$156.30</td>
                  <td className="p-3 text-sm font-mono text-right">$171.55</td>
                  <td className="p-3 text-sm font-mono text-right">$190.00</td>
                  <td className="p-3 text-sm font-bold text-right text-emerald-600">+$686</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="p-6 rounded-2xl border border-border-light bg-slate-50">
          <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4">
            Add by ISIN
          </h3>
          <div className="flex flex-col gap-4">
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase">ISIN</label>
              <input
                className="mt-2 w-full rounded-lg border border-border-light px-3 py-2 text-sm"
                placeholder="DE000..."
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase">Shares</label>
              <input
                className="mt-2 w-full rounded-lg border border-border-light px-3 py-2 text-sm"
                placeholder="100"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase">Buy-in Price</label>
              <input
                className="mt-2 w-full rounded-lg border border-border-light px-3 py-2 text-sm"
                placeholder="12.34"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase">Expected Price</label>
              <input
                className="mt-2 w-full rounded-lg border border-border-light px-3 py-2 text-sm"
                placeholder="18.50"
              />
            </div>
            <button className="mt-2 w-full rounded-lg bg-slate-900 text-white text-sm font-bold py-2">
              Lookup & Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

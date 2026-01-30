export default function CryptoPage() {
  return (
    <div className="h-full overflow-y-auto custom-scrollbar p-4 sm:p-6 lg:p-8 flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-900">Crypto Portfolio</h2>
          <p className="text-sm text-slate-500">
            Track crypto positions with target prices and performance.
          </p>
        </div>
        <button className="px-4 py-2 rounded-lg bg-accent text-white text-sm font-bold">
          Add Crypto
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 p-6 rounded-2xl border border-border-light bg-white shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Open Positions</h3>
            <span className="text-xs font-semibold text-slate-500">Live prices</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-border-light">
                  <th className="p-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Asset</th>
                  <th className="p-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">
                    Holdings
                  </th>
                  <th className="p-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">
                    Buy-in
                  </th>
                  <th className="p-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">
                    Current
                  </th>
                  <th className="p-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">
                    Target
                  </th>
                  <th className="p-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">
                    Gain %
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr className="hover:bg-slate-50/50">
                  <td className="p-3 text-sm font-bold text-slate-900">Bitcoin (BTC)</td>
                  <td className="p-3 text-sm font-mono text-right">0.85</td>
                  <td className="p-3 text-sm font-mono text-right">$31,200</td>
                  <td className="p-3 text-sm font-mono text-right">$42,100</td>
                  <td className="p-3 text-sm font-mono text-right">$55,000</td>
                  <td className="p-3 text-sm font-bold text-right text-emerald-600">+34.9%</td>
                </tr>
                <tr className="hover:bg-slate-50/50">
                  <td className="p-3 text-sm font-bold text-slate-900">Solana (SOL)</td>
                  <td className="p-3 text-sm font-mono text-right">32.3</td>
                  <td className="p-3 text-sm font-mono text-right">$98.40</td>
                  <td className="p-3 text-sm font-mono text-right">$128.10</td>
                  <td className="p-3 text-sm font-mono text-right">$220.00</td>
                  <td className="p-3 text-sm font-bold text-right text-emerald-600">+30.2%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="p-6 rounded-2xl border border-border-light bg-slate-50">
          <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4">Add Crypto</h3>
          <div className="flex flex-col gap-4">
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase">Symbol</label>
              <input
                className="mt-2 w-full rounded-lg border border-border-light px-3 py-2 text-sm"
                placeholder="BTC"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase">Holdings</label>
              <input
                className="mt-2 w-full rounded-lg border border-border-light px-3 py-2 text-sm"
                placeholder="0.5"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase">Buy-in Price</label>
              <input
                className="mt-2 w-full rounded-lg border border-border-light px-3 py-2 text-sm"
                placeholder="30000"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase">Target Price</label>
              <input
                className="mt-2 w-full rounded-lg border border-border-light px-3 py-2 text-sm"
                placeholder="50000"
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

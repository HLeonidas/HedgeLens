import type Highcharts from "highcharts";

import { HighchartsClient } from "@/components/charts/HighchartsClient";

const demoOptions = {
  chart: {
    type: "line",
    height: 320,
    backgroundColor: "transparent",
  },
  title: {
    text: "Time Value (Demo)",
  },
  xAxis: {
    title: { text: "Day" },
    categories: ["0", "15", "30", "45", "60", "75", "90"],
  },
  yAxis: {
    title: { text: "Value" },
  },
  series: [
    {
      type: "line",
      name: "Scenario A",
      data: [2.34, 2.18, 2.05, 1.9, 1.78, 1.62, 1.5],
    },
    {
      type: "line",
      name: "Scenario B",
      data: [2.34, 2.28, 2.2, 2.12, 2.05, 1.98, 1.9],
    },
  ],
  credits: { enabled: false },
} satisfies Highcharts.Options;

export default function ChartsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Charts</h1>
        <p className="text-sm text-slate-500 mt-1">
          Placeholder Highcharts demo to validate client rendering.
        </p>
      </div>
      <HighchartsClient options={demoOptions} className="w-full" />
    </div>
  );
}

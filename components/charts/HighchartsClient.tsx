"use client";

import Highcharts from "highcharts";
import { useEffect, useRef } from "react";

type HighchartsClientProps = {
  options: Highcharts.Options;
  className?: string;
};

export function HighchartsClient({
  options,
  className,
}: HighchartsClientProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    const chart = Highcharts.chart(containerRef.current, options);

    return () => {
      chart.destroy();
    };
  }, [options]);

  return <div ref={containerRef} className={className} />;
}

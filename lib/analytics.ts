export type Position = {
  isin: string;
  size: number;
  entryPrice: number;
};

export type Scenario = {
  volatility: number;
  drift: number;
  horizonDays: number;
  steps: number;
};

export type SimulationResult = {
  expectedReturn: number;
  variance: number;
  var95: number;
  timeValueCurve: Array<{ day: number; value: number }>;
  outcomes: Array<{ pnl: number }>;
};

export function simulateScenario(
  positions: Position[],
  scenario: Scenario
): SimulationResult {
  const totalNotional = positions.reduce(
    (sum, position) => sum + position.size * position.entryPrice,
    0
  );

  const horizonYears = scenario.horizonDays / 365;
  const expectedReturn = scenario.drift * horizonYears;
  const variance = Math.pow(scenario.volatility, 2) * horizonYears;
  const var95 = expectedReturn - 1.65 * Math.sqrt(variance);

  const timeValueCurve = Array.from({ length: scenario.steps + 1 }, (_, i) => {
    const day = Math.round((i / scenario.steps) * scenario.horizonDays);
    const decay = 1 - (i / scenario.steps) * Math.min(0.6, scenario.volatility);
    return {
      day,
      value: Number((totalNotional * Math.max(0, decay)).toFixed(4)),
    };
  });

  const outcomes = Array.from({ length: Math.max(10, scenario.steps) }, (_, i) => {
    const shock = (i / Math.max(1, scenario.steps)) * 2 - 1;
    const pnl = totalNotional * (expectedReturn + shock * scenario.volatility);
    return { pnl: Number(pnl.toFixed(2)) };
  });

  return {
    expectedReturn: Number(expectedReturn.toFixed(4)),
    variance: Number(variance.toFixed(4)),
    var95: Number(var95.toFixed(4)),
    timeValueCurve,
    outcomes,
  };
}

export type OptimizationInput = {
  objective: "max_return" | "min_risk" | "best_ratio";
  constraints: { maxLoss?: number; minReturn?: number };
  searchSpace: {
    putMin: number;
    putMax: number;
    callMin: number;
    callMax: number;
  };
};

export function optimizeRatio(input: OptimizationInput) {
  let bestScore = -Infinity;
  let bestRatio = { putCount: 0, callCount: 0, ratio: 0 };
  let expectedReturn = 0;
  let variance = 0;
  let var95 = 0;

  for (let putCount = input.searchSpace.putMin; putCount <= input.searchSpace.putMax; putCount += 1) {
    for (let callCount = input.searchSpace.callMin; callCount <= input.searchSpace.callMax; callCount += 1) {
      if (callCount === 0) continue;

      const ratio = putCount / callCount;
      const syntheticReturn = (callCount - putCount) / Math.max(1, putCount + callCount);
      const syntheticRisk = Math.abs(ratio - 1) * 0.1 + 0.05;
      const score =
        input.objective === "min_risk"
          ? -syntheticRisk
          : input.objective === "best_ratio"
            ? -Math.abs(ratio - 0.5)
            : syntheticReturn;

      if (input.constraints.minReturn && syntheticReturn < input.constraints.minReturn) {
        continue;
      }

      if (input.constraints.maxLoss && -syntheticRisk < input.constraints.maxLoss) {
        continue;
      }

      if (score > bestScore) {
        bestScore = score;
        bestRatio = {
          putCount,
          callCount,
          ratio: Number(ratio.toFixed(2)),
        };
        expectedReturn = Number(syntheticReturn.toFixed(4));
        variance = Number((syntheticRisk ** 2).toFixed(4));
        var95 = Number((syntheticReturn - 1.65 * syntheticRisk).toFixed(4));
      }
    }
  }

  return {
    bestRatio,
    expectedReturn,
    variance,
    var95,
  };
}
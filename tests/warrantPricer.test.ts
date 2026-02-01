import assert from "assert";

import { priceWarrant, type WarrantPayload } from "../lib/warrantPricer";

function nearlyEqual(a: number, b: number, tol = 1e-4) {
  return Math.abs(a - b) <= tol;
}

// Deterministic Black-Scholes test (call, T ~ 0.5 year).
{
  const valuationDate = "2026-01-01";
  const expiryDate = "2026-07-02"; // 182 days after Jan 1 in 2026
  const payload: WarrantPayload = {
    details: {
      stammdaten: {
        basispreis: { raw: "100", value: 100 },
        bezugsverhältnis: { raw: "1", value: 1 },
        typ: { raw: "CALL", value: null },
        währung: { raw: "USD", value: null },
      },
      handelsdaten: {
        "letzter handelstag": { raw: "02.07.2026", value: null },
      },
      volatilitaet: {
        "implizite volatilität": { raw: "0.2", value: 0.2 },
      },
    },
  };

  const result = priceWarrant(payload, {
    valuationDate,
    spot: 100,
    dividendYield: 0,
    riskFreeRate: 0.05,
    fx: { underlyingPerWarrant: 1 },
    underlyingCurrency: "USD",
  });

  // Expected value for S=100, K=100, r=0.05, q=0, sigma=0.2, T=182/365.
  const expected = 6.8776;
  assert.ok(
    nearlyEqual(result.results.fairValue, expected, 1e-3),
    `Fair value ${result.results.fairValue} not within tolerance of ${expected}`
  );
  assert.ok(
    nearlyEqual(
      result.results.fairValue,
      result.results.intrinsicValue + result.results.timeValue,
      1e-6
    ),
    "Fair value should equal intrinsic + time value"
  );
}

// Golden payload consistency test.
{
  const payload: WarrantPayload = {
    details: {
      stammdaten: {
        basispreis: { raw: "125", value: 125 },
        bezugsverhältnis: { raw: "0.1", value: 0.1 },
        typ: { raw: "PUT", value: null },
        währung: { raw: "EUR", value: null },
      },
      handelsdaten: {
        "letzter handelstag": { raw: "18.06.2026", value: null },
      },
      volatilitaet: {
        "implizite volatilität": { raw: "61.8894958496", value: 0.6188949584960001 },
      },
    },
  };

  const result = priceWarrant(payload, {
    valuationDate: "2026-01-31",
    spot: 146.59,
    dividendYield: 0,
    riskFreeRate: 0.03,
    fx: { underlyingPerWarrant: 1 },
    underlyingCurrency: "USD",
  });

  assert.strictEqual(result.inputs.ratio, 0.1);
  assert.ok(result.results.fairValue >= 0);
  assert.ok(
    nearlyEqual(
      result.results.fairValue,
      result.results.intrinsicValue + result.results.timeValue,
      1e-6
    ),
    "Fair value should equal intrinsic + time value"
  );
}

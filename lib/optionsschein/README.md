# Warrant Data Model

This module defines a reproducible, calculation-ready Warrant (OS) model for both standalone analysis and project-bound positions. It separates **persisted inputs** from **computed outputs** to ensure all KPIs are always reproducible from stored inputs.

## What is persisted (source of truth)
### Instrument / Contract (static)
- `isin`
- `name` (optional)
- `issuer` (optional)
- `warrantType` (call/put)
- `underlyingName` (optional)
- `underlyingSymbol`
- `strike`
- `expiry` (ISO date)
- `ratio` (ratio, default 1)
- `currency`
- `settlementType` (optional)
- `multiplier` (optional, default 1)

### Pricing Inputs (dynamic)
- `valuationDate` (ISO date)
- `underlyingPrice` (S)
- `volatility` (sigma, decimals)
- `rate` (r, decimals)
- `dividendYield` (q, decimals)
- `fxRate` (optional, default 1)
- `marketPrice` (optional)
- `bid` / `ask` (optional)

### Position-only (project-bound only)
- `projectId`
- `entryPrice`
- `quantity`

## What is derived (never source of truth)
Computed values are **derived** and may be cached only as a snapshot:
- `fairValue`
- `intrinsicValue`
- `timeValue`
- `breakEven`
- `agio` / `premium` (absolute + percent)
- `delta`, `gamma`, `theta`, `vega`
- `omega`
- `asOf`
- `warnings[]`

## Standalone vs Project-bound
- **Standalone OS**
  - No `projectId`.
  - Used for ad‑hoc analysis and scenario comparison.
  - Position fields are `null`.

- **Project-bound OS**
  - Has `projectId` and position fields (`entryPrice`, `quantity`).
  - Used to represent a position inside a project.

The core OS structure does **not** depend on projects; project fields are optional and only present when needed.

## Optional computed snapshot (cache only)
`computedSnapshot` stores:
- `computed` values
- `asOf`
- `inputHash`

Rules:
- Snapshot is a cache only.
- Recompute if any pricing input or valuation date changes.
- Never rely on the snapshot as the single source of truth.

## Minimum required fields (for Onvista-like KPIs)
To reproduce fair value, intrinsic/time value, break-even, agio, and Greeks:
- `S` = `underlyingPrice`
- `K` = `strike`
- `T` = derived from `valuationDate` + `expiry`
- `sigma` = `volatility`
- `r` = `rate`
- `q` = `dividendYield`
- `warrantType` = call/put
- `ratio`
- `fxRate`
- `valuationDate`

`marketPrice` is optional and used only for premium/benchmarking.

## Files
- `types.ts` – canonical TypeScript types
- `schema.ts` – Zod validation schemas
- `storage.ts` – Redis persistence helpers

## Notes on Formulas
The computation layer uses a Black–Scholes-style model with warrant adjustments:
- Price, intrinsic/time value, break-even, and Greeks are derived from standard inputs.
- Practical warrant inputs (ratio, multiplier, FX) are applied consistently.

Full formula derivations are intentionally omitted here.

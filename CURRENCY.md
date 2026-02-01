# Currency Handling in HedgeLens

This document explains how currencies are stored, displayed, and converted across the app, and when exchange rates are fetched/used.

## 1) Currency fields and precedence

### Project
- `project.baseCurrency` is the default currency for the project.

### Positions (project-bound)
- `position.currency` is the position/warrant currency (if set).
- If missing, we fall back to `project.baseCurrency`.

### User
- `user.preferred_currency` is the **display/aggregation currency** used in the dashboard and some summaries.

### Warrant (OS) instrument
- Onvista import provides `instrument.currency` and an optional `fxRate`.
- `fxRate` represents **underlying currency per 1 warrant currency** (see Warrant pricing below).

## 2) Exchange rates: source, cache, and freshness

### Source
- Exchange rates are fetched from **Alpha Vantage** via `lib/exchange-rate.ts`.

### Cache
- Rates are stored in Redis (`lib/store/exchange-rates.ts`).
- A rate is considered **fresh for 48 hours** (`MAX_AGE_MS`).

### Fetch rules
- `getOrFetchExchangeRate(from, to)`:
  - Returns cached rate if fresh.
  - Otherwise fetches from Alpha Vantage and stores the result.
- `/api/exchange-rate` (GET):
  - Calls `getOrFetchExchangeRate`.
  - Returns cached if fresh unless `force=1` is provided (admin only).
- `/api/exchange-rate` (POST):
  - Admin can set a **manual** rate.
  - If no rate is provided, it forces a fresh fetch.

### Inverse rates
- When converting, we try direct `from -> to`. If missing, we try inverse `to -> from` and invert it.

## 3) Where conversion happens (by page / module)

### Dashboard (server-side aggregation)
- File: `lib/dashboard.ts`
- Converts **position values** into `user.preferred_currency`.
- Currency resolution for a position:
  - `position.currency` → `project.baseCurrency`.
  - For **spot** positions: uses `project.underlyingLastPriceCurrency` or ticker currency before base.
- FX used:
  - `getOrFetchExchangeRate(from, preferred)` (cached if fresh).
  - If missing, tries inverse.
  - If still missing, value is left unconverted and a warning is emitted.

### Project detail page
- File: `app/(app)/projects/[id]/page.tsx`
- Fetches FX via `/api/exchange-rate?from=...&to=...` for relevant currencies.
- Uses those rates to show totals in the **preferred currency** (from `/api/me`).
- If FX is missing, it falls back to unconverted values and shows a warning.

### Warrant calculator (Optionsschein-Rechner)
- Files:
  - `components/optionsschein-rechner/OptionsscheinRechnerClient.tsx`
  - `app/api/optionsschein/calculate/route.ts`
  - `lib/warrantPricer.ts`
- Currency displayed in the calculator is:
  - `position.currency` (if present), otherwise `project.baseCurrency`, otherwise lookup currency.
- Pricing FX usage:
  - The pricing model expects **`fxRate = underlying currency per 1 warrant currency`**.
  - Internally it uses `underlyingPerWarrant = 1 / fxRate`.
  - If no FX is provided, it **defaults to 1** (same currency).
- Onvista lookup (`/api/isin/lookup`) returns `fxRate` from the provider when available.

### Investments
- File: `app/(app)/investments/page.tsx`
- Displays values in each investment’s own `currency` (no global conversion).

### Settings
- File: `app/(app)/settings/page.tsx`
- Admins can refresh FX (force fetch) or set a manual rate.
- Users can set `preferred_currency`, which affects dashboard + project summary conversions.

## 4) When we calculate FX rates

- **Dashboard load** (server):
  - Fetches FX for all currencies encountered → preferred currency.
  - Uses cached rates when fresh (<48h); otherwise fetches new ones.

- **Project detail page** (client):
  - Fetches FX for the currencies shown in the project page → preferred currency.
  - Uses cached rates on the server if fresh; otherwise fetches.

- **Manual refresh / override** (settings):
  - Admin can force refresh or set a manual rate.

## 5) Quick summary (what rate is used when)

- If **fresh cached** rate exists: use it.
- Else: fetch from Alpha Vantage and store.
- If direct rate missing: try inverse and invert it.
- If still missing: no conversion; show warning and keep original currency values.

---

If you want this documented per component or need a diagram, tell me which audience (dev vs. product) and I’ll add it.

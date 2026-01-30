# HedgeLens

## Technical Specification (v1/MVP)

### 1) Goal & Scope
- Online tool for options warrants (derivatives)
- Users enter ISIN -> product details loaded via API
- Capture and optimize put/call ratio
- Forecasts via scenario simulation
- Time value (over maturity) as a chart
- User accounts with saved projects
- Investment tracking (buy-in, shares, current price, target/expected)
- Crypto portfolio with own positions and target prices

---

### 2) Tech Stack
- Frontend: Angular 17+ + Tailwind CSS + Icon Pack (Tabler Icons)
- Charts: Highcharts (direct)
- Hosting/Backend: Vercel
  - Frontend hosting (Angular build)
  - Vercel Serverless Functions (`/api`) for ISIN proxy, simulation, optimization
- Data: Vercel
  - Data stored in Vercel Storage (e.g., Postgres/KV depending on setup)

---

### Charts (Highcharts)
- Install: `npm install highcharts`
- Use: Import `Highcharts` in a component and configure chart options there.

### 3) Architecture Overview
- Angular (Vercel) <-> Vercel Storage (Users, Projects, Results)
- Angular (Vercel) <-> Vercel Functions (`/api`) (ISIN lookup, simulation, optimization)

---

### 4) Data Model (Vercel Storage)

**/users/{uid}**
- email, createdAt, preferences
- riskProfile: conservative | balanced | aggressive

**/projects/{projectId}**
- ownerUid
- name
- createdAt, updatedAt
- baseCurrency
- ratios: putCount, callCount, ratio
- constraints: maxLoss, minReturn, maxVolatility, horizonDays

**/instruments/{isin}**
- isin
- name
- issuer
- type (put/call)
- underlying
- strike
- expiry
- currency
- price
- greeks? (delta, gamma, theta, vega) optional
- fetchedAt

**/positions/{positionId}**
- projectId
- isin
- side: put | call
- size
- entryPrice
- date

**/scenarios/{scenarioId}**
- projectId
- name (bear/base/bull/custom)
- volatility
- drift
- horizonDays
- steps

**/analytics/{analyticsId}**
- projectId
- expectedReturn
- variance
- var95
- bestRatioSet
- timeValueCurve (array)

**/investments/{positionId}**
- ownerUid
- isin
- name
- shares
- buyInPrice
- currentPrice
- expectedPrice
- currency
- updatedAt

**/crypto_positions/{positionId}**
- ownerUid
- symbol (e.g., BTC, ETH)
- name
- shares
- buyInPrice
- currentPrice
- expectedPrice
- currency
- updatedAt

---

### 5) API Contracts (Vercel Functions)

#### 5.1 ISIN Lookup
**POST** `/api/isin/lookup`
- Request:
```json
{ "isin": "DE000..." }
```
- Response:
```json
{
  "isin": "DE000...",
  "name": "Product Name",
  "issuer": "Issuer",
  "type": "call",
  "underlying": "DAX",
  "strike": 19000,
  "expiry": "2026-06-19",
  "currency": "EUR",
  "price": 2.34,
  "greeks": { "delta": 0.42, "theta": -0.03 }
}
```
- Notes: Serverless function acts as a proxy for the external ISIN provider (API key hidden).

---

#### 5.2 Latest Price (ISIN)
**POST** `/api/price/isin`
- Request:
```json
{ "isin": "DE000..." }
```
- Response:
```json
{
  "isin": "DE000...",
  "name": "Product Name",
  "price": 12.34,
  "currency": "EUR",
  "asOf": "2026-01-30T10:00:00Z"
}
```
- Notes: Price is fetched server-side and stored in Vercel Storage.

---

#### 5.3 Latest Price (Crypto)
**POST** `/api/price/crypto`
- Request:
```json
{ "symbol": "BTC" }
```
- Response:
```json
{
  "symbol": "BTC",
  "name": "Bitcoin",
  "price": 42000,
  "currency": "USD",
  "asOf": "2026-01-30T10:00:00Z"
}
```
- Notes: Price is fetched server-side and stored in Vercel Storage.

---

#### 5.4 Scenario Simulation
**POST** `/api/simulate`
- Request:
```json
{
  "projectId": "...",
  "positions": [{ "isin": "...", "size": 10, "entryPrice": 2.10 }],
  "scenario": { "volatility": 0.25, "drift": 0.04, "horizonDays": 90, "steps": 90 }
}
```
- Response:
```json
{
  "expectedReturn": 0.12,
  "variance": 0.08,
  "var95": -0.15,
  "timeValueCurve": [ { "day": 0, "value": 2.34 }, "..." ],
  "outcomes": [ { "pnl": -120 }, { "pnl": 80 }, "..." ]
}
```

---

#### 5.5 Ratio Optimization
**POST** `/api/optimize`
- Request:
```json
{
  "projectId": "...",
  "objective": "max_return | min_risk | best_ratio",
  "constraints": { "maxLoss": -500, "minReturn": 0.05 },
  "searchSpace": { "putMin": 0, "putMax": 10, "callMin": 0, "callMax": 10 }
}
```
- Response:
```json
{
  "bestRatio": { "putCount": 3, "callCount": 7, "ratio": 0.43 },
  "expectedReturn": 0.14,
  "variance": 0.06,
  "var95": -0.10
}
```

---

### 6) Calculation Logic (MVP)
- Put/Call ratio = putCount / callCount (callCount > 0)
- Scenario simulation: simplified stochastic model (GBM-like)
- Time value: linear/simplified modeling with theta
- Optimization: grid search over ratio combinations
- Investments: profit = (currentPrice - buyInPrice) * shares
- Expected: target value = expectedPrice * shares

---

### 7) Security
- ISIN provider API keys only as Vercel environment variables

---

### 8) MVP Limitations (Intentional)
- Simplified time value calculation
- No real order routing
- Simulation not exchange-accurate, scenario-based only

---

## Deployment (Vercel)
- Frontend and API run in a single Vercel project.
- API endpoints under `/api/*` as Vercel Functions.
- Configuration/secrets via Vercel environment variables.
- Position data stored in Vercel Storage (e.g., Postgres/KV depending on setup).

### Vercel Settings (for this repo)
- Build Command: `npm run build`
- Output Directory: `dist/hedgelens`
- Framework Preset: Other (Angular static build)
- SPA fallback: rewrite all routes to `/index.html` (see `vercel.json`)

### Vercel Storage Setup (Options)
- Postgres: structured data for users, projects, analytics, and positions.
- KV: fast access for latest prices and cached ISIN lookups.
- Blob: optional for exports, reports, or uploaded assets.

### Required Environment Variables
- `POSTGRES_URL` (or the Vercel Postgres connection vars)

### Deploy Steps
1) Install Vercel CLI: `npm i -g vercel`
2) Log in: `vercel login`
3) Link the project: `vercel link`
4) Set env vars in Vercel (ISIN provider keys, Auth.js secrets)
5) Deploy: `vercel`

## Angular CLI

This project was generated with Angular CLI version 17.3.17.

### Development server
Run `ng serve` for a dev server. Navigate to `http://localhost:4200/`. The application will automatically reload if you change any of the source files.

### Code scaffolding
Run `ng generate component component-name` to generate a new component. You can also use `ng generate directive|pipe|service|class|guard|interface|enum|module`.

### Build
Run `ng build` to build the project. The build artifacts will be stored in the `dist/` directory.

### Running unit tests
Run `ng test` to execute the unit tests via Karma.

### Running end-to-end tests
Run `ng e2e` to execute the end-to-end tests via a platform of your choice.

### Further help
To get more help on the Angular CLI use `ng help` or go check out the Angular CLI Overview and Command Reference page.

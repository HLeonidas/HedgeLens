# HedgeLens

## Tech Stack (Current)
- Next.js (App Router)
- Auth.js (NextAuth v5) with cookie-based JWT session
- Upstash Redis (Vercel Storage)
- Tailwind CSS

## Quick Start
1. Create `.env.local` values (see Environment).
2. `npm install`
3. `npm run dev`
4. Open `http://localhost:3000`

## Environment
Required for Auth + DB:
- `AUTH_SECRET`
- `AUTH_GITHUB_ID`
- `AUTH_GITHUB_SECRET`
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

Optional:
- `ISIN_PROVIDER_URL`
- `ISIN_PROVIDER_KEY`

## App Router Layout
- `app/` – routes + layouts
- `app/api/*` – server-only API routes
- `lib/` – server-only helpers (DB, analytics)

## Auth
Auth is implemented via Auth.js with GitHub OAuth.
Replace/extend the provider list when you add more identity providers.

## Deployment (Vercel)
- Build: `npm run build`
- Start: `npm run start`
- Framework: Next.js (auto-detected)
- API routes are part of the same deployment under `/api/*`

## Upstash Redis (Vercel Storage) Setup
If you created an Upstash Redis database via Vercel, use the steps below to connect it to this app.

1. **Create or connect an Upstash database**
   - In the Vercel Dashboard, open your project and go to **Storage**.
   - Create/select Upstash Redis and open it in the Upstash Console if needed.

2. **Pull env vars locally**
   - Run:
     ```
     vercel env pull .env.development.local
     ```
   - This populates `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`.

3. **Run the app**
   - `npm run dev`

## Next Steps (Workflow)
1. Auth setup
   - Confirm `.env.local` values are present and valid.
   - Verify GitHub OAuth callback URL points to `http://localhost:3000/api/auth/callback/github` in dev.
2. Database bootstrap
   - Run initial migration for `users` (must include `active` flag).
   - Ensure a DB client is available in `lib/` for server-only usage.
3. Security gating (required)
   - Add middleware or route guards that block access when `user.active = false`.
   - Apply the same check to API routes and page routes.
4. Account provisioning
   - On first login, upsert a `users` record with `active = true` by default.
   - Store provider ID + email to avoid duplicate accounts.

## Security
- Add a server-side guard that checks `users.active` on every page and API request. If inactive, deny access.
- On login, create (or update) the user record in Postgres so every authenticated user has an account row.

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

### 2) Tech Stack (Current)
- Frontend: Next.js (App Router) + Tailwind CSS
- Auth: Auth.js (NextAuth v5) with cookie-based JWT session
- Data: Postgres (Neon/Vercel Postgres)
- Hosting/Backend: Vercel
  - Next.js app + API routes under `/api/*`
  - Serverless functions for ISIN proxy, simulation, optimization

---

### 3) Architecture Overview
- Next.js (Vercel) <-> Auth.js (GitHub OAuth)
- Next.js (Vercel) <-> Postgres (Users, Projects, Results)
- Next.js (Vercel) <-> API routes (`/api`) (ISIN lookup, simulation, optimization)

---

### 4) Data Model (Postgres)

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

### 5) API Contracts (API Routes)

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

### 6) Calculation Logic
- Put/Call ratio = putCount / callCount (callCount > 0)
- Scenario simulation: simplified stochastic model (GBM-like)
- Time value: linear/simplified modeling with theta
- Optimization: grid search over ratio combinations
- Investments: profit = (currentPrice - buyInPrice) * shares
- Expected: target value = expectedPrice * shares

# HedgeLens

HedgeLens is a portfolio intelligence workspace focused on options warrants (Optionsscheine) with a companion holdings view for investments and crypto. It combines project-based warrant positions, lightweight pricing/greeks, and scenario/ratio analytics.

## App Concept (Short)
- Users own projects.
- Projects contain option positions (put/call) with market or model pricing.
- Users also track investments and crypto independently of projects.
- ISIN metadata can enrich positions and investments.

See `concepts/app-overview.md` for the full object relationship map.

## Implemented Features
- Auth.js (GitHub OAuth) session handling and API guards.
- User management in Settings: list users, search/filter/sort, theme toggle, logout.
- Projects: create and list projects; per-project detail view with positions.
- Options positions (project detail):
  - Add/delete positions (call/put), pricing mode (market or model).
  - Black–Scholes model pricing and Greeks (with recompute).
  - Ratio summary and value summary panels.
  - Time value curve generation and display in details.
- Investments workspace (`/investments`):
  - Track investments, options positions, and crypto positions in one view.
  - Inline editing, add new entries, mark investments sold, and summary totals by currency.
  - ISIN hidden by default with a hover info tooltip in the table.
- Optionsschein calculator API (`/api/optionsschein/calculate`) with scenario inputs and Greeks.
- Analytics APIs:
  - Scenario simulation (`/api/simulate`) with expected return/variance/VAR and time-value curve.
  - Ratio optimization (`/api/optimize`).
- ISIN lookup API (`/api/isin/lookup`) with external provider support and local demo fallback.
- Price APIs (`/api/price/isin`, `/api/price/crypto`) returning demo data.
- Redis-backed storage (Upstash) for users, projects, positions, investments, options positions, crypto positions.

## Not Done Yet / Placeholder Areas
- Dashboard metrics and charts are static placeholders.
- Charts page uses demo data only.
- Comparison, Put-Call Ratio, Scenarios, and Volatility pages are UI placeholders (not wired to data).
- Standalone `/crypto` page is mock data (real crypto tracking currently lives in `/investments`).
- Price feeds for ISIN and crypto are mocked; real market data integration is still pending.
- User actions in Settings (edit/delete) are UI-only, not wired to APIs.
- Persistence for scenario runs/analytics history is not implemented (APIs return computed results only).

## Primary App Areas
- `/projects` and `/projects/[id]`: Create projects and manage options positions.
- `/investments`: All investments, options positions, and crypto positions with summary totals.
- `/analysis/optionsschein-rechner`: Optionsschein pricing calculator.
- `/settings`: User list, theme toggle, session logout.

## Header Behavior (Breadcrumbs + Search)
- Breadcrumbs show **Section / Page** based on `components/layout/nav.ts`.
- Detail views add a third crumb:
  - `/projects/[id]` → project name fetched from `/api/projects/[id]`.
  - `/analysis/optionsschein-rechner/[isin]` → ISIN shown as the third crumb.
- Global search (header):
  - Searches projects and positions via `/api/search`.
  - If a valid ISIN is entered and no matching position exists, it opens
    `/analysis/optionsschein-rechner/{ISIN}`.

## Key API Routes
- Auth: `/api/auth/[...nextauth]`, `/api/me`, `/api/protected`
- Projects & positions: `/api/projects`, `/api/projects/[id]`, `/api/projects/[id]/positions`
- Optionsschein positions: `/api/optionsschein/positions`
- Investments & crypto: `/api/investments`, `/api/crypto`
- Pricing & lookups: `/api/isin/lookup`, `/api/price/isin`, `/api/price/crypto`
- Analytics: `/api/simulate`, `/api/optimize`, `/api/optionsschein/calculate`

## Concepts
- `concepts/app-overview.md`
- `concepts/investments-page.md`
- `concepts/projects-page.md`
- `concepts/project-detail-positions.md`
- `concepts/optionsschein-calculator.md`
- `concepts/settings-page.md`
- `app/(app)/README.md` (UI design patterns and layout conventions)

## Tech Stack
- Next.js (App Router)
- Auth.js (NextAuth v5)
- Upstash Redis (Vercel Storage)
- Tailwind CSS

## Quick Start
1. Create `.env.local` values (see Environment).
2. `npm install`
3. `npm run dev`
4. Open `http://localhost:3000`

## Environment Variables
Required:
- `AUTH_SECRET`
- `AUTH_GITHUB_ID`
- `AUTH_GITHUB_SECRET`
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

Optional:
- `ISIN_PROVIDER_URL`
- `ISIN_PROVIDER_KEY`

## Storage Schema
- `db/schema.md` describes the current storage shape and cache keys.

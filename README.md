# HedgeLens

## Status
- Next.js App Router migration (Jan 30, 2026)
- Angular legacy preserved in `legacy/`

## Tech Stack (Current)
- Next.js (App Router)
- Auth.js (next-auth) with cookie-based JWT session
- Postgres (Neon/Vercel Postgres)
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
- `POSTGRES_URL` (or `DATABASE_URL`)

Optional:
- `ISIN_PROVIDER_URL`
- `ISIN_PROVIDER_KEY`

## App Router Layout
- `app/` – routes + layouts
- `app/api/*` – server-only API routes
- `lib/` – server-only helpers (DB, analytics)
- `legacy/` – previous Angular codebase

## API Endpoints (App Router)
- `POST /api/isin/lookup`
- `POST /api/price/isin`
- `POST /api/price/crypto`
- `POST /api/simulate`
- `POST /api/optimize`
- `GET /api/health`
- `GET /api/me`
- `GET /api/protected`

## Auth
Auth is implemented via Auth.js (NextAuth v5) with GitHub OAuth.
Replace/extend the provider list when you add more identity providers.

## Deployment (Vercel)
- Build: `npm run build`
- Start: `npm run start`
- Framework: Next.js (auto-detected)
- API routes are part of the same deployment under `/api/*`

## Legacy Angular
The previous Angular codebase and build artifacts live in `legacy/`.
You can keep it there until feature parity is reached.

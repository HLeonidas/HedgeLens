# HedgeLens Storage Schema (v1/MVP)

This file defines the minimal storage schema and cache keys to align with the frontend data contracts.

## Postgres tables

### users
- id (text, pk)
- email (text, unique, not null)
- name (text, nullable)
- image (text, nullable)
- provider (text, nullable)
- provider_account_id (text, nullable)
- active (boolean, not null)
- created_at (timestamptz, not null)
- updated_at (timestamptz, not null)
- risk_profile (text, nullable)
- preferences (jsonb, nullable)

Indexes:
- users_email_idx on (email)

### projects
- id (text, pk)
- owner_uid (text, not null)
- name (text, not null)
- created_at (timestamptz, not null)
- updated_at (timestamptz, not null)
- base_currency (text, not null)
- ratios (jsonb, nullable) -- { putCount, callCount, ratio }
- constraints (jsonb, nullable) -- { maxLoss, minReturn, maxVolatility, horizonDays }

Indexes:
- projects_owner_uid_idx on (owner_uid)

### instruments
- isin (text, pk)
- name (text, not null)
- issuer (text, not null)
- type (text, not null) -- put | call
- underlying (text, not null)
- strike (numeric, not null)
- expiry (date, not null)
- currency (text, not null)
- price (numeric, not null)
- greeks (jsonb, nullable) -- { delta, gamma, theta, vega }
- fetched_at (timestamptz, not null)

### positions
- id (text, pk)
- project_id (text, not null)
- isin (text, not null)
- side (text, not null) -- put | call
- size (numeric, not null)
- entry_price (numeric, not null)
- date (date, not null)
- pricing_mode (text, not null) -- market | model
- underlying_symbol (text, nullable)
- underlying_price (numeric, nullable)
- strike (numeric, nullable)
- expiry (date, nullable)
- volatility (numeric, nullable)
- rate (numeric, nullable)
- dividend_yield (numeric, nullable)
- ratio (numeric, nullable) -- Bezugsverhältnis
- market_price (numeric, nullable)
- computed (jsonb, nullable) -- { fairValue, intrinsicValue, timeValue, delta, gamma, theta, vega, iv?, asOf }
- time_value_curve (jsonb, nullable) -- [{ day, value }]

Indexes:
- positions_project_id_idx on (project_id)
- positions_isin_idx on (isin)

### scenarios
- id (text, pk)
- project_id (text, not null)
- name (text, not null)
- volatility (numeric, not null)
- drift (numeric, not null)
- horizon_days (int, not null)
- steps (int, not null)
- created_at (timestamptz, not null)

Indexes:
- scenarios_project_id_idx on (project_id)

### analytics
- id (text, pk)
- project_id (text, not null)
- expected_return (numeric, not null)
- variance (numeric, not null)
- var95 (numeric, not null)
- best_ratio_set (jsonb, nullable) -- { putCount, callCount, ratio }
- time_value_curve (jsonb, not null) -- [{ day, value }]
- created_at (timestamptz, not null)

Indexes:
- analytics_project_id_idx on (project_id)

### investments
- id (text, pk)
- owner_uid (text, not null)
- isin (text, not null)
- name (text, not null)
- shares (numeric, not null)
- buy_in_price (numeric, not null)
- current_price (numeric, not null)
- expected_price (numeric, nullable)
- currency (text, not null)
- updated_at (timestamptz, not null)

Indexes:
- investments_owner_uid_idx on (owner_uid)
- investments_isin_idx on (isin)

### crypto_positions
- id (text, pk)
- owner_uid (text, not null)
- symbol (text, not null)
- name (text, not null)
- shares (numeric, not null)
- buy_in_price (numeric, not null)
- current_price (numeric, not null)
- expected_price (numeric, nullable)
- currency (text, not null)
- updated_at (timestamptz, not null)

Indexes:
- crypto_positions_owner_uid_idx on (owner_uid)
- crypto_positions_symbol_idx on (symbol)

## KV cache keys (Vercel KV)

- isin:lookup:{isin} -> Instrument payload (short TTL, e.g. 6h)
- price:isin:{isin} -> { isin, name, price, currency, asOf } (short TTL, e.g. 15m)
- price:crypto:{symbol} -> { symbol, name, price, currency, asOf } (short TTL, e.g. 15m)

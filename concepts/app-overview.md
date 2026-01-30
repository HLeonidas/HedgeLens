# Concept: HedgeLens Overview & Data Relationships

## Purpose
HedgeLens is a portfolio intelligence workspace focused on options warrants (Optionsscheine) and related holdings. It combines project-based warrant positions with a broader holdings view (investments and crypto) and lightweight analytics to evaluate ratios, scenarios, and pricing.

## Core Objects
- User: authenticated account with an activity flag and preferences.
- Project: a user-owned container for options warrant positions and strategy data.
- Position (Project Position): an options warrant position within a project (put/call), with market or model pricing.
- Options Position (Standalone): options positions not tied to a project, used in the Investments workspace.
- Investment: equity/ETF-like position tracked by ISIN with shares and target price.
- Crypto Position: crypto holding with shares and target price.
- Scenario: inputs describing a market condition (volatility, drift, horizon).
- Analytics: computed results for scenarios and ratio optimization.
- Instrument: reference metadata for an ISIN (name, issuer, strike, expiry, etc.).

## How Objects Relate
- User → Projects
  - A user owns many projects.
- Project → Positions
  - Each project contains many positions (put/call warrants).
- Project → Scenarios / Analytics
  - Scenarios and analytics are logically tied to a project’s positions.
- User → Investments / Crypto Positions
  - Investments and crypto holdings are user-owned and not tied to projects.
- User → Standalone Options Positions
  - Options positions can be tracked independently of projects for the Investments page.
- Instrument Metadata
  - ISIN lookup enriches positions and investments with reference data but does not “own” them.

## Data Flow (High Level)
- Projects page creates and lists projects for a user.
- Project detail adds positions, computes model pricing and Greeks, and summarizes ratio/value.
- Investments page aggregates investments, options positions, and crypto positions in one view.
- Scenario and optimization APIs compute analytics on demand; results can be displayed without persistence.
- Pricing and ISIN lookup endpoints enrich data (currently mocked or proxy-based).

## Current Persistence (As Implemented)
- Redis/Upstash stores user, project, position, investment, options position, and crypto records.
- Scenarios/analytics can be computed on demand; long-term history is not fully persisted.

## Constraints & Assumptions
- Currency totals are calculated per currency without FX conversion.
- Model pricing uses Black–Scholes assumptions; warrants may deviate from vanilla option models.
- Market prices are user-entered or mocked unless a provider is configured.

## Success Criteria
- Users understand where each object lives and how it impacts their portfolio view.
- The app provides a clear separation between project-based warrant strategies and global holdings.

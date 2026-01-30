# Concept: Investments Page

## Purpose
Provide a single workspace to manage equities/ETF investments, options positions, and crypto positions with live-ish pricing assumptions and performance calculations.

## Scope
- In scope:
  - View open investments, options positions, and crypto positions in dedicated tables.
  - Inline edit key fields (name, size/amounts, prices).
  - Compute invested capital, value-at-sell, gains, taxes, net value per row.
  - Mark investments as sold with a sold price input.
  - Summary totals by currency across all open positions.
- Out of scope:
  - Real market data feeds and auto-refresh.
  - Portfolio rebalancing or allocation targets.
  - Advanced tax logic beyond simple rate.

## Users
- Individual investor tracking mixed portfolios with manual inputs.
- Users who need a quick snapshot and editable ledger of positions.

## Functional Requirements
- List investments from `/api/investments`.
- List options positions from `/api/optionsschein/positions`.
- List crypto positions from `/api/crypto`.
- Inline edit fields per row with PATCH requests.
- Add new items for each section.
- Mark an investment as sold with a sell price and status update.
- Display ISIN via tooltip (info icon), not as a visible column.
- Show summary totals per currency at the bottom of the page.

## Non-Functional Requirements
- Performance: handle ~200 rows without UI lag.
- Security/Privacy: show only the authenticated user’s positions.
- Accessibility: keyboard-friendly inline inputs and tooltips.
- Reliability: graceful UI for fetch errors and empty states.

## Data & Integrations
- Data inputs: Investments, options positions, crypto positions.
- Data outputs: PATCH updates for edits; POST for new items; sold status updates.
- External services/APIs: none directly (prices currently mocked or manual).

## UX / Flows
- Primary flow: open page → view positions → inline edit → save.
- Edge cases: empty states per section, invalid inputs, network errors, partial loads.

## Risks & Open Questions
- Currency conversions not handled for totals across currencies.
- Tax logic is simplified; may need localization.

## Success Criteria
- Users can add/edit positions and see totals without leaving the page.
- Errors are clear and do not block other sections.

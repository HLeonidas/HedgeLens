# Concept: Project Detail (Positions)

## Purpose
Provide a detailed view of a single project with options positions, model pricing, and ratio/value summaries.

## Scope
- In scope:
  - Add positions (call/put) with market or model pricing.
  - Compute model values and Greeks (Black–Scholes).
  - Recompute model positions on demand.
  - Show put/call ratio summary and value summary.
  - Expand row details for model inputs and time value curve.
- Out of scope:
  - Multi-user collaboration.
  - Automated market price updates.

## Users
- Users maintaining a specific options strategy and monitoring ratios/values.

## Functional Requirements
- Fetch project and positions via `/api/projects/[id]`.
- Add positions via `/api/projects/[id]/positions`.
- Delete positions via `/api/projects/[id]/positions/[posId]`.
- Recompute model via `/api/projects/[id]/positions/[posId]/recompute`.
- Persist and display computed fields, including time value curve.

## Non-Functional Requirements
- Performance: responsive UI with moderate position counts.
- Security/Privacy: verify ownership on all API routes.
- Reliability: robust validation for pricing inputs.

## Data & Integrations
- Data inputs: ISIN, side, size, pricing inputs.
- Data outputs: stored positions and computed results.
- External services/APIs: optional ISIN lookup if integrated elsewhere.

## UX / Flows
- Primary flow: open project → add position → view summaries → recompute if model.
- Edge cases: invalid inputs, missing computed fields, empty project.

## Risks & Open Questions
- Model assumptions and parameter defaults need validation.
- Ratio summary depends on having at least one call position.

## Success Criteria
- Users can add positions and see ratio/value summaries update.
- Model recompute updates displayed values without reload issues.

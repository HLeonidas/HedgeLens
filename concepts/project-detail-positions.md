# Concept: Project Detail Page (HedgeLens)

## Purpose
The Project Detail page provides a focused workspace for managing and analyzing a **single strategy project**.  
It allows users to inspect project metadata, review key metrics, manage option warrant positions, and explore ratios and analytics derived from those positions.

The page represents the **operational core** of a strategy: positions are added, edited, analyzed, and evaluated here.

---

## Target Users
- Users actively managing a specific option warrant strategy
- Investors who want to understand the **risk, exposure, and structure** of a project
- Advanced users iterating on position composition and ratios

---

## Page Layout (Top → Bottom)

### 1. Project Header
A clear identification of the current project and its context.

**Elements**
- Project name (primary heading)
- Optional project description
- Visual project indicator (color / icon)
- Underlying asset / ticker (if provided)
- Action buttons:
  - **Edit Project** (name, description, color)
  - **Delete Project** (with confirmation)

**Behavior**
- Header remains visible at the top of the page
- Editing metadata does not affect positions

---

### 2. Project KPIs & Summary Section
A compact overview of the most important project-level information.

**Displayed Metrics**
- Base currency
- Risk profile (computed)
- Put/Call ratio
- Total number of positions
- Aggregate exposure / value (if available)
- Average leverage or volatility (optional)

**Visualization**
- KPI cards for numeric values
- Optional charts (Highcharts), for example:
  - Put vs Call distribution
  - Risk score breakdown
  - Time-to-expiry distribution

**Behavior**
- Metrics update automatically when positions change
- Charts are read-only and purely informational

---

### 3. Positions Table
The main working area of the page.

**Purpose**
Manage all option warrant positions belonging to the project.

**Table Columns**
- Instrument (ISIN / name)
- Side (Put / Call)
- Size
- Pricing mode (Market / Model)
- Price / Value
- Leverage
- Time to expiry
- Actions

**Row Behavior**
- Rows are not navigational
- Each row has action buttons:
  - Edit position
  - Delete position
  - Recompute model (if applicable)

**Global Actions**
- Primary button: **Add Position**
  - Opens a modal or side drawer
  - Same design language as on the Projects page

---

### 4. Position Management Flows

#### Add Position
- Triggered via “Add Position” button
- Inputs:
  - ISIN (lookup or manual)
  - Side (Put / Call)
  - Size
  - Pricing mode (Market / Model)
  - Pricing inputs (if model-based)
- Validation:
  - Required fields
  - Numeric constraints
- Result:
  - Position added
  - KPIs and risk profile update automatically

#### Edit Position
- Same form as creation, pre-filled
- Updates recompute affected analytics

#### Delete Position
- Requires confirmation
- Updates KPIs and risk profile immediately

---

## Risk Profile (Automatic)
The project’s risk profile is **fully derived from its positions**.

**Inputs Used**
- Volatility
- Time to expiry
- Moneyness
- Leverage ratio
- Position size (log-scaled)
- Pricing mode penalty (model-based positions slightly riskier)

**Scoring**
- Positions are aggregated into a weighted project risk score (0–100)
- Mapping:
  - < 35 → Conservative
  - 35–64.99 → Balanced
  - ≥ 65 → Aggressive

**Rules**
- Risk profile is not user-editable once positions exist
- Empty projects retain their initial profile or remain “Custom”

---

## Functional Requirements

### API
- `GET /api/projects/{id}`
  - Fetch project metadata and positions
- `PUT /api/projects/{id}`
  - Edit project metadata
- `DELETE /api/projects/{id}`
  - Delete project
- `POST /api/projects/{id}/positions`
  - Add position
- `PUT /api/projects/{id}/positions/{posId}`
  - Edit position
- `DELETE /api/projects/{id}/positions/{posId}`
  - Delete position
- `POST /api/projects/{id}/positions/{posId}/recompute`
  - Recompute model-based values

---

## Non-Functional Requirements
- **Performance:** responsive with medium-sized position sets
- **Consistency:** tables, modals, and buttons match Projects page design
- **Accessibility:** keyboard navigation, readable tables, clear confirmations
- **Reliability:** safe recomputation and validation of model inputs

---

## Underlying Asset Chart
Below the positions section, display a TradingView chart for the project’s underlying asset.

**Behavior**
- Uses the project’s `underlyingSymbol` (e.g. `NASDAQ:COIN`).
- If no symbol is set, show a friendly empty-state message prompting the user to add one.

---

## Out of Scope
- Collaboration or sharing
- Automated market data updates
- Historical analytics timelines
- Cross-project aggregation

---

## Design Rationale
- Project metadata, metrics, and positions are clearly separated
- KPIs provide immediate strategic insight
- The positions table is optimized for **frequent interaction**
- Analytics support decisions without overwhelming the user

---

## Success Criteria
- Users can quickly understand a project’s current state
- Adding or editing positions feels fast and safe
- KPIs and risk profile update predictably
- The page scales from simple to complex strategies without clutter

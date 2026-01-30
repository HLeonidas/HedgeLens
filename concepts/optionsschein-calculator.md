# Concept: Optionsschein Calculator (HedgeLens)

## 1. Purpose
Provide a **scenario-based calculator for options warrants (Optionsscheine)** that enables users to analyze price sensitivity, Greeks, and valuation metrics, and to compare different market scenarios. The calculator supports both **project-based instruments** and **ad-hoc ISIN analysis** and focuses on analysis rather than execution.

---

## 2. Scope

### In Scope
- Scenario-based valuation of options warrants
- Model-based pricing (fair value, intrinsic value, time value)
- Calculation of Greeks and sensitivity metrics
- Break-even and price reaction analysis
- Reuse of existing project positions
- Ad-hoc analysis via ISIN input

### Out of Scope
- Real-time market data feeds
- Order execution or trading
- Portfolio-wide aggregation across projects

---

## 3. Entry States & User Flow

### Initial State (No Calculator Selected)
When the calculator is opened without a selected instrument, the user is presented with two entry options:

1. **Select an existing Optionsschein from a Project**
   - Choose an OS from the table of existing project positions
   - Previously entered parameters and calculations are reused

2. **Enter an ISIN manually**
   - Enter an ISIN to analyze an Optionsschein in ad-hoc mode
   - No project association at this stage

Once an Optionsschein is selected, the initial selection UI disappears and the user is redirected to the calculator view.

---

## 4. Routing & State Model

### Calculator Route
/optionsschein-rechner/[instrumentId]

### Instrument Origin
Each calculator instance has a defined origin:
- `project` – instrument originates from an existing project position
- `ad-hoc` – instrument is temporarily created from manual ISIN input

This origin determines persistence and available actions.

---

## 5. Behavior by Instrument Origin

### Case 1: Optionsschein from Project
- Buy-in price, quantity, and model parameters are prefilled
- Calculations are shown immediately
- Scenario changes are temporary unless explicitly saved
- Stored values are reused when reopening the calculator

### Case 2: Optionsschein via ISIN (Ad-hoc)
- Instrument parameters are editable
- Calculations are performed in ad-hoc mode
- User may optionally add the instrument to a project
  - Required inputs:
    - Buy-in price
    - Quantity / shares
    - Target project
- After saving, the instrument behaves like a project-based OS

---

## 6. Calculator Layout & UI Structure

### 6.1 Instrument Metrics Row
A dedicated **summary row** displays key metrics in a compact key–value layout.

**Contract & Market Metrics**
- Basispreis (Strike)
- Aufgeld
- Break-even
- Implizite Volatilität
- Bewertungsstichtag

**Valuation**
- Fairer Wert
- Intrinsischer Wert
- Zeitwert

**Greeks**
- Delta
- Gamma
- Theta
- Vega
- Omega

Metrics are read-only by default and reflect the current valuation inputs.

---

### 6.2 Details / Model Inputs
An expandable **Details** section allows editing of model parameters:
- Underlying price
- Volatility
- Risk-free rate
- Dividend yield (optional)
- FX rate (if applicable)
- Valuation date

Changes trigger recalculation of all displayed metrics.

---

### 6.3 Scenario Calculation Table
Below the metrics row, a table presents scenario-based results:

- Scenario name
- Underlying price change
- Resulting Optionsschein price
- Profit / Loss (absolute and percentage)
- Comparison to current market price

Features:
- Add/remove scenarios
- Support for up to **5 scenarios** per calculation
- Current market price highlighted as baseline

---

## 7. Persistence Rules

### Project-Based Instruments
- Model inputs and computed results can be saved
- Stored values are reused for future calculations
- Valuation timestamp is persisted

### Ad-hoc Instruments
- No data is persisted by default
- Persistence occurs only when the user adds the instrument to a project

---

## 8. API Design

### Calculation Endpoint
POST /api/optionsschein/calculate

**Request**
- Instrument reference or ad-hoc definition
- Base valuation inputs
- Array of scenario overrides (maximum 5)

**Response**
- Base valuation results
- Greeks and value decomposition
- Scenario-specific calculation results

Partial results may be returned if individual scenarios fail validation.

---

## 9. Validation & Edge Cases
- Expiry date in the past → validation error
- Zero or negative volatility → invalid
- Missing required inputs → partial calculation with warnings
- Invalid call/put configuration → blocked

---

## 10. Risks & Assumptions
- Optionsscheine are valued using simplified option pricing models
- Issuer spreads and intraday pricing adjustments are not fully replicated
- Results are approximations intended for analysis purposes

UI disclaimer:
> *Model-based values are approximations and may differ from issuer prices.*

---

## 11. Success Criteria
- Users can quickly select or input an Optionsschein and analyze it
- Scenario changes update results instantly
- Project-based instruments reopen with precomputed values
- Ad-hoc ISINs can be promoted to projects without friction
- The calculator feels fast, focused, and trustworthy

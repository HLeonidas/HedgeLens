# Concept: Projects Page (HedgeLens)

## Purpose
The Projects page is the central workspace for organizing option warrant strategies in HedgeLens.  
Each project represents a **strategy container** that groups put/call warrant positions, scenarios, and analytics under a shared context.

Projects allow users to separate strategies by **market view, risk profile, currency, or timeframe**, while keeping global holdings (Investments and Crypto) independent.

---

## Target Users
- Individual investors managing multiple option warrant strategies
- Users who want to compare strategies by risk profile and currency
- Advanced users separating positions by theme (hedging, directional, income, etc.)

---

## Page Layout

### 1. Filter & Actions Section
A compact control section at the top of the page for quick navigation and management.

**Elements**
- Search input (filter by project name)
- Filter dropdowns:
  - Base currency (EUR, USD, …)
  - Risk profile (Conservative, Balanced, Aggressive, Custom)
- Primary action:
  - **Create Project** button

**Behavior**
- Filters update the project list instantly
- Filter state is local to the page (no persistence required initially)

---

### 2. Projects Table
The main overview of all user-owned projects.

**Columns**
1. **Project Indicator**
   - Colored dot representing the project’s identity
2. **Project Name**
3. **Base Currency**
4. **Risk Profile**
   - Displayed as a badge
   - Color-coded by risk level
5. **Put/Call Ratio**
   - Displayed as a numeric ratio or badge
6. **Last Updated**
7. **Actions**
   - Open project
   - (Optional later: edit / delete)

**Row Behavior**
- Entire row is clickable and navigates to `/projects/[id]`
- Subtle hover state for clarity without visual noise

---

### 3. Empty & Edge States
- **No projects**
  - Friendly empty state with short explanation
  - Call-to-action: “Create your first project”
- **No results (filtered)**
  - Clear message and option to reset filters
- **Loading / error**
  - Skeleton rows or inline error messages

---

## Create Project Flow

### Trigger
- Click **Create Project**

### Fields
- **Project Name** (required)
- **Base Currency** (required)
- **Risk Profile** (optional)
  - Conservative
  - Balanced
  - Aggressive
  - Custom
- **Project Color**
  - Used for visual identification (dot, headers, charts)

### Validation
- Project name is required and unique per user
- Base currency is required
- Inline validation with clear error messages

### Risk Profile Calculation (Automatic)
The risk profile is **computed** from the positions inside a project. It updates whenever a position is added, updated, or deleted.

**Inputs used**
- Volatility (higher = riskier)
- Time to expiry (shorter = riskier)
- Moneyness (more OTM = riskier)
- Leverage ratio
- Position size (log‑scaled)
- Pricing mode penalty (model positions slightly riskier)

**Scoring (0–100)**
Weighted risk score is computed across positions and mapped to labels:
- < 35 → Conservative
- 35–64.99 → Balanced
- ≥ 65 → Aggressive

**Notes**
- The profile is not user‑editable once positions exist.
- If a project has no positions, the profile stays as chosen at creation (or Custom).

### Result
- Project is created via `POST /api/projects`
- Project list updates immediately
- User can open the project directly

---

## Functional Requirements

### API
- `POST /api/projects`
  - Create a project
- `GET /api/projects`
  - List user projects
- `GET /api/projects/{id}`
  - Fetch project detail data

### Permissions
- Projects are user-owned
- Only the owning user can view or modify their projects

---

## Non-Functional Requirements
- **Performance:** fast load and creation without blocking analytics
- **Scalability:** clean UI with many projects
- **Accessibility:** keyboard navigation, readable badges, sufficient contrast
- **Consistency:** project color reused across the application

---

## Out of Scope
- Project sharing or collaboration
- Role-based permissions within projects
- Historical analytics persistence
- FX conversion between project currencies

---

## Design Rationale
- Projects act as **strategy containers**, not generic folders
- Visual identifiers (color + badge) reduce cognitive load
- Clear separation between:
  - Project-based strategies
  - Global holdings (Investments, Crypto)

---

## Success Criteria
- Users immediately understand what a project represents
- Creating and accessing projects feels fast and intuitive
- Strategies are visually distinguishable at a glance
- The page scales smoothly from few to many projects

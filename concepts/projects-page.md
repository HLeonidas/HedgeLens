# Concept: Projects Page

## Purpose
Let users create and organize projects for options warrant portfolios, then drill into project details and positions.

## Scope
- In scope:
  - Create projects with name, base currency, and optional risk profile.
  - List existing projects and open a project detail view.
- Out of scope:
  - Sharing projects or team collaboration.
  - Project-level permissions beyond owner.

## Users
- Users building structured portfolios of option positions by strategy or theme.

## Functional Requirements
- Create project via `/api/projects`.
- List projects with metadata and last-updated date.
- Navigate to `/projects/[id]`.

## Non-Functional Requirements
- Performance: list and create quickly on first load.
- Security/Privacy: only user-owned projects are visible.
- Accessibility: keyboard-friendly inputs and clear error messages.

## Data & Integrations
- Data inputs: Project creation payload.
- Data outputs: Project list and detail fetches.
- External services/APIs: none.

## UX / Flows
- Primary flow: open page → create project → see in list → open detail.
- Edge cases: no projects yet, invalid input, API errors.

## Risks & Open Questions
- Should support editing or deleting projects in the list.

## Success Criteria
- Users can reliably create and access projects.

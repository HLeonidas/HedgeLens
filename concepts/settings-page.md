# Concept: Settings Page

## Purpose
Allow users to manage session, basic appearance, and user list visibility.

## Scope
- In scope:
  - Theme toggle (light/dark).
  - User list with search, filter, sort, pagination.
  - Logout current session.
- Out of scope:
  - Editing or deleting users (UI only for now).
  - Role management beyond active/inactive display.

## Users
- Admin or power users managing access and display preferences.

## Functional Requirements
- Fetch users via `/api/users` with query params.
- Toggle theme persisted to local storage.
- Sign out via Auth.js.

## Non-Functional Requirements
- Security/Privacy: only authorized users should access user list.
- Reliability: handle empty and error states gracefully.

## Data & Integrations
- Data inputs: query params for user list.
- Data outputs: none (read-only for now).
- External services/APIs: Auth.js session.

## UX / Flows
- Primary flow: open settings → adjust theme → browse users.
- Edge cases: no users returned, API errors.

## Risks & Open Questions
- Need to define user roles/permissions for access control.
- Edit/delete user actions are not wired yet.

## Success Criteria
- Users can switch theme and review user list with filters.

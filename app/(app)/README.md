# App UI Design Patterns

This file documents shared UI patterns used across the app pages so that new features match the existing system.

## Layout & Surfaces
- **Page wrapper:** Soft, light background with a centered content container. Avoid full-bleed unless a design explicitly calls for it.
- **Primary surfaces:** Use `bg-white` / `bg-surface-light` with `border-border-light` and rounded corners (`rounded-xl` / `rounded-2xl`).
- **Spacing:** 4/6/8 spacing units for card padding; use `gap-4` or `gap-6` for grid layouts.

## Cards
- **KPI cards:** Small labels in `text-xs uppercase text-slate-500`, values in `text-2xl font-bold`.
- **Context rows:** Secondary values in `text-xs text-slate-500 uppercase tracking-tighter`.
- **Clickable cards:** Use `hover:border-slate-300 hover:shadow-sm` and keep the whole card as the click target.

## Tables
- **Header:** `text-xs font-bold uppercase tracking-wider`, row dividers via `divide-y divide-border-light`.
- **Row hover:** `hover:bg-slate-50 transition-colors`.
- **Action menus:** Use the same 3-dot menu style as positions.
- **Info tooltips:** Use Headless UI popovers for hover info, never plain `title` attributes.

## Loading States
- **Project list skeleton:** Skeleton table that matches final column widths and layout.
- **Text loading:** Use `animate-pulse` with `bg-slate-200` blocks in the right size.

## Modals
- **Structure:** Header (title + helper text), body, footer actions.
- **Backdrop:** `bg-slate-900/40 backdrop-blur-sm`.
- **Sizing:** `max-w-sm` for single-input modals, `max-w-lg` for multi-step.
- **Buttons:** Primary on right, secondary on left.

## Toggles & Switchers
- **Switch cards:** Use a short title, `Help` tag, and a short description.
- **Switch size:** Larger `h-7 w-12` with check icon in the knob for clarity.
- **Behavior:** Switch should execute on save; avoid confirmation dialogs after save.

## Icons
- **Material Symbols:** Use `material-symbols-outlined` with matching sizing.
- **Ticker branding:** Prefer Massive `icon_url` in lists; fall back to `logo_url`, then initials.

## Microcopy
- **Tone:** Short, clear, and action-oriented.
- **Dates:** Prefer localized `toLocaleString()` for timestamps with context labels.


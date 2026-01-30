# HedgeLens UI Design Patterns

This document defines the baseline UI patterns for **tables, inputs, buttons, and modals** in HedgeLens. Use these patterns to ensure consistent spacing, typography, and interaction behavior across the app.

## Typography (Page Headers)
- **Main heading**
  - `text-3xl font-black text-slate-900 tracking-tight`
- **Subheading**
  - `text-sm text-slate-500 mt-1`

## Tables
### Container
- Outer wrapper: `rounded-xl border border-border-light overflow-hidden bg-white`
- Horizontal scroll: `overflow-x-auto overflow-y-visible`

### Header Row (`thead`)
- Row: `bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider border-b border-border-light`
- Header cells: `px-6 py-4`

### Body Rows (`tbody`)
- Body: `divide-y divide-border-light`
- Row hover: `hover:bg-slate-50 transition-colors group`
- Cells: `px-6 py-4`

### Action Menu (Row)
- Trigger button: `opacity-0 group-hover:opacity-100 p-1.5 hover:bg-slate-200 rounded transition-all`
- Menu container: `absolute right-0 z-10 w-44 rounded-lg border border-border-light bg-white shadow-lg overflow-hidden`
- Menu item: `w-full px-3 py-2 text-left text-xs font-semibold text-rose-600 hover:bg-rose-50 flex items-center gap-2`

### Table Footer
- Footer row wrapper: `px-6 py-4 bg-slate-50 border-t border-border-light flex items-center justify-between text-xs font-medium text-slate-500`
- Footer buttons: `px-3 py-1 bg-white border border-border-light rounded hover:bg-slate-100 transition-colors`

## Inputs
### Search / Filter Inputs
- Wrapper: `flex items-center gap-2 rounded-lg border border-border-light px-4 py-3 text-sm text-slate-500 bg-slate-50`
- Icon: `material-symbols-outlined text-base`
- Input: `w-full bg-transparent outline-none text-slate-700 text-sm font-semibold`

### Standard Inputs / Selects / Textareas
- Input: `w-full rounded-lg border border-border-light px-4 py-3 text-sm bg-slate-50`
- Select: `w-full rounded-lg border border-border-light px-4 py-3 text-sm bg-slate-50`
- Textarea: `w-full rounded-lg border border-border-light px-4 py-3 text-sm bg-slate-50`

## Buttons
### Primary Button
- `px-5 py-3 rounded-lg bg-primary hover:bg-blue-700 text-white text-sm font-semibold transition-colors`

### Secondary Button
- `px-5 py-3 border border-border-light rounded-lg text-sm font-medium hover:bg-slate-100 transition-colors`

### Danger Button
- `px-5 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-sm font-bold shadow-sm transition-all`

## Modals
### Overlay
- `fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50`

### Modal Container
- `w-full max-w-md bg-white shadow-2xl border border-border-light rounded-2xl transform transition-all duration-300 ease-in-out`
- Show state: `scale-100 opacity-100`
- Hidden state: `scale-95 opacity-0`

### Modal Header
- Wrapper: `p-6 border-b border-border-light flex items-start gap-4`
- Title: `text-lg font-bold text-slate-900`
- Subtitle: `text-sm text-slate-500 mt-1`

### Modal Body
- Wrapper: `p-6`
- Text: `text-sm text-slate-600`

### Modal Footer
- Wrapper: `p-6 border-t border-border-light bg-slate-50 flex gap-3`
- Buttons: use **Primary** / **Secondary** / **Danger** patterns above.

---

## Notes
- Keep all spacing and typography consistent with these patterns.
- Always use `border-border-light` and `bg-surface-light` for surfaces to keep theme alignment.
- For actions, use subtle hover transitions only (no heavy animations).

# Plan: Need Status Automation, Waitlist Home, System-Wide UI Rollout

This is a large, multi-part change. To keep it shippable and reviewable I'll deliver it in **three phases**, each independently testable. If you want to compress or split further, tell me before I start.

---

## Phase 1 — Automatic Need Status (backend + UI)

**Migration** (`beneficiary_needs`):
- Add `status_source TEXT NOT NULL DEFAULT 'auto' CHECK (status_source IN ('auto','manual'))`
- Add `manual_status_note TEXT`, `funded_amount NUMERIC NOT NULL DEFAULT 0`
- New SQL function `public.recompute_need_status(p_beneficiary_id uuid)`:
  - Sum `allocation_line_items.amount` grouped by `need_type_id` for the beneficiary (both direct-need lines and package-derived lines already produced by allocation engine).
  - Update each row where `status_source='auto'`: set `funded_amount`, then derive `status` per rules (met / partially_met / unmet). Also mark `partially_met` when funded=0 but an active enrollment exists on a project whose `addresses_need_type_id` matches.
- Triggers on `allocation_line_items`, `allocations`, `sponsorship_*`, `program_beneficiaries` (enrollment table), and `beneficiary_needs` (own cost edits) that call `recompute_need_status(beneficiary_id)`.
- Backfill: `SELECT recompute_need_status(id) FROM beneficiaries` (org-safe — function is scoped by beneficiary).
- End with `NOTIFY pgrst, 'reload schema'`.

**UI** (`NeedsSection.tsx` + edit dialog):
- Show derived status + "Auto" badge + `funded_amount of estimated_cost` line.
- Status dropdown is disabled until user toggles **Override manually** (checkbox); note becomes required. Save writes `status_source='manual'` + `manual_status_note`.
- "Return to automatic" button clears manual and calls the recompute RPC.
- Invalidate `['beneficiary-needs', beneficiaryId]` after mutations and on realtime allocation events.

---

## Phase 2 — Waiting List Standalone Home

- **Route**: add `/waitlist` in `src/App.tsx`, permission-gated.
- **Sidebar**: add "Waiting List" under PEOPLE in `WorkspaceSidebar.tsx` (icon `ListOrdered`), after Households.
- **Page** (`src/pages/WaitlistPipeline.tsx`): reuse existing `WaitlistManagement.tsx` logic. Kanban columns for `application → assessment → scoring → waiting_list → funding_match → enrolled`. Card shows name, age, needs summary, score, days waiting. Stage-appropriate action buttons. "New application" CTA opens existing form.
- **Shared match component** (`WaitlistMatchPicker.tsx`): ranked list of top eligible applicants for a given programme/package context. Used by both the pipeline's "Match & Enroll" step and the Record Donation dialog.
- **Record Donation dialog**: relabel "Add from waiting list" → **"Match to a waiting applicant"**; opens `WaitlistMatchPicker` with donation context. Selecting an applicant runs the same match+enroll flow.
- Update every "N waiting" reference on dashboards to link to `/waitlist`.

---

## Phase 3 — System-Wide UI Rollout (tokens + motion)

Roll the dashboard's design tokens (navy canvas, teal/gold accents, 16px radius, soft elevation with inner top highlight, tinted icon chips, sparkline stat tiles, glass panels, restyled pills/tables/buttons/dialogs) across the app, plus motion (entrance fades, count-ups, chart draws, micro-interactions) with the same reduced-motion + no-replay guardrails.

**Order** (each group = one commit-sized pass):
1. Beneficiaries (list, profile, form, dialogs)
2. Households, Partners, Waiting List
3. Programmes, Projects, Activities, M&E
4. Funding (Donors, Funding Intelligence, Allocation Engine, Donations Inbox, Financial Suite)
5. Intelligence (Analytics, Risk, Grant Discovery, Burn vs Impact)
6. Donor Portal (high polish)
7. Operations, Engagement, Governance, Admin/Settings
8. Auth, Setup Wizard, empty/error states, toasts, dialogs

**Rules**: tokens only, no invented colours; light-theme parity; dialogs/sheets share the card language; no layout restructure; Field Mode minimal decoration.

---

## Delivery cadence

Because Phase 3 alone spans ~80+ files and can't reasonably ship in a single turn without regressions, I recommend:

- **This turn**: Phase 1 (migration + hook + dialog) and Phase 2 (route, sidebar, page, shared picker, dialog rewire). Fully testable.
- **Next turns**: Phase 3 group-by-group (I'll checkpoint after each of the 8 groups so you can review dark/light parity before I proceed).

Reply **"go"** to start with Phase 1+2 now, or tell me to reorder / drop / expand any part.

## Technical notes

- Auto-derivation lives in SQL (single source of truth) — hooks just call the RPC; triggers keep it fresh even for non-UI writes.
- `WaitlistMatchPicker` is the one shared codepath — dialog is a thin wrapper.
- Design tokens already live in `src/index.css`; the rollout is mostly swapping ad-hoc classes for existing tokens + wrapping metric grids in `StaggerGrid` / `SparklineTile`.

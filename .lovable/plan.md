## Scope

This is a big prompt spanning sidebar, four analytics tabs, one migration, and cross-tab polish. To ship it safely without a single mega-diff, I'll split it into three passes and get your go-ahead before each.

### Pass 1 — Sidebar corrections + legacy cleanup (small, immediate)

Files touched: `src/components/workspace/WorkspaceSidebar.tsx`, `CommandPalette.tsx`, `MobileBottomNav.tsx`, `WorkspaceHeader.tsx`, `Dashboard.tsx`, `QuickNavCards.tsx`, `QuickActionsPanel.tsx`, `src/README.md`.

- Remove "Reports & Insights" entry from INTELLIGENCE group.
- Move "Map view" out of PROGRAMS into INTELLIGENCE, positioned right after Analytics.
- Add "Burn vs Impact" (`/intelligence/burn-vs-impact`, icon `TrendingUp`) after Risk Intelligence — gated by `can.viewAnalytics || can.viewReports`. **Note:** `BurnVsImpact.tsx` currently mounts at `/burn-vs-impact`; I'll add the `/intelligence/burn-vs-impact` route alongside it (or move it) so the sidebar link resolves.
- Update every stale `/reports-analytics` reference across the codebase to `/analytics` (Dashboard quick-nav, command palette, quick actions, mobile bottom nav matcher, header title map). The redirect route in App.tsx stays.
- INTELLIGENCE final order: AI Assistant, Grant Discovery, Risk Intelligence, Burn vs Impact, Analytics, Map view.

Verification: sidebar visual walk, click each link, confirm `/reports-analytics` redirects.

### Pass 2 — Analytics migration + edge function metric handlers (Sections 2–4)

One migration adds:
- `program_indicators.target_value NUMERIC` (IF NOT EXISTS).
- Postgres functions for every metric listed in Sections 2–4, each starting with the RLS belt-and-braces membership check.
- Ends with `NOTIFY pgrst, 'reload schema';`.

Before writing the migration, I need to inspect the real table shapes: `donations` (amount_native / fx_rate_to_base columns?), `allocations` (amount_base?), `donor_pools` (balance columns / scope?), `beneficiary_indicator_values`, `indicator_translations`, `beneficiary_baselines`, `project_report_drafts`, `field_logs`, project budget table. Some column names in the spec are assumed. Where the actual schema differs, I'll adapt and note the substitutions in the migration description.

Then update `supabase/functions/analytics-query/index.ts`:
- Dispatch new handlers `money:*`, `impact:*`, `operations:*`.
- Flip `implemented: true` for those tabs in `src/lib/analyticsConfig.ts` and populate real metric/dimension/filter lists per spec.
- Add 60s in-memory cache keyed by `(org_id, sha256(body))`.

### Pass 3 — Custom tab + cross-tab polish (Sections 5–6)

- Custom tab: unified alphabetized metric/dimension/filter pickers built from `TABS` config, auto chart-type picker, "Examples" prompts, graceful "unsupported combination" empty state.
- Add "Last updated · {time}" + refresh button next to headline (amber if >5m stale) in `AnswerArea`.
- Wire Export popover PNG (html-to-image), CSV (existing), PDF (jsPDF, one page).
- Confirm URL deep-linking (already via `useAnalyticsUrlState`) covers the new tabs.

## Deliverable order

1. Ship Pass 1 now (no schema, no edge-function risk).
2. On approval, I'll open Pass 2 with the migration ready for your review — this is where I'll need to run `supabase--read_query` against actual table schemas before writing SQL.
3. Pass 3 follows.

Approve Pass 1 and I'll ship it immediately, then proceed to Pass 2.

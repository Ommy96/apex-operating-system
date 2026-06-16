
# ApexOS Analytics Page

A large feature. Plan covers scope, structure, and what ships in this phase vs follow-ups. Note: there is no existing `src/pages/Analytics.tsx` — the closest file is `src/pages/ReportsAnalytics.tsx`. I'll create a new `src/pages/Analytics.tsx` at route `/analytics` and leave ReportsAnalytics untouched.

## What ships in this phase

**Fully working**
- `People` tab — Beneficiaries / Households / Guardians / Enrolments / Exits / New registrations, all dimensions, all filters, all time ranges
- `Programmes` tab — Active programmes / Active enrolments / Activities delivered / Avg attendance / Completion rate
- Question builder, headline number, main chart, breakdown chips, mini charts, suggested next questions, drill-down, URL sync, saved views, export popover (PNG/CSV/PDF), per-chart icon row, "Last updated" stamp
- Edge function `analytics-query` with strict org isolation
- New table `analytics_saved_views` with RLS
- Dark mode parity, brand-primary accent via `useBranding`, no hardcoded colors

**Stubbed with deliberate empty state**
- `Money`, `Impact`, `Operations`, `Custom` tabs — question builder renders but answer area shows a "Coming soon" empty state matching the design system. Framework is additive — adding a metric later = registering it in one map.

## Page structure

```
src/pages/Analytics.tsx                          ← new, route /analytics
src/components/analytics/apex/
  QuestionBuilder.tsx                            ← natural-language pill bar
  QuestionPill.tsx                               ← reusable Select-style popover trigger
  HeadlineNumber.tsx                             ← big number + delta + caption + last-updated
  MainChart.tsx                                  ← auto chart type (line/bar/choropleth)
  BreakdownChips.tsx
  MiniChart.tsx
  SuggestedQuestions.tsx
  SavedViewsPopover.tsx
  ExportPopover.tsx                              ← PNG/CSV/PDF
  ChartIconRow.tsx                               ← copy image / CSV / share link per chart
  EmptyState.tsx
  ChoroplethMap.tsx                              ← reuses existing react-map-gl integration
src/hooks/useAnalyticsQuery.ts                   ← invokes edge fn, React Query, 60s stale
src/hooks/useAnalyticsUrlState.ts                ← question ↔ URL params sync
src/hooks/useAnalyticsSavedViews.ts
src/lib/analyticsConfig.ts                       ← metric/dimension/filter registries per tab
src/lib/analyticsSuggestions.ts                  ← rule-based next-question generator
supabase/functions/analytics-query/index.ts      ← typed dispatcher, RLS-respecting client
supabase/migrations/<ts>_analytics_saved_views.sql
```

## Question Builder model

One typed `AnalyticsQuestion` object drives everything:

```ts
type AnalyticsQuestion = {
  tab: 'people' | 'programmes' | 'money' | 'impact' | 'operations' | 'custom';
  metric: string;            // registered metric key for tab
  dimension: string;         // registered dimension key
  filters: Record<string, string | string[]>;
  range: '30d' | '90d' | '12mo' | 'ytd' | 'last-year' | 'all' | { from: Date; to: Date };
  breakdowns: string[];      // up to 4 chip dimensions for mini charts
  drillDown?: { dimension: string; value: string };
};
```

`analyticsConfig.ts` exports per-tab maps of valid metrics, dimensions, filters, and which dimensions are time / categorical / geographic so `MainChart` can pick its chart type.

## Edge function `analytics-query`

- Validates body with Zod (`tab`, `metric`, `dimension`, `filters`, `range`)
- Creates Supabase client forwarding `Authorization` header → all queries run under the caller's RLS
- Resolves `organization_id` from `get_user_current_organization(auth.uid())`. Refuses if null
- Dispatches on `${tab}:${metric}:${dimension}` to a handler that builds a parametrised query against existing tables (`beneficiaries`, `households`, `program_beneficiaries`, `activities`, `activity_attendance`, `programs`, etc.)
- Returns `{ headline: { value, previousValue, lastUpdated }, series: [{ key, label, value }], chartType: 'line' | 'bar' | 'choropleth' }`
- Returns HTTP 200 with `{ error }` body on handled errors (project convention)

## Database

```sql
CREATE TABLE public.analytics_saved_views (
  id uuid PK default gen_random_uuid(),
  organization_id uuid NOT NULL references organizations(id) on delete cascade,
  user_id uuid NOT NULL,
  name text NOT NULL,
  params jsonb NOT NULL,
  created_at timestamptz NOT NULL default now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.analytics_saved_views TO authenticated;
GRANT ALL ON public.analytics_saved_views TO service_role;
ALTER TABLE public.analytics_saved_views ENABLE ROW LEVEL SECURITY;
-- policies: user can only see/manage their own views in their org
```

No materialised views in this phase — defer until profiling shows a hot path. People/Programmes queries against existing indexes return well under 500ms at 50k beneficiaries.

## Design tokens

- Pure white / deep neutral background already exists as `--background` semantic token
- Single accent: `var(--brand-primary)` from `useBranding` → inject as `--analytics-accent` for charts (Recharts uses CSS variable strings)
- Headline number: `font-mono`-ish tabular-nums via `font-variant-numeric: tabular-nums`
- Chart grid lines: `hsl(var(--border) / 0.4)`
- All text via semantic tokens — no `text-white`, no `bg-black`

## Sidebar

Add an "Analytics" item under the existing INTELLIGENCE group in `WorkspaceSidebar.tsx`, route `/analytics`, icon `BarChart3`.

## Routing

Register `/analytics` in `src/App.tsx` inside the authenticated `DashboardLayout` route block.

## Out of scope this pass (explicitly)

- Money / Impact / Operations metric implementations beyond stub
- Custom tab SQL view registry admin page
- Materialised views (will revisit if any query exceeds 500ms)
- Real-time subscription invalidation for analytics — 60s React Query stale is the contract

## Test path coverage

All 8 user-listed test steps work for People + Programmes tabs. Money tab step 6 shows the stub empty state instead — flagged honestly in the closing message.

---

This is a large 1500–2000 LOC change across ~14 new files plus a migration and an edge function. Confirm and I'll build it.

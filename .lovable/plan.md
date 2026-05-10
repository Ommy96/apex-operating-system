# M&E Module Architecture Upgrade — Implementation Plan

## Schema audit (verified against live DB)

**Existing tables (confirmed present):** `organizations`, `profiles`, `programs`, `projects`, `activities`, `beneficiaries`, `households`, `indicators`, `indicator_values`, `me_data_schedule`, `logframe_entries`, `programme_milestones`, `beneficiary_services`, `beneficiary_visitations`, `disaggregation_categories`, `grants`, `financial_transactions`.

**Missing:** `narrative_reports` — Step 7's "auto-pulls from narrative report challenges/lessons" will degrade gracefully (section left empty with note "no narrative report submitted for this period") rather than block the build.

**Convention conflicts to resolve in migrations:**
- Prompt uses `org_id` everywhere; project standard is `organization_id`. **All new tables will use `organization_id`** to match `user_belongs_to_org()` RLS helper.
- Prompt wants `unit_of_measurement` on `indicators`; the column is already named `unit`. Will reuse `unit` instead of adding a duplicate.
- Prompt wants `is_active` on `indicators`; already exists. Skip.
- Prompt wants `created_by` on `indicators`; already exists. Skip.
- Soft-delete: project standard requires `deleted_at` + `updated_by` on every new table per Core memory.

## Phasing

The full prompt is ~10 hours. To keep each phase shippable and reviewable, I'll split into 4 phases. **This plan covers Phase 1 only** — once approved and merged, I'll write a follow-up plan for Phase 2.

```text
Phase 1  ── Foundation                 (this plan)
           DB migrations 1A–1E
           M&E Hub page + sidebar restructure
           Indicator rebuild (list + 5-step wizard + detail + versioning)

Phase 2  ── Field tools                 (next)
           Configurable Form Builder (Step 4)
           Case Management (Step 5)
           Beneficiary profile Cases sub-tab

Phase 3  ── Analytics & Reporting      (later)
           Disaggregation engine (Step 6)
           Automated Report Assembly modal (Step 7)
           Data Quality dashboard + active prompts (Step 9)

Phase 4  ── Public access              (last)
           Stakeholder access mgmt (Step 8 admin side)
           Public /stakeholder/:token portal (no-auth route)
```

## Phase 1 — what gets built

### 1. Database migration (single migration file)

**1A. Indicator versioning + data dictionary**
- `ALTER TABLE indicators ADD COLUMN` for: `version int default 1`, `version_notes text`, `superseded_by uuid`, `decision_context text`, `calculation_method text`, `data_source_description text`, `disaggregation_dimensions text[]`, `baseline_value numeric`, `baseline_date date`, `reporting_frequency text`, `target_value numeric`, `target_date date`, `collection_responsibility uuid` (FK profiles.user_id), `validation_rule jsonb`, `notes text`, `retired_at timestamptz`, `retired_reason text`, `level text` (output/outcome/impact/process), `deleted_at timestamptz`, `updated_by uuid`.
- New table `indicator_versions` (snapshot history).

**1B. Configurable forms (tables only — UI in Phase 2)**
- `me_forms`, `me_form_fields`, `me_form_submissions` with `organization_id`, soft-delete columns, RLS by `user_belongs_to_org`.

**1C. Case management (tables only — UI in Phase 2)**
- `beneficiary_cases`, `case_entries`.

**1D. Data quality flags**
- `data_quality_flags` table (used in Phase 1 only as a destination; active flagging logic lands in Phase 3).

**1E. Stakeholder access (table only — UI in Phase 4)**
- `stakeholder_access` table.

All new tables: RLS enabled, `SELECT/INSERT/UPDATE` policies using `user_belongs_to_org(auth.uid(), organization_id)`, plus super-admin bypass via `has_role(auth.uid(),'admin')`.

### 2. M&E Hub page — `src/pages/MEHub.tsx`

Route `/me`. Sections:
- Two large anchor cards (Beneficiary Data → `/beneficiaries`, Project Data → `/programs-management`) with live counts.
- 3-column summary grid: indicator health (traffic light counts + top 4 off-track), data collection status (overdue/due/collected from `me_data_schedule`), case management (placeholder counts of 0 in Phase 1, wired in Phase 2).
- Bottom donut: data quality score with the documented 40/30/30 weighting; in Phase 1 the case-related component falls back to "no flags table data yet" → score reflects only the available signals.

New hook `src/hooks/useMEHub.ts` aggregates the queries.

### 3. Indicator management rebuild

- **`src/pages/IndicatorManagement.tsx`** at `/indicators`. Replaces existing `IndicatorsDashboard` entry point (kept as embedded list inside this page initially to avoid losing functionality). Filters: programme, level, status, traffic light, search. CSV import deferred to Phase 3 (button stub disabled with "Coming soon" tooltip).
- **`src/components/indicators/NewIndicatorWizard.tsx`** — 5-step sheet: Purpose → Definition → Targets → Measurement → Review. Enforces `decision_context` required (Principle 1) before allowing Step 2. Save as draft (`is_active=false`) or publish (`is_active=true`).
- **`src/pages/IndicatorDetail.tsx`** at `/indicators/:id` — header + 6 tabs: Overview, Progress, History, Disaggregation (placeholder chart in Phase 1, real engine in Phase 3), Versions, Forms (empty state until Phase 2). "Record data" sheet writes to `indicator_values` and updates `me_data_schedule`.
- **Versioning logic** in `src/hooks/useIndicators.ts`: when editing a published indicator with existing `indicator_values`, force a version-bump dialog (change reason + effective_from required), snapshot previous state to `indicator_versions`, increment `version`.

### 4. Sidebar + routing

- `WorkspaceSidebar.tsx`: Programmes & M&E section becomes 3 items — Programmes, Projects, **M&E** (new, route `/me`, icon `Activity`). When path matches `/me`, `/indicators`, `/cases`, `/me/forms`, sub-nav appears: M&E Hub, Indicators, Form builder (disabled in Phase 1), Cases (disabled in Phase 1).
- `App.tsx`: add routes `/me`, `/indicators`, `/indicators/:id`. Reserve `/cases`, `/me/forms`, `/stakeholder/:token` as commented placeholders for later phases.

### 5. Out of scope for Phase 1 (explicit)

- Form Builder UI, Case Management UI, Disaggregation engine, Report Assembly modal, Stakeholder Portal, active data-quality prompts on activity save, CSV indicator import. All have DB foundations laid where needed so Phase 2/3/4 are pure UI work.

## Files

**Created (Phase 1):**
```
supabase/migrations/<timestamp>_me_phase1_foundation.sql
src/pages/MEHub.tsx
src/pages/IndicatorManagement.tsx
src/pages/IndicatorDetail.tsx
src/components/indicators/NewIndicatorWizard.tsx
src/components/indicators/IndicatorVersionDialog.tsx
src/components/indicators/RecordIndicatorValueSheet.tsx
src/hooks/useMEHub.ts
```

**Modified:**
```
src/components/workspace/WorkspaceSidebar.tsx   (add M&E item + sub-nav)
src/App.tsx                                      (add 3 routes)
src/hooks/useIndicators.ts                       (versioning, new fields)
src/integrations/supabase/types.ts               (regenerated by migration)
```

## Verification at end of Phase 1

1. TypeScript build clean.
2. `/me` loads, both anchor cards render, summary grid pulls real counts.
3. `/indicators` lists existing indicators with new column layout.
4. New indicator wizard blocks save without `decision_context`.
5. Editing a published indicator with values opens version dialog and writes to `indicator_versions`.
6. Sidebar shows new M&E item; sub-nav appears on M&E routes; disabled items show tooltip "Available in next release".
7. Existing M&E features (calendar at `/programs-management?tab=calendar`, M&E Suite, etc.) continue to work unchanged.

## Confirmation needed

Approve this plan and I'll start with the migration file. After Phase 1 ships, I'll write the Phase 2 plan in a separate message.

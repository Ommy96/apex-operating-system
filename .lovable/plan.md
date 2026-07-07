# Universal Program → Project → Activity Hierarchy

Two shifts: **programs become optional** (projects can stand alone) and **tier labels become tenant-renamable** (display-only, DB tables and routes unchanged).

## 1. Database migration

`projects.program_id` is already nullable — no change needed there.

Add three columns to `organizations`:

```sql
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS tier_label_program  TEXT NOT NULL DEFAULT 'Programme',
  ADD COLUMN IF NOT EXISTS tier_label_project  TEXT NOT NULL DEFAULT 'Project',
  ADD COLUMN IF NOT EXISTS tier_label_activity TEXT NOT NULL DEFAULT 'Activity';
NOTIFY pgrst, 'reload schema';
```

## 2. Terminology hook

New `src/hooks/useTierLabels.ts` — reads the three columns for the current org (cached via TanStack Query), returns:

```ts
{ program, programPlural, project, projectPlural, activity, activityPlural, isLoading }
```

Pluralisation reuses the same auto-plural rule as `useBeneficiaryTerminology`.

## 3. Standalone project support

- **ProjectForm** (`src/components/programs/ProjectForm.tsx`): make the programme select optional, add a "No programme (standalone project)" choice, allow submit with `program_id = null`.
- **AllProjects list** (`src/pages/AllProjects.tsx`): group results — under each programme, plus a final "Standalone projects" section for `program_id IS NULL`.
- **ProjectDashboard breadcrumb**: when `program_id` is null, render `{ProjectsLabel} / {name}` and skip the program link.
- **Program rollups** (`useProgramRollups`, analytics handlers, `useOverviewMetrics`): confirm they filter `program_id IS NOT NULL` or group-by program so standalone projects are excluded from program aggregates rather than surfacing as orphans.
- Empty states: program with 0 projects, project with 0 activities, standalone project — each shows a helpful CTA using tier labels.

## 4. Replace hard-coded labels

Sweep the user-facing strings surfaced by ripgrep — sidebar, `ProgramsManagement`, `AllProjects`, `Activities`, `ProgramDashboard`, `ProjectDashboard`, analytics tab titles, dashboards, form labels, breadcrumbs, empty states, `WorkspaceSidebar`, `CommandPalette`, `WorkspaceHeader`. Route paths and DB identifiers stay untouched.

Guardrails:
- Skip strings that are actually referring to Supabase table/column names or internal analytics metric ids.
- Skip marketing/legal copy where "Programme" is part of a proper noun.

## 5. Org Settings → Terminology section

Add a `TerminologySettings` component and register it in `src/components/settings/registry.ts` + `OrganizationSettings.tsx`. Three text inputs (Program / Project / Activity tier labels) with a live preview showing the sidebar/breadcrumb sentence rebuilt as the admin types, saved via `useSettingsForm`.

## 6. Test path

Covered by the intent's checklist — standalone project creation, renamed tiers in one org while a second org keeps defaults, empty programme/project states.

## Technical notes

- Hook depends on `useOrganization`; falls back to defaults while loading so the UI never flashes empty.
- Because labels come from the org record, cross-org isolation is automatic — RLS on `organizations` already scopes to the caller's org.
- Migration is additive with defaults, so existing rows and existing UI paths keep working during rollout.

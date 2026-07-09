
# Pass 5 — Scope-Aware Donor Reporting

Builds on existing pieces: `useReportAssembly`, `DonorProgressReport`, `beneficiaryReportGenerator`, `useDonorPortal`, Allocation Engine restriction data (Pass 4), and Phase 4 normalization (`indicatorNormalization.ts`, `program_rollup_indicators`). Does **not** rebuild them.

## 1. Scope detection — new hook

`src/hooks/useDonorScope.ts`
- Input: `donorId` (or `donorAccountId` for portal).
- Reads `donation_intents` + `allocations` for that donor, groups by `scope` and target id (`beneficiary_id | project_id | program_id`).
- Returns:
  ```ts
  {
    scopes: Array<{
      kind: "beneficiary" | "project" | "program" | "unrestricted";
      targetId: string | null;
      targetName: string;
      restriction: "restricted" | "unrestricted" | "time_restricted";
      totalGiven: number;
    }>;
    hasBeneficiary: boolean;
    hasProject: boolean;
    hasProgram: boolean;
    hasUnrestricted: boolean;
  }
  ```
- Cross-org isolation: query scoped through `useOrganization` (portal path uses donor's org via `donor_accounts.organization_id`).

## 2. Three new report components (+ reuse existing)

`src/components/reports/`
- `ProjectDonorReport.tsx` — one project: indicators (from `indicator_values` scoped to project via `project_baseline_indicators` / `indicators.project_id`), enrolled beneficiaries counts by gender, activities delivered in period, budget vs allocated vs spent from `budgets`/`allocations`/`expenses`, field highlights from `field_logs` (top 3), restriction disclosure banner via `RestrictionBadge`. Reuses `GrantFinancialReport` block.
- `ProgramRolloutDonorReport.tsx` — one program: pulls all projects, aggregates normalized indicator values through `program_rollup_indicators` + `program_rollup_translations` using `aggregateNormalized` from `indicatorNormalization.ts`; combined beneficiary reach; per-project mini summaries (name, reach, %complete, spend); program-level outcomes text.
- `UnrestrictedDonorReport.tsx` — org-impact summary: total unrestricted given, split of how those pooled funds were re-allocated across programs (join `allocations` where `restriction='unrestricted'` and `source_pool_id` traces to their intents), top 3 outcomes across org, indicator health mix.
- Beneficiary shape stays `beneficiaryReportGenerator` (magazine) — wrap in `SponsorBeneficiaryReport.tsx` that lists all sponsored beneficiaries for the donor and renders the existing magazine + impact feed per beneficiary.

Each component:
- Accepts `{ donorId, periodStart, periodEnd, orgId }`.
- Renders inside a `forwardRef` div so a shared `pdfExport(ref, filename)` helper produces branded PDF (extract current html2canvas+jsPDF logic from `DonorProgressReport` into `src/lib/pdfExport.ts`).
- Shows restriction badge + FX disclosure on every money figure (use existing `CurrencyAmount` + `RestrictionBadge`).

## 3. Auto-scoped generator UI

Edit `src/components/reports/DonorReportRouter.tsx` (new) — dropdown of donors, selecting one calls `useDonorScope` and:
- Proposes report shape chips ("Project: Foo", "Program: Bar rollup", "Sponsorship: 3 beneficiaries", "Unrestricted org summary"), each selected by default; user can uncheck / add.
- Renders the corresponding report components stacked with export buttons.
- Add a "Donor report" tab to `DonorReports.tsx` (or a new route section in FundingIntelligence) that mounts this router. Keep the existing template-based generator for legacy runs.

## 4. Donor portal integration

Edit `src/pages/DonorPortal.tsx` and add `src/components/donor-portal/DonorReportsTab.tsx`:
- Uses `useDonorScope(currentDonorAccountId)`.
- For each detected scope, renders a card linking to the read-only report view (Project / Program rollup / Beneficiary magazine / Unrestricted summary). Uses the same components in "portal" mode (hides admin-only actions, still allows PDF export).
- RLS: relies on existing donor portal policies — donor sees only rows tied to their `donor_accounts.donor_id`.

## 5. Export

`src/lib/pdfExport.ts` — shared helper (extract from `DonorProgressReport`). All four report shapes call it; beneficiary magazine keeps its current styling, others get a clean report layout using existing `Card`/`Separator` design tokens.

## 6. Test path checklist (matches user's)

1. Project donor → only project report generated, restriction disclosure visible.
2. Program donor → rollup with normalized indicators via `aggregateNormalized`.
3. Sponsor → beneficiary magazine + impact feed (unchanged path, re-exposed through router).
4. Unrestricted donor → org-impact summary component renders.
5. Portal: `DonorReportsTab` filters by donor's scope only; cross-org RLS unchanged.

## Notes / non-goals

- No DB migration. All scope data already exists after Pass 4.
- No new edge functions; assembly happens client-side via existing tables + Phase 4 helpers.
- Do not modify Allocation Engine or `indicatorNormalization.ts`.


# Structured vulnerability assessments

## Scope
- Extend existing vulnerability summaries, needs and waiting-list ranking; preserve historical records.
- Add organisation-owned category catalogues seeded with education, food security, housing, healthcare, disability support, psychosocial, safeguarding and economic categories, ordered for the organisation's sector.
- Assess beneficiaries (including groups/institutions), households and existing institution/group entities.
- Capture evidence, severity, intervention, review date, justified needs and optional transparent scoring criteria.
- Store edits and human decisions as immutable versions with reviewer identity and decision notes.
- Use the sensitive life-event access rule for health/safeguarding records; prevent their contents or scores from leaking through exports, donor feeds or legacy summaries.
- Feed reviewed non-sensitive outcomes into the existing waiting-list ranking, without automatic eligibility decisions.

## Technical details
- Add tenant-scoped categories and append-only assessment versions with organisation/subject/need validation and explicit grants/RLS.
- Use a transaction-backed version/review operation; protect prior versions and category sensitivity changes.
- Preserve legacy level/tags until a first reviewed assessment; derive safe summaries afterward, with sensitive outcomes redacted.
- Integrate a shared assessment panel into beneficiary, household and entity screens and a catalogue section into Settings.
- Add focused scoring/ranking/version/security tests and inspect live policies. External Supabase prevents authenticated browser verification unless a usable app session is available.

## Verification
Create, review, revise and read back an assessment; confirm earlier versions, need links and waiting-list contribution. Check sensitive exclusions and Umazi's separate catalogue. Disclose unavailable signed-in checks under NOT DONE.

<!-- Previous unrelated rollout plan retained below for reference. -->
# Previous: Phase 3 — System-Wide UI Rollout

"All" is ~100 pages and ~200 components. Rather than one mega-turn that risks visual regressions, I'll do it in 8 focused batches — each shippable, each verifiable in the preview — matching your prescribed order. You'll see progress after every batch and can steer.

## Rollout method (applied to every batch)

Instead of rewriting every page, I lift the design system into shared primitives so pages inherit it automatically, then hand-tune the pages that render heavy custom chrome.

1. **Token audit per page group** — grep for hardcoded `text-white`, `bg-black`, `bg-red-500`, `text-*-700`, `border-gray-*`, raw hex — replace with semantic tokens (`bg-card`, `text-foreground`, `bg-destructive/10`, `border-border`, status pill utilities).
2. **Card language** — replace bare `<Card>` in headers/stat rows with the `sparkline-tile`, `glass-panel`, and `elevated-surface` utilities already defined in `index.css`.
3. **Motion pass** — wrap top stat grids in `<StaggerGrid>`, wrap KPI numbers in `<AnimatedNumber>`, apply `.card-hover` and press-scale utilities. Respect the no-replay guard already in `motion.ts`.
4. **Dialogs & sheets** — apply `glass-panel` / elevated card variants to the same primitives Record Donation and Edit Need use.
5. **Verify** — build + Playwright screenshot the group's flagship page in dark and light, spot-check contrast.

## Batches

1. **Beneficiaries** — `Beneficiaries.tsx`, `BeneficiaryProfile.tsx`, `BeneficiaryForm.tsx`, `NeedsSection`, `BeneficiaryOverviewTab`, `SectorFieldsStep`, `DuplicatePreSaveDialog`, `DeduplicationReview`.
2. **Households / Partners / Waiting List** — `Households`, `HouseholdProfile`, `PartnerCollaboration`, `WaitlistManagement`, `WaitlistMatchPicker` (already token-clean, verify).
3. **Programmes / Projects / Activities / M&E** — `ProgramsManagement`, `ProgramDashboard`, `ProgramManagerWorkspace`, `AllProjects`, `Activities`, `ActivityDetail`, `MEConsolidated`, `MECalendar`, `IndicatorManagement`, `IndicatorsDashboard`, `RiskDashboard` (has hardcoded reds/oranges → soft-pill utilities).
4. **Funding** — `DonorManagement`, `FundingIntelligence`, `AllocationEngine`, `DonationsInbox`, `FinancialSuite`, `CashTransfers`, `ExpenseClaims`, financial sub-components.
5. **Intelligence** — `Analytics`, `RiskIntelligence`, `GrantDiscovery`, `BurnVsImpact`, `AIInsights`, `MapView`, `BoardReporting`, `BoardPortal`.
6. **Donor Portal** — `DonorPortal.tsx` and all `src/components/donor-portal/*` (highest polish priority — full glass rail, gradient tiles, sparklines).
7. **Operations / Engagement / Governance / Admin** — `HRManagement`, `VolunteerManagement`, `CommunicationsHub`, `AutomationEngine`, `ComplianceGovernance`, `ComplaintManagement`, `DocumentManagement`, `Documents`, `ConsentOverview`, `DataQualityDashboard`, `SafeguardingDashboard`, `RoleManagement`, `BranchManagement`, `StakeholderAccessManagement`, `OrganizationSettings`, `InferaAdminDashboard`.
8. **Auth / Setup / Shell** — `Auth`, `DonorAuth`, `ResetPassword`, `Setup2FA`, `SuperAdminLogin`, `RegisterOrganization`, `OrgSetupWizard`, `NotFound`, `WhistleblowerForm`, plus a sweep of toast / error / empty-state variants. Field Mode gets tokens with minimal decoration per battery guardrail.

## Guardrails held across all batches

- Tokens only — no per-page invented colours or purple.
- Light-theme parity verified after each batch.
- No layout restructure; no removed elements; no logic touches.
- Motion follows `prefers-reduced-motion` and never replays on refetch.
- Field Mode: tokens applied, decoration minimal.

## Technical detail

- Grep patterns per batch: `rg -n "text-(white|black|red|green|blue|yellow|orange|purple|indigo|gray|slate)-[0-9]|bg-\[#|from-purple|to-indigo" src/pages/<group>` etc.
- Reusable utilities to apply: `.sparkline-tile`, `.glass-panel`, `.elevated-surface`, `.status-pill-*`, `.card-hover`, `.tabular-nums`, plus `<StaggerGrid>`, `<AnimatedNumber>`, `<TiltCard>`, `<SparklineTile>`.
- Any hardcoded severity colours (e.g. `RiskDashboard`'s red/orange/amber/blue map) become semantic destructive/warning/success/info tokens (add `--warning` / `--success` HSL vars to `index.css` if missing, keep dark+light parity).
- Verification per batch: `bun run build` + Playwright screenshot of the flagship page in both themes; attach to the batch's closing note.

## Delivery cadence

Each batch is one turn: I ship the batch, screenshot the flagship page, and stop. You say "next" (or point me at a specific batch) and I move on. If nothing needs approval between batches, say "run all straight through" and I'll chain them without pausing.

Ready to start Batch 1 (Beneficiaries) on approval.

# ApexOS / Ufanisi DMS — Architecture Notes

_Updated by the 17 Jun 2026 structural cleanup pass._

## Sidebar map

Top-level groups and items as wired in `src/components/AppSidebar.tsx`:

| Group | Item | Route | Visibility |
|---|---|---|---|
| HOME | My Workspace | `/workspace/lead` | Only when the current user has `project_lead`/manager rights on at least one project (via `useLeadProjects`). |
| HOME | Dashboard | `/dashboard` | Everyone. |
| PEOPLE | Beneficiaries | `/beneficiaries` | `can.viewBeneficiaries` |
| PEOPLE | Households | `/households` | `can.viewBeneficiaries` |
| PEOPLE | Donors | `/donors` | `can.viewDonors` |
| PEOPLE | Partners | `/partners` | `can.viewPartners` |
| PROGRAMS | Programs | `/programs-management` | `can.viewPrograms` |
| PROGRAMS | Projects | `/projects` | `can.viewPrograms` |
| PROGRAMS | Activities | `/activities` | `can.viewPrograms` |
| PROGRAMS | M&E | `/me` | `can.viewME` |
| PROGRAMS | Logframe & ToC | `/me?tab=logframe` | `can.viewME` |
| INTELLIGENCE | AI Assistant | `/ai-insights` | `can.viewAI` |
| INTELLIGENCE | Grant Discovery | `/ai/grants` | Everyone authenticated |
| INTELLIGENCE | Risk Intelligence | `/risk-intelligence` | `can.viewRisk` |
| INTELLIGENCE | Burn vs Impact | `/intelligence/burn-vs-impact` | `can.viewAnalytics` or `can.viewReports` |
| INTELLIGENCE | Analytics | `/analytics` | `can.viewAnalytics` or `can.viewReports` |
| INTELLIGENCE | Map view | `/map` | `can.viewPrograms` |
| FUNDING | Donors / Funding Intel / Allocation Engine / Donations Inbox | various | `can.viewDonors` / `can.viewFinancials` |
| OPERATIONS | Financial, Cash Transfers, Expense Claims, Procurement, HR, Automation, Communications, Field Mode, etc. | various | per-module gating |
| ENGAGEMENT | Communications, Stakeholders, Partner Collaboration | various | per-module gating |
| GOVERNANCE | Documents, Compliance, Board Portal, Learning Log, Impact Stories | various | per-module gating |
| ADMIN | Roles & Access, Settings | various | `can.manageRoles` / `can.manageSettings` |

## Programme > Project > Activity hierarchy

The system models three nested levels:

1. **Programme** (`programs` table) — the strategic container. Entry point: `/programs-management` (Portfolio is the default tab). Drill into one programme at `/programs/dashboard/:programId`, which now exposes **six** tabs: Overview, Projects, Performance, Funding, Risks & Issues, Reports.
2. **Project** (`projects` table) — a delivery unit inside a programme. Entry point: the parent programme's Projects tab, or `/projects` for a flat list. Drill into a project at `/projects/dashboard/:projectId`, which exposes **eight** tabs: Overview, Beneficiaries, Activities, Funding, M&E, Team & Partners, Workplan, Reports.
3. **Activity** (`activities` table) — the lowest unit of execution. Lives inside a project. Entry point: the parent project's Activities tab, or the standalone `/activities` list.

## Impact Allocation Engine

Donations land in `donor_pools` keyed by donor + scope (`org_unrestricted`, `program_unrestricted`, `project_pool`, `beneficiary_direct`). On donation insert, the allocation engine eagerly draws from the pool into `allocations` rows pointing at projects or individual beneficiaries. FX rates are captured at allocation time so historical statements stay reproducible regardless of later currency moves.

## Deletion log — 17 Jun 2026 cleanup pass

- `src/pages/ReportsAnalytics.tsx` — folded into `Analytics.tsx`; `/reports-analytics` now redirects to `/analytics`.
- `src/pages/CustomReports.tsx` — dead code (no route, no inbound link). No replacement.
- `src/pages/MEsuite.tsx` — dead code. No replacement.
- `src/pages/MEHub.tsx` — superseded by `MEConsolidated.tsx`'s inline overview. `/me` still renders the consolidated page.
- `src/pages/ProgramsPortfolio.tsx` — folded into `ProgramsManagement.tsx` as the default `Portfolio` tab; `/programs/portfolio` redirects to `/programs-management?tab=portfolio`.
- `src/hooks/useMEHub.ts` — only consumed by the deleted `MEHub.tsx`.
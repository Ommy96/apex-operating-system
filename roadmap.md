# Permission system gap closure (audit 2026-11-02)
## Data quality module
- [x] Inventory existing flags, fuzzy duplicate matching, review and merge transaction; report gaps before implementation.
- [x] Extend existing flags with stable template/record identity, approved configuration and scoped scan/recheck workflows.
- [x] Seed missing DOB, minor guardian, expired consent (records and documents), unset care and unassessed need checks; 20 rules across four organisations.
- [x] Extend duplicate review with persistent distinct decisions and exact preserved-link merge preview; never auto-merge; restore the unreachable duplicate-review page.
- [x] Run eight rule tests and SQL configuration/privilege assertions; build and linter checks pass without new warnings.
- [ ] Signed-in scan twice/correct/recheck/confirm-different/merge and Umazi/non-admin/donor API checks — authenticated end-to-end checks are unavailable on external unmanaged Supabase.
- [ ] Merge records carrying immutable assessments, form submissions or legacy file links — deliberately blocked until a preservation-safe history strategy is supplied; uniqueness collisions also abort without discarding records.
- [ ] Legacy unsupported flag resolution, full legacy activity/form/case/visit issue mapping, scheduled scan dispatch and unspecified original Feature 3 sections — not supplied/fully implemented; unsupported issue closure is blocked rather than falsely confirmed.
## Results framework and indicators
- [x] Inventory existing indicator/logframe and analytics paths; report legacy sources, duplicated calculations and mutable reporting gaps.
- [x] Extend shared direction-aware calculations, distinct automated beneficiary sources and existing definition/baseline/target capture.
- [x] Add immutable approved reporting periods and reasoned amendments; approved-only donor projection with frozen programme associations.
- [x] Include definitions, denominators, periods and limitations in CSV/Excel/JSON and project donor PDF; add approved achievement to existing analytics.
- [x] Run 16 focused tests, SQL rule/privilege assertions, linter and signed-out desktop/mobile checks.
- [ ] Signed-in creation/calculation/approval/amendment, actual-data deduplication and Umazi/non-admin checks — external unmanaged Supabase has no available authenticated session.
- [ ] Full original Feature 2 sections — not supplied; implement only the explicit amendments and test-path requirements provided.
- [ ] Broader legacy programme-manager rollup calculations and stakeholder-token report projection audit — old separate programme indicators and token-based sharing remain outside the verified approved-period path.
## Donor portal completion
- [x] Diagnose NSP-AID: 651 links / 547 distinct beneficiaries / KES 105,000 recorded sponsorship funding; no allocations or received donations. Replace zero-on-no-allocation feed and blocked currency persistence.
- [x] Add immutable new-allocation FX snapshots, approved donor-safe request projection, received-only thank-you drafts, sharing guards and explicit contact-consent birthdays.
- [x] Run 15 focused tests, verify anonymous account-ID requests denied by both deployed report services, and check donor login desktop/mobile.
- [ ] Signed-in NSP-AID, Donor A/B direct API/file/export and Umazi/non-admin approval workflow tests — external unmanaged Supabase has no available authenticated session.
- [ ] Historical FX conversion for records with no captured rate — no truthful historical snapshot exists; figures remain in recorded currency.
- [ ] Complete existing needs breakdown FX, optional birthday email dispatch, broader authored-impact-story approval/consent audit, organisation-document download audit and pagination beyond 1,000 allocation records — not fully implemented/verified this turn.
- [ ] Review 649 pre-existing database security warnings — unchanged by donor migrations.

- [x] Audit roles, catalogue, assignment scoping, Phase 5.2 comparison (report saved to Files).
- [x] Add missing system roles (Project Manager, Staff Member) + aggregate permission; extend role seeding.
- [x] Enforce role scoping in RLS (beneficiaries, households) with assigned-programme/project checks.
- [x] Aggregate-only RPC `get_program_aggregate` with minimum-cell-size suppression + programme dashboard banner.
- [x] Staff portal `/workspace` (operational) with default landing for field-scoped roles.
- [x] Assignment revocation RPC + HR "End access" action.
- [x] Automated role-constant tests + live RLS probes (program manager, field staff, revocation, cross-org).
- [ ] Donor/Sponsor staff RBAC role: intentionally skipped — donor access exists via the donor portal; recorded as a design conflict.
- [ ] Browser walkthrough signed-in as non-admin — external unmanaged Supabase provides no usable browser session.

# Structured vulnerability assessments

## Family and guardian capture
- [x] Extend existing family status options per organisation and migrate legacy labels without altering care responsibility.
- [x] Add live composition fields using conservative defaults, preserve hidden family/guardian data and keep own contacts age-specific.
- [x] Share options in profiles and PDF/Excel reports; run mapping, retention and adult/minor rule tests.
- [ ] Verify signed-in live selection and save/readback, second-org/non-admin flows — external unmanaged Supabase provides no usable browser session.
- [ ] Confirm original per-option field lists — upload references them but does not include them; implemented conservative optional detail fields instead.
- [ ] Separate care-institution name from school institution_name — existing shared storage column remains an unresolved modelling conflict; no destructive split performed.

- [x] Inventory current assessment, needs, waiting-list and sensitive-data paths.
- [x] Add tenant-scoped categories and immutable assessment versions with permission-enforced review and need links.
- [x] Add assessment/history screens and configurable categories for all four subject types.
- [x] Extend existing waiting-list ranking and derive safe legacy summaries.
- [x] Run focused rule tests and inspect anonymous grants, RLS and Umazi catalogue isolation.
- [ ] Authenticated end-to-end creation, revision, donor/export exclusion and non-authorised-role checks: blocked by external Supabase with no usable browser session; Umazi currently has no beneficiaries.

# Tasks and case management
- [x] Extend existing task/case tables, links, assignment alerts and audit logs; keep cases and tasks distinct.
- [x] Add idempotent source-task creation and enforce server-side status transitions, case closure reasons, sensitive access and assignment scope.
- [x] Add task and case screens, linked case tasks, and staff workload counters; remove the duplicate legacy HR task editor.
- [x] Run focused workflow tests and inspect tenant/sensitive policies and source record fields.
- [ ] Verify authenticated create/assign/progress/close, duplicate scan, donor exclusion, direct API/file/export access, role revocation and Umazi cross-org behavior: no authenticated browser session or representative Umazi records available.
- [ ] Verify workload totals against real assigned open/overdue tasks: current task table has no test records.
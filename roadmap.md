# ApexOS Post-Implementation Audit (audit-only, no fixes)

## Remove duplicate sector fields (current request)
- [x] Check stored sector data: query returned no rows; no education migration or undated history decisions needed.
- [x] Remove five duplicate names from existing configs without changing other custom fields.
- [x] Remove education seed duplicates, keep indicators, add settings duplicate warning, and include core education columns in exports.
- [x] Verify cleanup in H2HO and preservation of all five Umazi fields; zero retained attendance/term/sponsorship rows; duplicate guard and genuine-field/export checks pass.
- [ ] Verify a–d authenticated edit/save, registration/enrollment, genuine custom-step rendering and download as H2HO/Umazi non-admin — external unmanaged auth cannot mint sessions. Existing Category step means student counts are 8 editing / 9 registering, not the brief’s 7 / 8; no unrelated step removed.

## Staff assignment fix (current request only)
- [x] Diagnose exact live project-team read, FK/profile policies and missing offboarding column.
- [x] Repair project list with checked reads, staff names, skeleton/empty/error/retry states and returned-ID checks on writes.
- [x] Mount existing programme Team tab under staff/role management permission; end-date removals.
- [x] Add missing project-team update timestamp; end-date access immediately and prevent field project assignments granting sibling programmes.
- [x] Run focused tests: 11 passed, including forced project/programme failures and successful retries; full suite 179 passed and preview build OK.
- [ ] Verification a–f: assignment/readback, exact assigned-project RPC output, single-field-role beneficiary scope, removal reload and Umazi isolation — external authenticated session unavailable; database read tool cannot execute the assigned-project RPC.
- [ ] Verification g: live signed-in forced failure remains unavailable; both list error/retry paths pass isolated tests.

## Adoption prompts (run in uploaded order)
- [x] A: Global header sync indicator — shared app-level sync owner, upload lock, scoped queue, quiet synced state, mobile icon/count and link to sync tab.
- [x] A: Compliance tray alerts and red-only dashboard banner, shared expiry rules and settings cache.
- [ ] A: Signed-in checks including Umazi/non-admin and 390px header — external authentication unavailable.
- [ ] S1: Await the referenced S1 brief, not included in this upload.
- [x] B: Obligation model, scoped derived periods, HR matrix/filters, team bulk creation, selected-period programme rollups and idempotent audited reminders.
- [ ] B: Verification a–f (submission flip, overdue boundary, programme lead, own-only/API and Umazi isolation, twice-send-once) — external authenticated testing unavailable; no existing submissions or obligations to exercise.
- [x] B: Zero-obligation denominator verified in a focused test; full suite 161 passed. Signed-out reminder call denied without sending.
- [ ] B: Signed-in HR matrix/bulk-create and zero-obligation screen — external authentication unavailable.
- [x] C: Server-scoped aggregate vulnerability map, suppression, ranked cold zones and audited organisation visit-gap setting; existing map reused, edge deployed.
- [x] C: Seven focused privacy/threshold tests and full suite (168 passed); colour luminance differs in both themes. Anonymous RPC access revoked.
- [ ] C: Complete administrative centroid coverage — current allowlist covers 11 named sub-counties; unmapped areas are listed without fabricated pins, villages await verified public centres.
- [ ] C: Live verification a–f, saved threshold readback, responsive map framing and theme contrast — external authentication unavailable; /map redirects to /auth and database test role cannot execute authenticated RPCs.

- [x] Correct repeated role choices: organisation-scoped catalogue, identical-grant deduplication, distinct-grant labels; preserve stored roles/access.
- [x] Assignment dropdown: one choice per standard role, choosing the fewest-grant version without altering existing assignments.
- [ ] Verify corrected role choices signed in as Umazi and non-admin (external authentication unavailable).

- [x] Part 1: Feature-by-feature implementation verification (9 areas)
- [x] Part 2: Database & architecture audit (tables, FK, RLS, storage, functions, jobs, isolation)
- [x] Part 3: Security & permissions testing (per role; blocked items marked BLOCKED)
- [x] Part 4: Functional workflow testing (blocked where auth unavailable)
- [x] Part 5: UI/UX audit
- [x] Part 6: Feature scorecard
- [x] Part 7: Prioritized defect register
- [x] Part 8: UI/UX screenshot inventory
- [x] Part 9: Final audit report + top-10 actions → /mnt/documents/ApexOS_PostImplementation_Audit_2026-11-09.md
- [x] Run existing test suite as evidence (132/132 pass)
- [x] Check browser auth availability (external Supabase → signed-in tests BLOCKED)

- Platform-wide UI/UX transformation (uploaded brief), in phases:
  - [x] Phase 1: management menu regrouped into brief's module map (permission-gated)
  - [~] Phase 2: Overview — operations pulse + demographics added; full layout rework pending
  - [x] Phase 3: Tasks — list/board/calendar, search, assignee filter, sort (cases timeline pending)
  - [ ] Phase 4: Data Quality + Impact dashboards
  - [ ] Phase 5: Roles & Access (categorised permissions)
  - [ ] Phase 6: Funding & Sponsorship (committed/received/disbursed)
  - [ ] Phase 7: Registration wizard + beneficiary profile
  - [ ] Phase 8: Analytics, Communications, staff/donor workspace menus

# Project rules

- Offline sync has one app-level provider and a synchronous upload lock; all consumers share state and timers, and queue reads/uploads remain scoped to the current organisation and user to prevent duplicate uploads and cross-account exposure.

- Compliance tray and dashboard alerts share the settings query and expiry helper; this keeps saved certificate dates and urgency thresholds consistent without storing duplicate notifications.

- Role catalogues scope to the current organisation, prefer local system roles over global templates, and collapse only identical system permission sets; preserve distinct grants and stored assignments to avoid accidental access changes.
- New-assignment dropdowns offer one standard role per name, selecting the fewest-grant version deterministically; full role catalogues retain distinct permission versions and existing assignments remain unchanged.

- Every settings/config UPDATE or UPSERT appends `.select('id')` and passes the result through `ensureWritten` (src/lib/settingsWrite.ts) — RLS-filtered updates return no error and 0 rows, which otherwise shows "Saved" then reverts.
- Settings forms read saved values from the table that stores them (e.g. `organizations`), never from `currentOrganization`, which only carries id/name/slug/role.
- Care-arrangement values are compared only through `src/lib/careArrangement.ts` constants/helpers — no raw string literals.
- Family-status selectors, composition fields and reports use `src/lib/familyStatus.ts`; custom options extend existing org configuration, and selection changes retain hidden data and guardian links because composition is not care responsibility.
- Admin account recovery for members (confirmation status, resend, admin-confirm) goes through the `member-account-actions` edge function, which verifies org owner/admin or super admin server-side.
- Vulnerability assessments are append-only versions saved through the permission-checked transaction RPC; shared panels support beneficiary, household and entity subjects, and database triggers derive safe summaries and the existing waitlist priority.
- Health/safeguarding assessment content must stay out of shared summaries, donor queries and exports; assessment panels are print-hidden and sensitive access uses the life-event server helper.
- Role scoping is enforced server-side: `beneficiaries`/`households` RLS restricts program-manager-only and field-staff-only users (field_officer/data_entry/staff_member) to assigned programmes/projects via the DB helpers; `src/lib/rbacRoles.ts` mirrors the SQL role lists — change both together. Org-elevated and unassigned org members keep full org access; programme managers see other programmes via `get_program_aggregate` (minimum cell size 5).
- Departing staff access ends through the `revoke_staff_access` RPC (HR "End access"); it deactivates roles, ends team memberships and reassigns pending approvals — never delete historical records.
- Keep cases (ongoing situations) distinct from tasks (actions), extending `beneficiary_cases` and `staff_tasks`; enforce assignment scope in database policies, deduplicate source tasks by organisation/event/source record, reuse `notifications` and `audit_logs`, and never change need status from task completion.
- Donor readers use shared live query invalidation; distinguish recorded sponsorship funding from received donations and allocations, use immutable allocation FX snapshots, and route requests through existing visit_requests with donor-safe approved projections so internal notes never leak.
- Results use the existing indicator/logframe catalogue and shared direction-aware calculation helpers; approved period snapshots are append-only and server-computed, while donor results use permission-checked approved projections to preserve reporting truth.
- Data quality extends existing flags and fuzzy matching through approved template RPCs; rule/record uniqueness and correction rechecks enforce truth, while merge manifests preserve link IDs and block unsupported immutable history.
- Analytics exports consume the same permission-checked aggregate report model as charts; server-side small-cell and complementary suppression run before serialization, and prepared files preserve user activation for downloads.
- Every outbound email/WhatsApp/SMS goes through `supabase/functions/_shared/delivery.ts` `deliver()` with a stable idempotency key; it logs to `message_deliveries`, blocks confidential beneficiary terms, honours per-user channel preferences/quiet hours for non-transactional mail, and keeps the fixed sender domain — so retries never duplicate and failures are never shown as sent.

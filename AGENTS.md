# Project rules

- Every settings/config UPDATE or UPSERT appends `.select('id')` and passes the result through `ensureWritten` (src/lib/settingsWrite.ts) — RLS-filtered updates return no error and 0 rows, which otherwise shows "Saved" then reverts.
- Settings forms read saved values from the table that stores them (e.g. `organizations`), never from `currentOrganization`, which only carries id/name/slug/role.
- Care-arrangement values are compared only through `src/lib/careArrangement.ts` constants/helpers — no raw string literals.
- Admin account recovery for members (confirmation status, resend, admin-confirm) goes through the `member-account-actions` edge function, which verifies org owner/admin or super admin server-side.
- Vulnerability assessments are append-only versions saved through the permission-checked transaction RPC; shared panels support beneficiary, household and entity subjects, and database triggers derive safe summaries and the existing waitlist priority.
- Health/safeguarding assessment content must stay out of shared summaries, donor queries and exports; assessment panels are print-hidden and sensitive access uses the life-event server helper.

# Structured vulnerability assessments

## Family and guardian capture
- [ ] Extend existing family status options per organisation and migrate legacy labels without altering care responsibility.
- [ ] Add live composition fields, preserve hidden data and multiple guardians, and keep own contacts age-specific.
- [ ] Share options in profiles/reports and test live changes, preservation and adult/minor rules.
- [ ] Verify signed-in save/readback and second-org/non-admin flows when a usable session is available.

- [x] Inventory current assessment, needs, waiting-list and sensitive-data paths.
- [x] Add tenant-scoped categories and immutable assessment versions with permission-enforced review and need links.
- [x] Add assessment/history screens and configurable categories for all four subject types.
- [x] Extend existing waiting-list ranking and derive safe legacy summaries.
- [x] Run focused rule tests and inspect anonymous grants, RLS and Umazi catalogue isolation.
- [ ] Authenticated end-to-end creation, revision, donor/export exclusion and non-authorised-role checks: blocked by external Supabase with no usable browser session; Umazi currently has no beneficiaries.
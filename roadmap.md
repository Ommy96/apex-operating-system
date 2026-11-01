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
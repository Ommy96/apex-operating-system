
## Sprint 2 Plan — Compliance & Accountability

### Phase 1: Database Migrations (all tables + columns at once)
1. Create `complaints` table with RLS
2. Create `safeguarding_incidents` table with RLS
3. Create `whistleblower_reports` table with RLS (no deleted_at)
4. Add KRA/NGO Board columns to organizations
5. Create `dedup_decisions` table
6. Create `find_potential_duplicates` PostgreSQL function
7. Add new RBAC permissions: viewAccountability, manageComplaints, viewSafeguarding, manageSafeguarding
8. Assign permissions to default roles
9. Create `policy-documents` and `compliance-docs` storage buckets

### Phase 2: Edge Functions
1. `create-complaint` — public intake, no auth
2. `submit-whistleblower-report` — public intake, no auth, no IP logging for anonymous

### Phase 3: UI Components & Pages
1. ComplaintIntake.tsx (public /feedback/:orgSlug)
2. ComplaintManagement.tsx + ComplaintDetail drawer
3. SafeguardingReportForm.tsx
4. SafeguardingDashboard.tsx + IncidentDetail drawer
5. WhistleblowerForm.tsx (public /report/:orgSlug)
6. WhistleblowerManagement.tsx
7. useFeatureFlag hook + FeatureFlagGuard + UpgradePrompt
8. KRA compliance section in settings + ComplianceAlertBanner
9. Deduplication warning in registration + DeduplicationReview page
10. Indicator traffic light in IndicatorsDashboard + LogFrameBuilder

### Phase 4: Integration
1. Add Accountability section to AppSidebar
2. Add all new routes to App.tsx
3. Apply FeatureFlagGuard to specified routes
4. Grey out disabled features in sidebar

# M&E Consolidation + Beneficiary Profile Upgrade

This is a large two-part change. Proposing a phased plan so you can confirm scope before I touch ~20+ files.

## Part 1 — M&E Sidebar Consolidation

### Sidebar cleanup (`src/components/workspace/WorkspaceSidebar.tsx` + `src/components/AppSidebar.tsx`)
Remove these entries from "Programs & M&E":
- M&E Suite (`/me-suite`)
- Indicators (`/indicators`)
- Forms (`/me/forms`)
- M&E Calendar (`/me-calendar`)
- Data quality (`/me/data-quality`)
- Report assembly (`/me/reports`)
- Stakeholders (`/me/stakeholders`)
- Cases (separate)

Keep exactly one: **M&E** → `/me` (Target icon, active when `pathname.startsWith('/me')`).

### New consolidated page `src/pages/MEConsolidated.tsx` (route `/me`)
Horizontal tab bar (URL-synced via `?tab=`):
1. **Overview** — current MEHub content
2. **Indicators** — IndicatorManagement
3. **Data Collection** — MECalendar + form submissions list
4. **Forms** — FormBuilderList
5. **Cases** — CaseManagement
6. **Reports** — ReportAssembly

Each tab lazy-loaded via `React.lazy` + `Suspense`.

Keep Data Quality and Stakeholders accessible via sub-routes / Overview links (not removed, just delisted from sidebar). I'll keep them under settings/Overview links so functionality isn't lost.

### Routes (`src/App.tsx`)
- `/me` → `MEConsolidated`
- Redirects: `/me-calendar`, `/indicators`, `/me/forms`, `/cases`, `/me-suite` → `/me?tab=...`
- Detail routes unchanged: `/me/indicators/:id`, `/me/forms/:id`, `/me/cases/:id`

---

## Part 2 — Beneficiary Profile Upgrade

### 2A. Field audit + display additions (`src/pages/BeneficiaryProfile.tsx` + components)
Add missing fields to correct sections per the mapping you provided (unique ID, consent, registration_source, vulnerability, economic, audit footer, general notes box).

### 2B. Age-aware display
Wire `calculateAge` / `isMinor` from `src/lib/ageUtils.ts`. Apply rules:
- Minors: hide marital status, occupation, income, employment, national ID (with amber warn if present)
- Adults non-tertiary: hide school/grade/enrollment fields; show single "Highest education" line
- Adults tertiary: relabel school→Institution, grade→Course, add Year of Study

### 2C. Dual relationships
- **New table** `beneficiary_out_of_system_contacts` (org-scoped, RLS via `user_belongs_to_org`)
- Family & Relationships section shows two sub-sections: "In this system" (from `beneficiary_relationships`) + "Outside this system" (guardian fields + new contacts table)
- "Register this person" pre-fills BeneficiaryForm and auto-links on save

### 2D. Location card
New sidebar card always showing County / Sub-county / Village (with `—` placeholders + edit link).

### 2E. Profile completeness meter
Thin progress bar in hero, calculated from key fields (age-conditional), with tooltip listing missing fields.

### 2F. Excel export (`src/lib/beneficiaryExport.ts`)
Replace current export with 4-sheet workbook (Beneficiaries grouped columns / Guardian & Family Contacts / Programme Enrollments / Summary). Uses `xlsx` (already in project). Wire into Beneficiaries.tsx Export button.

### 2G. Profile improvements
- G1 Print view (CSS `@media print` on profile)
- G2 Inline quick-edit for phone, village, sub_county, school_name, grade, notes
- G3 Photo upload via avatar overlay → new `beneficiary-photos` storage bucket
- G4 Accurate status badge with "Record exit" sheet
- G5 "Last visit" stat replacing "Time enrolled"

---

## Database migrations required
1. `beneficiary_out_of_system_contacts` table + RLS
2. `beneficiary-photos` storage bucket + policies

Both will be presented for your approval before execution.

---

## Suggested execution order (please confirm)

Given the scope, I recommend executing in 3 phases so each can be reviewed:

- **Phase A**: Part 1 (sidebar + consolidated M&E page + redirects). Smallest, highest visible impact, ~4 files.
- **Phase B**: Part 2 sections 2A–2E (profile field audit, age rules, location card, completeness, dual relationships incl. migration). ~6–8 files + 1 migration.
- **Phase C**: Part 2 sections 2F–2G (Excel export overhaul, print view, inline edit, photo upload incl. bucket migration, status badge, last-visit stat). ~5–7 files + 1 migration.

**Reply with:**
- "Proceed all" → I'll execute A→B→C sequentially (migrations will pause for your approval).
- "Proceed Phase A only" (or B / C) → I'll do just that phase.
- Any scope edits before I start.

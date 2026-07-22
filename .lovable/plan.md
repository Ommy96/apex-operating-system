## Goal
Make beneficiary registration + the "All Types" filter/cards sector-aware, driven by the org's chosen sector via the EXISTING dynamic-field system (`org_beneficiary_config`, `beneficiary_field_values`, `entity_types`). Preserve H2HO's current experience exactly.

---

## 1. Sector field templates (seed data)

Add a single new module `src/lib/sectorFieldTemplates.ts`:

- Exports `SECTOR_FIELD_TEMPLATES: Record<SectorKey, SectorFieldTemplate>` where each template = `{ sectionKey, sectionLabel, fields: FieldDef[] }`.
- `FieldDef = { key, label, type: 'text'|'number'|'select'|'multiselect'|'boolean'|'date', options?, required?, sort_order }`.
- Templates cover: `education_sponsorship`, `agriculture`, `health`, `humanitarian`, `livelihoods`, `faith_community`, `multi_sector` (empty, universal-core only). Map existing `SectorKey` values from `setupWizardSectors.ts` to these (education → education_sponsorship, faith_based → faith_community, child_protection/wash/etc → nearest match or multi_sector).
- Fields listed per intent spec: land size + tenure, crops (multi), livestock (multi + counts), farming method, years farming, cooperative membership, inputs received (agriculture); patient no., facility, condition category, treatment status, SHA/insurance, disability, next of kin (health); etc.
- Non-destructive merger helper: `mergeTemplateIntoConfig(existingCustomFields, template)` — adds only fields whose `key` is not already present.

## 2. Wizard wiring

`src/pages/OrgSetupWizard.tsx`: when sector is chosen and the wizard completes (or re-runs), after upserting `org_beneficiary_config`, merge the sector template into `custom_fields` via the helper above, then upsert. Never delete existing custom fields. Also persist `sector_key` (new column, see migration below) so profile section labels can pick the right template later.

## 3. Migration

One migration:

- `ALTER TABLE public.org_beneficiary_config ADD COLUMN IF NOT EXISTS sector_key TEXT;`
- `ALTER TABLE public.org_beneficiary_config ADD COLUMN IF NOT EXISTS beneficiary_types TEXT[] DEFAULT '{}'::text[];` (holds the wizard-chosen type keys so the Beneficiaries page cards + filter can read them).
- Backfill: rows with `org_type='child_welfare'` and no `sector_key` → `education_sponsorship` (H2HO stays as-is because their existing custom_fields already contain the education fields; the merger is idempotent).
- End with `NOTIFY pgrst, 'reload schema';`.

RLS: table already has policies; no changes needed. GRANTs already present.

## 4. BeneficiaryForm — sector step

`src/components/beneficiary/BeneficiaryForm.tsx`:

- Add a new "Sector details" step after existing core steps, rendered ONLY when `config.custom_fields.length > 0` (H2HO's flow keeps rendering its education fields via the sector template so nothing visibly changes for them; other orgs get their sector's fields).
- New component `src/components/beneficiary/SectorFieldsStep.tsx` renders one input per `custom_fields` entry with correct control (`Input`, `Input type=number`, `Select`, multi-select via checkbox grid, `Switch`, date input). Enforces `required` before allowing "Next".
- On save, values go through the existing `beneficiary_field_values` path (new helper `src/lib/saveBeneficiaryFieldValues.ts` if none exists — otherwise reuse `saveBeneficiaryField.ts`). Wrap in `{ data, error }` with `toast.error` on failure.

## 5. Profile side-panel section

`src/components/beneficiary/BeneficiaryOverviewTab.tsx`:

- Add a new collapsible section titled after `config.sector_key` (e.g. "FARM DETAILS" for agriculture, "HEALTH" for health). Section is hidden when template has no fields.
- Reads current values from `beneficiary_field_values` (or existing hook) and renders each via existing `InlineEditableField`. Save-through path unchanged.

## 6. "All Types" dropdown + summary cards

`src/pages/Beneficiaries.tsx`:

- Read `config.beneficiary_types` (from wizard) plus `useEntityTypes()` for anything the admin added. Fall back to a sane default (`['individual']`) only when both are empty.
- Replace hardcoded type array powering the filter `Select` and the summary stat cards.
- Cards: cap at 5 configured types + one "Active" card; each shows a count from `beneficiaries` filtered by `entity_type_id` / `beneficiary_type` (whichever column exists — verify with a `supabase--read_query`).
- Grid, search, export code paths already read `beneficiary_type` — no change beyond the filter options.

## 7. Custom Fields settings

Already present in `BeneficiaryDataSettings.tsx`. No behavioural change — just confirm the sector template merged into `custom_fields` shows up there so admins can add/remove.

## Files touched

Created:
- `src/lib/sectorFieldTemplates.ts`
- `src/components/beneficiary/SectorFieldsStep.tsx`
- One migration

Edited:
- `src/hooks/useOrgBeneficiaryConfig.ts` (add `sector_key`, `beneficiary_types`)
- `src/pages/OrgSetupWizard.tsx` (merge template on save)
- `src/components/beneficiary/BeneficiaryForm.tsx` (add sector step)
- `src/components/beneficiary/BeneficiaryOverviewTab.tsx` (sector section)
- `src/pages/Beneficiaries.tsx` (dynamic types filter + cards)

## Guardrails honoured

- Existing custom fields never deleted (merge-only).
- H2HO row untouched (`sector_key` backfilled but their `custom_fields` already contain the education fields).
- All queries scope by `organization_id` via existing hooks.
- `{ data, error }` + `toast.error` on every mutation.
- Uses `useTierLabels` and `beneficiary_terminology` already threaded through the form.
- Migration ends with `NOTIFY pgrst, 'reload schema';`.

## Test plan (matches intent §4)

1. Reconfigure a test org → Agriculture. Registration shows universal core + "Farm Details" step (land, crops, livestock, method). Save. Profile shows FARM DETAILS.
2. Same org's Beneficiaries page: filter and cards show Farmer / Farmer group / Cooperative — not Students.
3. H2HO reload: same form, same fields, same data.
4. Umazi (or a new org) → Health: form shows Health template.
5. Custom Fields settings still lets admin add a field on any org.
6. Cross-org isolation: switching orgs swaps the template.
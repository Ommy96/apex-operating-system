# Donor portal diagnosis and verification

## Live facts
- NSP-AID account has 651 beneficiary_donors links, 547 distinct beneficiaries and KES 105,000 amount_received. It has no allocations and no donations linked to its donor account. No allocation or payment records were manufactured.
- Sponsorship reader: beneficiary_donors filtered by donor_name and organization_id. Allocation reader: allocations filtered by donor_account_id. These are separate financial concepts.
- Old feed queried allocations by donor_account_id and returned all-zero totals immediately when none existed; it never reached donations. It also read nonexistent beneficiary_donors.donor_account_id, discarded query errors, and generated arbitrary 1%/5% attribution from internal activity notes.
- Old contribution total picked allocations, otherwise commitments, otherwise sponsorship amounts, incorrectly presenting promises as received contribution totals.
- Old feed and money-flow used component-local state, so shared Refresh did not refresh them. New live feed reads approved sponsorship_updates; allocation views read shared live allocation queries. Recorded sponsorship funding is labelled separately.
- Currency update directly changed donor_accounts, but no donor self-update policy existed. It discarded zero-row writes. Preference now uses a caller-bound protected action and validates returned rows.
- Old currency formatting selected current rates, sometimes without any date, and aggregated unlike currencies. Historical allocation figures now use captured native/base amounts or immutable fx_snapshot; missing rates stay native. Existing legacy records have no fabricated snapshots.

## Security and requests
- Reproduced anonymous account-ID access against both deployed donor report services before edits; both now reject that same probe.
- Requests extend visit_requests. Donors create only for their own sponsorships and read a projection that omits staff_notes, response_draft, visit_feedback and internal home-visit references. Reports appear only after explicit response approval.
- Sharing defaults off. Sensitive beneficiary and managed-document types are blocked by triggers. New sponsorship updates default private and require sharing approval.
- Thank-you drafts use recorded received donations and remain private until approved. Birthday cards require explicit active, unexpired sponsor_contact or birthday_contact consent and recorded DOB.
- New privileged helpers live outside the exposed API schema, behind caller-respecting wrappers. Database linter returned to the 649 pre-existing findings; no new findings remain.

## Verification
- 15 focused tests passed: captured FX, missing rates, cancelled/redirected totals, received-only acknowledgement, DOB/contact consent and forbidden document types, plus settings row-count checks.
- Preview build logs clean. Correct donor dashboard route redirects signed-out users to donor login; desktop/mobile login checked, no runtime errors or mobile horizontal overflow.

## NOT DONE
- Authenticated NSP-AID and Donor A/B URL/API/file/export, Umazi and non-admin request approval paths: external unmanaged Supabase has no available browser session.
- No received-donation rows exist for NSP-AID; acknowledgement cannot be meaningfully exercised for that donor until a real received contribution is recorded.
- Historical snapshots cannot be recovered from today's rate table. Unsupported conversions are deliberately left native.
- Existing needs estimates/line-item breakdown FX, optional birthday email delivery, complete story-authoring approval/consent audit, managed-document download auditing and allocation history pagination beyond 1,000 records remain incomplete.
- No app publication performed. 649 existing database warnings remain outside this change.
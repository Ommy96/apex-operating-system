// Sector → smart defaults applied by the Org Setup Wizard.
// Pure data — consumed by OrgSetupWizard.tsx.

export type SectorKey =
  | 'education'
  | 'agriculture'
  | 'health'
  | 'humanitarian'
  | 'child_protection'
  | 'livelihoods'
  | 'wash'
  | 'environment'
  | 'governance'
  | 'faith_based'
  | 'multi_sector';

export type BeneficiaryTypeKey =
  | 'individual'
  | 'child'
  | 'youth'
  | 'adult'
  | 'household'
  | 'farmer_group'
  | 'school'
  | 'community_group'
  | 'cooperative'
  | 'health_facility'
  | 'refugee_camp'
  | 'village'
  | 'organization';

export type FundingModelKey =
  | 'program_funded'
  | 'project_funded'
  | 'beneficiary_funded'
  | 'hybrid';

export type ReportingStyleKey =
  | 'donor_driven'
  | 'board_driven'
  | 'me_logframe'
  | 'light_touch';

export interface SectorPreset {
  key: SectorKey;
  label: string;
  blurb: string;
  emoji: string;
  orgType: string; // maps to org_beneficiary_config.org_type
  terminology: string;
  beneficiaryTypes: BeneficiaryTypeKey[];
  // org_beneficiary_config flags
  configFlags: Partial<{
    collect_education_data: boolean;
    collect_health_data: boolean;
    collect_economic_data: boolean;
    collect_household_data: boolean;
    collect_hiv_status: boolean;
    collect_nutritional_status: boolean;
    collect_disability_details: boolean;
  }>;
  // Suggested dynamic field names persisted into org_beneficiary_config.custom_fields
  customFields: { name: string; label: string; type: string; group: string }[];
  // Feature flags toggled on for this sector
  features: string[];
  // Starter logframe outline (goal/outcomes/outputs)
  logframe: { title: string; goal: string; outcomes: string[]; outputs: string[] };
  // Starter indicators
  indicators: { name: string; unit: string; level: 'output' | 'outcome' | 'impact' }[];
}

export const SECTOR_PRESETS: SectorPreset[] = [
  {
    key: 'education',
    label: 'Education',
    blurb: 'Schools, sponsorship, scholarships, academic outcomes.',
    emoji: '🎓',
    orgType: 'child_welfare',
    terminology: 'Student',
    beneficiaryTypes: ['child', 'youth', 'school', 'household'],
    configFlags: { collect_education_data: true, collect_household_data: true, collect_health_data: true },
    customFields: [
      { name: 'current_school', label: 'Current school', type: 'text', group: 'Education' },
      { name: 'current_grade', label: 'Current grade / class', type: 'text', group: 'Education' },
      { name: 'attendance_rate', label: 'Attendance %', type: 'number', group: 'Education' },
      { name: 'last_term_score', label: 'Last term average score', type: 'number', group: 'Education' },
      { name: 'sponsorship_status', label: 'Sponsorship status', type: 'select', group: 'Sponsorship' },
    ],
    features: ['sponsorship', 'academic_tracking'],
    logframe: {
      title: 'Education programme — starter logframe',
      goal: 'Improved learning outcomes for children in our communities',
      outcomes: ['Sustained school enrolment and attendance', 'Improved academic performance'],
      outputs: ['Sponsored learners receive school fees & supplies', 'Quarterly home visits conducted', 'Academic mentorship sessions delivered'],
    },
    indicators: [
      { name: 'Number of learners sponsored', unit: 'learners', level: 'output' },
      { name: 'Average attendance rate', unit: '%', level: 'outcome' },
      { name: 'Transition rate to next class', unit: '%', level: 'outcome' },
      { name: 'Average exam score', unit: 'score', level: 'impact' },
    ],
  },
  {
    key: 'agriculture',
    label: 'Agriculture',
    blurb: 'Farmer groups, crops, livestock, yields, market linkage.',
    emoji: '🌾',
    orgType: 'livelihood',
    terminology: 'Farmer',
    beneficiaryTypes: ['farmer_group', 'cooperative', 'household', 'individual'],
    configFlags: { collect_economic_data: true, collect_household_data: true },
    customFields: [
      { name: 'land_acreage', label: 'Land acreage', type: 'number', group: 'Farm' },
      { name: 'primary_crops', label: 'Primary crops', type: 'multiselect', group: 'Farm' },
      { name: 'livestock_count', label: 'Livestock count', type: 'number', group: 'Farm' },
      { name: 'last_harvest_yield_kg', label: 'Last harvest yield (kg)', type: 'number', group: 'Farm' },
      { name: 'market_access', label: 'Market access', type: 'select', group: 'Livelihood' },
    ],
    features: ['field_mode'],
    logframe: {
      title: 'Agriculture programme — starter logframe',
      goal: 'Increased household food security and farm income',
      outcomes: ['Improved farm productivity', 'Strengthened market linkages'],
      outputs: ['Farmers trained in good agronomic practices', 'Inputs distributed to farmer groups', 'Cooperatives formed and registered'],
    },
    indicators: [
      { name: 'Farmers reached with training', unit: 'farmers', level: 'output' },
      { name: 'Average yield per acre', unit: 'kg/acre', level: 'outcome' },
      { name: 'Average household farm income', unit: 'KES', level: 'impact' },
    ],
  },
  {
    key: 'health',
    label: 'Health / Medical',
    blurb: 'Clinics, patients, treatments, outreach.',
    emoji: '🏥',
    orgType: 'health',
    terminology: 'Patient',
    beneficiaryTypes: ['individual', 'household', 'health_facility'],
    configFlags: { collect_health_data: true, collect_nutritional_status: true, collect_hiv_status: true, collect_disability_details: true },
    customFields: [
      { name: 'primary_diagnosis', label: 'Primary diagnosis', type: 'text', group: 'Clinical' },
      { name: 'treatment_plan', label: 'Treatment plan', type: 'text', group: 'Clinical' },
      { name: 'last_clinic_visit', label: 'Last clinic visit', type: 'date', group: 'Clinical' },
      { name: 'next_clinic_visit', label: 'Next clinic visit', type: 'date', group: 'Clinical' },
      { name: 'facility_name', label: 'Facility name', type: 'text', group: 'Clinical' },
    ],
    features: ['field_mode'],
    logframe: {
      title: 'Health programme — starter logframe',
      goal: 'Improved community health outcomes',
      outcomes: ['Increased access to essential health services', 'Improved treatment adherence'],
      outputs: ['Patients enrolled in care', 'Outreach clinics conducted', 'Health education sessions delivered'],
    },
    indicators: [
      { name: 'Patients reached', unit: 'patients', level: 'output' },
      { name: 'Treatment adherence rate', unit: '%', level: 'outcome' },
      { name: 'Reduction in priority disease incidence', unit: '%', level: 'impact' },
    ],
  },
  {
    key: 'humanitarian',
    label: 'Humanitarian / Relief',
    blurb: 'Emergency response, displaced populations, aid distribution.',
    emoji: '🆘',
    orgType: 'disaster_response',
    terminology: 'Beneficiary',
    beneficiaryTypes: ['household', 'individual', 'refugee_camp', 'village'],
    configFlags: { collect_household_data: true, collect_disability_details: true, collect_nutritional_status: true },
    customFields: [
      { name: 'displacement_status', label: 'Displacement status', type: 'select', group: 'Vulnerability' },
      { name: 'household_vulnerability_score', label: 'Household vulnerability score', type: 'number', group: 'Vulnerability' },
      { name: 'shelter_type', label: 'Shelter type', type: 'select', group: 'Living conditions' },
      { name: 'aid_received_kind', label: 'Aid received (kind)', type: 'multiselect', group: 'Aid distribution' },
      { name: 'last_distribution_date', label: 'Last distribution date', type: 'date', group: 'Aid distribution' },
    ],
    features: ['field_mode', 'cash_transfers'],
    logframe: {
      title: 'Humanitarian response — starter logframe',
      goal: 'Lives saved and dignity preserved in crisis-affected populations',
      outcomes: ['Improved access to food, shelter and protection', 'Restored basic services'],
      outputs: ['Households reached with emergency assistance', 'Cash transfers disbursed', 'Protection cases referred'],
    },
    indicators: [
      { name: 'Households assisted', unit: 'households', level: 'output' },
      { name: 'Value of cash transfers disbursed', unit: 'KES', level: 'output' },
      { name: 'Households reporting adequate food consumption', unit: '%', level: 'outcome' },
    ],
  },
  {
    key: 'child_protection',
    label: 'Child Protection',
    blurb: 'Safeguarding, case management, family strengthening.',
    emoji: '🛡️',
    orgType: 'child_welfare',
    terminology: 'Child',
    beneficiaryTypes: ['child', 'youth', 'household'],
    configFlags: { collect_household_data: true, collect_health_data: true, collect_disability_details: true },
    customFields: [
      { name: 'risk_level', label: 'Risk level', type: 'select', group: 'Safeguarding' },
      { name: 'caregiver_relationship', label: 'Primary caregiver relationship', type: 'select', group: 'Family' },
      { name: 'open_cases', label: 'Open cases', type: 'number', group: 'Safeguarding' },
    ],
    features: ['safeguarding', 'case_management'],
    logframe: {
      title: 'Child protection — starter logframe',
      goal: 'Children grow up safe and supported',
      outcomes: ['Reduced risk of harm', 'Stronger families and caregivers'],
      outputs: ['Cases identified and managed', 'Caregivers trained', 'Referrals completed'],
    },
    indicators: [
      { name: 'Children with active case plans', unit: 'children', level: 'output' },
      { name: 'Cases resolved within SLA', unit: '%', level: 'outcome' },
    ],
  },
  {
    key: 'livelihoods',
    label: 'Livelihoods / Economic Empowerment',
    blurb: 'Training, savings groups, micro-enterprise, income.',
    emoji: '💼',
    orgType: 'livelihood',
    terminology: 'Participant',
    beneficiaryTypes: ['individual', 'adult', 'youth', 'community_group', 'cooperative'],
    configFlags: { collect_economic_data: true, collect_household_data: true },
    customFields: [
      { name: 'income_source', label: 'Primary income source', type: 'text', group: 'Livelihood' },
      { name: 'monthly_income', label: 'Monthly income', type: 'number', group: 'Livelihood' },
      { name: 'savings_group', label: 'Savings group', type: 'text', group: 'Livelihood' },
      { name: 'business_type', label: 'Business type', type: 'text', group: 'Livelihood' },
    ],
    features: ['cash_transfers'],
    logframe: {
      title: 'Livelihoods programme — starter logframe',
      goal: 'Sustainable household income for vulnerable populations',
      outcomes: ['Increased income from enterprise', 'Improved financial inclusion'],
      outputs: ['Participants trained', 'Savings groups formed', 'Start-up grants disbursed'],
    },
    indicators: [
      { name: 'Participants trained', unit: 'people', level: 'output' },
      { name: 'Average monthly income', unit: 'KES', level: 'outcome' },
      { name: 'Active businesses 6 months post-grant', unit: '%', level: 'impact' },
    ],
  },
  {
    key: 'wash',
    label: 'WASH',
    blurb: 'Water, sanitation and hygiene infrastructure and behaviour.',
    emoji: '💧',
    orgType: 'general',
    terminology: 'Community member',
    beneficiaryTypes: ['household', 'community_group', 'school', 'village'],
    configFlags: { collect_household_data: true, collect_health_data: true },
    customFields: [
      { name: 'water_source', label: 'Primary water source', type: 'select', group: 'WASH' },
      { name: 'distance_to_water_m', label: 'Distance to water (m)', type: 'number', group: 'WASH' },
      { name: 'latrine_type', label: 'Latrine type', type: 'select', group: 'WASH' },
      { name: 'handwashing_facility', label: 'Handwashing facility available', type: 'boolean', group: 'WASH' },
    ],
    features: ['field_mode'],
    logframe: {
      title: 'WASH programme — starter logframe',
      goal: 'Healthier communities through safe water and sanitation',
      outcomes: ['Improved access to safe water', 'Improved hygiene practices'],
      outputs: ['Water points constructed/rehabilitated', 'Latrines built', 'Hygiene promotion sessions held'],
    },
    indicators: [
      { name: 'People with access to safe water', unit: 'people', level: 'outcome' },
      { name: 'Households with improved latrines', unit: 'households', level: 'outcome' },
    ],
  },
  {
    key: 'environment',
    label: 'Environment / Climate',
    blurb: 'Conservation, tree planting, climate-smart agriculture.',
    emoji: '🌳',
    orgType: 'general',
    terminology: 'Community member',
    beneficiaryTypes: ['community_group', 'household', 'village', 'farmer_group'],
    configFlags: { collect_household_data: true },
    customFields: [
      { name: 'trees_planted', label: 'Trees planted', type: 'number', group: 'Environment' },
      { name: 'land_under_conservation_ha', label: 'Land under conservation (ha)', type: 'number', group: 'Environment' },
    ],
    features: ['field_mode'],
    logframe: {
      title: 'Environment programme — starter logframe',
      goal: 'Resilient landscapes and communities',
      outcomes: ['Increased tree cover', 'Adoption of climate-smart practices'],
      outputs: ['Seedlings distributed', 'Community training delivered'],
    },
    indicators: [
      { name: 'Trees planted', unit: 'trees', level: 'output' },
      { name: 'Tree survival rate at 12 months', unit: '%', level: 'outcome' },
    ],
  },
  {
    key: 'governance',
    label: 'Governance / Advocacy',
    blurb: 'Civic engagement, policy advocacy, accountability.',
    emoji: '⚖️',
    orgType: 'general',
    terminology: 'Citizen',
    beneficiaryTypes: ['individual', 'community_group', 'organization'],
    configFlags: {},
    customFields: [
      { name: 'advocacy_issue', label: 'Advocacy issue', type: 'text', group: 'Advocacy' },
      { name: 'policy_engagement_level', label: 'Policy engagement level', type: 'select', group: 'Advocacy' },
    ],
    features: [],
    logframe: {
      title: 'Governance programme — starter logframe',
      goal: 'More accountable, inclusive institutions',
      outcomes: ['Increased citizen participation', 'Policy reforms influenced'],
      outputs: ['Forums convened', 'Policy briefs published'],
    },
    indicators: [
      { name: 'Citizens reached with civic education', unit: 'people', level: 'output' },
      { name: 'Policy briefs adopted', unit: 'briefs', level: 'outcome' },
    ],
  },
  {
    key: 'faith_based',
    label: 'Faith-Based',
    blurb: 'Congregation-led service, holistic family support.',
    emoji: '✝️',
    orgType: 'general',
    terminology: 'Member',
    beneficiaryTypes: ['individual', 'household', 'community_group'],
    configFlags: { collect_household_data: true },
    customFields: [
      { name: 'congregation', label: 'Congregation / parish', type: 'text', group: 'Faith' },
    ],
    features: [],
    logframe: {
      title: 'Faith-based ministry — starter logframe',
      goal: 'Whole-person wellbeing in our community',
      outcomes: ['Spiritual, social and material needs addressed'],
      outputs: ['Outreach activities held', 'Support delivered to vulnerable households'],
    },
    indicators: [
      { name: 'Households supported', unit: 'households', level: 'output' },
    ],
  },
  {
    key: 'multi_sector',
    label: 'Multi-sector',
    blurb: 'Multiple programme areas. Flexible defaults.',
    emoji: '🧩',
    orgType: 'general',
    terminology: 'Beneficiary',
    beneficiaryTypes: ['individual', 'household', 'community_group'],
    configFlags: { collect_household_data: true, collect_education_data: true, collect_health_data: true },
    customFields: [],
    features: [],
    logframe: {
      title: 'Organisation logframe — starter',
      goal: 'Improved wellbeing for the communities we serve',
      outcomes: ['Improved access to services'],
      outputs: ['Programme activities delivered'],
    },
    indicators: [
      { name: 'Total people reached', unit: 'people', level: 'output' },
    ],
  },
];

export const BENEFICIARY_TYPES: { key: BeneficiaryTypeKey; label: string }[] = [
  { key: 'individual', label: 'Individual' },
  { key: 'child', label: 'Child' },
  { key: 'youth', label: 'Youth' },
  { key: 'adult', label: 'Adult' },
  { key: 'household', label: 'Household' },
  { key: 'farmer_group', label: 'Farmer group' },
  { key: 'school', label: 'School' },
  { key: 'community_group', label: 'Community group' },
  { key: 'cooperative', label: 'Cooperative' },
  { key: 'health_facility', label: 'Health facility' },
  { key: 'refugee_camp', label: 'Refugee camp' },
  { key: 'village', label: 'Village' },
  { key: 'organization', label: 'Organisation' },
];

export const FUNDING_MODELS: { key: FundingModelKey; label: string; desc: string }[] = [
  { key: 'program_funded', label: 'Program-funded', desc: 'Funding tied to programmes / grants.' },
  { key: 'project_funded', label: 'Project-funded', desc: 'Funding tied to discrete projects.' },
  { key: 'beneficiary_funded', label: 'Beneficiary-funded (sponsorship)', desc: 'Donors sponsor individual beneficiaries.' },
  { key: 'hybrid', label: 'Hybrid', desc: 'Mix of the above.' },
];

export const REPORTING_STYLES: { key: ReportingStyleKey; label: string; desc: string }[] = [
  { key: 'donor_driven', label: 'Donor-driven', desc: 'Reports follow donor requirements & schedules.' },
  { key: 'board_driven', label: 'Board-driven', desc: 'Quarterly board packs are the main rhythm.' },
  { key: 'me_logframe', label: 'M&E / logframe-driven', desc: 'Indicators and logframes drive reporting.' },
  { key: 'light_touch', label: 'Light-touch', desc: 'Keep it simple. Minimal reporting overhead.' },
];

export function featuresFromChoices(
  sector: SectorPreset,
  fundingModels: FundingModelKey[],
  reportingStyle: ReportingStyleKey,
): Record<string, boolean> {
  const set = new Set<string>(sector.features);
  if (fundingModels.includes('beneficiary_funded')) set.add('sponsorship');
  if (fundingModels.includes('hybrid')) set.add('sponsorship');
  if (reportingStyle === 'me_logframe') {
    set.add('logframe');
    set.add('indicators');
  }
  if (reportingStyle === 'donor_driven') set.add('donor_reports');
  if (reportingStyle === 'board_driven') set.add('board_reporting');
  // Always on
  set.add('field_mode');
  const out: Record<string, boolean> = {};
  set.forEach((f) => { out[f] = true; });
  return out;
}
-- =====================================================
-- MIGRATION: Create Entity Types for Heart to Heart Programs
-- =====================================================
-- This migration creates 5 entity types to replace hardcoded program tables:
-- 1. Education (formerly children)
-- 2. Feeding Program
-- 3. Kipawa Sato  
-- 4. Self Empowerment
-- 5. Support Groups
-- =====================================================

-- 1. EDUCATION ENTITY TYPE (from children table)
INSERT INTO entity_types (
  id,
  organization_id,
  name,
  slug,
  description,
  icon,
  color,
  is_active,
  sort_order,
  field_schema,
  settings
) VALUES (
  'e0000001-0001-0001-0001-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'Education',
  'education',
  'Education sponsorship program for children and students',
  'GraduationCap',
  'blue',
  true,
  1,
  '[
    {"name": "student_id", "type": "text", "label": "Student ID", "required": false},
    {"name": "first_name", "type": "text", "label": "First Name", "required": true},
    {"name": "last_name", "type": "text", "label": "Last Name", "required": true},
    {"name": "date_of_birth", "type": "date", "label": "Date of Birth", "required": false},
    {"name": "gender", "type": "select", "label": "Gender", "required": false, "options": ["Male", "Female"]},
    {"name": "photo_url", "type": "text", "label": "Photo URL", "required": false},
    {"name": "residence", "type": "select", "label": "Residence", "required": false, "options": ["Kibera", "Kawangware", "Diaspora", "Outside Nairobi"]},
    {"name": "academic_level", "type": "select", "label": "Academic Level", "required": false, "options": ["Pre Primary", "Lower Primary", "Upper Primary", "Junior Secondary School", "Secondary School", "Senior School", "Tertiary", "Special School"]},
    {"name": "institution_name", "type": "text", "label": "Institution Name", "required": false},
    {"name": "grade", "type": "text", "label": "Grade/Class", "required": false},
    {"name": "course_name", "type": "text", "label": "Course Name", "required": false},
    {"name": "parental_status", "type": "select", "label": "Parental Status", "required": false, "options": ["Both alive", "Both deceased", "Partial"]},
    {"name": "guardian_name", "type": "text", "label": "Guardian Name", "required": false},
    {"name": "relation", "type": "text", "label": "Relation to Guardian", "required": false},
    {"name": "guardian_phone", "type": "text", "label": "Guardian Phone", "required": false},
    {"name": "guardian_email", "type": "text", "label": "Guardian Email", "required": false},
    {"name": "contact", "type": "text", "label": "Contact", "required": false},
    {"name": "address", "type": "text", "label": "Address", "required": false},
    {"name": "medical_notes", "type": "textarea", "label": "Medical Notes", "required": false},
    {"name": "special_needs", "type": "textarea", "label": "Special Needs", "required": false},
    {"name": "special_condition", "type": "text", "label": "Special Condition", "required": false},
    {"name": "donor", "type": "text", "label": "Donor/Sponsor", "required": false},
    {"name": "donation_received_ksh", "type": "number", "label": "Donation Received (KSH)", "required": false},
    {"name": "receives_transport", "type": "checkbox", "label": "Receives Transport", "required": false},
    {"name": "receives_shopping", "type": "checkbox", "label": "Receives Shopping", "required": false},
    {"name": "receives_hbc", "type": "checkbox", "label": "Receives HBC", "required": false},
    {"name": "enrollment_date", "type": "date", "label": "Enrollment Date", "required": false},
    {"name": "status", "type": "select", "label": "Status", "required": true, "options": ["active", "inactive", "graduated", "transferred"]},
    {"name": "replacement_status", "type": "text", "label": "Replacement Status", "required": false},
    {"name": "inactive_reason", "type": "text", "label": "Inactive Reason", "required": false},
    {"name": "inactive_date", "type": "date", "label": "Inactive Date", "required": false}
  ]'::jsonb,
  '{"displayNameField": "first_name", "secondaryDisplayField": "last_name"}'::jsonb
);

-- 2. FEEDING PROGRAM ENTITY TYPE
INSERT INTO entity_types (
  id,
  organization_id,
  name,
  slug,
  description,
  icon,
  color,
  is_active,
  sort_order,
  field_schema,
  settings
) VALUES (
  'e0000001-0002-0002-0002-000000000002',
  'a0000000-0000-0000-0000-000000000001',
  'Feeding Program',
  'feeding-program',
  'Nutrition support program providing meals to beneficiaries',
  'Utensils',
  'orange',
  true,
  2,
  '[
    {"name": "name", "type": "text", "label": "Full Name", "required": true},
    {"name": "gender", "type": "select", "label": "Gender", "required": false, "options": ["Male", "Female"]},
    {"name": "type", "type": "select", "label": "Program Type", "required": false, "options": ["Kawangware Lunch Hour", "Kibera Early Dinner"]},
    {"name": "academic_level", "type": "select", "label": "Academic Level", "required": false, "options": ["Pre Primary", "Lower Primary", "Upper Primary", "Junior Secondary School", "Secondary School", "Senior School", "Tertiary", "Special School"]},
    {"name": "grade", "type": "text", "label": "Grade/Class", "required": false},
    {"name": "contact", "type": "text", "label": "Contact", "required": false},
    {"name": "school", "type": "text", "label": "School", "required": false},
    {"name": "education_sponsorship", "type": "checkbox", "label": "Receives Education Sponsorship", "required": false}
  ]'::jsonb,
  '{"displayNameField": "name"}'::jsonb
);

-- 3. KIPAWA SATO ENTITY TYPE
INSERT INTO entity_types (
  id,
  organization_id,
  name,
  slug,
  description,
  icon,
  color,
  is_active,
  sort_order,
  field_schema,
  settings
) VALUES (
  'e0000001-0003-0003-0003-000000000003',
  'a0000000-0000-0000-0000-000000000001',
  'Kipawa Sato',
  'kipawa-sato',
  'Talent development and mentorship program',
  'Music',
  'purple',
  true,
  3,
  '[
    {"name": "full_name", "type": "text", "label": "Full Name", "required": true},
    {"name": "gender", "type": "select", "label": "Gender", "required": false, "options": ["Male", "Female"]},
    {"name": "age", "type": "number", "label": "Age", "required": false},
    {"name": "academic_level", "type": "select", "label": "Academic Level", "required": false, "options": ["Pre Primary", "Lower Primary", "Upper Primary", "Junior Secondary School", "Secondary School", "Senior School", "Tertiary", "Special School"]},
    {"name": "location", "type": "select", "label": "Location", "required": false, "options": ["Kibera", "Kawangware"]},
    {"name": "talent_category", "type": "select", "label": "Talent Category", "required": false, "options": ["Music", "Dance", "Poetry", "Art & Craft", "Sport", "Boardgames"]},
    {"name": "specific_skill", "type": "select", "label": "Specific Skill", "required": false, "options": ["Singing", "Spoken Word", "Drawing", "Instruments", "Football", "Basketball", "Chess", "Fashion", "Modern", "Traditional"]},
    {"name": "year_enrolled", "type": "number", "label": "Year Enrolled", "required": false},
    {"name": "coach_mentor_name", "type": "text", "label": "Coach/Mentor Name", "required": false},
    {"name": "awards_recognition", "type": "textarea", "label": "Awards & Recognition", "required": false},
    {"name": "school_support_given", "type": "checkbox", "label": "School Support Given", "required": false}
  ]'::jsonb,
  '{"displayNameField": "full_name"}'::jsonb
);

-- 4. SELF EMPOWERMENT ENTITY TYPE
INSERT INTO entity_types (
  id,
  organization_id,
  name,
  slug,
  description,
  icon,
  color,
  is_active,
  sort_order,
  field_schema,
  settings
) VALUES (
  'e0000001-0004-0004-0004-000000000004',
  'a0000000-0000-0000-0000-000000000001',
  'Self Empowerment',
  'self-empowerment',
  'Business support, loans and grants for economic empowerment',
  'Briefcase',
  'green',
  true,
  4,
  '[
    {"name": "applicant_id", "type": "text", "label": "Applicant ID", "required": false},
    {"name": "full_name", "type": "text", "label": "Full Name", "required": true},
    {"name": "gender", "type": "select", "label": "Gender", "required": false, "options": ["Male", "Female"]},
    {"name": "contact", "type": "text", "label": "Contact", "required": false},
    {"name": "residence", "type": "select", "label": "Residence", "required": false, "options": ["Kibera", "Kawangware", "Diaspora", "Outside Nairobi"]},
    {"name": "business_name", "type": "text", "label": "Business Name", "required": false},
    {"name": "type_of_business", "type": "text", "label": "Type of Business", "required": false},
    {"name": "support_status", "type": "textarea", "label": "Support Status", "required": false},
    {"name": "start_date", "type": "date", "label": "Start Date", "required": false},
    {"name": "business_location", "type": "text", "label": "Business Location", "required": false},
    {"name": "amount_requested", "type": "number", "label": "Amount Requested", "required": false},
    {"name": "amount_approved", "type": "number", "label": "Amount Approved", "required": false},
    {"name": "amount_status", "type": "select", "label": "Amount Status", "required": false, "options": ["Loan", "Grant"]},
    {"name": "current_status", "type": "textarea", "label": "Current Status", "required": false},
    {"name": "is_active", "type": "checkbox", "label": "Is Active", "required": false}
  ]'::jsonb,
  '{"displayNameField": "full_name", "secondaryDisplayField": "business_name"}'::jsonb
);

-- 5. SUPPORT GROUPS ENTITY TYPE
INSERT INTO entity_types (
  id,
  organization_id,
  name,
  slug,
  description,
  icon,
  color,
  is_active,
  sort_order,
  field_schema,
  settings
) VALUES (
  'e0000001-0005-0005-0005-000000000005',
  'a0000000-0000-0000-0000-000000000001',
  'Support Groups',
  'support-groups',
  'Community support groups and meeting management',
  'Users',
  'teal',
  true,
  5,
  '[
    {"name": "name", "type": "text", "label": "Group Name", "required": true},
    {"name": "description", "type": "textarea", "label": "Description", "required": false},
    {"name": "facilitator", "type": "text", "label": "Team Leader/Facilitator", "required": false},
    {"name": "team_leader_contact", "type": "text", "label": "Team Leader Contact", "required": false},
    {"name": "location", "type": "text", "label": "Location", "required": false},
    {"name": "meeting_schedule", "type": "text", "label": "Meeting Schedule", "required": false},
    {"name": "member_count", "type": "number", "label": "Member Count", "required": false}
  ]'::jsonb,
  '{"displayNameField": "name"}'::jsonb
);

-- =====================================================
-- DATA MIGRATION: Migrate records from hardcoded tables to entities
-- =====================================================

-- Migrate children -> Education entities
INSERT INTO entities (id, entity_type_id, organization_id, display_name, status, created_by, created_at, updated_at, data)
SELECT 
  gen_random_uuid(),
  'e0000001-0001-0001-0001-000000000001',
  organization_id,
  CONCAT(first_name, ' ', last_name),
  COALESCE(status, 'active'),
  created_by,
  created_at,
  updated_at,
  jsonb_build_object(
    'student_id', student_id,
    'first_name', first_name,
    'last_name', last_name,
    'date_of_birth', date_of_birth,
    'gender', gender,
    'photo_url', photo_url,
    'residence', residence,
    'academic_level', academic_level,
    'institution_name', institution_name,
    'grade', grade,
    'course_name', course_name,
    'parental_status', parental_status,
    'guardian_name', guardian_name,
    'relation', relation,
    'guardian_phone', guardian_phone,
    'guardian_email', guardian_email,
    'contact', contact,
    'address', address,
    'medical_notes', medical_notes,
    'special_needs', special_needs,
    'special_condition', special_condition,
    'donor', donor,
    'donation_received_ksh', donation_received_ksh,
    'receives_transport', receives_transport,
    'receives_shopping', receives_shopping,
    'receives_hbc', receives_hbc,
    'enrollment_date', enrollment_date,
    'status', status,
    'replacement_status', replacement_status,
    'inactive_reason', inactive_reason,
    'inactive_date', inactive_date,
    'original_id', id
  )
FROM children
WHERE organization_id = 'a0000000-0000-0000-0000-000000000001';

-- Migrate feeding_program -> Feeding Program entities
INSERT INTO entities (id, entity_type_id, organization_id, display_name, status, created_by, created_at, updated_at, data)
SELECT 
  gen_random_uuid(),
  'e0000001-0002-0002-0002-000000000002',
  organization_id,
  name,
  'active',
  created_by,
  created_at,
  updated_at,
  jsonb_build_object(
    'name', name,
    'gender', gender,
    'type', type,
    'academic_level', academic_level,
    'grade', grade,
    'contact', contact,
    'school', school,
    'education_sponsorship', education_sponsorship,
    'original_id', id
  )
FROM feeding_program
WHERE organization_id = 'a0000000-0000-0000-0000-000000000001';

-- Migrate kipawa_sato -> Kipawa Sato entities
INSERT INTO entities (id, entity_type_id, organization_id, display_name, status, created_by, created_at, updated_at, data)
SELECT 
  gen_random_uuid(),
  'e0000001-0003-0003-0003-000000000003',
  organization_id,
  full_name,
  'active',
  created_by,
  created_at,
  updated_at,
  jsonb_build_object(
    'full_name', full_name,
    'gender', gender,
    'age', age,
    'academic_level', academic_level,
    'location', location,
    'talent_category', talent_category,
    'specific_skill', specific_skill,
    'year_enrolled', year_enrolled,
    'coach_mentor_name', coach_mentor_name,
    'awards_recognition', awards_recognition,
    'school_support_given', school_support_given,
    'original_id', id
  )
FROM kipawa_sato
WHERE organization_id = 'a0000000-0000-0000-0000-000000000001';

-- Migrate self_empowerment -> Self Empowerment entities
INSERT INTO entities (id, entity_type_id, organization_id, display_name, status, created_by, created_at, updated_at, data)
SELECT 
  gen_random_uuid(),
  'e0000001-0004-0004-0004-000000000004',
  organization_id,
  full_name,
  CASE WHEN is_active THEN 'active' ELSE 'inactive' END,
  created_by,
  created_at,
  updated_at,
  jsonb_build_object(
    'applicant_id', applicant_id,
    'full_name', full_name,
    'gender', gender,
    'contact', contact,
    'residence', residence,
    'business_name', business_name,
    'type_of_business', type_of_business,
    'support_status', support_status,
    'start_date', start_date,
    'business_location', business_location,
    'amount_requested', amount_requested,
    'amount_approved', amount_approved,
    'amount_status', amount_status,
    'current_status', current_status,
    'is_active', is_active,
    'original_id', id
  )
FROM self_empowerment
WHERE organization_id = 'a0000000-0000-0000-0000-000000000001';

-- Migrate support_groups -> Support Groups entities
INSERT INTO entities (id, entity_type_id, organization_id, display_name, status, created_by, created_at, updated_at, data)
SELECT 
  gen_random_uuid(),
  'e0000001-0005-0005-0005-000000000005',
  organization_id,
  name,
  'active',
  created_by,
  created_at,
  updated_at,
  jsonb_build_object(
    'name', name,
    'description', description,
    'facilitator', facilitator,
    'team_leader_contact', team_leader_contact,
    'location', location,
    'meeting_schedule', meeting_schedule,
    'member_count', member_count,
    'original_id', id
  )
FROM support_groups
WHERE organization_id = 'a0000000-0000-0000-0000-000000000001';
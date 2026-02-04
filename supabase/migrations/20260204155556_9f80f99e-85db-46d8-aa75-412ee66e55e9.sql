
-- Migration: Transfer legacy data to unified beneficiaries table
-- This migration copies data from legacy tables to the new beneficiaries table

-- 1. Migrate children → beneficiaries (type: 'student')
INSERT INTO beneficiaries (
  id, organization_id, beneficiary_type, display_name, first_name, middle_name, last_name,
  gender, date_of_birth, academic_level, grade, institution_name, course_name,
  student_id_number, photo_url, status, county, sub_county, estate_village,
  legacy_child_id, created_by, created_at, updated_at
)
SELECT 
  gen_random_uuid(),
  c.organization_id,
  'student'::beneficiary_type,
  CONCAT(c.first_name, ' ', c.last_name),
  c.first_name,
  NULL,
  c.last_name,
  c.gender,
  c.date_of_birth,
  c.academic_level,
  c.grade,
  c.institution_name,
  c.course_name,
  c.student_id,
  c.photo_url,
  c.status,
  NULL,
  NULL,
  c.address,
  c.id,
  c.created_by,
  c.created_at,
  c.updated_at
FROM children c
WHERE NOT EXISTS (
  SELECT 1 FROM beneficiaries b WHERE b.legacy_child_id = c.id
);

-- 2. Migrate kipawa_sato → beneficiaries (type: 'student') - only if not linked to existing child
INSERT INTO beneficiaries (
  id, organization_id, beneficiary_type, display_name, first_name, last_name,
  gender, academic_level, location, year_enrolled, legacy_child_id,
  created_by, created_at, updated_at, status
)
SELECT 
  gen_random_uuid(),
  k.organization_id,
  'student'::beneficiary_type,
  k.full_name,
  SPLIT_PART(k.full_name, ' ', 1),
  CASE 
    WHEN POSITION(' ' IN k.full_name) > 0 
    THEN SUBSTRING(k.full_name FROM POSITION(' ' IN k.full_name) + 1)
    ELSE ''
  END,
  k.gender,
  k.academic_level,
  k.location::text,
  k.year_enrolled,
  k.linked_child_id,
  k.created_by,
  k.created_at,
  k.updated_at,
  'active'
FROM kipawa_sato k
WHERE k.linked_child_id IS NULL
AND NOT EXISTS (
  SELECT 1 FROM beneficiaries b WHERE b.legacy_child_id = k.id
);

-- 3. Migrate feeding_program → beneficiaries (type: 'student') - only if not linked
INSERT INTO beneficiaries (
  id, organization_id, beneficiary_type, display_name, first_name, last_name,
  gender, academic_level, grade, institution_name, legacy_child_id,
  created_by, created_at, updated_at, status
)
SELECT 
  gen_random_uuid(),
  f.organization_id,
  'student'::beneficiary_type,
  f.name,
  SPLIT_PART(f.name, ' ', 1),
  CASE 
    WHEN POSITION(' ' IN f.name) > 0 
    THEN SUBSTRING(f.name FROM POSITION(' ' IN f.name) + 1)
    ELSE ''
  END,
  f.gender,
  f.academic_level,
  f.grade,
  f.school,
  f.linked_child_id,
  f.created_by,
  f.created_at,
  f.updated_at,
  'active'
FROM feeding_program f
WHERE f.linked_child_id IS NULL
AND NOT EXISTS (
  SELECT 1 FROM beneficiaries b WHERE b.legacy_child_id = f.id
);

-- 4. Migrate family_adoption → beneficiaries (type: 'adult')
INSERT INTO beneficiaries (
  id, organization_id, beneficiary_type, display_name, first_name, last_name,
  gender, location, source_of_income, legacy_child_id,
  created_by, created_at, updated_at, status
)
SELECT 
  gen_random_uuid(),
  fa.organization_id,
  'adult'::beneficiary_type,
  fa.known_name,
  SPLIT_PART(COALESCE(fa.actual_name, fa.known_name), ' ', 1),
  CASE 
    WHEN POSITION(' ' IN COALESCE(fa.actual_name, fa.known_name)) > 0 
    THEN SUBSTRING(COALESCE(fa.actual_name, fa.known_name) FROM POSITION(' ' IN COALESCE(fa.actual_name, fa.known_name)) + 1)
    ELSE ''
  END,
  fa.gender,
  fa.residence::text,
  fa.source_of_income,
  fa.linked_child_id,
  fa.created_by,
  fa.created_at,
  fa.updated_at,
  COALESCE(fa.family_status, 'active')
FROM family_adoption fa
WHERE NOT EXISTS (
  SELECT 1 FROM beneficiaries b WHERE b.legacy_child_id = fa.id
);

-- 5. Migrate self_empowerment → beneficiaries (type: 'adult')
INSERT INTO beneficiaries (
  id, organization_id, beneficiary_type, display_name, first_name, last_name,
  gender, location, amount_given, legacy_child_id,
  created_by, created_at, updated_at, status
)
SELECT 
  gen_random_uuid(),
  se.organization_id,
  'adult'::beneficiary_type,
  se.full_name,
  SPLIT_PART(se.full_name, ' ', 1),
  CASE 
    WHEN POSITION(' ' IN se.full_name) > 0 
    THEN SUBSTRING(se.full_name FROM POSITION(' ' IN se.full_name) + 1)
    ELSE ''
  END,
  se.gender,
  se.residence::text,
  se.amount_approved,
  se.linked_child_id,
  se.created_by,
  se.created_at,
  se.updated_at,
  CASE WHEN se.is_active THEN 'active' ELSE 'inactive' END
FROM self_empowerment se
WHERE NOT EXISTS (
  SELECT 1 FROM beneficiaries b WHERE b.legacy_child_id = se.id
);

-- 6. Migrate support_groups → beneficiaries (type: 'group')
INSERT INTO beneficiaries (
  id, organization_id, beneficiary_type, display_name, group_name,
  location, group_schedule, leader_name, leader_phone, member_count,
  legacy_child_id, created_by, created_at, updated_at, status
)
SELECT 
  gen_random_uuid(),
  sg.organization_id,
  'group'::beneficiary_type,
  sg.name,
  sg.name,
  sg.location,
  sg.meeting_schedule,
  sg.facilitator,
  sg.team_leader_contact,
  sg.member_count,
  sg.linked_child_id,
  sg.created_by,
  sg.created_at,
  sg.updated_at,
  'active'
FROM support_groups sg
WHERE NOT EXISTS (
  SELECT 1 FROM beneficiaries b WHERE b.legacy_child_id = sg.id
);

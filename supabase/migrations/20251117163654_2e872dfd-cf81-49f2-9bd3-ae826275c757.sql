-- Update existing records from 'Junior Secondary' to 'Junior Secondary School'
UPDATE children 
SET academic_level = 'Junior Secondary School'::academic_level_type 
WHERE academic_level = 'Junior Secondary'::academic_level_type;

UPDATE feeding_program 
SET academic_level = 'Junior Secondary School'::academic_level_type 
WHERE academic_level = 'Junior Secondary'::academic_level_type;

UPDATE kipawa_sato 
SET academic_level = 'Junior Secondary School'::academic_level_type 
WHERE academic_level = 'Junior Secondary'::academic_level_type;

-- Update existing records from 'Junior School' to 'Junior Secondary School'
UPDATE children 
SET academic_level = 'Junior Secondary School'::academic_level_type 
WHERE academic_level = 'Junior School'::academic_level_type;

UPDATE feeding_program 
SET academic_level = 'Junior Secondary School'::academic_level_type 
WHERE academic_level = 'Junior School'::academic_level_type;

UPDATE kipawa_sato 
SET academic_level = 'Junior Secondary School'::academic_level_type 
WHERE academic_level = 'Junior School'::academic_level_type;
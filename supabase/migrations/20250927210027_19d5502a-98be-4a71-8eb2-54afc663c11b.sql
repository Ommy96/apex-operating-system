-- Add requested program values to the enum used by program_reports.program
-- Safe to run multiple times thanks to IF NOT EXISTS
ALTER TYPE program_type ADD VALUE IF NOT EXISTS 'Kibera Early dinner';
ALTER TYPE program_type ADD VALUE IF NOT EXISTS 'Kawangware Lunch Hour';
ALTER TYPE program_type ADD VALUE IF NOT EXISTS 'Kibera Kipawa Sato';
ALTER TYPE program_type ADD VALUE IF NOT EXISTS 'Kawangware Kipawa Sato';
ALTER TYPE program_type ADD VALUE IF NOT EXISTS 'Self Empowerment';
ALTER TYPE program_type ADD VALUE IF NOT EXISTS 'Support Groups';
ALTER TYPE program_type ADD VALUE IF NOT EXISTS 'Family Adoption';
ALTER TYPE program_type ADD VALUE IF NOT EXISTS 'Medical';
ALTER TYPE program_type ADD VALUE IF NOT EXISTS 'Education';
ALTER TYPE program_type ADD VALUE IF NOT EXISTS 'Rongai Sunday Feeding';
ALTER TYPE program_type ADD VALUE IF NOT EXISTS 'Kawangware Sunday Feeding';
ALTER TYPE program_type ADD VALUE IF NOT EXISTS 'Kibera Sunday Feeding';
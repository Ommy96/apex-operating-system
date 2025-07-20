-- Add contact field for team leader in support groups
ALTER TABLE public.support_groups 
ADD COLUMN team_leader_contact text;
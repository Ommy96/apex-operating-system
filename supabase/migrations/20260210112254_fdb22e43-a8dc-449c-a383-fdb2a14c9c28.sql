
-- Add program_id to beneficiary_donors to link donors to specific programs
ALTER TABLE public.beneficiary_donors
ADD COLUMN program_id uuid REFERENCES public.programs(id) ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX idx_beneficiary_donors_program_id ON public.beneficiary_donors(program_id);

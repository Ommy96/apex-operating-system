-- Add donor and donation received fields to children table
ALTER TABLE public.children 
ADD COLUMN donor TEXT,
ADD COLUMN donation_received_ksh DECIMAL(10,2);

-- Add comment for clarity
COMMENT ON COLUMN public.children.donor IS 'Donor source for the child';
COMMENT ON COLUMN public.children.donation_received_ksh IS 'Amount of donation received in Kenyan Shillings';
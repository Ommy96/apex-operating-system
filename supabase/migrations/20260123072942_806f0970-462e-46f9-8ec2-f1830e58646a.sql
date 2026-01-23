-- Phase 1: Add service flags and inactivity tracking to children table

-- Add service flags for transport, shopping, and home-based care
ALTER TABLE public.children 
ADD COLUMN IF NOT EXISTS receives_transport BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS receives_shopping BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS receives_hbc BOOLEAN DEFAULT false;

-- Add inactivity tracking columns
ALTER TABLE public.children 
ADD COLUMN IF NOT EXISTS inactive_reason TEXT,
ADD COLUMN IF NOT EXISTS inactive_date DATE;

-- Add index for quick filtering by service type
CREATE INDEX IF NOT EXISTS idx_children_services ON public.children (receives_transport, receives_shopping, receives_hbc) WHERE status = 'active';

-- Add comment for documentation
COMMENT ON COLUMN public.children.receives_transport IS 'Whether child receives school transport support';
COMMENT ON COLUMN public.children.receives_shopping IS 'Whether child receives shopping support';
COMMENT ON COLUMN public.children.receives_hbc IS 'Whether child receives home-based care';
COMMENT ON COLUMN public.children.inactive_reason IS 'Reason for marking child as inactive';
COMMENT ON COLUMN public.children.inactive_date IS 'Date when child was marked inactive';
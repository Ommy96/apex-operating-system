-- Create transport_records table for managing school transport per term
CREATE TABLE public.transport_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  child_id UUID NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  term TEXT NOT NULL CHECK (term IN ('Term 1', 'Term 2', 'Term 3')),
  year INTEGER NOT NULL,
  receives_transport BOOLEAN NOT NULL DEFAULT true,
  receives_shopping BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(child_id, term, year)
);

-- Enable Row Level Security
ALTER TABLE public.transport_records ENABLE ROW LEVEL SECURITY;

-- Create policies for transport records
CREATE POLICY "Users can view transport records"
ON public.transport_records
FOR SELECT
USING (true);

CREATE POLICY "Admin and management can create transport records"
ON public.transport_records
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'management')
  )
);

CREATE POLICY "Admin and management can update transport records"
ON public.transport_records
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'management')
  )
);

CREATE POLICY "Admin can delete transport records"
ON public.transport_records
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_transport_records_updated_at
BEFORE UPDATE ON public.transport_records
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster queries
CREATE INDEX idx_transport_records_child_id ON public.transport_records(child_id);
CREATE INDEX idx_transport_records_term_year ON public.transport_records(term, year);
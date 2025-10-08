-- Add term column to activities table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'activities' 
    AND column_name = 'term'
  ) THEN
    ALTER TABLE public.activities ADD COLUMN term TEXT;
  END IF;
END $$;

-- Migrate existing term data from description to term column for academic performance records
UPDATE public.activities
SET term = (
  SELECT CASE 
    WHEN description ~ 'Term: (Term [123])' THEN 
      substring(description from 'Term: (Term [123])')
    ELSE NULL
  END
)
WHERE title LIKE '%Academic Performance%' 
  AND term IS NULL
  AND description ~ 'Term: (Term [123])';

-- Create an index on term for better query performance
CREATE INDEX IF NOT EXISTS idx_activities_term ON public.activities(term) WHERE term IS NOT NULL;
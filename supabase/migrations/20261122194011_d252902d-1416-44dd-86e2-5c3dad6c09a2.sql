UPDATE public.org_beneficiary_config AS c
SET custom_fields = (
  SELECT COALESCE(jsonb_agg(field ORDER BY position), '[]'::jsonb)
  FROM jsonb_array_elements(c.custom_fields) WITH ORDINALITY AS fields(field, position)
  WHERE COALESCE(field ->> 'name', '') NOT IN ('current_school', 'current_grade', 'attendance_rate', 'last_term_score', 'sponsorship_status')
), updated_at = now()
WHERE jsonb_typeof(c.custom_fields) = 'array'
AND EXISTS (
  SELECT 1 FROM jsonb_array_elements(c.custom_fields) AS fields(field)
  WHERE field ->> 'name' IN ('current_school', 'current_grade', 'attendance_rate', 'last_term_score', 'sponsorship_status')
);
NOTIFY pgrst, 'reload schema';
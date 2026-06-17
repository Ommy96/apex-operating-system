-- Schema cache reload following the structural cleanup pass.
-- This pass is mostly UI/routing changes; this NOTIFY is defensive
-- in case any sub-component query was implicitly relying on a previously-cached schema state.
NOTIFY pgrst, 'reload schema';
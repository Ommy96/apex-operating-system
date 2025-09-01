-- Enable realtime for alumni table
ALTER TABLE public.alumni REPLICA IDENTITY FULL;

-- Add alumni table to realtime publication
ALTER publication supabase_realtime ADD TABLE public.alumni;
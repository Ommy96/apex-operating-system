-- Enable real-time for profiles table to support live role change notifications
REPLICA IDENTITY FULL;

-- Add profiles table to real-time publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;

-- Also add audit_logs to real-time publication for admin monitoring
ALTER PUBLICATION supabase_realtime ADD TABLE public.audit_logs;
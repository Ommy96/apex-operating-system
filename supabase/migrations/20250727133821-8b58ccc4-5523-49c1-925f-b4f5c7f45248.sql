-- Create rate limiting table for role changes
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  attempt_count INTEGER NOT NULL DEFAULT 1,
  window_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  blocked_until TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on rate limits table
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Create policies for rate limits
CREATE POLICY "Users can view their own rate limits" 
ON public.rate_limits 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "System can manage rate limits" 
ON public.rate_limits 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX idx_rate_limits_user_action ON public.rate_limits(user_id, action_type);
CREATE INDEX idx_rate_limits_window ON public.rate_limits(window_start);

-- Create rate limiting function
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  user_id_param UUID,
  action_type_param TEXT,
  max_attempts INTEGER DEFAULT 5,
  window_minutes INTEGER DEFAULT 60
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  current_window TIMESTAMP WITH TIME ZONE;
  current_count INTEGER;
  existing_record RECORD;
BEGIN
  current_window := date_trunc('hour', now()) + 
    (EXTRACT(EPOCH FROM (now() - date_trunc('hour', now()))) / (window_minutes * 60))::INTEGER * (window_minutes * 60) * INTERVAL '1 second';
  
  -- Get existing rate limit record for this user and action
  SELECT * INTO existing_record
  FROM public.rate_limits
  WHERE user_id = user_id_param 
    AND action_type = action_type_param
    AND window_start = current_window;
  
  -- Check if user is currently blocked
  IF existing_record.blocked_until IS NOT NULL AND existing_record.blocked_until > now() THEN
    RETURN FALSE;
  END IF;
  
  -- If no existing record, create one
  IF existing_record IS NULL THEN
    INSERT INTO public.rate_limits (user_id, action_type, window_start, attempt_count)
    VALUES (user_id_param, action_type_param, current_window, 1);
    RETURN TRUE;
  END IF;
  
  -- If within limits, increment count
  IF existing_record.attempt_count < max_attempts THEN
    UPDATE public.rate_limits 
    SET attempt_count = attempt_count + 1,
        updated_at = now()
    WHERE id = existing_record.id;
    RETURN TRUE;
  END IF;
  
  -- If exceeded limits, block user
  UPDATE public.rate_limits 
  SET blocked_until = now() + (window_minutes * 2) * INTERVAL '1 minute',
      updated_at = now()
  WHERE id = existing_record.id;
  
  RETURN FALSE;
END;
$$;

-- Add trigger to update timestamps
CREATE TRIGGER update_rate_limits_updated_at
  BEFORE UPDATE ON public.rate_limits
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
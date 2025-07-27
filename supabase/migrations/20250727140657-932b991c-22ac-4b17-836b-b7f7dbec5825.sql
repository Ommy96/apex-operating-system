-- Phase 4: Advanced Features - Approval workflows and enhanced audit trail

-- Create approval_requests table for workflow management
CREATE TABLE public.approval_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  request_type text NOT NULL,
  requester_id uuid REFERENCES auth.users(id) NOT NULL,
  approver_id uuid REFERENCES auth.users(id),
  target_entity_type text NOT NULL,
  target_entity_id uuid NOT NULL,
  requested_changes jsonb NOT NULL DEFAULT '{}'::jsonb,
  current_values jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  reason text,
  reviewer_comments text,
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '7 days'),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  approved_at timestamp with time zone,
  rejected_at timestamp with time zone
);

-- Enable RLS on approval_requests
ALTER TABLE public.approval_requests ENABLE ROW LEVEL SECURITY;

-- Create policies for approval_requests
CREATE POLICY "Users can view their own requests" 
ON public.approval_requests 
FOR SELECT 
USING (requester_id = auth.uid());

CREATE POLICY "Admins can view all approval requests" 
ON public.approval_requests 
FOR SELECT 
USING (get_user_role(auth.uid()) = 'admin'::user_role);

CREATE POLICY "Users can create approval requests" 
ON public.approval_requests 
FOR INSERT 
WITH CHECK (requester_id = auth.uid());

CREATE POLICY "Admins can update approval requests" 
ON public.approval_requests 
FOR UPDATE 
USING (get_user_role(auth.uid()) = 'admin'::user_role);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_approval_requests_updated_at
BEFORE UPDATE ON public.approval_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enhanced audit logs with more detailed tracking
CREATE OR REPLACE FUNCTION public.log_comprehensive_audit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  action_type text;
  user_agent_info text;
  ip_address_info text;
BEGIN
  -- Determine action type
  IF TG_OP = 'INSERT' THEN
    action_type := 'created';
  ELSIF TG_OP = 'UPDATE' THEN
    action_type := 'updated';
  ELSIF TG_OP = 'DELETE' THEN
    action_type := 'deleted';
  END IF;

  -- Get user agent and IP from current request (simplified for this example)
  user_agent_info := current_setting('request.headers', true)::json->>'user-agent';
  ip_address_info := current_setting('request.headers', true)::json->>'x-forwarded-for';

  -- Insert comprehensive audit log
  INSERT INTO public.audit_logs (
    event_type,
    entity_type,
    entity_id,
    user_id,
    old_values,
    new_values,
    user_agent,
    ip_address,
    metadata
  ) VALUES (
    action_type,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    auth.uid(),
    CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) WHEN TG_OP = 'UPDATE' THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP = 'INSERT' THEN to_jsonb(NEW) WHEN TG_OP = 'UPDATE' THEN to_jsonb(NEW) ELSE NULL END,
    user_agent_info,
    ip_address_info,
    jsonb_build_object(
      'operation', TG_OP,
      'table', TG_TABLE_NAME,
      'timestamp', now(),
      'session_id', current_setting('application_name', true)
    )
  );

  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- Add comprehensive audit triggers to key tables
CREATE TRIGGER audit_children_changes
AFTER INSERT OR UPDATE OR DELETE ON public.children
FOR EACH ROW EXECUTE FUNCTION public.log_comprehensive_audit();

CREATE TRIGGER audit_programs_changes
AFTER INSERT OR UPDATE OR DELETE ON public.programs
FOR EACH ROW EXECUTE FUNCTION public.log_comprehensive_audit();

CREATE TRIGGER audit_activities_changes
AFTER INSERT OR UPDATE OR DELETE ON public.activities
FOR EACH ROW EXECUTE FUNCTION public.log_comprehensive_audit();

-- Function to auto-approve low-risk requests
CREATE OR REPLACE FUNCTION public.auto_approve_request(request_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  request_record public.approval_requests;
BEGIN
  -- Get the request
  SELECT * INTO request_record FROM public.approval_requests WHERE id = request_id;
  
  -- Auto-approve certain low-risk request types
  IF request_record.request_type IN ('profile_update', 'minor_edit') AND request_record.priority = 'low' THEN
    UPDATE public.approval_requests 
    SET status = 'approved',
        approved_at = now(),
        approver_id = auth.uid(),
        reviewer_comments = 'Auto-approved: Low risk request'
    WHERE id = request_id;
    
    RETURN true;
  END IF;
  
  RETURN false;
END;
$function$;

-- Create notification triggers for approval workflow
CREATE OR REPLACE FUNCTION public.notify_approval_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  -- Log the approval request creation in audit logs
  INSERT INTO public.audit_logs (
    event_type,
    entity_type,
    entity_id,
    user_id,
    new_values,
    metadata
  ) VALUES (
    'approval_request_created',
    'approval_request',
    NEW.id,
    NEW.requester_id,
    to_jsonb(NEW),
    jsonb_build_object(
      'request_type', NEW.request_type,
      'priority', NEW.priority,
      'expires_at', NEW.expires_at
    )
  );
  
  RETURN NEW;
END;
$function$;

CREATE TRIGGER approval_request_notification
AFTER INSERT ON public.approval_requests
FOR EACH ROW EXECUTE FUNCTION public.notify_approval_request();

-- Enable realtime for approval_requests
ALTER TABLE public.approval_requests REPLICA IDENTITY FULL;
ALTER publication supabase_realtime ADD TABLE public.approval_requests;
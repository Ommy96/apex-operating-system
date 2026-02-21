
-- Volunteers table
CREATE TABLE public.volunteers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  skills TEXT[] DEFAULT '{}',
  availability TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  start_date DATE,
  end_date DATE,
  notes TEXT,
  photo_url TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Volunteer assignments
CREATE TABLE public.volunteer_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  volunteer_id UUID NOT NULL REFERENCES public.volunteers(id) ON DELETE CASCADE,
  program_id UUID REFERENCES public.programs(id) ON DELETE SET NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  role_title TEXT NOT NULL,
  description TEXT,
  start_date DATE NOT NULL,
  end_date DATE,
  status TEXT NOT NULL DEFAULT 'active',
  supervisor_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Volunteer hours log
CREATE TABLE public.volunteer_hours (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  volunteer_id UUID NOT NULL REFERENCES public.volunteers(id) ON DELETE CASCADE,
  assignment_id UUID REFERENCES public.volunteer_assignments(id) ON DELETE SET NULL,
  log_date DATE NOT NULL,
  hours NUMERIC(5,2) NOT NULL,
  description TEXT,
  verified_by UUID,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.volunteers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.volunteer_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.volunteer_hours ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "View volunteers in org" ON public.volunteers
  FOR SELECT USING (public.user_belongs_to_org(auth.uid(), organization_id));
CREATE POLICY "Manage volunteers in org" ON public.volunteers
  FOR ALL USING (
    public.user_belongs_to_org(auth.uid(), organization_id)
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'management'))
  );

CREATE POLICY "View assignments in org" ON public.volunteer_assignments
  FOR SELECT USING (public.user_belongs_to_org(auth.uid(), organization_id));
CREATE POLICY "Manage assignments in org" ON public.volunteer_assignments
  FOR ALL USING (
    public.user_belongs_to_org(auth.uid(), organization_id)
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'management'))
  );

CREATE POLICY "View hours in org" ON public.volunteer_hours
  FOR SELECT USING (public.user_belongs_to_org(auth.uid(), organization_id));
CREATE POLICY "Manage hours in org" ON public.volunteer_hours
  FOR ALL USING (
    public.user_belongs_to_org(auth.uid(), organization_id)
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'management'))
  );

-- Indexes
CREATE INDEX idx_volunteers_org ON public.volunteers(organization_id);
CREATE INDEX idx_volunteer_assignments_volunteer ON public.volunteer_assignments(volunteer_id);
CREATE INDEX idx_volunteer_hours_volunteer ON public.volunteer_hours(volunteer_id);
CREATE INDEX idx_volunteer_hours_date ON public.volunteer_hours(log_date);

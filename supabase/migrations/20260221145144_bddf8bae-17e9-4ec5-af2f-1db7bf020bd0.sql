
-- Regions table
CREATE TABLE public.regions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  country TEXT,
  county TEXT,
  coordinates JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Branches table
CREATE TABLE public.branches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  region_id UUID REFERENCES public.regions(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  code TEXT,
  address TEXT,
  phone TEXT,
  email TEXT,
  manager_name TEXT,
  manager_user_id UUID,
  is_active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Branch staff assignments
CREATE TABLE public.branch_staff (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT DEFAULT 'staff',
  is_primary BOOLEAN DEFAULT false,
  assigned_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branch_staff ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "View regions in org" ON public.regions
  FOR SELECT USING (public.user_belongs_to_org(auth.uid(), organization_id));
CREATE POLICY "Manage regions" ON public.regions
  FOR ALL USING (
    public.user_belongs_to_org(auth.uid(), organization_id)
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'management'))
  );

CREATE POLICY "View branches in org" ON public.branches
  FOR SELECT USING (public.user_belongs_to_org(auth.uid(), organization_id));
CREATE POLICY "Manage branches" ON public.branches
  FOR ALL USING (
    public.user_belongs_to_org(auth.uid(), organization_id)
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'management'))
  );

CREATE POLICY "View branch staff in org" ON public.branch_staff
  FOR SELECT USING (public.user_belongs_to_org(auth.uid(), organization_id));
CREATE POLICY "Manage branch staff" ON public.branch_staff
  FOR ALL USING (
    public.user_belongs_to_org(auth.uid(), organization_id)
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'management'))
  );

-- Indexes
CREATE INDEX idx_regions_org ON public.regions(organization_id);
CREATE INDEX idx_branches_org ON public.branches(organization_id);
CREATE INDEX idx_branches_region ON public.branches(region_id);
CREATE INDEX idx_branch_staff_branch ON public.branch_staff(branch_id);
CREATE INDEX idx_branch_staff_user ON public.branch_staff(user_id);

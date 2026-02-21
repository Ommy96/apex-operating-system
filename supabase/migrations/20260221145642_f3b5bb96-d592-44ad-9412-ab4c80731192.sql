
-- Partner organizations
CREATE TABLE public.partner_organizations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  partner_name TEXT NOT NULL,
  partner_type TEXT NOT NULL DEFAULT 'implementing',
  contact_person TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  website TEXT,
  description TEXT,
  country TEXT,
  address TEXT,
  partnership_start DATE,
  partnership_end DATE,
  status TEXT NOT NULL DEFAULT 'active',
  agreement_url TEXT,
  metadata JSONB DEFAULT '{}',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Shared resources between partners
CREATE TABLE public.partner_shared_resources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  partner_id UUID NOT NULL REFERENCES public.partner_organizations(id) ON DELETE CASCADE,
  resource_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  value_amount NUMERIC(12,2),
  currency TEXT DEFAULT 'KES',
  direction TEXT NOT NULL DEFAULT 'received',
  start_date DATE,
  end_date DATE,
  status TEXT DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Joint activities
CREATE TABLE public.partner_activities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  partner_id UUID NOT NULL REFERENCES public.partner_organizations(id) ON DELETE CASCADE,
  program_id UUID REFERENCES public.programs(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  activity_date DATE,
  location TEXT,
  status TEXT DEFAULT 'planned',
  outcome TEXT,
  participants_count INTEGER,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.partner_organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_shared_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_activities ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "View partners in org" ON public.partner_organizations
  FOR SELECT USING (public.user_belongs_to_org(auth.uid(), organization_id));
CREATE POLICY "Manage partners" ON public.partner_organizations
  FOR ALL USING (
    public.user_belongs_to_org(auth.uid(), organization_id)
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'management'))
  );

CREATE POLICY "View shared resources in org" ON public.partner_shared_resources
  FOR SELECT USING (public.user_belongs_to_org(auth.uid(), organization_id));
CREATE POLICY "Manage shared resources" ON public.partner_shared_resources
  FOR ALL USING (
    public.user_belongs_to_org(auth.uid(), organization_id)
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'management'))
  );

CREATE POLICY "View partner activities in org" ON public.partner_activities
  FOR SELECT USING (public.user_belongs_to_org(auth.uid(), organization_id));
CREATE POLICY "Manage partner activities" ON public.partner_activities
  FOR ALL USING (
    public.user_belongs_to_org(auth.uid(), organization_id)
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'management'))
  );

-- Indexes
CREATE INDEX idx_partner_orgs_org ON public.partner_organizations(organization_id);
CREATE INDEX idx_partner_resources_partner ON public.partner_shared_resources(partner_id);
CREATE INDEX idx_partner_activities_partner ON public.partner_activities(partner_id);

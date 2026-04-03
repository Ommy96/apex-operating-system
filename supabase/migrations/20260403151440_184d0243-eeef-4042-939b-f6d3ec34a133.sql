
-- Procurement: vendors
CREATE TABLE public.vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id),
  name TEXT NOT NULL,
  contact_person TEXT,
  phone TEXT,
  email TEXT,
  category TEXT DEFAULT 'general' CHECK (category IN ('supplies','services','equipment','construction','transport','general')),
  kra_pin TEXT,
  registration_number TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active','inactive','blacklisted')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can manage vendors" ON public.vendors FOR ALL TO authenticated
  USING (public.user_belongs_to_org(auth.uid(), org_id))
  WITH CHECK (public.user_belongs_to_org(auth.uid(), org_id));

-- Procurement: purchase requisitions
CREATE TABLE public.purchase_requisitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id),
  project_id UUID REFERENCES public.projects(id),
  grant_id UUID REFERENCES public.grants(id),
  title TEXT NOT NULL,
  requested_by UUID REFERENCES public.profiles(user_id),
  items JSONB DEFAULT '[]',
  total_amount DECIMAL(14,2) DEFAULT 0,
  currency CHAR(3) DEFAULT 'KES',
  justification TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft','submitted','approved','rejected','ordered')),
  approved_by UUID REFERENCES public.profiles(user_id),
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
ALTER TABLE public.purchase_requisitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can manage requisitions" ON public.purchase_requisitions FOR ALL TO authenticated
  USING (public.user_belongs_to_org(auth.uid(), org_id))
  WITH CHECK (public.user_belongs_to_org(auth.uid(), org_id));

-- Procurement: purchase orders
CREATE TABLE public.purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id),
  requisition_id UUID REFERENCES public.purchase_requisitions(id),
  vendor_id UUID REFERENCES public.vendors(id),
  po_number TEXT UNIQUE,
  items JSONB DEFAULT '[]',
  total_amount DECIMAL(14,2) DEFAULT 0,
  currency CHAR(3) DEFAULT 'KES',
  delivery_date DATE,
  delivery_location TEXT,
  status TEXT DEFAULT 'issued' CHECK (status IN ('issued','delivered','cancelled','partial')),
  budget_line_item_id UUID,
  issued_at TIMESTAMPTZ DEFAULT now(),
  delivered_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can manage POs" ON public.purchase_orders FOR ALL TO authenticated
  USING (public.user_belongs_to_org(auth.uid(), org_id))
  WITH CHECK (public.user_belongs_to_org(auth.uid(), org_id));

-- Platform announcements
CREATE TABLE public.platform_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  type TEXT DEFAULT 'info' CHECK (type IN ('info','warning','critical','feature')),
  target TEXT DEFAULT 'all' CHECK (target IN ('all','starter','professional','enterprise')),
  created_by UUID REFERENCES auth.users(id),
  published_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.platform_announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone authenticated can read announcements" ON public.platform_announcements FOR SELECT TO authenticated USING (true);
CREATE POLICY "Super admins can create announcements" ON public.platform_announcements FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Platform announcement reads
CREATE TABLE public.platform_announcement_reads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id UUID REFERENCES public.platform_announcements(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(announcement_id, user_id)
);
ALTER TABLE public.platform_announcement_reads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own reads" ON public.platform_announcement_reads FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- GIS columns on beneficiaries
ALTER TABLE public.beneficiaries ADD COLUMN IF NOT EXISTS latitude DECIMAL(9,6);
ALTER TABLE public.beneficiaries ADD COLUMN IF NOT EXISTS longitude DECIMAL(9,6);

-- GIS columns on projects
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS latitude DECIMAL(9,6);
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS longitude DECIMAL(9,6);

-- Super admin bypass policies for new tables
CREATE POLICY "Super admin vendors" ON public.vendors FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Super admin requisitions" ON public.purchase_requisitions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Super admin POs" ON public.purchase_orders FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

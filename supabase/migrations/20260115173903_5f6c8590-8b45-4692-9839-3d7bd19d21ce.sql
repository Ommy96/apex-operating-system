-- Phase 1: Create Organizations Infrastructure

-- Create organizations table
CREATE TABLE public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    logo_url TEXT,
    description TEXT,
    website TEXT,
    email TEXT,
    phone TEXT,
    address TEXT,
    country TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    settings JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create organization_members table (links users to organizations with roles)
CREATE TABLE public.organization_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'manager', 'member')),
    is_primary BOOLEAN NOT NULL DEFAULT false,
    invited_by UUID REFERENCES auth.users(id),
    joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (organization_id, user_id)
);

-- Create indexes for performance
CREATE INDEX idx_organizations_slug ON public.organizations(slug);
CREATE INDEX idx_organizations_is_active ON public.organizations(is_active);
CREATE INDEX idx_org_members_org_id ON public.organization_members(organization_id);
CREATE INDEX idx_org_members_user_id ON public.organization_members(user_id);
CREATE INDEX idx_org_members_is_primary ON public.organization_members(is_primary);

-- Enable RLS
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

-- Helper function: Get user's primary organization ID
CREATE OR REPLACE FUNCTION public.get_user_organization_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT organization_id 
    FROM public.organization_members 
    WHERE user_id = _user_id 
    AND is_primary = true
    LIMIT 1;
$$;

-- Helper function: Check if user belongs to an organization
CREATE OR REPLACE FUNCTION public.user_belongs_to_org(_user_id UUID, _org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 
        FROM public.organization_members 
        WHERE user_id = _user_id 
        AND organization_id = _org_id
    );
$$;

-- Helper function: Get user's role within an organization
CREATE OR REPLACE FUNCTION public.get_org_member_role(_user_id UUID, _org_id UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT role 
    FROM public.organization_members 
    WHERE user_id = _user_id 
    AND organization_id = _org_id
    LIMIT 1;
$$;

-- RLS Policies for organizations table
CREATE POLICY "Users can view organizations they belong to"
ON public.organizations
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.organization_members 
        WHERE organization_members.organization_id = organizations.id 
        AND organization_members.user_id = auth.uid()
    )
);

CREATE POLICY "Organization owners and admins can update their org"
ON public.organizations
FOR UPDATE
USING (
    public.get_org_member_role(auth.uid(), id) IN ('owner', 'admin')
);

CREATE POLICY "Only super admins can insert organizations"
ON public.organizations
FOR INSERT
WITH CHECK (
    public.get_user_role(auth.uid()) = 'admin'::user_role
);

CREATE POLICY "Only super admins can delete organizations"
ON public.organizations
FOR DELETE
USING (
    public.get_user_role(auth.uid()) = 'admin'::user_role
);

-- RLS Policies for organization_members table
CREATE POLICY "Users can view members of their organizations"
ON public.organization_members
FOR SELECT
USING (
    public.user_belongs_to_org(auth.uid(), organization_id)
);

CREATE POLICY "Org owners and admins can insert members"
ON public.organization_members
FOR INSERT
WITH CHECK (
    public.get_org_member_role(auth.uid(), organization_id) IN ('owner', 'admin')
    OR public.get_user_role(auth.uid()) = 'admin'::user_role
);

CREATE POLICY "Org owners and admins can update members"
ON public.organization_members
FOR UPDATE
USING (
    public.get_org_member_role(auth.uid(), organization_id) IN ('owner', 'admin')
    OR public.get_user_role(auth.uid()) = 'admin'::user_role
);

CREATE POLICY "Org owners can delete members"
ON public.organization_members
FOR DELETE
USING (
    public.get_org_member_role(auth.uid(), organization_id) = 'owner'
    OR public.get_user_role(auth.uid()) = 'admin'::user_role
);

-- Add updated_at trigger for organizations
CREATE TRIGGER update_organizations_updated_at
BEFORE UPDATE ON public.organizations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add updated_at trigger for organization_members
CREATE TRIGGER update_org_members_updated_at
BEFORE UPDATE ON public.organization_members
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert Heart to Heart Organization as the first organization
INSERT INTO public.organizations (
    id,
    name,
    slug,
    description,
    is_active
) VALUES (
    'a0000000-0000-0000-0000-000000000001',
    'Heart to Heart Organization',
    'heart-to-heart',
    'Supporting children and families through comprehensive community programs',
    true
);
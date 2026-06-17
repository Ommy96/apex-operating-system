
-- Drop old activities + attendance (cascade)
DROP TABLE IF EXISTS public.activity_attendance CASCADE;
DROP TABLE IF EXISTS public.activities CASCADE;

-- Enums
DO $$ BEGIN
  CREATE TYPE public.activity_type AS ENUM ('event', 'disbursement');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.activity_status AS ENUM ('planned', 'in_progress', 'completed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.disbursement_kind AS ENUM (
    'cash', 'school_fees', 'textbook', 'uniform', 'food_kit',
    'medical', 'agricultural_input', 'hygiene_kit', 'transport',
    'rent', 'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 1) activities
CREATE TABLE public.activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  program_id UUID REFERENCES public.programs(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  type public.activity_type NOT NULL,
  status public.activity_status NOT NULL DEFAULT 'planned',
  scheduled_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  location TEXT,
  county TEXT,
  sub_county TEXT,
  facilitator_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  facilitator_name TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.activities TO authenticated;
GRANT ALL ON public.activities TO service_role;

ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "activities_select_org" ON public.activities
  FOR SELECT TO authenticated
  USING (public.user_belongs_to_org(auth.uid(), organization_id) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "activities_insert_org" ON public.activities
  FOR INSERT TO authenticated
  WITH CHECK (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "activities_update_org" ON public.activities
  FOR UPDATE TO authenticated
  USING (public.user_belongs_to_org(auth.uid(), organization_id))
  WITH CHECK (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "activities_delete_org" ON public.activities
  FOR DELETE TO authenticated
  USING (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE INDEX activities_org_project_idx ON public.activities (organization_id, project_id);
CREATE INDEX activities_org_status_sched_idx ON public.activities (organization_id, status, scheduled_at);

CREATE TRIGGER trg_activities_updated_at
  BEFORE UPDATE ON public.activities
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) activity_participants
CREATE TABLE public.activity_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  activity_id UUID NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
  beneficiary_id UUID NOT NULL REFERENCES public.beneficiaries(id) ON DELETE CASCADE,
  attended BOOLEAN NOT NULL DEFAULT false,
  arrival_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (activity_id, beneficiary_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.activity_participants TO authenticated;
GRANT ALL ON public.activity_participants TO service_role;

ALTER TABLE public.activity_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "activity_participants_select_org" ON public.activity_participants
  FOR SELECT TO authenticated
  USING (public.user_belongs_to_org(auth.uid(), organization_id) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "activity_participants_insert_org" ON public.activity_participants
  FOR INSERT TO authenticated
  WITH CHECK (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "activity_participants_update_org" ON public.activity_participants
  FOR UPDATE TO authenticated
  USING (public.user_belongs_to_org(auth.uid(), organization_id))
  WITH CHECK (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "activity_participants_delete_org" ON public.activity_participants
  FOR DELETE TO authenticated
  USING (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE INDEX activity_participants_org_ben_idx ON public.activity_participants (organization_id, beneficiary_id);

-- 3) activity_disbursements
CREATE TABLE public.activity_disbursements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  activity_id UUID NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
  beneficiary_id UUID NOT NULL REFERENCES public.beneficiaries(id) ON DELETE CASCADE,
  kind public.disbursement_kind NOT NULL,
  quantity NUMERIC,
  unit TEXT,
  monetary_value NUMERIC,
  currency TEXT,
  reference_no TEXT,
  received_at TIMESTAMPTZ,
  receipt_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.activity_disbursements TO authenticated;
GRANT ALL ON public.activity_disbursements TO service_role;

ALTER TABLE public.activity_disbursements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "activity_disbursements_select_org" ON public.activity_disbursements
  FOR SELECT TO authenticated
  USING (public.user_belongs_to_org(auth.uid(), organization_id) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "activity_disbursements_insert_org" ON public.activity_disbursements
  FOR INSERT TO authenticated
  WITH CHECK (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "activity_disbursements_update_org" ON public.activity_disbursements
  FOR UPDATE TO authenticated
  USING (public.user_belongs_to_org(auth.uid(), organization_id))
  WITH CHECK (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "activity_disbursements_delete_org" ON public.activity_disbursements
  FOR DELETE TO authenticated
  USING (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE INDEX activity_disbursements_org_ben_idx ON public.activity_disbursements (organization_id, beneficiary_id);

NOTIFY pgrst, 'reload schema';

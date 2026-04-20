
DROP TABLE IF EXISTS public.risk_reviews CASCADE;

CREATE TABLE public.risk_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  risk_key TEXT NOT NULL,
  risk_category TEXT NOT NULL,
  risk_severity TEXT NOT NULL,
  risk_description TEXT,
  status TEXT NOT NULL DEFAULT 'reviewed',
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT risk_reviews_org_key_unique UNIQUE (organization_id, risk_key)
);

CREATE INDEX idx_risk_reviews_org ON public.risk_reviews(organization_id);
CREATE INDEX idx_risk_reviews_org_status ON public.risk_reviews(organization_id, status);

ALTER TABLE public.risk_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view their risk reviews"
  ON public.risk_reviews FOR SELECT
  TO authenticated
  USING (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Org members can create risk reviews"
  ON public.risk_reviews FOR INSERT
  TO authenticated
  WITH CHECK (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Org members can update their risk reviews"
  ON public.risk_reviews FOR UPDATE
  TO authenticated
  USING (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Org members can delete their risk reviews"
  ON public.risk_reviews FOR DELETE
  TO authenticated
  USING (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE TRIGGER trg_risk_reviews_updated
  BEFORE UPDATE ON public.risk_reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

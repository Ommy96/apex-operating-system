
-- 1) allocation_line_items table
CREATE TABLE IF NOT EXISTS public.allocation_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  allocation_id UUID NOT NULL REFERENCES public.allocations(id) ON DELETE CASCADE,
  need_type_id UUID REFERENCES public.need_types(id) ON DELETE SET NULL,
  package_item_id UUID REFERENCES public.sponsorship_package_items(id) ON DELETE SET NULL,
  beneficiary_id UUID REFERENCES public.beneficiaries(id) ON DELETE SET NULL,
  amount_native NUMERIC NOT NULL DEFAULT 0,
  native_currency TEXT,
  amount_base NUMERIC NOT NULL DEFAULT 0,
  base_currency TEXT,
  label TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.allocation_line_items TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.allocation_line_items TO authenticated;
GRANT ALL ON public.allocation_line_items TO service_role;

ALTER TABLE public.allocation_line_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members read alloc line items"
  ON public.allocation_line_items FOR SELECT
  USING (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "org members manage alloc line items"
  ON public.allocation_line_items FOR ALL
  USING (public.user_belongs_to_org(auth.uid(), organization_id))
  WITH CHECK (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE INDEX IF NOT EXISTS idx_ali_org ON public.allocation_line_items(organization_id);
CREATE INDEX IF NOT EXISTS idx_ali_alloc ON public.allocation_line_items(allocation_id);
CREATE INDEX IF NOT EXISTS idx_ali_need ON public.allocation_line_items(need_type_id);
CREATE INDEX IF NOT EXISTS idx_ali_ben ON public.allocation_line_items(beneficiary_id);

-- 2) Backfill sponsorship_package_items.need_type_id from item_type
UPDATE public.sponsorship_package_items spi
SET need_type_id = nt.id
FROM public.need_types nt
WHERE spi.need_type_id IS NULL
  AND nt.organization_id = spi.organization_id
  AND lower(nt.key) = lower(spi.item_type);

-- 3) View: unmet-needs funding gap per project / per beneficiary
CREATE OR REPLACE VIEW public.v_unmet_needs_gap AS
SELECT
  bn.organization_id,
  bn.beneficiary_id,
  b.project_id AS enrolled_project_id,
  bn.need_type_id,
  nt.label AS need_label,
  bn.status,
  COALESCE(bn.estimated_cost, nt.default_cost, 0) AS estimated_cost,
  COALESCE(bn.currency, nt.default_currency, 'KES') AS currency
FROM public.beneficiary_needs bn
LEFT JOIN public.need_types nt ON nt.id = bn.need_type_id
LEFT JOIN LATERAL (
  SELECT project_id FROM public.beneficiary_services
  WHERE beneficiary_id = bn.beneficiary_id AND status = 'active'
  ORDER BY created_at DESC LIMIT 1
) b ON true
WHERE bn.status IN ('open','partially_met');

GRANT SELECT ON public.v_unmet_needs_gap TO authenticated, service_role;

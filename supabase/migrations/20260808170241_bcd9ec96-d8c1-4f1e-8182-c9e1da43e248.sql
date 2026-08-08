
-- ============================================================
-- 1. Link sponsorship package items to need types
-- ============================================================
CREATE OR REPLACE FUNCTION public.tg_link_package_item_need_type()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_id uuid;
BEGIN
  IF NEW.need_type_id IS NULL AND NEW.item_label IS NOT NULL THEN
    SELECT nt.id INTO v_id
      FROM public.need_types nt
     WHERE nt.organization_id = NEW.organization_id
       AND (
         lower(trim(nt.label)) = lower(trim(NEW.item_label))
         OR lower(trim(nt.key))   = lower(regexp_replace(trim(NEW.item_label), '[^a-zA-Z0-9]+', '_', 'g'))
         OR lower(trim(nt.label)) LIKE lower(trim(NEW.item_label)) || '%'
         OR lower(trim(NEW.item_label)) LIKE lower(trim(nt.label)) || '%'
       )
     ORDER BY (lower(trim(nt.label)) = lower(trim(NEW.item_label))) DESC, nt.sort_order
     LIMIT 1;
    NEW.need_type_id := v_id;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_link_package_item_need_type ON public.sponsorship_package_items;
CREATE TRIGGER trg_link_package_item_need_type
  BEFORE INSERT OR UPDATE ON public.sponsorship_package_items
  FOR EACH ROW EXECUTE FUNCTION public.tg_link_package_item_need_type();

-- Backfill existing package items
UPDATE public.sponsorship_package_items spi
   SET need_type_id = nt.id
  FROM public.need_types nt
 WHERE spi.need_type_id IS NULL
   AND nt.organization_id = spi.organization_id
   AND (
     lower(trim(nt.label)) = lower(trim(spi.item_label))
     OR lower(trim(nt.label)) LIKE lower(trim(spi.item_label)) || '%'
     OR lower(trim(spi.item_label)) LIKE lower(trim(nt.label)) || '%'
   );

-- ============================================================
-- 2. Smarter need-status recomputation
-- ============================================================
CREATE OR REPLACE FUNCTION public.recompute_need_status(p_beneficiary_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
  v_funded NUMERIC;
  v_has_enrollment BOOLEAN;
  v_new_status TEXT;
  v_auto_need_count INT;
  v_unattributed NUMERIC := 0;
  v_sole_need_id uuid;
BEGIN
  IF p_beneficiary_id IS NULL THEN RETURN; END IF;

  SELECT COUNT(*), (ARRAY_AGG(id ORDER BY created_at, id))[1]
    INTO v_auto_need_count, v_sole_need_id
    FROM public.beneficiary_needs
   WHERE beneficiary_id = p_beneficiary_id
     AND status_source = 'auto';

  -- Sponsorship money that cannot be attributed to any specific need,
  -- because the donation has no package or the package has no need links.
  SELECT COALESCE(SUM(bd.amount_received), 0)
    INTO v_unattributed
    FROM public.beneficiary_donors bd
   WHERE bd.beneficiary_id = p_beneficiary_id
     AND NOT EXISTS (
       SELECT 1 FROM public.sponsorship_package_items spi
        WHERE spi.package_id = bd.sponsorship_package_id
          AND spi.need_type_id IS NOT NULL
     );

  FOR r IN
    SELECT id, need_type_id, estimated_cost
      FROM public.beneficiary_needs
     WHERE beneficiary_id = p_beneficiary_id
       AND status_source = 'auto'
  LOOP
    -- (a) Explicit allocation line items attributed to this need type
    SELECT COALESCE(SUM(COALESCE(amount_base, amount_native, 0)), 0)
      INTO v_funded
      FROM public.allocation_line_items
     WHERE beneficiary_id = p_beneficiary_id
       AND need_type_id  = r.need_type_id;

    -- (b) Sponsorship coverage, split pro-rata across the package's needs
    v_funded := v_funded + COALESCE((
      SELECT SUM(
        bd.amount_received
        * (COALESCE(spi.cost, 0) / NULLIF(pk.total_cost, 0))
      )
        FROM public.beneficiary_donors bd
        JOIN public.sponsorship_package_items spi
          ON spi.package_id = bd.sponsorship_package_id
         AND spi.need_type_id = r.need_type_id
        JOIN (
          SELECT package_id, SUM(COALESCE(cost, 0)) AS total_cost
            FROM public.sponsorship_package_items
           WHERE need_type_id IS NOT NULL
           GROUP BY package_id
        ) pk ON pk.package_id = bd.sponsorship_package_id
       WHERE bd.beneficiary_id = p_beneficiary_id
    ), 0);

    -- (c) Fallback: free-amount sponsorship with exactly one auto need
    IF v_unattributed > 0 AND v_auto_need_count = 1 AND r.id = v_sole_need_id THEN
      v_funded := v_funded + v_unattributed;
    END IF;

    -- Active enrolment on a project that addresses this need
    SELECT EXISTS (
      SELECT 1
        FROM public.beneficiary_services bs
        JOIN public.projects p ON p.id = bs.project_id
       WHERE bs.beneficiary_id = p_beneficiary_id
         AND LOWER(COALESCE(bs.status,'')) = 'active'
         AND p.addresses_need_type_id = r.need_type_id
    ) INTO v_has_enrollment;

    IF r.estimated_cost IS NOT NULL AND r.estimated_cost > 0 AND v_funded >= r.estimated_cost THEN
      v_new_status := 'met';
    ELSIF v_funded > 0 THEN
      v_new_status := 'partially_met';
    ELSIF v_has_enrollment THEN
      v_new_status := 'partially_met';
    ELSE
      v_new_status := 'unmet';
    END IF;

    UPDATE public.beneficiary_needs
       SET funded_amount = ROUND(v_funded, 2),
           status        = v_new_status,
           updated_at    = now()
     WHERE id = r.id;
  END LOOP;
END; $$;

-- Backfill: recompute every beneficiary that has needs
DO $$
DECLARE b uuid;
BEGIN
  FOR b IN SELECT DISTINCT beneficiary_id FROM public.beneficiary_needs LOOP
    PERFORM public.recompute_need_status(b);
  END LOOP;
END $$;

-- ============================================================
-- 3. Group members
-- ============================================================
CREATE TABLE IF NOT EXISTS public.group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  group_beneficiary_id uuid NOT NULL REFERENCES public.beneficiaries(id) ON DELETE CASCADE,
  linked_beneficiary_id uuid REFERENCES public.beneficiaries(id) ON DELETE SET NULL,
  full_name text NOT NULL,
  role_in_group text NOT NULL DEFAULT 'member',
  phone text,
  email text,
  gender text,
  date_of_birth date,
  national_id text,
  bio text,
  joined_date date,
  created_by uuid,
  updated_by uuid,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_group_members_group ON public.group_members(group_beneficiary_id);
CREATE INDEX IF NOT EXISTS idx_group_members_org ON public.group_members(organization_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.group_members TO authenticated;
GRANT ALL ON public.group_members TO service_role;

ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view group members"
  ON public.group_members FOR SELECT TO authenticated
  USING (organization_id = public.get_user_organization_id(auth.uid()) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Org members can add group members"
  ON public.group_members FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.get_user_organization_id(auth.uid()));

CREATE POLICY "Org members can update group members"
  ON public.group_members FOR UPDATE TO authenticated
  USING (organization_id = public.get_user_organization_id(auth.uid()))
  WITH CHECK (organization_id = public.get_user_organization_id(auth.uid()));

CREATE POLICY "Org members can delete group members"
  ON public.group_members FOR DELETE TO authenticated
  USING (organization_id = public.get_user_organization_id(auth.uid()));

DROP TRIGGER IF EXISTS trg_group_members_updated_at ON public.group_members;
CREATE TRIGGER trg_group_members_updated_at
  BEFORE UPDATE ON public.group_members
  FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();

NOTIFY pgrst, 'reload schema';

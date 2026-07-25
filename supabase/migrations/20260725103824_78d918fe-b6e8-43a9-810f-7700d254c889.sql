-- 1) Columns
ALTER TABLE public.beneficiary_needs
  ADD COLUMN IF NOT EXISTS status_source TEXT NOT NULL DEFAULT 'auto'
    CHECK (status_source IN ('auto','manual')),
  ADD COLUMN IF NOT EXISTS manual_status_note TEXT,
  ADD COLUMN IF NOT EXISTS funded_amount NUMERIC NOT NULL DEFAULT 0;

-- 2) Recompute function (per beneficiary)
CREATE OR REPLACE FUNCTION public.recompute_need_status(p_beneficiary_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
  v_funded NUMERIC;
  v_has_enrollment BOOLEAN;
  v_new_status TEXT;
BEGIN
  IF p_beneficiary_id IS NULL THEN RETURN; END IF;

  FOR r IN
    SELECT id, need_type_id, estimated_cost
      FROM public.beneficiary_needs
     WHERE beneficiary_id = p_beneficiary_id
       AND status_source = 'auto'
  LOOP
    -- Sum allocation line items attributed to this need type for this beneficiary
    SELECT COALESCE(SUM(COALESCE(amount_base, amount_native, 0)), 0)
      INTO v_funded
      FROM public.allocation_line_items
     WHERE beneficiary_id = p_beneficiary_id
       AND need_type_id  = r.need_type_id;

    -- Add sponsorship coverage (beneficiary_donors with a package item matching this need)
    v_funded := v_funded + COALESCE((
      SELECT SUM(COALESCE(bd.amount_received, 0))
        FROM public.beneficiary_donors bd
        JOIN public.sponsorship_package_items spi
          ON spi.package_id = bd.sponsorship_package_id
       WHERE bd.beneficiary_id = p_beneficiary_id
         AND spi.need_type_id  = r.need_type_id
    ), 0);

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
       SET funded_amount = v_funded,
           status        = v_new_status,
           updated_at    = now()
     WHERE id = r.id;
  END LOOP;
END;
$$;

-- 3) Trigger helpers
CREATE OR REPLACE FUNCTION public.trg_recompute_from_ali()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF (TG_OP = 'DELETE') THEN
    IF OLD.beneficiary_id IS NOT NULL THEN PERFORM public.recompute_need_status(OLD.beneficiary_id); END IF;
    RETURN OLD;
  END IF;
  IF NEW.beneficiary_id IS NOT NULL THEN PERFORM public.recompute_need_status(NEW.beneficiary_id); END IF;
  IF TG_OP='UPDATE' AND OLD.beneficiary_id IS DISTINCT FROM NEW.beneficiary_id AND OLD.beneficiary_id IS NOT NULL THEN
    PERFORM public.recompute_need_status(OLD.beneficiary_id);
  END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.trg_recompute_from_bd()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF (TG_OP = 'DELETE') THEN
    IF OLD.beneficiary_id IS NOT NULL THEN PERFORM public.recompute_need_status(OLD.beneficiary_id); END IF;
    RETURN OLD;
  END IF;
  IF NEW.beneficiary_id IS NOT NULL THEN PERFORM public.recompute_need_status(NEW.beneficiary_id); END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.trg_recompute_from_bs()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF (TG_OP='DELETE') THEN
    IF OLD.beneficiary_id IS NOT NULL THEN PERFORM public.recompute_need_status(OLD.beneficiary_id); END IF;
    RETURN OLD;
  END IF;
  IF NEW.beneficiary_id IS NOT NULL THEN PERFORM public.recompute_need_status(NEW.beneficiary_id); END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.trg_recompute_from_bn()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF (TG_OP='DELETE') THEN RETURN OLD; END IF;
  IF NEW.beneficiary_id IS NOT NULL AND NEW.status_source='auto' THEN
    PERFORM public.recompute_need_status(NEW.beneficiary_id);
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_ali_recompute ON public.allocation_line_items;
CREATE TRIGGER trg_ali_recompute
AFTER INSERT OR UPDATE OR DELETE ON public.allocation_line_items
FOR EACH ROW EXECUTE FUNCTION public.trg_recompute_from_ali();

DROP TRIGGER IF EXISTS trg_bd_recompute ON public.beneficiary_donors;
CREATE TRIGGER trg_bd_recompute
AFTER INSERT OR UPDATE OR DELETE ON public.beneficiary_donors
FOR EACH ROW EXECUTE FUNCTION public.trg_recompute_from_bd();

DROP TRIGGER IF EXISTS trg_bs_recompute ON public.beneficiary_services;
CREATE TRIGGER trg_bs_recompute
AFTER INSERT OR UPDATE OR DELETE ON public.beneficiary_services
FOR EACH ROW EXECUTE FUNCTION public.trg_recompute_from_bs();

-- estimated_cost / need-type edits trigger recompute (skip when recompute itself is running: check status_source unchanged? simple guard: only fire when relevant cols change or on INSERT)
DROP TRIGGER IF EXISTS trg_bn_recompute ON public.beneficiary_needs;
CREATE TRIGGER trg_bn_recompute
AFTER INSERT OR UPDATE OF estimated_cost, need_type_id, status_source ON public.beneficiary_needs
FOR EACH ROW EXECUTE FUNCTION public.trg_recompute_from_bn();

-- 4) Backfill: recompute all beneficiaries that have needs
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT DISTINCT beneficiary_id FROM public.beneficiary_needs WHERE beneficiary_id IS NOT NULL LOOP
    PERFORM public.recompute_need_status(r.beneficiary_id);
  END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';
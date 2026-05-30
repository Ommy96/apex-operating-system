
-- Funding Intelligence aggregation views
CREATE OR REPLACE VIEW public.v_program_funding_summary
WITH (security_invoker = true)
AS
WITH program_budget AS (
  SELECT p.id AS program_id,
         p.organization_id,
         p.name,
         p.currency,
         p.status,
         COALESCE(p.total_budget, 0)::numeric AS planned_budget,
         COALESCE((SELECT SUM(b.total_amount) FROM public.budgets b WHERE b.program_id = p.id), 0)::numeric AS budgets_total,
         COALESCE((SELECT SUM(pr.budget) FROM public.projects pr WHERE pr.program_id = p.id AND pr.deleted_at IS NULL), 0)::numeric AS projects_budget_total
  FROM public.programs p
  WHERE p.deleted_at IS NULL
),
ft AS (
  SELECT program_id,
         SUM(CASE WHEN transaction_type IN ('grant_received','donation','program_funding','project_funding','beneficiary_support','contribution') THEN amount ELSE 0 END) AS received,
         SUM(CASE WHEN transaction_type = 'expense' THEN amount ELSE 0 END) AS spent
  FROM public.financial_transactions
  WHERE program_id IS NOT NULL
  GROUP BY program_id
),
prog_donor AS (
  SELECT program_id,
         SUM(COALESCE(contribution_amount,0)) AS program_level_funding,
         COUNT(DISTINCT COALESCE(donor_name, sponsor_id::text)) AS program_donors_count
  FROM public.program_donors
  GROUP BY program_id
),
bene_donor AS (
  SELECT program_id,
         SUM(COALESCE(amount_received,0)) AS beneficiary_level_funding,
         COUNT(DISTINCT donor_name) AS beneficiary_donors_count
  FROM public.beneficiary_donors
  WHERE program_id IS NOT NULL
  GROUP BY program_id
),
project_grants AS (
  SELECT pr.program_id,
         COALESCE(SUM(ft2.amount),0) AS project_level_funding
  FROM public.projects pr
  LEFT JOIN public.financial_transactions ft2
    ON ft2.project_id = pr.id
   AND ft2.transaction_type IN ('grant_received','project_funding','donation')
  WHERE pr.deleted_at IS NULL
  GROUP BY pr.program_id
)
SELECT pb.program_id,
       pb.organization_id,
       pb.name,
       pb.currency,
       pb.status,
       GREATEST(pb.planned_budget, pb.budgets_total, pb.projects_budget_total) AS total_budget,
       COALESCE(pd.program_level_funding, 0) AS program_level_funding,
       COALESCE(pj.project_level_funding, 0) AS project_level_funding,
       COALESCE(bd.beneficiary_level_funding, 0) AS beneficiary_level_funding,
       COALESCE(ft.received, 0) AS total_received,
       COALESCE(ft.spent, 0) AS total_spent,
       COALESCE(pd.program_donors_count, 0) + COALESCE(bd.beneficiary_donors_count, 0) AS donor_count
FROM program_budget pb
LEFT JOIN ft ON ft.program_id = pb.program_id
LEFT JOIN prog_donor pd ON pd.program_id = pb.program_id
LEFT JOIN bene_donor bd ON bd.program_id = pb.program_id
LEFT JOIN project_grants pj ON pj.program_id = pb.program_id;

GRANT SELECT ON public.v_program_funding_summary TO authenticated;
GRANT SELECT ON public.v_program_funding_summary TO service_role;

-- Project-level funding summary
CREATE OR REPLACE VIEW public.v_project_funding_summary
WITH (security_invoker = true)
AS
SELECT pr.id AS project_id,
       pr.organization_id,
       pr.program_id,
       pr.name,
       pr.status,
       COALESCE(pr.budget, 0)::numeric AS total_budget,
       COALESCE((SELECT SUM(amount) FROM public.financial_transactions ft
                 WHERE ft.project_id = pr.id
                   AND ft.transaction_type IN ('grant_received','project_funding','donation','contribution')), 0) AS total_received,
       COALESCE((SELECT SUM(amount) FROM public.financial_transactions ft
                 WHERE ft.project_id = pr.id AND ft.transaction_type = 'expense'), 0) AS total_spent,
       pr.start_date,
       pr.end_date
FROM public.projects pr
WHERE pr.deleted_at IS NULL;

GRANT SELECT ON public.v_project_funding_summary TO authenticated;
GRANT SELECT ON public.v_project_funding_summary TO service_role;

-- Funding health score RPC (0-100)
CREATE OR REPLACE FUNCTION public.program_funding_health_score(_program_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
  coverage_score numeric := 0;
  burn_score numeric := 0;
  diversity_score numeric := 0;
  expiry_score numeric := 100;
  total_committed numeric;
  coverage_pct numeric;
  expiring_count int;
  total_grants int;
  final_score numeric;
BEGIN
  SELECT * INTO r FROM public.v_program_funding_summary WHERE program_id = _program_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('score', 0, 'coverage', 0, 'burn', 0, 'diversity', 0, 'expiry', 100);
  END IF;

  total_committed := r.program_level_funding + r.project_level_funding + r.beneficiary_level_funding;
  IF r.total_budget > 0 THEN
    coverage_pct := LEAST(100, (total_committed / r.total_budget) * 100);
  ELSE
    coverage_pct := CASE WHEN total_committed > 0 THEN 100 ELSE 0 END;
  END IF;
  coverage_score := coverage_pct;

  -- Burn rate score: closer received->spent ratio under 1 is better
  IF r.total_received > 0 THEN
    burn_score := CASE
      WHEN r.total_spent <= r.total_received THEN 100 - LEAST(50, (1 - r.total_spent / r.total_received) * 50)
      ELSE GREATEST(0, 100 - ((r.total_spent - r.total_received) / r.total_received) * 100)
    END;
  ELSE
    burn_score := 50;
  END IF;

  -- Donor diversity: 1 donor = 25, 2 = 50, 3 = 75, 4+ = 100
  diversity_score := LEAST(100, r.donor_count * 25);

  -- Grant expiry risk: grants ending within 90 days
  SELECT COUNT(*) FILTER (WHERE end_date IS NOT NULL AND end_date <= (CURRENT_DATE + INTERVAL '90 days') AND end_date >= CURRENT_DATE),
         COUNT(*)
    INTO expiring_count, total_grants
    FROM public.grants g
   WHERE g.organization_id = r.organization_id
     AND g.status IN ('active','approved','disbursed');

  IF total_grants > 0 THEN
    expiry_score := GREATEST(0, 100 - (expiring_count::numeric / total_grants) * 100);
  END IF;

  final_score := ROUND((coverage_score * 0.4 + burn_score * 0.25 + diversity_score * 0.2 + expiry_score * 0.15)::numeric, 1);

  RETURN jsonb_build_object(
    'score', final_score,
    'coverage', ROUND(coverage_score, 1),
    'burn', ROUND(burn_score, 1),
    'diversity', ROUND(diversity_score, 1),
    'expiry', ROUND(expiry_score, 1),
    'total_budget', r.total_budget,
    'total_committed', total_committed,
    'total_received', r.total_received,
    'total_spent', r.total_spent,
    'donor_count', r.donor_count,
    'expiring_grants', expiring_count
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.program_funding_health_score(uuid) TO authenticated, service_role;

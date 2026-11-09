CREATE OR REPLACE FUNCTION public.get_donor_funded_needs(_beneficiary uuid)
RETURNS TABLE(need_type_id uuid, need_name text, need_status text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT DISTINCT ON (li.need_type_id) li.need_type_id, COALESCE(nt.label, li.label, 'Need') AS need_name,
         lower(bn.status) AS need_status
  FROM public.allocation_line_items li
  JOIN public.allocations a ON a.id = li.allocation_id
  JOIN public.donor_accounts da ON da.id = a.donor_account_id AND da.user_id = auth.uid() AND da.is_active
       AND da.organization_id = li.organization_id
  LEFT JOIN public.need_types nt ON nt.id = li.need_type_id
  LEFT JOIN public.beneficiary_needs bn ON bn.beneficiary_id = li.beneficiary_id AND bn.need_type_id = li.need_type_id
       AND bn.organization_id = li.organization_id
  WHERE li.beneficiary_id = _beneficiary AND li.need_type_id IS NOT NULL
    AND public.is_donor_of_beneficiary(_beneficiary)
  ORDER BY li.need_type_id, li.created_at DESC;
$$;
REVOKE ALL ON FUNCTION public.get_donor_funded_needs(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_donor_funded_needs(uuid) TO authenticated;
NOTIFY pgrst, 'reload schema';
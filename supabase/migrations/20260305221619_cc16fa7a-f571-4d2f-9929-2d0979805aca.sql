-- Super Admin bypass policies: allow users with 'admin' role in user_roles to SELECT all data

-- Organizations
CREATE POLICY "Super admins can view all organizations"
ON public.organizations FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Organization Members
CREATE POLICY "Super admins can view all organization members"
ON public.organization_members FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Profiles
CREATE POLICY "Super admins can view all profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Beneficiaries
CREATE POLICY "Super admins can view all beneficiaries"
ON public.beneficiaries FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Programs
CREATE POLICY "Super admins can view all programs"
ON public.programs FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Financial Transactions
CREATE POLICY "Super admins can view all financial transactions"
ON public.financial_transactions FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Audit Logs (already has admin policy but uses profiles.role, add user_roles based one)
CREATE POLICY "Super admins can view all audit logs via user_roles"
ON public.audit_logs FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Children
CREATE POLICY "Super admins can view all children"
ON public.children FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Entities
CREATE POLICY "Super admins can view all entities"
ON public.entities FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Super admins can also UPDATE organizations (for suspend/activate/tier changes)
CREATE POLICY "Super admins can update all organizations"
ON public.organizations FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";

export function useFinancials() {
  const { currentOrganization } = useOrganization();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const orgId = currentOrganization?.organization_id;

  // ── Budgets ──
  const budgets = useQuery({
    queryKey: ["budgets", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("budgets")
        .select("*, programs(name), projects(name)")
        .eq("organization_id", orgId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  const createBudget = useMutation({
    mutationFn: async (values: any) => {
      const { error } = await supabase.from("budgets").insert({
        ...values,
        organization_id: orgId,
        created_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
      toast.success("Budget created successfully");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateBudget = useMutation({
    mutationFn: async ({ id, ...values }: any) => {
      const { error } = await supabase.from("budgets").update(values).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
      toast.success("Budget updated");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteBudget = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("budgets").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
      toast.success("Budget deleted");
    },
    onError: (e: any) => toast.error(e.message),
  });

  // ── Budget Line Items ──
  const useBudgetLineItems = (budgetId: string | null) =>
    useQuery({
      queryKey: ["budget-line-items", budgetId],
      queryFn: async () => {
        const { data, error } = await supabase
          .from("budget_line_items")
          .select("*, budget_categories(name)")
          .eq("budget_id", budgetId!)
          .order("sort_order");
        if (error) throw error;
        return data;
      },
      enabled: !!budgetId,
    });

  const createLineItem = useMutation({
    mutationFn: async (values: any) => {
      const { error } = await supabase.from("budget_line_items").insert(values);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budget-line-items"] });
      toast.success("Line item added");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteLineItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("budget_line_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budget-line-items"] });
      toast.success("Line item removed");
    },
    onError: (e: any) => toast.error(e.message),
  });

  // ── Budget Categories ──
  const budgetCategories = useQuery({
    queryKey: ["budget-categories", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("budget_categories")
        .select("*")
        .eq("organization_id", orgId!)
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  const createCategory = useMutation({
    mutationFn: async (values: any) => {
      const { error } = await supabase.from("budget_categories").insert({
        ...values,
        organization_id: orgId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budget-categories"] });
      toast.success("Category created");
    },
    onError: (e: any) => toast.error(e.message),
  });

  // ── Expenses ──
  const expenses = useQuery({
    queryKey: ["expenses", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expenses")
        .select("*, budgets(name), programs(name), projects(name), budget_categories(name)")
        .eq("organization_id", orgId!)
        .order("expense_date", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  const createExpense = useMutation({
    mutationFn: async (values: any) => {
      const { error } = await supabase.from("expenses").insert({
        ...values,
        organization_id: orgId,
        created_by: user?.id,
        submitted_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      toast.success("Expense recorded");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateExpense = useMutation({
    mutationFn: async ({ id, ...values }: any) => {
      const { error } = await supabase.from("expenses").update(values).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      toast.success("Expense updated");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteExpense = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("expenses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["financial-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["donor-support-totals"] });
      queryClient.invalidateQueries({ queryKey: ["cost-analytics"] });
      toast.success("Expense deleted");
    },
    onError: (e: any) => toast.error(e.message),
  });

  // ── Grants ──
  const grants = useQuery({
    queryKey: ["grants", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("grants")
        .select("*")
        .eq("organization_id", orgId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  const createGrant = useMutation({
    mutationFn: async (values: any) => {
      const { error } = await supabase.from("grants").insert({
        ...values,
        organization_id: orgId,
        created_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["grants"] });
      toast.success("Grant created");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateGrant = useMutation({
    mutationFn: async ({ id, ...values }: any) => {
      const { error } = await supabase.from("grants").update(values).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["grants"] });
      toast.success("Grant updated");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteGrant = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("grants").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["grants"] });
      toast.success("Grant deleted");
    },
    onError: (e: any) => toast.error(e.message),
  });

  // ── Grant Programs ──
  const useGrantPrograms = (grantId: string | null) =>
    useQuery({
      queryKey: ["grant-programs", grantId],
      queryFn: async () => {
        const { data, error } = await supabase
          .from("grant_programs")
          .select("*, programs(name)")
          .eq("grant_id", grantId!);
        if (error) throw error;
        return data;
      },
      enabled: !!grantId,
    });

  const linkGrantProgram = useMutation({
    mutationFn: async (values: any) => {
      const { error } = await supabase.from("grant_programs").insert(values);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["grant-programs"] });
      toast.success("Program linked to grant");
    },
    onError: (e: any) => toast.error(e.message),
  });

  // ── Grant Compliance ──
  const useGrantCompliance = (grantId: string | null) =>
    useQuery({
      queryKey: ["grant-compliance", grantId],
      queryFn: async () => {
        const { data, error } = await supabase
          .from("grant_compliance_items")
          .select("*")
          .eq("grant_id", grantId!)
          .order("sort_order");
        if (error) throw error;
        return data;
      },
      enabled: !!grantId,
    });

  const createComplianceItem = useMutation({
    mutationFn: async (values: any) => {
      const { error } = await supabase.from("grant_compliance_items").insert(values);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["grant-compliance"] });
      toast.success("Compliance item added");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateComplianceItem = useMutation({
    mutationFn: async ({ id, ...values }: any) => {
      const { error } = await supabase.from("grant_compliance_items").update(values).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["grant-compliance"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  // ── Grant Reports ──
  const useGrantReports = (grantId: string | null) =>
    useQuery({
      queryKey: ["grant-reports", grantId],
      queryFn: async () => {
        const { data, error } = await supabase
          .from("grant_reports")
          .select("*")
          .eq("grant_id", grantId!)
          .order("due_date", { ascending: true });
        if (error) throw error;
        return data;
      },
      enabled: !!grantId,
    });

  const createGrantReport = useMutation({
    mutationFn: async (values: any) => {
      const { error } = await supabase.from("grant_reports").insert({
        ...values,
        organization_id: orgId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["grant-reports"] });
      toast.success("Report schedule added");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateGrantReport = useMutation({
    mutationFn: async ({ id, ...values }: any) => {
      const { error } = await supabase.from("grant_reports").update(values).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["grant-reports"] });
      toast.success("Report updated");
    },
    onError: (e: any) => toast.error(e.message),
  });

  // ── Grant Documents ──
  const useGrantDocuments = (grantId: string | null) =>
    useQuery({
      queryKey: ["grant-documents", grantId],
      queryFn: async () => {
        const { data, error } = await supabase
          .from("grant_documents")
          .select("*")
          .eq("grant_id", grantId!)
          .order("created_at", { ascending: false });
        if (error) throw error;
        return data;
      },
      enabled: !!grantId,
    });

  const createGrantDocument = useMutation({
    mutationFn: async (values: any) => {
      const { error } = await supabase.from("grant_documents").insert({
        ...values,
        organization_id: orgId,
        uploaded_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["grant-documents"] });
      toast.success("Document uploaded");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteGrantDocument = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("grant_documents").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["grant-documents"] });
      toast.success("Document removed");
    },
    onError: (e: any) => toast.error(e.message),
  });

  // ── Grant Budget Utilization ──
  const useGrantUtilization = (grantId: string | null) =>
    useQuery({
      queryKey: ["grant-utilization", grantId],
      queryFn: async () => {
        // Get linked programs
        const { data: linkedProgs } = await supabase
          .from("grant_programs")
          .select("program_id, allocated_amount")
          .eq("grant_id", grantId!);
        const programIds = (linkedProgs || []).map(p => p.program_id);
        if (programIds.length === 0) return { totalAllocated: 0, totalSpent: 0, byProgram: [] };

        // Get expenses for those programs
        const { data: expenses } = await supabase
          .from("expenses")
          .select("program_id, amount, programs(name)")
          .eq("organization_id", orgId!)
          .in("program_id", programIds);

        const byProgram = (linkedProgs || []).map(lp => {
          const spent = (expenses || [])
            .filter(e => e.program_id === lp.program_id)
            .reduce((s, e) => s + Number(e.amount || 0), 0);
          const progName = (expenses || []).find(e => e.program_id === lp.program_id)?.programs?.name || 'Unknown';
          return {
            programId: lp.program_id,
            programName: progName,
            allocated: Number(lp.allocated_amount || 0),
            spent,
            remaining: Number(lp.allocated_amount || 0) - spent,
            utilization: Number(lp.allocated_amount || 0) > 0 ? (spent / Number(lp.allocated_amount || 0)) * 100 : 0,
          };
        });

        return {
          totalAllocated: byProgram.reduce((s, p) => s + p.allocated, 0),
          totalSpent: byProgram.reduce((s, p) => s + p.spent, 0),
          byProgram,
        };
      },
      enabled: !!grantId && !!orgId,
    });

  // ── All upcoming grant reports (for dashboard alerts) ──
  const upcomingGrantReports = useQuery({
    queryKey: ["upcoming-grant-reports", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("grant_reports")
        .select("*, grants(grant_name)")
        .eq("organization_id", orgId!)
        .eq("status", "pending")
        .order("due_date", { ascending: true })
        .limit(10);
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  // ── Programs list (for selectors) ──
  const programs = useQuery({
    queryKey: ["programs-list", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("programs")
        .select("id, name")
        .eq("organization_id", orgId!)
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  // ── Cost Analytics ──
  const costAnalytics = useQuery({
    queryKey: ["cost-analytics", orgId],
    queryFn: async () => {
      // Get total expenses by program
      const { data: expensesByProgram, error: e1 } = await supabase
        .from("expenses")
        .select("program_id, amount, programs(name)")
        .eq("organization_id", orgId!)
        .eq("status", "approved");
      if (e1) throw e1;

      // Get beneficiary counts by program
      const { data: enrollments, error: e2 } = await supabase
        .from("beneficiary_services")
        .select("program_id, beneficiary_id")
        .eq("organization_id", orgId!)
        .eq("status", "active");
      if (e2) throw e2;

      // Total beneficiaries
      const { count: totalBeneficiaries, error: e3 } = await supabase
        .from("beneficiaries")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", orgId!)
        .eq("status", "active");
      if (e3) throw e3;

      // Calculate per-program costs
      const programCosts: Record<string, { name: string; totalSpent: number; beneficiaryCount: number }> = {};
      
      expensesByProgram?.forEach((exp: any) => {
        if (!exp.program_id) return;
        if (!programCosts[exp.program_id]) {
          programCosts[exp.program_id] = {
            name: exp.programs?.name || "Unknown",
            totalSpent: 0,
            beneficiaryCount: 0,
          };
        }
        programCosts[exp.program_id].totalSpent += Number(exp.amount) || 0;
      });

      enrollments?.forEach((en: any) => {
        if (!en.program_id) return;
        if (!programCosts[en.program_id]) {
          programCosts[en.program_id] = { name: "Unknown", totalSpent: 0, beneficiaryCount: 0 };
        }
        programCosts[en.program_id].beneficiaryCount += 1;
      });

      const totalExpenses = expensesByProgram?.reduce((s: number, e: any) => s + (Number(e.amount) || 0), 0) || 0;

      return {
        programCosts: Object.values(programCosts).map((p) => ({
          ...p,
          costPerBeneficiary: p.beneficiaryCount > 0 ? p.totalSpent / p.beneficiaryCount : 0,
        })),
        totalExpenses,
        totalBeneficiaries: totalBeneficiaries || 0,
        overallCostPerBeneficiary: (totalBeneficiaries || 0) > 0 ? totalExpenses / (totalBeneficiaries || 1) : 0,
      };
    },
    enabled: !!orgId,
  });

  // Real-time subscriptions for all financial tables
  useRealtimeSubscription([
    { table: "budgets", queryKeys: [["budgets", orgId || ""]], orgId, enabled: !!orgId },
    { table: "budget_line_items", queryKeys: [["budget-line-items"]], enabled: !!orgId },
    { table: "expenses", queryKeys: [["expenses", orgId || ""], ["cost-analytics", orgId || ""]], orgId, enabled: !!orgId },
    { table: "grants", queryKeys: [["grants", orgId || ""]], orgId, enabled: !!orgId },
    { table: "financial_transactions", queryKeys: [["financial-transactions", orgId || ""], ["donor-support-totals", orgId || ""]], orgId, enabled: !!orgId },
  ]);

  const deleteTransaction = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("financial_transactions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financial-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["donor-support-totals"] });
      queryClient.invalidateQueries({ queryKey: ["cost-analytics"] });
      toast.success("Transaction deleted");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return {
    budgets,
    createBudget,
    updateBudget,
    deleteBudget,
    useBudgetLineItems,
    createLineItem,
    deleteLineItem,
    budgetCategories,
    createCategory,
    expenses,
    createExpense,
    updateExpense,
    deleteExpense,
    grants,
    createGrant,
    updateGrant,
    deleteGrant,
    useGrantPrograms,
    linkGrantProgram,
    useGrantCompliance,
    createComplianceItem,
    updateComplianceItem,
    programs,
    costAnalytics,
    deleteTransaction,
  };
}

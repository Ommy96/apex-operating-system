import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import { toast } from "sonner";

export function useBoardReporting() {
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const queryClient = useQueryClient();
  const orgId = currentOrganization?.organization_id;

  // Board members
  const { data: boardMembers = [], isLoading: loadingMembers } = useQuery({
    queryKey: ["board-members", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("board_members")
        .select("*")
        .eq("organization_id", orgId!)
        .order("full_name");
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  // Board reports
  const { data: boardReports = [], isLoading: loadingReports } = useQuery({
    queryKey: ["board-reports", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("board_reports")
        .select("*")
        .eq("organization_id", orgId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  // Report sections
  const fetchReportSections = async (reportId: string) => {
    const { data, error } = await supabase
      .from("board_report_sections")
      .select("*")
      .eq("report_id", reportId)
      .order("sort_order");
    if (error) throw error;
    return data;
  };

  // Create board member
  const createMember = useMutation({
    mutationFn: async (member: { full_name: string; email: string; role?: string; title?: string }) => {
      const { error } = await supabase.from("board_members").insert({
        organization_id: orgId!,
        ...member,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["board-members"] });
      toast.success("Board member added");
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Create board report
  const createReport = useMutation({
    mutationFn: async (report: {
      title: string;
      description?: string;
      report_period_start: string;
      report_period_end: string;
      meeting_date?: string;
      meeting_agenda?: string;
      executive_summary?: string;
    }) => {
      const { data, error } = await supabase
        .from("board_reports")
        .insert({
          organization_id: orgId!,
          created_by: user?.id,
          ...report,
        })
        .select()
        .single();
      if (error) throw error;

      // Auto-create default sections
      const defaultSections = [
        { section_type: "executive_summary", title: "Executive Summary", sort_order: 0 },
        { section_type: "program_performance", title: "Program Performance", sort_order: 1 },
        { section_type: "financial_overview", title: "Financial Overview", sort_order: 2 },
        { section_type: "beneficiary_impact", title: "Beneficiary Impact", sort_order: 3 },
        { section_type: "risk_assessment", title: "Risk Assessment", sort_order: 4 },
        { section_type: "recommendations", title: "Recommendations & Next Steps", sort_order: 5 },
      ];

      await supabase.from("board_report_sections").insert(
        defaultSections.map((s) => ({
          ...s,
          report_id: data.id,
          organization_id: orgId!,
        }))
      );

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["board-reports"] });
      toast.success("Board report created with default sections");
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Update report
  const updateReport = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; status?: string; executive_summary?: string; approved_by?: string; approved_at?: string; published_at?: string }) => {
      const { error } = await supabase.from("board_reports").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["board-reports"] });
      toast.success("Report updated");
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Update section
  const updateSection = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; narrative?: string; content?: any; is_visible?: boolean }) => {
      const { error } = await supabase.from("board_report_sections").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Section updated");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return {
    boardMembers,
    boardReports,
    loadingMembers,
    loadingReports,
    fetchReportSections,
    createMember,
    createReport,
    updateReport,
    updateSection,
  };
}

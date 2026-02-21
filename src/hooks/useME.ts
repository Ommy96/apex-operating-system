import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "./useOrganization";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export function useME() {
  const { currentOrganization } = useOrganization();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const orgId = currentOrganization?.organization_id;

  // ========== LOGFRAMES ==========
  const logframes = useQuery({
    queryKey: ["logframes", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("logframes")
        .select("*, logframe_levels(*, logframe_indicators(*))")
        .eq("organization_id", orgId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  const createLogframe = useMutation({
    mutationFn: async (values: { title: string; description?: string; program_id?: string; project_id?: string }) => {
      const { data, error } = await supabase
        .from("logframes")
        .insert({ ...values, organization_id: orgId!, created_by: user?.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["logframes"] });
      toast.success("LogFrame created");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const createLogframeLevel = useMutation({
    mutationFn: async (values: {
      logframe_id: string;
      parent_id?: string;
      level_type: string;
      title: string;
      description?: string;
      assumptions?: string;
      risks?: string;
      means_of_verification?: string;
      sort_order?: number;
    }) => {
      const { data, error } = await supabase
        .from("logframe_levels")
        .insert(values)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["logframes"] });
      toast.success("Level added");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteLogframe = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("logframes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["logframes"] });
      toast.success("LogFrame deleted");
    },
    onError: (e: any) => toast.error(e.message),
  });

  // ========== THEORY OF CHANGE ==========
  const tocList = useQuery({
    queryKey: ["toc", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("theory_of_change")
        .select("*, toc_nodes(*), toc_connections(*)")
        .eq("organization_id", orgId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  const createToc = useMutation({
    mutationFn: async (values: { title: string; description?: string; narrative?: string; program_id?: string }) => {
      const { data, error } = await supabase
        .from("theory_of_change")
        .insert({ ...values, organization_id: orgId!, created_by: user?.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["toc"] });
      toast.success("Theory of Change created");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const createTocNode = useMutation({
    mutationFn: async (values: { toc_id: string; node_type: string; title: string; description?: string; position_x?: number; position_y?: number; color?: string }) => {
      const { data, error } = await supabase
        .from("toc_nodes")
        .insert(values)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["toc"] });
      toast.success("Node added");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteToc = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("theory_of_change").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["toc"] });
      toast.success("Theory of Change deleted");
    },
    onError: (e: any) => toast.error(e.message),
  });

  // ========== SURVEYS ==========
  const surveys = useQuery({
    queryKey: ["surveys", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("surveys")
        .select("*, survey_questions(*)")
        .eq("organization_id", orgId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  const createSurvey = useMutation({
    mutationFn: async (values: { title: string; description?: string; survey_type: string; program_id?: string; project_id?: string }) => {
      const { data, error } = await supabase
        .from("surveys")
        .insert({ ...values, organization_id: orgId!, created_by: user?.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["surveys"] });
      toast.success("Survey created");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const createSurveyQuestion = useMutation({
    mutationFn: async (values: { survey_id: string; question_text: string; question_type: string; options?: any; is_required?: boolean; section?: string; sort_order?: number }) => {
      const { data, error } = await supabase
        .from("survey_questions")
        .insert(values)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["surveys"] });
      toast.success("Question added");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteSurvey = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("surveys").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["surveys"] });
      toast.success("Survey deleted");
    },
    onError: (e: any) => toast.error(e.message),
  });

  // ========== RISK SCORES ==========
  const riskScores = useQuery({
    queryKey: ["risk-scores", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("beneficiary_risk_scores")
        .select("*, beneficiaries(display_name, beneficiary_type, status)")
        .eq("organization_id", orgId!)
        .order("assessment_date", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  const createRiskScore = useMutation({
    mutationFn: async (values: {
      beneficiary_id: string;
      vulnerability_index?: number;
      dropout_risk_score?: number;
      engagement_score?: number;
      academic_trend_score?: number;
      followup_compliance_score?: number;
      overall_risk_level?: string;
      risk_flags?: any;
      notes?: string;
    }) => {
      const { data, error } = await supabase
        .from("beneficiary_risk_scores")
        .insert({ ...values, organization_id: orgId!, assessed_by: user?.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["risk-scores"] });
      toast.success("Risk assessment saved");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const progressLogs = useQuery({
    queryKey: ["progress-logs", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("beneficiary_progress_logs")
        .select("*, beneficiaries(display_name)")
        .eq("organization_id", orgId!)
        .order("log_date", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  return {
    logframes, createLogframe, createLogframeLevel, deleteLogframe,
    tocList, createToc, createTocNode, deleteToc,
    surveys, createSurvey, createSurveyQuestion, deleteSurvey,
    riskScores, createRiskScore, progressLogs,
  };
}

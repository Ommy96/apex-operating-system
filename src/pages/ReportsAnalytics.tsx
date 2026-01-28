import { useState, useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  BarChart3,
  FileText,
  GraduationCap,
  Users,
  Home,
  Target,
  Activity,
  Shield
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeroHeader } from "@/components/PageHeroHeader";
import { useOrganization } from "@/hooks/useOrganization";
import { startOfMonth, subMonths, endOfMonth } from "date-fns";
import { DateRange } from "react-day-picker";

// Analytics sections
import { AnalyticsDateFilter } from "@/components/analytics/AnalyticsDateFilter";
import { ReportsSummarySection } from "@/components/analytics/ReportsSummarySection";
import { AcademicPerformanceSection } from "@/components/analytics/AcademicPerformanceSection";
import { ChildLifecycleSection } from "@/components/analytics/ChildLifecycleSection";
import { ProgramPerformanceSection } from "@/components/analytics/ProgramPerformanceSection";
import { FieldActivitySection } from "@/components/analytics/FieldActivitySection";
import { StaffPerformanceSection } from "@/components/analytics/StaffPerformanceSection";
import { SystemIntelligenceSection } from "@/components/analytics/SystemIntelligenceSection";

export default function ReportsAnalytics() {
  const { currentOrganization } = useOrganization();
  const [activeTab, setActiveTab] = useState("reports");
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(subMonths(new Date(), 2)),
    to: endOfMonth(new Date())
  });
  const [programFilter, setProgramFilter] = useState("all");

  // Fetch children data
  const { data: children = [], isLoading: isLoadingChildren } = useQuery({
    queryKey: ['analytics-children', currentOrganization?.organization_id],
    queryFn: async () => {
      if (!currentOrganization?.organization_id) return [];
      const { data, error } = await supabase
        .from('children')
        .select('*')
        .eq('organization_id', currentOrganization.organization_id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentOrganization?.organization_id,
  });

  // Fetch documents
  const { data: documents = [], isLoading: isLoadingDocs } = useQuery({
    queryKey: ['analytics-documents', currentOrganization?.organization_id],
    queryFn: async () => {
      if (!currentOrganization?.organization_id) return [];
      const childIds = children?.map(c => c.id) || [];
      if (childIds.length === 0) return [];
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .in('child_id', childIds);
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentOrganization?.organization_id && !!children?.length,
  });

  // Fetch academic performance data
  const { data: academicRecords = [], isLoading: isLoadingAcademic } = useQuery({
    queryKey: ['analytics-academic', currentOrganization?.organization_id],
    queryFn: async () => {
      if (!currentOrganization?.organization_id) return [];
      const { data, error } = await supabase
        .from('academic_performance')
        .select('*')
        .eq('organization_id', currentOrganization.organization_id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentOrganization?.organization_id,
  });

  // Fetch program data
  const { data: programData, isLoading: isLoadingPrograms } = useQuery({
    queryKey: ['analytics-programs', currentOrganization?.organization_id],
    queryFn: async () => {
      if (!currentOrganization?.organization_id) return null;
      const orgId = currentOrganization.organization_id;
      const [feeding, kipawa, selfEmp, family, support, medical] = await Promise.all([
        supabase.from('feeding_program').select('id, gender, academic_level, created_at').eq('organization_id', orgId),
        supabase.from('kipawa_sato').select('id, gender, academic_level, talent_category, created_at').eq('organization_id', orgId),
        supabase.from('self_empowerment').select('id, gender, is_active, created_at').eq('organization_id', orgId),
        supabase.from('family_adoption').select('id, gender, no_of_beneficiaries, created_at').eq('organization_id', orgId),
        supabase.from('support_groups').select('id, member_count, created_at').eq('organization_id', orgId),
        supabase.from('medical_records').select('id, gender, created_at').eq('organization_id', orgId)
      ]);
      return {
        children: children || [],
        feeding: feeding.data || [],
        kipawa: kipawa.data || [],
        selfEmpowerment: selfEmp.data || [],
        familyAdoption: family.data || [],
        supportGroups: support.data || [],
        medical: medical.data || []
      };
    },
    enabled: !!currentOrganization?.organization_id,
  });

  // Fetch reports data
  const { data: reportsData, isLoading: isLoadingReports } = useQuery({
    queryKey: ['analytics-reports', currentOrganization?.organization_id],
    queryFn: async () => {
      if (!currentOrganization?.organization_id) return null;
      const orgId = currentOrganization.organization_id;
      const [homeVisits, schoolVisits, programReports, activityReports, businessVisits] = await Promise.all([
        supabase.from('home_visit_reports').select('*').eq('organization_id', orgId),
        supabase.from('school_visit_reports').select('*').eq('organization_id', orgId),
        supabase.from('program_reports').select('*').eq('organization_id', orgId),
        supabase.from('activity_reports').select('*').eq('organization_id', orgId),
        supabase.from('business_visit_reports').select('*').eq('organization_id', orgId)
      ]);
      return {
        homeVisits: homeVisits.data || [],
        schoolVisits: schoolVisits.data || [],
        programReports: programReports.data || [],
        activityReports: activityReports.data || [],
        businessVisits: businessVisits.data || []
      };
    },
    enabled: !!currentOrganization?.organization_id,
  });

  // Fetch replacements data
  const { data: replacements = [], isLoading: isLoadingReplacements } = useQuery({
    queryKey: ['analytics-replacements', currentOrganization?.organization_id],
    queryFn: async () => {
      // Since we don't have a dedicated replacements table, return empty for now
      // This can be extended to use audit_logs or a dedicated table
      return [];
    },
    enabled: !!currentOrganization?.organization_id,
  });

  // Fetch programs for filter
  const { data: programs = [] } = useQuery({
    queryKey: ['analytics-program-list', currentOrganization?.organization_id],
    queryFn: async () => {
      if (!currentOrganization?.organization_id) return [];
      const { data, error } = await supabase
        .from('programs')
        .select('id, name')
        .eq('organization_id', currentOrganization.organization_id)
        .eq('is_active', true);
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentOrganization?.organization_id,
  });

  const isLoading = isLoadingChildren || isLoadingDocs || isLoadingPrograms || isLoadingReports || isLoadingAcademic;

  const tabs = [
    { id: 'reports', label: 'Reports Summary', icon: FileText },
    { id: 'academic', label: 'Academic', icon: GraduationCap },
    { id: 'lifecycle', label: 'Child Lifecycle', icon: Users },
    { id: 'programs', label: 'Programs', icon: Target },
    { id: 'field', label: 'Field Activity', icon: Home },
    { id: 'staff', label: 'Staff Performance', icon: Activity },
    { id: 'system', label: 'System Intelligence', icon: Shield }
  ];

  return (
    <div className="space-y-6 pb-8">
      <PageHeroHeader
        icon={BarChart3}
        title="Analytics & Insights"
        description="Comprehensive intelligence dashboard - your single source of truth for organizational performance, accountability, and impact"
      />

      {/* Date & Filter Controls */}
      <AnalyticsDateFilter
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        programFilter={programFilter}
        onProgramFilterChange={setProgramFilter}
        programs={programs}
      />

      {/* Tab Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="flex flex-wrap h-auto gap-1 p-1 bg-muted/50">
          {tabs.map((tab) => (
            <TabsTrigger 
              key={tab.id} 
              value={tab.id}
              className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              <tab.icon className="h-4 w-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Reports Summary Tab */}
        <TabsContent value="reports">
          <ReportsSummarySection 
            reportsData={reportsData}
            dateRange={dateRange}
            isLoading={isLoadingReports}
          />
        </TabsContent>

        {/* Academic Performance Tab */}
        <TabsContent value="academic">
          <AcademicPerformanceSection 
            academicRecords={academicRecords}
            children={children}
            isLoading={isLoadingAcademic || isLoadingChildren}
          />
        </TabsContent>

        {/* Child Lifecycle Tab */}
        <TabsContent value="lifecycle">
          <ChildLifecycleSection 
            children={children}
            replacements={replacements}
            dateRange={dateRange}
            isLoading={isLoadingChildren || isLoadingReplacements}
          />
        </TabsContent>

        {/* Program Performance Tab */}
        <TabsContent value="programs">
          <ProgramPerformanceSection 
            programs={programs}
            programData={programData}
            reportsData={reportsData}
            isLoading={isLoadingPrograms}
          />
        </TabsContent>

        {/* Field Activity Tab */}
        <TabsContent value="field">
          <FieldActivitySection 
            homeVisits={reportsData?.homeVisits || []}
            children={children}
            dateRange={dateRange}
            isLoading={isLoadingReports || isLoadingChildren}
          />
        </TabsContent>

        {/* Staff Performance Tab */}
        <TabsContent value="staff">
          <StaffPerformanceSection 
            reportsData={reportsData}
            dateRange={dateRange}
            isLoading={isLoadingReports}
          />
        </TabsContent>

        {/* System Intelligence Tab */}
        <TabsContent value="system">
          <SystemIntelligenceSection 
            children={children}
            programData={programData}
            reportsData={reportsData}
            documents={documents}
            isLoading={isLoading}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

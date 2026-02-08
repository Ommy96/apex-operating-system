import { useState } from "react";
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

  const orgId = currentOrganization?.organization_id;

  // Fetch beneficiaries (unified system)
  const { data: beneficiaries = [], isLoading: isLoadingBeneficiaries } = useQuery({
    queryKey: ['analytics-beneficiaries', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from('beneficiaries')
        .select('id, display_name, first_name, last_name, beneficiary_type, gender, date_of_birth, academic_level, grade, institution_name, county, sub_county, location, status, inactive_date, inactive_reason, photo_url, created_at, has_special_needs')
        .eq('organization_id', orgId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!orgId,
  });

  // Fetch beneficiary academics
  const { data: academicRecords = [], isLoading: isLoadingAcademic } = useQuery({
    queryKey: ['analytics-beneficiary-academics', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from('beneficiary_academics')
        .select('*')
        .eq('organization_id', orgId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!orgId,
  });

  // Fetch beneficiary visitations (all types)
  const { data: visitations = [], isLoading: isLoadingVisitations } = useQuery({
    queryKey: ['analytics-visitations', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from('beneficiary_visitations')
        .select('*')
        .eq('organization_id', orgId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!orgId,
  });

  // Fetch enrollments (services)
  const { data: enrollments = [], isLoading: isLoadingEnrollments } = useQuery({
    queryKey: ['analytics-enrollments', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from('beneficiary_services')
        .select('id, beneficiary_id, program_id, project_id, enrolled_date, exit_date, status, created_at')
        .eq('organization_id', orgId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!orgId,
  });

  // Fetch programs for filter
  const { data: programs = [] } = useQuery({
    queryKey: ['analytics-program-list', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from('programs')
        .select('id, name, is_active')
        .eq('organization_id', orgId)
        .eq('is_active', true);
      if (error) throw error;
      return data || [];
    },
    enabled: !!orgId,
  });

  // Fetch reports data
  const { data: reportsData, isLoading: isLoadingReports } = useQuery({
    queryKey: ['analytics-reports', orgId],
    queryFn: async () => {
      if (!orgId) return null;
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
    enabled: !!orgId,
  });

  // Fetch uploads
  const { data: uploads = [] } = useQuery({
    queryKey: ['analytics-uploads', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from('beneficiary_uploads')
        .select('id, created_at')
        .eq('organization_id', orgId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!orgId,
  });

  // Fetch replacements
  const { data: replacements = [], isLoading: isLoadingReplacements } = useQuery({
    queryKey: ['analytics-replacements', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from('replacements')
        .select('*')
        .eq('organization_id', orgId);
      if (error) throw error;
      if (!data || data.length === 0) return [];
      
      const childIds = data.map(r => r.original_child_id).filter((id): id is string => !!id);
      const { data: childrenData } = await supabase
        .from('children')
        .select('id, first_name, last_name')
        .in('id', childIds);
      
      const childMap = new Map((childrenData || []).map(c => [c.id, `${c.first_name} ${c.last_name}`]));
      return data.map(r => ({ ...r, original_name: childMap.get(r.original_child_id) || 'N/A' }));
    },
    enabled: !!orgId,
  });

  const isLoading = isLoadingBeneficiaries || isLoadingReports || isLoadingAcademic;

  const tabs = [
    { id: 'reports', label: 'Reports Summary', icon: FileText },
    { id: 'programs', label: 'Programs', icon: Target },
    { id: 'lifecycle', label: 'Beneficiary Lifecycle', icon: Users },
    { id: 'field', label: 'Visitations', icon: Home },
    { id: 'academic', label: 'Academic', icon: GraduationCap },
    { id: 'staff', label: 'Staff Performance', icon: Activity },
    { id: 'system', label: 'Data Quality', icon: Shield }
  ];

  return (
    <div className="space-y-6 pb-8">
      <PageHeroHeader
        icon={BarChart3}
        title="Analytics & Insights"
        description="Enrollment-driven intelligence dashboard — your single source of truth for organizational performance and impact"
      />

      <AnalyticsDateFilter
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        programFilter={programFilter}
        onProgramFilterChange={setProgramFilter}
        programs={programs}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
          <TabsList className="inline-flex w-max md:w-auto md:flex-wrap h-auto gap-1 p-1 bg-muted/50">
            {tabs.map((tab) => (
              <TabsTrigger 
                key={tab.id} 
                value={tab.id}
                className="flex items-center gap-2 whitespace-nowrap data-[state=active]:bg-background data-[state=active]:shadow-sm"
              >
                <tab.icon className="h-4 w-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value="reports">
          <ReportsSummarySection 
            reportsData={reportsData}
            dateRange={dateRange}
            isLoading={isLoadingReports}
          />
        </TabsContent>

        <TabsContent value="programs">
          <ProgramPerformanceSection 
            programs={programs}
            programData={null}
            reportsData={reportsData}
            isLoading={false}
          />
        </TabsContent>

        <TabsContent value="lifecycle">
          <ChildLifecycleSection 
            children={beneficiaries}
            replacements={replacements}
            dateRange={dateRange}
            isLoading={isLoadingBeneficiaries || isLoadingReplacements}
          />
        </TabsContent>

        <TabsContent value="field">
          <FieldActivitySection 
            visitations={visitations}
            beneficiaries={beneficiaries}
            dateRange={dateRange}
            isLoading={isLoadingVisitations || isLoadingBeneficiaries}
          />
        </TabsContent>

        <TabsContent value="academic">
          <AcademicPerformanceSection 
            academicRecords={academicRecords}
            beneficiaries={beneficiaries}
            isLoading={isLoadingAcademic || isLoadingBeneficiaries}
          />
        </TabsContent>

        <TabsContent value="staff">
          <StaffPerformanceSection 
            reportsData={reportsData}
            dateRange={dateRange}
            isLoading={isLoadingReports}
          />
        </TabsContent>

        <TabsContent value="system">
          <SystemIntelligenceSection 
            beneficiaries={beneficiaries}
            enrollments={enrollments}
            programs={programs}
            reportsData={reportsData}
            uploads={uploads}
            isLoading={isLoading}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { 
  Download, 
  Users, 
  GraduationCap, 
  FileText, 
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  XCircle,
  Search,
  BarChart3,
  PieChart,
  Target,
  BookOpen,
  FileWarning,
  Activity,
  MapPin,
  Calendar
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Bar, BarChart, Line, LineChart, Pie, PieChart as RechartsPieChart, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { getCardStyles, CardVariant } from "@/lib/cardStyles";
import { PageHeroHeader } from "@/components/PageHeroHeader";
import { useOrganization } from "@/hooks/useOrganization";
import { downloadExcel } from "@/lib/downloadUtils";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";

const REQUIRED_DOCUMENT_CATEGORIES = ['Profile', 'Consent Form', 'Follow-Up Form', 'Intake Form'];

const CHART_COLORS = {
  primary: 'hsl(var(--primary))',
  secondary: 'hsl(var(--secondary))',
  accent: 'hsl(var(--accent))',
  blue: '#3b82f6',
  pink: '#ec4899',
  purple: '#8b5cf6',
  emerald: '#10b981',
  amber: '#f59e0b',
  red: '#ef4444'
};

export default function ReportsAnalytics() {
  const { currentOrganization } = useOrganization();
  const [missingDocsSearch, setMissingDocsSearch] = useState("");

  // Fetch children data
  const { data: children, isLoading: isLoadingChildren } = useQuery({
    queryKey: ['analytics-children', currentOrganization?.organization_id],
    queryFn: async () => {
      if (!currentOrganization?.organization_id) return [];
      const { data, error } = await supabase
        .from('children')
        .select('id, first_name, last_name, gender, academic_level, grade, institution_name, status, residence, created_at')
        .eq('organization_id', currentOrganization.organization_id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentOrganization?.organization_id,
  });

  // Fetch documents for missing docs analysis
  const { data: documents, isLoading: isLoadingDocs } = useQuery({
    queryKey: ['analytics-documents', currentOrganization?.organization_id],
    queryFn: async () => {
      if (!currentOrganization?.organization_id) return [];
      const childIds = children?.map(c => c.id) || [];
      if (childIds.length === 0) return [];
      const { data, error } = await supabase
        .from('documents')
        .select('child_id, category')
        .in('child_id', childIds);
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentOrganization?.organization_id && !!children?.length,
  });

  // Fetch program data for cross-program analytics
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
      const [homeVisits, schoolVisits, programReports, activityReports] = await Promise.all([
        supabase.from('home_visit_reports').select('id, created_at, staff').eq('organization_id', orgId),
        supabase.from('school_visit_reports').select('id, created_at, staff').eq('organization_id', orgId),
        supabase.from('program_reports').select('id, created_at, staff').eq('organization_id', orgId),
        supabase.from('activity_reports').select('id, created_at, staff').eq('organization_id', orgId)
      ]);
      return {
        homeVisits: homeVisits.data || [],
        schoolVisits: schoolVisits.data || [],
        programReports: programReports.data || [],
        activityReports: activityReports.data || []
      };
    },
    enabled: !!currentOrganization?.organization_id,
  });

  // Calculate missing documents per child
  const childrenWithMissingDocs = useMemo(() => {
    if (!children || !documents) return [];
    return children.map(child => {
      const childDocs = documents.filter(doc => doc.child_id === child.id);
      const uploadedCategories = childDocs.map(doc => doc.category).filter(Boolean);
      const missingCategories = REQUIRED_DOCUMENT_CATEGORIES.filter(
        cat => !uploadedCategories.includes(cat)
      );
      return {
        ...child,
        missingCategories,
        uploadedCategories: REQUIRED_DOCUMENT_CATEGORIES.filter(cat => uploadedCategories.includes(cat)),
        complianceScore: ((REQUIRED_DOCUMENT_CATEGORIES.length - missingCategories.length) / REQUIRED_DOCUMENT_CATEGORIES.length) * 100
      };
    }).filter(child => child.missingCategories.length > 0);
  }, [children, documents]);

  // Filter missing docs by search
  const filteredMissingDocs = useMemo(() => {
    if (!missingDocsSearch) return childrenWithMissingDocs;
    const query = missingDocsSearch.toLowerCase();
    return childrenWithMissingDocs.filter(child =>
      `${child.first_name} ${child.last_name}`.toLowerCase().includes(query) ||
      child.institution_name?.toLowerCase().includes(query)
    );
  }, [childrenWithMissingDocs, missingDocsSearch]);

  // Academic level distribution
  const academicDistribution = useMemo(() => {
    if (!children) return [];
    const counts: Record<string, number> = {};
    children.forEach(child => {
      const level = child.academic_level || 'Not Specified';
      counts[level] = (counts[level] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [children]);

  // Gender distribution
  const genderDistribution = useMemo(() => {
    if (!children) return [];
    const counts = { Male: 0, Female: 0, Other: 0 };
    children.forEach(child => {
      if (child.gender === 'Male') counts.Male++;
      else if (child.gender === 'Female') counts.Female++;
      else if (child.gender) counts.Other++;
    });
    return [
      { name: 'Male', value: counts.Male, color: CHART_COLORS.blue },
      { name: 'Female', value: counts.Female, color: CHART_COLORS.pink },
      { name: 'Other', value: counts.Other, color: CHART_COLORS.purple }
    ].filter(item => item.value > 0);
  }, [children]);

  // Status distribution
  const statusDistribution = useMemo(() => {
    if (!children) return { active: 0, inactive: 0 };
    const active = children.filter(c => c.status === 'active').length;
    return { active, inactive: children.length - active };
  }, [children]);

  // Location distribution
  const locationDistribution = useMemo(() => {
    if (!children) return [];
    const counts: Record<string, number> = {};
    children.forEach(child => {
      const loc = child.residence || 'Not Specified';
      counts[loc] = (counts[loc] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([location, count]) => ({ location, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [children]);

  // Monthly enrollment trends (last 6 months)
  const enrollmentTrends = useMemo(() => {
    if (!children) return [];
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const date = subMonths(new Date(), i);
      const start = startOfMonth(date);
      const end = endOfMonth(date);
      const count = children.filter(c => {
        const created = new Date(c.created_at);
        return created >= start && created <= end;
      }).length;
      months.push({
        month: format(date, 'MMM yyyy'),
        enrollments: count
      });
    }
    return months;
  }, [children]);

  // Program summary
  const programSummary = useMemo(() => {
    if (!programData) return [];
    return [
      { name: 'Education (Children)', count: children?.length || 0, icon: GraduationCap, color: 'bg-blue-500' },
      { name: 'Feeding Program', count: programData.feeding.length, icon: Activity, color: 'bg-emerald-500' },
      { name: 'Kipawa Sato', count: programData.kipawa.length, icon: Target, color: 'bg-amber-500' },
      { name: 'Self Empowerment', count: programData.selfEmpowerment.length, icon: TrendingUp, color: 'bg-purple-500' },
      { name: 'Family Adoption', count: programData.familyAdoption.reduce((sum, f) => sum + (f.no_of_beneficiaries || 1), 0), icon: Users, color: 'bg-pink-500' },
      { name: 'Support Groups', count: programData.supportGroups.reduce((sum, g) => sum + (g.member_count || 0), 0), icon: Users, color: 'bg-indigo-500' },
      { name: 'Medical Records', count: programData.medical.length, icon: FileText, color: 'bg-red-500' }
    ];
  }, [children, programData]);

  // Reports summary
  const reportsSummary = useMemo(() => {
    if (!reportsData) return { total: 0, breakdown: [] };
    const total = reportsData.homeVisits.length + reportsData.schoolVisits.length + 
                  reportsData.programReports.length + reportsData.activityReports.length;
    return {
      total,
      breakdown: [
        { name: 'Home Visits', value: reportsData.homeVisits.length, color: CHART_COLORS.blue },
        { name: 'School Visits', value: reportsData.schoolVisits.length, color: CHART_COLORS.emerald },
        { name: 'Program Reports', value: reportsData.programReports.length, color: CHART_COLORS.purple },
        { name: 'Activity Reports', value: reportsData.activityReports.length, color: CHART_COLORS.amber }
      ].filter(item => item.value > 0)
    };
  }, [reportsData]);

  // Document compliance rate
  const complianceRate = useMemo(() => {
    if (!children?.length) return 0;
    const compliantChildren = children.length - childrenWithMissingDocs.length;
    return Math.round((compliantChildren / children.length) * 100);
  }, [children, childrenWithMissingDocs]);

  // Export missing documents
  const handleExportMissingDocs = () => {
    if (!filteredMissingDocs.length) {
      toast.error("No missing documents data to export");
      return;
    }
    const data = filteredMissingDocs.map(child => ({
      "Student Name": `${child.first_name} ${child.last_name}`,
      "Academic Level": child.academic_level || "N/A",
      "Institution": child.institution_name || "N/A",
      "Missing Documents": child.missingCategories.join(", "),
      "Compliance Score": `${child.complianceScore.toFixed(0)}%`
    }));
    downloadExcel(data, 'missing_documents_report', 'Missing Documents');
    toast.success("Missing documents report exported");
  };

  const isLoading = isLoadingChildren || isLoadingDocs || isLoadingPrograms || isLoadingReports;

  const overviewStats = [
    {
      title: "Total Students",
      value: children?.length || 0,
      icon: Users,
      trend: enrollmentTrends.length > 1 ? enrollmentTrends[enrollmentTrends.length - 1].enrollments - enrollmentTrends[enrollmentTrends.length - 2].enrollments : 0
    },
    {
      title: "Active Students",
      value: statusDistribution.active,
      icon: CheckCircle2,
      percentage: children?.length ? Math.round((statusDistribution.active / children.length) * 100) : 0
    },
    {
      title: "Document Compliance",
      value: `${complianceRate}%`,
      icon: FileText,
      alert: complianceRate < 80
    },
    {
      title: "Total Reports",
      value: reportsSummary.total,
      icon: BarChart3
    }
  ];

  return (
    <div className="space-y-6 pb-8">
      <PageHeroHeader
        icon={BarChart3}
        title="Analytics & Insights"
        description="Comprehensive analytics, compliance tracking, and program insights"
      />

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {overviewStats.map((stat, index) => {
          const cardStyle = getCardStyles((index % 6) as CardVariant);
          return (
            <Card key={stat.title} className={`${cardStyle} border-l-4`}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-2xl font-bold">{stat.value}</p>
                      {stat.trend !== undefined && stat.trend !== 0 && (
                        <Badge variant={stat.trend > 0 ? "default" : "destructive"} className="text-xs">
                          {stat.trend > 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                          {Math.abs(stat.trend)}
                        </Badge>
                      )}
                      {stat.alert && (
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                      )}
                    </div>
                    {stat.percentage !== undefined && (
                      <p className="text-xs text-muted-foreground mt-1">{stat.percentage}% of total</p>
                    )}
                  </div>
                  <div className="p-3 rounded-xl bg-primary/10">
                    <stat.icon className="h-6 w-6 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
          <TabsTrigger value="overview" className="gap-2">
            <PieChart className="h-4 w-4 hidden sm:inline" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="academic" className="gap-2">
            <GraduationCap className="h-4 w-4 hidden sm:inline" />
            Academic
          </TabsTrigger>
          <TabsTrigger value="programs" className="gap-2">
            <Target className="h-4 w-4 hidden sm:inline" />
            Programs
          </TabsTrigger>
          <TabsTrigger value="compliance" className="gap-2">
            <FileWarning className="h-4 w-4 hidden sm:inline" />
            Compliance
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Enrollment Trends */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Enrollment Trends
                </CardTitle>
                <CardDescription>New enrollments over the last 6 months</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <AreaChart data={enrollmentTrends}>
                    <defs>
                      <linearGradient id="enrollmentGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.3}/>
                        <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="month" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip />
                    <Area 
                      type="monotone" 
                      dataKey="enrollments" 
                      stroke={CHART_COLORS.primary}
                      fillOpacity={1}
                      fill="url(#enrollmentGradient)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Gender Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Gender Distribution
                </CardTitle>
                <CardDescription>Breakdown by gender across all students</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <RechartsPieChart>
                    <Pie
                      data={genderDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={4}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {genderDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Location Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-primary" />
                  Location Distribution
                </CardTitle>
                <CardDescription>Students by residence area</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={locationDistribution} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis type="number" className="text-xs" />
                    <YAxis dataKey="location" type="category" width={100} className="text-xs" />
                    <Tooltip />
                    <Bar dataKey="count" fill={CHART_COLORS.primary} radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Report Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Reports by Type
                </CardTitle>
                <CardDescription>Distribution of submitted reports</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <RechartsPieChart>
                    <Pie
                      data={reportsSummary.breakdown}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={4}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {reportsSummary.breakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Academic Tab */}
        <TabsContent value="academic" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Academic Level Distribution */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-primary" />
                  Academic Level Distribution
                </CardTitle>
                <CardDescription>Students grouped by their current academic level</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={academicDistribution}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="name" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip />
                    <Bar dataKey="value" fill={CHART_COLORS.primary} radius={[4, 4, 0, 0]}>
                      {academicDistribution.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={Object.values(CHART_COLORS)[index % Object.values(CHART_COLORS).length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Active vs Inactive Students */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-primary" />
                  Student Status
                </CardTitle>
                <CardDescription>Active vs inactive enrollment status</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    <span className="font-medium">Active Students</span>
                  </div>
                  <span className="text-2xl font-bold text-emerald-600">{statusDistribution.active}</span>
                </div>
                <Progress value={children?.length ? (statusDistribution.active / children.length) * 100 : 0} className="h-3" />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <XCircle className="h-5 w-5 text-red-500" />
                    <span className="font-medium">Inactive Students</span>
                  </div>
                  <span className="text-2xl font-bold text-red-600">{statusDistribution.inactive}</span>
                </div>
                <Progress value={children?.length ? (statusDistribution.inactive / children.length) * 100 : 0} className="h-3 [&>div]:bg-red-500" />
              </CardContent>
            </Card>

            {/* Quick Academic Insights */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-primary" />
                  Key Insights
                </CardTitle>
                <CardDescription>Important academic metrics</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Document Compliance</span>
                    <Badge variant={complianceRate >= 80 ? "default" : complianceRate >= 50 ? "secondary" : "destructive"}>
                      {complianceRate}%
                    </Badge>
                  </div>
                  <Progress value={complianceRate} className="h-2" />
                </div>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Total Institutions</span>
                    <span className="font-bold">{new Set(children?.map(c => c.institution_name).filter(Boolean)).size}</span>
                  </div>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Students Missing Docs</span>
                    <Badge variant="destructive">{childrenWithMissingDocs.length}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Programs Tab */}
        <TabsContent value="programs" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {programSummary.map((program, index) => {
              const cardStyle = getCardStyles((index % 6) as CardVariant);
              return (
                <Card key={program.name} className={`${cardStyle} border-l-4 hover:shadow-lg transition-shadow`}>
                  <CardContent className="p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`p-2 rounded-lg ${program.color}`}>
                        <program.icon className="h-5 w-5 text-white" />
                      </div>
                      <h3 className="font-semibold text-sm">{program.name}</h3>
                    </div>
                    <p className="text-3xl font-bold">{program.count}</p>
                    <p className="text-xs text-muted-foreground mt-1">Total beneficiaries</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Program Comparison Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                Program Comparison
              </CardTitle>
              <CardDescription>Beneficiary count across all programs</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={programSummary}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" className="text-xs" angle={-45} textAnchor="end" height={100} />
                  <YAxis className="text-xs" />
                  <Tooltip />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {programSummary.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={Object.values(CHART_COLORS)[index % Object.values(CHART_COLORS).length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Compliance Tab */}
        <TabsContent value="compliance" className="space-y-6">
          {/* Compliance Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className={complianceRate >= 80 ? "border-l-4 border-l-emerald-500" : complianceRate >= 50 ? "border-l-4 border-l-amber-500" : "border-l-4 border-l-red-500"}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Compliance Rate</p>
                    <p className="text-3xl font-bold">{complianceRate}%</p>
                  </div>
                  {complianceRate >= 80 ? (
                    <CheckCircle2 className="h-10 w-10 text-emerald-500" />
                  ) : complianceRate >= 50 ? (
                    <AlertTriangle className="h-10 w-10 text-amber-500" />
                  ) : (
                    <XCircle className="h-10 w-10 text-red-500" />
                  )}
                </div>
                <Progress value={complianceRate} className="h-2 mt-3" />
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-emerald-500">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Compliant Students</p>
                    <p className="text-3xl font-bold text-emerald-600">{(children?.length || 0) - childrenWithMissingDocs.length}</p>
                  </div>
                  <CheckCircle2 className="h-10 w-10 text-emerald-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-red-500">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Students Missing Docs</p>
                    <p className="text-3xl font-bold text-red-600">{childrenWithMissingDocs.length}</p>
                  </div>
                  <FileWarning className="h-10 w-10 text-red-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Missing Documents Table */}
          <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FileWarning className="h-5 w-5 text-red-500" />
                  Students Missing Required Documents
                </CardTitle>
                <CardDescription>
                  Required: {REQUIRED_DOCUMENT_CATEGORIES.join(", ")}
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search students..."
                    value={missingDocsSearch}
                    onChange={(e) => setMissingDocsSearch(e.target.value)}
                    className="pl-10 w-[200px]"
                  />
                </div>
                <Button onClick={handleExportMissingDocs} variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                </div>
              ) : filteredMissingDocs.length > 0 ? (
                <ScrollArea className="h-[400px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Student Name</TableHead>
                        <TableHead>Academic Level</TableHead>
                        <TableHead>Institution</TableHead>
                        <TableHead>Missing Documents</TableHead>
                        <TableHead>Compliance</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredMissingDocs.map((child) => (
                        <TableRow key={child.id}>
                          <TableCell className="font-medium">
                            {child.first_name} {child.last_name}
                          </TableCell>
                          <TableCell>{child.academic_level || <span className="text-muted-foreground">N/A</span>}</TableCell>
                          <TableCell>{child.institution_name || <span className="text-muted-foreground">N/A</span>}</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {child.missingCategories.map((cat) => (
                                <Badge key={cat} variant="destructive" className="text-xs">
                                  {cat}
                                </Badge>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Progress value={child.complianceScore} className="h-2 w-16" />
                              <span className="text-xs text-muted-foreground">{child.complianceScore.toFixed(0)}%</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              ) : (
                <div className="text-center py-12">
                  <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto mb-4" />
                  <h3 className="font-semibold text-lg mb-1">All Students Compliant!</h3>
                  <p className="text-muted-foreground">All students have the required documents uploaded.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

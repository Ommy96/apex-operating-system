import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, BarChart3, Target, MessageSquare, FolderKanban,
  Users, DollarSign, Heart, Calendar, TrendingUp, Clock,
 ChevronRight, Activity, Layers, Flag, Network, CalendarClock, ShieldAlert, Handshake, Package, Megaphone, Sprout
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { ProgramObservations, ProgramIndicators } from "@/components/programs";
import { ProgramProjects } from "@/components/programs/ProgramProjects";
import { ProgramFunding } from "@/components/programs/ProgramFunding";
import { ProgramSponsorshipDashboard } from "@/components/programs/ProgramSponsorshipDashboard";
import { ProgramTeam } from "@/components/programs/ProgramTeam";
import { ProgramMilestones } from "@/components/programs/ProgramMilestones";
import { ProgramLogframe } from "@/components/programs/ProgramLogframe";
import { ProgramMESchedule } from "@/components/programs/ProgramMESchedule";
import { ProgramRiskRegister } from "@/components/programs/ProgramRiskRegister";
import { ProgramPartners } from "@/components/programs/ProgramPartners";
import { ProgramReachTargets } from "@/components/programs/ProgramReachTargets";
import { DonorReportPacks } from "@/components/programs/DonorReportPacks";
import { ProgramCommsPlan } from "@/components/programs/ProgramCommsPlan";
import { SustainabilityPlan } from "@/components/programs/SustainabilityPlan";
import { format, differenceInDays, isPast, isFuture } from "date-fns";

const statusConfig: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  planning: { label: "Planning", color: "text-muted-foreground", bg: "bg-muted/60", dot: "bg-muted-foreground" },
  active: { label: "Active", color: "text-success", bg: "bg-success/10", dot: "bg-success" },
  on_hold: { label: "On Hold", color: "text-warning", bg: "bg-warning/10", dot: "bg-warning" },
  completed: { label: "Completed", color: "text-primary", bg: "bg-primary/10", dot: "bg-primary" },
};

const ProgramDashboard = () => {
  const { programId } = useParams<{ programId: string }>();
  const navigate = useNavigate();
  const { currentOrganization } = useOrganization();
  const [activeTab, setActiveTab] = useState("overview");

  const { data: program, isLoading } = useQuery({
    queryKey: ['program-detail', programId],
    queryFn: async () => {
      if (!programId) return null;
      const { data, error } = await supabase
        .from('programs')
        .select('*')
        .eq('id', programId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!programId,
  });

  const { data: projects } = useQuery({
    queryKey: ['program-projects', programId],
    queryFn: async () => {
      if (!programId) return [];
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('program_id', programId)
        .order('name');
      if (error) throw error;
      return data;
    },
    enabled: !!programId,
  });

  const { data: beneficiaryCount } = useQuery({
    queryKey: ['program-beneficiaries-count', programId],
    queryFn: async () => {
      if (!programId || !currentOrganization?.organization_id) return 0;
      // Distinct beneficiaries enrolled in this program (any of its projects)
      const { data, error } = await supabase
        .from('beneficiary_services')
        .select('beneficiary_id')
        .eq('program_id', programId)
        .eq('organization_id', currentOrganization.organization_id)
        .eq('status', 'active');
      if (error) throw error;
      const unique = new Set((data || []).map((r: any) => r.beneficiary_id));
      return unique.size;
    },
    enabled: !!programId && !!currentOrganization?.organization_id,
  });

  const { data: activitiesCount } = useQuery({
    queryKey: ['program-activities-count', programId],
    queryFn: async () => {
      if (!programId) return { total: 0, completed: 0 };
      const { data, error } = await supabase
        .from('activities')
        .select('id, status')
        .eq('program_id', programId);
      if (error) throw error;
      const total = data?.length || 0;
      const completed = data?.filter(a => a.status === 'completed').length || 0;
      return { total, completed };
    },
    enabled: !!programId,
  });

  const timeline = useMemo(() => {
    if (!program?.start_date) return null;
    const start = new Date(program.start_date);
    const end = program.end_date ? new Date(program.end_date) : null;
    const today = new Date();
    if (!end) return { progress: null, daysLeft: null, totalDays: null, elapsed: differenceInDays(today, start) };
    const totalDays = differenceInDays(end, start);
    const elapsed = differenceInDays(today, start);
    const progress = Math.min(100, Math.max(0, Math.round((elapsed / totalDays) * 100)));
    const daysLeft = differenceInDays(end, today);
    return { progress, daysLeft, totalDays, elapsed };
  }, [program]);

  const status = statusConfig[program?.status || "planning"] || statusConfig.planning;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-9 rounded-lg" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-7 w-64" />
            <Skeleton className="h-4 w-96" />
          </div>
        </div>
        <Skeleton className="h-40 w-full rounded-2xl" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!program) {
    return (
      <div className="text-center py-16">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-muted mb-4">
          <Layers className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-1">Program not found</h3>
        <p className="text-sm text-muted-foreground mb-4">This program may have been moved or deleted.</p>
        <Button variant="outline" onClick={() => navigate('/programs-management')}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Programs
        </Button>
      </div>
    );
  }

  const activityCompletion = activitiesCount
    ? activitiesCount.total > 0
      ? Math.round((activitiesCount.completed / activitiesCount.total) * 100)
      : 0
    : 0;

  return (
    <div className="space-y-6">
      {/* ─── Hero Header ─── */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-primary/[0.06] via-accent/[0.04] to-transparent p-6 md:p-8">
        {/* Decorative blobs */}
        <div className="absolute -top-20 -right-20 h-56 w-56 rounded-full bg-primary/[0.06] blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 h-40 w-40 rounded-full bg-accent/[0.05] blur-2xl pointer-events-none" />

        <div className="relative flex flex-col md:flex-row md:items-start gap-4">
          {/* Back + title */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/programs-management')}
            className="shrink-0 rounded-xl bg-background/60 backdrop-blur border border-border/50 hover:bg-background"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>

          <div className="flex-1 min-w-0 space-y-3">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
                {program.name}
              </h1>
              <Badge className={`${status.bg} ${status.color} border-0 gap-1.5 px-3 py-1 text-xs font-semibold`}>
                <span className={`inline-block h-2 w-2 rounded-full ${status.dot}`} />
                {status.label}
              </Badge>
            </div>

            {program.description && (
              <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl line-clamp-2">
                {program.description}
              </p>
            )}

            {/* Timeline bar */}
            {timeline && timeline.progress !== null && (
              <div className="max-w-md space-y-1.5">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {format(new Date(program.start_date!), 'MMM yyyy')}
                  </span>
                  <span className="font-medium text-foreground">{timeline.progress}% elapsed</span>
                  <span>{program.end_date ? format(new Date(program.end_date), 'MMM yyyy') : ''}</span>
                </div>
                <Progress value={timeline.progress} className="h-2" />
                {timeline.daysLeft !== null && timeline.daysLeft > 0 && (
                  <p className="text-xs text-muted-foreground">
                    <Clock className="inline h-3 w-3 mr-1" />
                    {timeline.daysLeft} days remaining
                  </p>
                )}
                {timeline.daysLeft !== null && timeline.daysLeft <= 0 && program.status !== 'completed' && (
                  <p className="text-xs text-destructive font-medium">
                    <Clock className="inline h-3 w-3 mr-1" />
                    Program timeline has ended
                  </p>
                )}
              </div>
            )}

            {/* Tags */}
            {program.target_population && program.target_population.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {program.target_population.map((pop: string) => (
                  <Badge key={pop} variant="secondary" className="text-xs font-normal bg-secondary/80">
                    {pop}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── Stat Cards ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Users}
          label="Beneficiaries"
          value={beneficiaryCount || 0}
          accent="primary"
        />
        <StatCard
          icon={FolderKanban}
          label="Projects"
          value={projects?.length || 0}
          accent="accent"
        />
        <StatCard
          icon={Activity}
          label="Activities"
          value={`${activitiesCount?.completed || 0}/${activitiesCount?.total || 0}`}
          subtitle={activitiesCount?.total ? `${activityCompletion}% complete` : undefined}
          accent="success"
        />
        <StatCard
          icon={TrendingUp}
          label="Timeline"
          value={timeline?.progress !== null ? `${timeline?.progress}%` : '—'}
          subtitle={timeline?.daysLeft && timeline.daysLeft > 0 ? `${timeline.daysLeft}d left` : program.end_date ? 'Ended' : 'Ongoing'}
          accent="warning"
        />
      </div>

      {/* ─── Tabs ─── */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="overflow-x-auto no-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
          <TabsList className="inline-flex w-max md:w-auto bg-muted/50 p-1 rounded-xl">
            {[
              { value: "overview", icon: BarChart3, label: "Overview" },
              { value: "projects", icon: FolderKanban, label: "Projects" },
            { value: "team", icon: Users, label: "Team" },
            { value: "milestones", icon: Flag, label: "Milestones" },
              { value: "logframe", icon: Network, label: "Logframe" },
              { value: "funding", icon: DollarSign, label: "Funding" },
              { value: "indicators", icon: Target, label: "Indicators" },
              { value: "me_schedule", icon: CalendarClock, label: "M&E Schedule" },
              { value: "risks", icon: ShieldAlert, label: "Risks" },
              { value: "partners", icon: Handshake, label: "Partners" },
              { value: "reach", icon: Target, label: "Reach" },
              { value: "observations", icon: MessageSquare, label: "Observations" },
              { value: "sponsorship", icon: Heart, label: "Sponsorship" },
              { value: "donor_packs", icon: Package, label: "Donor Packs" },
              { value: "comms", icon: Megaphone, label: "Comms" },
              { value: "sustainability", icon: Sprout, label: "Sustainability" },
            ].map(tab => (
              <TabsTrigger key={tab.value} value={tab.value} className="gap-2 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <tab.icon className="h-4 w-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {activeTab === "overview" && (
          <TabsContent value="overview" forceMount className="mt-6 space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Program Details */}
              <Card className="border-border/60">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Layers className="h-4 w-4 text-primary" />
                    </div>
                    Program Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {program.category && (
                    <DetailRow label="Category" value={<Badge variant="outline" className="capitalize">{program.category}</Badge>} />
                  )}
                  {program.start_date && (
                    <DetailRow label="Start Date" value={format(new Date(program.start_date), 'MMM d, yyyy')} />
                  )}
                  {program.end_date && (
                    <DetailRow label="End Date" value={format(new Date(program.end_date), 'MMM d, yyyy')} />
                  )}
                  {!program.end_date && <DetailRow label="End Date" value={<Badge variant="secondary" className="text-xs">Ongoing</Badge>} />}
                  {program.objectives && (
                    <div className="pt-2 border-t border-border/50">
                      <p className="text-xs font-medium text-muted-foreground mb-1.5">Objectives</p>
                      <p className="text-sm leading-relaxed">{program.objectives}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Projects List */}
              <Card className="border-border/60">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <div className="h-8 w-8 rounded-lg bg-accent/10 flex items-center justify-center">
                        <FolderKanban className="h-4 w-4 text-accent" />
                      </div>
                      Projects
                      <Badge variant="secondary" className="ml-1 text-xs">{projects?.length || 0}</Badge>
                    </CardTitle>
                    {(projects?.length || 0) > 5 && (
                      <Button variant="ghost" size="sm" onClick={() => setActiveTab("projects")} className="text-xs gap-1">
                        View all <ChevronRight className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {projects?.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center mb-3">
                        <FolderKanban className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <p className="text-sm text-muted-foreground">No projects yet</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {projects?.slice(0, 5).map((project) => {
                        const pStatus = statusConfig[project.status || 'active'] || statusConfig.planning;
                        return (
                          <button
                            key={project.id}
                            onClick={() => navigate(`/project/${project.id}`)}
                            className="w-full flex items-center justify-between p-3 rounded-xl bg-muted/40 hover:bg-muted/70 transition-colors group text-left"
                          >
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">{project.name}</p>
                              {project.project_code && (
                                <p className="text-xs text-muted-foreground mt-0.5">{project.project_code}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <Badge variant="outline" className={`text-xs border-0 ${pStatus.bg} ${pStatus.color}`}>
                                {pStatus.label}
                              </Badge>
                              <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Activity completion bar */}
            {activitiesCount && activitiesCount.total > 0 && (
              <Card className="border-border/60">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-lg bg-success/10 flex items-center justify-center">
                        <Activity className="h-4 w-4 text-success" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Activity Completion</p>
                        <p className="text-xs text-muted-foreground">{activitiesCount.completed} of {activitiesCount.total} activities completed</p>
                      </div>
                    </div>
                    <span className="text-2xl font-bold text-foreground">{activityCompletion}%</span>
                  </div>
                  <Progress value={activityCompletion} className="h-2.5" />
                </CardContent>
              </Card>
            )}

            <ProgramIndicators programId={programId} showAddButton={false} />
          </TabsContent>
        )}

        {activeTab === "projects" && (
          <TabsContent value="projects" forceMount className="mt-6">
            <ProgramProjects programId={programId} />
          </TabsContent>
        )}
        {activeTab === "team" && (
          <TabsContent value="team" forceMount className="mt-6">
            <ProgramTeam programId={programId} />
          </TabsContent>
        )}
        {activeTab === "milestones" && (
          <TabsContent value="milestones" forceMount className="mt-6">
            <ProgramMilestones programId={programId} />
          </TabsContent>
        )}
        {activeTab === "logframe" && (
          <TabsContent value="logframe" forceMount className="mt-6">
            <ProgramLogframe programId={programId!} orgId={currentOrganization?.organization_id} />
          </TabsContent>
        )}
        {activeTab === "funding" && (
          <TabsContent value="funding" forceMount className="mt-6">
            <ProgramFunding programId={programId} />
          </TabsContent>
        )}
        {activeTab === "indicators" && (
          <TabsContent value="indicators" forceMount className="mt-6">
            <ProgramIndicators programId={programId} />
          </TabsContent>
        )}
        {activeTab === "me_schedule" && (
          <TabsContent value="me_schedule" forceMount className="mt-6">
            <ProgramMESchedule programId={programId!} orgId={currentOrganization?.organization_id} />
          </TabsContent>
        )}
        {activeTab === "risks" && (
          <TabsContent value="risks" forceMount className="mt-6">
            <ProgramRiskRegister programId={programId!} orgId={currentOrganization?.organization_id} />
          </TabsContent>
        )}
        {activeTab === "partners" && (
          <TabsContent value="partners" forceMount className="mt-6">
            <ProgramPartners programId={programId!} orgId={currentOrganization?.organization_id} />
          </TabsContent>
        )}
        {activeTab === "reach" && (
          <TabsContent value="reach" forceMount className="mt-6">
            <ProgramReachTargets programId={programId!} orgId={currentOrganization?.organization_id} />
          </TabsContent>
        )}
        {activeTab === "observations" && (
          <TabsContent value="observations" forceMount className="mt-6">
            <ProgramObservations programId={programId} />
          </TabsContent>
        )}
        {activeTab === "sponsorship" && (
          <TabsContent value="sponsorship" forceMount className="mt-6">
            <ProgramSponsorshipDashboard programId={programId} />
          </TabsContent>
        )}
        {activeTab === "donor_packs" && (
          <TabsContent value="donor_packs" forceMount className="mt-6">
            <DonorReportPacks programId={programId!} orgId={currentOrganization?.organization_id} />
          </TabsContent>
        )}
        {activeTab === "comms" && (
          <TabsContent value="comms" forceMount className="mt-6">
            <ProgramCommsPlan programId={programId!} orgId={currentOrganization?.organization_id} />
          </TabsContent>
        )}
        {activeTab === "sustainability" && (
          <TabsContent value="sustainability" forceMount className="mt-6">
            <SustainabilityPlan programId={programId!} orgId={currentOrganization?.organization_id} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

/* ─── Sub-components ─── */

function StatCard({ icon: Icon, label, value, subtitle, accent }: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  subtitle?: string;
  accent: "primary" | "accent" | "success" | "warning";
}) {
  const colors = {
    primary: { bg: "bg-primary/10", text: "text-primary" },
    accent: { bg: "bg-accent/10", text: "text-accent" },
    success: { bg: "bg-success/10", text: "text-success" },
    warning: { bg: "bg-warning/10", text: "text-warning" },
  };
  const c = colors[accent];
  return (
    <Card className="border-border/60 hover:shadow-elevation-2 transition-shadow">
      <CardContent className="pt-5 pb-4 px-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
            <p className="text-2xl font-bold text-foreground">{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          </div>
          <div className={`h-10 w-10 rounded-xl ${c.bg} flex items-center justify-center shrink-0`}>
            <Icon className={`h-5 w-5 ${c.text}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{typeof value === 'string' ? value : value}</span>
    </div>
  );
}

export default ProgramDashboard;

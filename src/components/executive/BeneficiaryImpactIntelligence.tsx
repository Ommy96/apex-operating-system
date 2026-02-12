import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend, AreaChart, Area,
} from "recharts";
import {
  GraduationCap, Heart, AlertTriangle, Users, Eye, Activity,
  ShieldAlert, TrendingUp, ClipboardCheck, UserX,
} from "lucide-react";
import { cn } from "@/lib/utils";

const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--accent))',
  'hsl(var(--warning, 45 93% 47%))',
  'hsl(var(--info, 217 91% 60%))',
  'hsl(var(--destructive))',
  'hsl(var(--muted-foreground))',
];

interface BeneficiaryImpactData {
  academicTrends: { term: string; students: number; avgScore: number; avgGradeScore: number }[];
  gradeDistribution: Record<string, number>;
  avgServicesPerBenef: number;
  multiServiceBenefs: number;
  avgVisitsPerBenef: number;
  overdue90: number;
  followUpCompletionRate: number;
  totalFollowUpsRequired: number;
  specialNeedsCount: number;
  hivPositiveCount: number;
  medicalConditionsCount: number;
  missingDOB: number;
  missingLocation: number;
  visitTypeBreakdown: Record<string, number>;
  serviceDistribution: { range: string; count: number }[];
  totalBeneficiariesWithVisits: number;
  visitCoverageRate: number;
}

interface Props {
  data: BeneficiaryImpactData;
  isLoading: boolean;
}

export function BeneficiaryImpactIntelligence({ data, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i}><CardContent className="p-6"><Skeleton className="h-40 w-full" /></CardContent></Card>
        ))}
      </div>
    );
  }

  const gradeData = Object.entries(data.gradeDistribution)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => {
      const order = ['ME1', 'ME2', 'BE1', 'BE2', 'AE1', 'AE2', 'EE1', 'EE2'];
      return order.indexOf(a.name) - order.indexOf(b.name);
    });

  const visitTypeData = Object.entries(data.visitTypeBreakdown)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([name, value]) => ({ name, value }));

  const totalVisitTypes = visitTypeData.reduce((s, d) => s + d.value, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Heart className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold text-foreground">Beneficiary Impact & Outcome Intelligence</h3>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <KpiCard label="Avg Services/Beneficiary" value={data.avgServicesPerBenef} icon={<Activity className="h-4 w-4" />} color="primary" />
        <KpiCard label="Multi-Service Beneficiaries" value={data.multiServiceBenefs} icon={<Users className="h-4 w-4" />} color="accent" />
        <KpiCard label="Avg Visits/Beneficiary" value={data.avgVisitsPerBenef} icon={<Eye className="h-4 w-4" />} color="info" />
        <KpiCard label="Visit Coverage" value={`${data.visitCoverageRate}%`} icon={<ClipboardCheck className="h-4 w-4" />} color="success" />
        <KpiCard label="Overdue Visits (90d+)" value={data.overdue90} icon={<AlertTriangle className="h-4 w-4" />} color={data.overdue90 > 0 ? "danger" : "success"} />
        <KpiCard label="Follow-Up Rate" value={`${data.followUpCompletionRate}%`} icon={<TrendingUp className="h-4 w-4" />} color={data.followUpCompletionRate >= 70 ? "success" : "warning"} />
      </div>

      <Tabs defaultValue="academic" className="space-y-4">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="academic" className="text-xs">Academic Impact</TabsTrigger>
          <TabsTrigger value="services" className="text-xs">Service History</TabsTrigger>
          <TabsTrigger value="vulnerability" className="text-xs">Vulnerability</TabsTrigger>
          <TabsTrigger value="visitations" className="text-xs">Visitation Analysis</TabsTrigger>
        </TabsList>

        {/* Academic Impact */}
        <TabsContent value="academic" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Academic Trends */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <GraduationCap className="h-4 w-4 text-primary" />
                  Academic Performance Trends
                </CardTitle>
              </CardHeader>
              <CardContent>
                {data.academicTrends.length > 0 ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <AreaChart data={data.academicTrends}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="term" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} angle={-30} textAnchor="end" height={50} />
                      <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                      <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }} />
                      <Legend />
                      <Area type="monotone" dataKey="avgScore" name="Avg Score %" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.15} strokeWidth={2} />
                      <Area type="monotone" dataKey="students" name="Students Assessed" stroke="hsl(var(--accent))" fill="hsl(var(--accent))" fillOpacity={0.1} strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-10">No academic data available yet</p>
                )}
              </CardContent>
            </Card>

            {/* Grade Distribution */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Grade Distribution (All Terms)</CardTitle>
              </CardHeader>
              <CardContent>
                {gradeData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={gradeData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                      <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                      <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }} />
                      <Bar dataKey="value" name="Count" radius={[4, 4, 0, 0]}>
                        {gradeData.map((entry, i) => {
                          const gradeColorMap: Record<string, string> = {
                            'EE2': 'hsl(var(--primary))', 'EE1': 'hsl(var(--primary))',
                            'AE2': 'hsl(var(--accent))', 'AE1': 'hsl(var(--accent))',
                            'BE2': 'hsl(var(--warning, 45 93% 47%))', 'BE1': 'hsl(var(--warning, 45 93% 47%))',
                            'ME2': 'hsl(var(--destructive))', 'ME1': 'hsl(var(--destructive))',
                          };
                          return <Cell key={i} fill={gradeColorMap[entry.name] || COLORS[i % COLORS.length]} />;
                        })}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-10">No grade data available</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Service History */}
        <TabsContent value="services" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Service Distribution */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Service Enrollment Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={data.serviceDistribution}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="range" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                    <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                    <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }} />
                    <Bar dataKey="count" name="Beneficiaries" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]}>
                      {data.serviceDistribution.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Service engagement insights */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Service Engagement Insights</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <InsightRow
                  label="Average services per beneficiary"
                  value={data.avgServicesPerBenef.toString()}
                  status={data.avgServicesPerBenef >= 1.5 ? 'good' : data.avgServicesPerBenef >= 1 ? 'neutral' : 'warning'}
                />
                <InsightRow
                  label="Beneficiaries with multiple services"
                  value={data.multiServiceBenefs.toString()}
                  status="neutral"
                />
                <InsightRow
                  label="Beneficiaries with no services"
                  value={data.serviceDistribution[0]?.count.toString() || '0'}
                  status={data.serviceDistribution[0]?.count > 0 ? 'warning' : 'good'}
                />
                <InsightRow
                  label="Follow-up completion rate"
                  value={`${data.followUpCompletionRate}%`}
                  status={data.followUpCompletionRate >= 80 ? 'good' : data.followUpCompletionRate >= 50 ? 'neutral' : 'warning'}
                />
                <InsightRow
                  label="Total follow-ups required"
                  value={data.totalFollowUpsRequired.toString()}
                  status="neutral"
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Vulnerability */}
        <TabsContent value="vulnerability" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <VulnerabilityCard
              icon={<ShieldAlert className="h-5 w-5" />}
              title="Special Needs"
              count={data.specialNeedsCount}
              color="warning"
              description="Beneficiaries identified with special needs"
            />
            <VulnerabilityCard
              icon={<Heart className="h-5 w-5" />}
              title="HIV Positive"
              count={data.hivPositiveCount}
              color="danger"
              description="Beneficiaries with positive HIV status"
            />
            <VulnerabilityCard
              icon={<AlertTriangle className="h-5 w-5" />}
              title="Medical Conditions"
              count={data.medicalConditionsCount}
              color="info"
              description="Beneficiaries with other medical conditions"
            />
            <VulnerabilityCard
              icon={<UserX className="h-5 w-5" />}
              title="Overdue Visits (90d+)"
              count={data.overdue90}
              color={data.overdue90 > 5 ? "danger" : "warning"}
              description="Active beneficiaries not visited in 90+ days"
            />
            <VulnerabilityCard
              icon={<AlertTriangle className="h-5 w-5" />}
              title="Missing DOB"
              count={data.missingDOB}
              color="neutral"
              description="Active beneficiaries without date of birth"
            />
            <VulnerabilityCard
              icon={<AlertTriangle className="h-5 w-5" />}
              title="Missing Location"
              count={data.missingLocation}
              color="neutral"
              description="Active beneficiaries without county or location"
            />
          </div>
        </TabsContent>

        {/* Visitation Analysis */}
        <TabsContent value="visitations" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Visit Type Breakdown */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Visit Type Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                {visitTypeData.length > 0 ? (
                  <div className="flex items-center gap-6">
                    <ResponsiveContainer width="45%" height={200}>
                      <PieChart>
                        <Pie data={visitTypeData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="value" strokeWidth={2}>
                          {visitTypeData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-2 flex-1">
                      {visitTypeData.map((d, i) => (
                        <div key={d.name} className="flex items-center justify-between gap-2 text-xs">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                            <span className="truncate capitalize">{d.name.replace(/_/g, ' ')}</span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="font-semibold">{d.value}</span>
                            <span className="text-muted-foreground">({totalVisitTypes > 0 ? Math.round((d.value / totalVisitTypes) * 100) : 0}%)</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-10">No visitation data</p>
                )}
              </CardContent>
            </Card>

            {/* Visitation Coverage Summary */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Visitation Coverage Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-muted-foreground">Visit Coverage Rate</span>
                      <span className="font-semibold">{data.visitCoverageRate}%</span>
                    </div>
                    <Progress value={data.visitCoverageRate} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-muted-foreground">Follow-Up Completion</span>
                      <span className="font-semibold">{data.followUpCompletionRate}%</span>
                    </div>
                    <Progress value={data.followUpCompletionRate} className="h-2" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="text-center p-3 rounded-lg bg-muted/50">
                    <p className="text-2xl font-bold text-foreground">{data.totalBeneficiariesWithVisits}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Beneficiaries Visited</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-muted/50">
                    <p className="text-2xl font-bold text-foreground">{data.avgVisitsPerBenef}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Avg Visits Each</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function KpiCard({ label, value, icon, color }: { label: string; value: string | number; icon: React.ReactNode; color: string }) {
  const colorMap: Record<string, string> = {
    primary: "bg-primary/10 text-primary",
    accent: "bg-accent/10 text-accent",
    success: "bg-green-500/10 text-green-600",
    info: "bg-blue-500/10 text-blue-600",
    warning: "bg-amber-500/10 text-amber-600",
    danger: "bg-red-500/10 text-red-600",
  };
  return (
    <Card>
      <CardContent className="p-3 flex items-center gap-3">
        <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center shrink-0", colorMap[color] || colorMap.primary)}>
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-lg font-bold text-foreground leading-none">{value}</p>
          <p className="text-[10px] text-muted-foreground truncate mt-0.5">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function InsightRow({ label, value, status }: { label: string; value: string; status: 'good' | 'neutral' | 'warning' }) {
  const statusColor = {
    good: 'text-green-600 bg-green-500/10',
    neutral: 'text-muted-foreground bg-muted/50',
    warning: 'text-amber-600 bg-amber-500/10',
  };
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground">{label}</span>
      <Badge variant="outline" className={cn("text-xs font-semibold", statusColor[status])}>
        {value}
      </Badge>
    </div>
  );
}

function VulnerabilityCard({ icon, title, count, color, description }: {
  icon: React.ReactNode; title: string; count: number; color: string; description: string;
}) {
  const colorMap: Record<string, { bg: string; text: string; border: string }> = {
    warning: { bg: 'bg-amber-500/5', text: 'text-amber-600', border: 'border-amber-500/20' },
    danger: { bg: 'bg-red-500/5', text: 'text-red-600', border: 'border-red-500/20' },
    info: { bg: 'bg-blue-500/5', text: 'text-blue-600', border: 'border-blue-500/20' },
    neutral: { bg: 'bg-muted/30', text: 'text-muted-foreground', border: 'border-border/50' },
  };
  const c = colorMap[color] || colorMap.neutral;

  return (
    <Card className={cn("border", c.border, c.bg)}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center shrink-0", c.text, c.bg)}>
            {icon}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">{title}</p>
            <p className="text-2xl font-bold text-foreground mt-1">{count}</p>
            <p className="text-[11px] text-muted-foreground mt-1">{description}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

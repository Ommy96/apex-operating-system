import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend, RadialBarChart, RadialBar,
} from "recharts";
import {
  Target, Users, MapPin, TrendingUp, Activity, Layers,
  ArrowUpRight, ArrowDownRight, BarChart3, GitBranch,
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

interface ProgramCoverage {
  programId: string;
  programName: string;
  isActive: boolean;
  totalEnrolled: number;
  activeEnrolled: number;
  exitedCount: number;
  newEnrollments: number;
  exitRate: number;
  genderDistribution: { male: number; female: number; other: number };
  ageDistribution: Record<string, number>;
  countyDistribution: Record<string, number>;
  subCountyDistribution: Record<string, number>;
  projectCount: number;
  projects: any[];
  visitationCount: number;
  activityCount: number;
  participantCount: number;
}

interface ProgramIntelligenceData {
  programCoverage: ProgramCoverage[];
  overallGender: { male: number; female: number; other: number };
  overallAge: Record<string, number>;
  overallCounty: Record<string, number>;
  overallType: Record<string, number>;
  enrollmentTrends: { month: string; monthShort: string; newEnrollments: number; exits: number; net: number }[];
  activeServices: number;
  completedServices: number;
  avgServicesPerBeneficiary: number;
}

interface Props {
  data: ProgramIntelligenceData;
  isLoading: boolean;
}

export function ProgramProjectIntelligence({ data, isLoading }: Props) {
  const [selectedProgram, setSelectedProgram] = useState<string>("all");

  const selectedProgramData = useMemo(() => {
    if (selectedProgram === "all") return null;
    return data.programCoverage.find(p => p.programId === selectedProgram) || null;
  }, [selectedProgram, data.programCoverage]);

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i}><CardContent className="p-6"><Skeleton className="h-40 w-full" /></CardContent></Card>
        ))}
      </div>
    );
  }

  // Prepare chart data
  const genderData = selectedProgramData
    ? [
        { name: 'Male', value: selectedProgramData.genderDistribution.male },
        { name: 'Female', value: selectedProgramData.genderDistribution.female },
        { name: 'Other', value: selectedProgramData.genderDistribution.other },
      ].filter(d => d.value > 0)
    : [
        { name: 'Male', value: data.overallGender.male },
        { name: 'Female', value: data.overallGender.female },
        { name: 'Other', value: data.overallGender.other },
      ].filter(d => d.value > 0);

  const ageData = Object.entries(
    selectedProgramData ? selectedProgramData.ageDistribution : data.overallAge
  ).filter(([, v]) => v > 0).map(([name, value]) => ({ name, value }));

  const countyData = Object.entries(
    selectedProgramData ? selectedProgramData.countyDistribution : data.overallCounty
  ).filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, value]) => ({ name, value }));

  const typeData = Object.entries(data.overallType)
    .filter(([, v]) => v > 0)
    .map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value }));

  const coverageBarData = data.programCoverage
    .filter(p => p.totalEnrolled > 0)
    .sort((a, b) => b.activeEnrolled - a.activeEnrolled)
    .map(p => ({
      name: p.programName.length > 18 ? p.programName.substring(0, 18) + '…' : p.programName,
      active: p.activeEnrolled,
      exited: p.exitedCount,
      new: p.newEnrollments,
    }));

  const totalGender = genderData.reduce((s, d) => s + d.value, 0);

  return (
    <div className="space-y-6">
      {/* Program filter */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">Program & Project Intelligence</h3>
        </div>
        <Select value={selectedProgram} onValueChange={setSelectedProgram}>
          <SelectTrigger className="w-[240px]">
            <SelectValue placeholder="All Programs" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Programs</SelectItem>
            {data.programCoverage.map(p => (
              <SelectItem key={p.programId} value={p.programId}>{p.programName}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <MiniStat
          label="Programs"
          value={data.programCoverage.filter(p => p.isActive).length}
          icon={<Layers className="h-4 w-4" />}
          color="primary"
        />
        <MiniStat
          label="Projects"
          value={data.programCoverage.reduce((s, p) => s + p.projectCount, 0)}
          icon={<GitBranch className="h-4 w-4" />}
          color="accent"
        />
        <MiniStat
          label="Active Services"
          value={data.activeServices}
          icon={<Activity className="h-4 w-4" />}
          color="success"
        />
        <MiniStat
          label="Completed"
          value={data.completedServices}
          icon={<Target className="h-4 w-4" />}
          color="info"
        />
        <MiniStat
          label="Avg Services/Beneficiary"
          value={data.avgServicesPerBeneficiary}
          icon={<BarChart3 className="h-4 w-4" />}
          color="warning"
        />
        <MiniStat
          label="Total Activities"
          value={data.programCoverage.reduce((s, p) => s + p.activityCount, 0)}
          icon={<TrendingUp className="h-4 w-4" />}
          color="primary"
        />
      </div>

      {/* Main Sections */}
      <Tabs defaultValue="coverage" className="space-y-4">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="coverage" className="text-xs">Coverage</TabsTrigger>
          <TabsTrigger value="demographics" className="text-xs">Demographics</TabsTrigger>
          <TabsTrigger value="geographic" className="text-xs">Geographic</TabsTrigger>
          <TabsTrigger value="trends" className="text-xs">Trends</TabsTrigger>
        </TabsList>

        {/* Coverage Tab */}
        <TabsContent value="coverage" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Program Coverage Chart */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Enrollment by Program</CardTitle>
              </CardHeader>
              <CardContent>
                {coverageBarData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={coverageBarData} layout="vertical" margin={{ left: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                      <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                      <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }} />
                      <Legend />
                      <Bar dataKey="active" name="Active" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                      <Bar dataKey="exited" name="Exited" fill="hsl(var(--muted-foreground))" radius={[0, 4, 4, 0]} />
                      <Bar dataKey="new" name="New (Period)" fill="hsl(var(--accent))" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-10">No enrollment data available</p>
                )}
              </CardContent>
            </Card>

            {/* Program Cards */}
            <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1">
              {data.programCoverage.map(p => (
                <Card key={p.programId} className={cn(
                  "transition-all",
                  selectedProgram === p.programId && "ring-2 ring-primary"
                )}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-sm font-semibold truncate">{p.programName}</span>
                        <Badge variant={p.isActive ? "default" : "secondary"} className="text-[10px] shrink-0">
                          {p.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      <span className="text-lg font-bold text-primary">{p.activeEnrolled}</span>
                    </div>
                    <div className="grid grid-cols-4 gap-2 text-xs text-muted-foreground">
                      <div><span className="block font-medium text-foreground">{p.totalEnrolled}</span>Total</div>
                      <div><span className="block font-medium text-foreground">{p.newEnrollments}</span>New</div>
                      <div><span className="block font-medium text-foreground">{p.projectCount}</span>Projects</div>
                      <div><span className="block font-medium text-foreground">{p.exitRate}%</span>Exit Rate</div>
                    </div>
                    {p.totalEnrolled > 0 && (
                      <Progress value={(p.activeEnrolled / p.totalEnrolled) * 100} className="mt-2 h-1.5" />
                    )}
                  </CardContent>
                </Card>
              ))}
              {data.programCoverage.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">No programs found</p>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Demographics Tab */}
        <TabsContent value="demographics" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {/* Gender */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Gender Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                {genderData.length > 0 ? (
                  <div className="flex items-center gap-4">
                    <ResponsiveContainer width="50%" height={160}>
                      <PieChart>
                        <Pie data={genderData} cx="50%" cy="50%" innerRadius={35} outerRadius={60} dataKey="value" strokeWidth={2}>
                          {genderData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-2">
                      {genderData.map((d, i) => (
                        <div key={d.name} className="flex items-center gap-2 text-xs">
                          <div className="h-2.5 w-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                          <span className="text-muted-foreground">{d.name}</span>
                          <span className="font-semibold">{d.value}</span>
                          <span className="text-muted-foreground">({totalGender > 0 ? Math.round((d.value / totalGender) * 100) : 0}%)</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">No data</p>
                )}
              </CardContent>
            </Card>

            {/* Age Distribution */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Age Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                {ageData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={160}>
                    <BarChart data={ageData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                      <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                      <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }} />
                      <Bar dataKey="value" name="Count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">No data</p>
                )}
              </CardContent>
            </Card>

            {/* Beneficiary Type */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Beneficiary Types</CardTitle>
              </CardHeader>
              <CardContent>
                {typeData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={160}>
                    <PieChart>
                      <Pie data={typeData} cx="50%" cy="50%" outerRadius={60} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                        {typeData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">No data</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Geographic Tab */}
        <TabsContent value="geographic" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            {/* County Chart */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Distribution by County</CardTitle>
              </CardHeader>
              <CardContent>
                {countyData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={countyData} layout="vertical" margin={{ left: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                      <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                      <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }} />
                      <Bar dataKey="value" name="Beneficiaries" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-10">No geographic data available</p>
                )}
              </CardContent>
            </Card>

            {/* County Table */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  Geographic Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-[280px] overflow-y-auto">
                  {countyData.map((c, i) => {
                    const totalCounty = countyData.reduce((s, d) => s + d.value, 0);
                    const pct = totalCounty > 0 ? Math.round((c.value / totalCounty) * 100) : 0;
                    return (
                      <div key={c.name} className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-xs font-medium text-muted-foreground w-5">{i + 1}.</span>
                          <span className="text-sm truncate">{c.name}</span>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <Progress value={pct} className="w-20 h-1.5" />
                          <span className="text-xs font-semibold w-8 text-right">{c.value}</span>
                          <span className="text-xs text-muted-foreground w-10 text-right">{pct}%</span>
                        </div>
                      </div>
                    );
                  })}
                  {countyData.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-8">No geographic data</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Trends Tab */}
        <TabsContent value="trends" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Enrollment Trends */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Enrollment Trends (6 Months)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={data.enrollmentTrends}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="monthShort" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                    <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                    <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }} />
                    <Legend />
                    <Line type="monotone" dataKey="newEnrollments" name="New Enrollments" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="exits" name="Exits" stroke="hsl(var(--destructive))" strokeWidth={2} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="net" name="Net Growth" stroke="hsl(var(--accent))" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Service Delivery Summary */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Service Delivery Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {data.programCoverage
                    .filter(p => p.activityCount > 0 || p.visitationCount > 0)
                    .sort((a, b) => (b.activityCount + b.visitationCount) - (a.activityCount + a.visitationCount))
                    .slice(0, 8)
                    .map(p => (
                      <div key={p.programId} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="truncate font-medium">{p.programName}</span>
                          <span className="text-muted-foreground shrink-0 ml-2">
                            {p.activityCount} activities · {p.visitationCount} visits · {p.participantCount} participants
                          </span>
                        </div>
                        <div className="flex gap-1">
                          <Progress value={p.activityCount > 0 ? 100 : 0} className="h-1 flex-1" />
                        </div>
                      </div>
                    ))}
                  {data.programCoverage.filter(p => p.activityCount > 0 || p.visitationCount > 0).length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-8">No service delivery data</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function MiniStat({ label, value, icon, color }: { label: string; value: number | string; icon: React.ReactNode; color: string }) {
  const colorMap: Record<string, string> = {
    primary: "bg-primary/10 text-primary",
    accent: "bg-accent/10 text-accent",
    success: "bg-success/10 text-success",
    info: "bg-info/10 text-info",
    warning: "bg-warning/10 text-warning",
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

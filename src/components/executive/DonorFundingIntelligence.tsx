import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DollarSign, TrendingUp, Users, PieChart, BarChart3, AlertTriangle, ArrowUpRight, ArrowDownRight
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart as RechartsPie, Pie, Cell, Legend, LineChart, Line, AreaChart, Area,
} from "recharts";

const COLORS = [
  'hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))',
  'hsl(var(--chart-4))', 'hsl(var(--chart-5))', 'hsl(var(--accent))',
];

interface DonorFundingData {
  totalFunds: number;
  uniqueDonors: number;
  totalDonations: number;
  avgDonation: number;
  costPerBeneficiary: number;
  donorRanking: { name: string; total: number; donations: number; beneficiaries: number }[];
  programAllocation: { program: string; amount: number; percentage: number }[];
  monthlyTrends: { month: string; amount: number; count: number }[];
  topDonorShare: number;
  unallocatedFunds: number;
  fundingGrowth: number;
  beneficiariesWithDonors: number;
  beneficiariesWithoutDonors: number;
}

interface Props {
  data: DonorFundingData;
  isLoading: boolean;
}

function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `KSh ${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `KSh ${(value / 1_000).toFixed(0)}K`;
  return `KSh ${value.toLocaleString()}`;
}

export function DonorFundingIntelligence({ data, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <Skeleton className="h-80" />
      </div>
    );
  }

  const kpiCards = [
    { label: "Total Donor Funds", value: formatCurrency(data.totalFunds), icon: DollarSign, color: "text-success" },
    { label: "Unique Donors", value: data.uniqueDonors.toString(), icon: Users, color: "text-info" },
    { label: "Cost Per Beneficiary", value: formatCurrency(data.costPerBeneficiary), icon: BarChart3, color: "text-warning" },
    {
      label: "Funding Growth",
      value: `${data.fundingGrowth >= 0 ? '+' : ''}${data.fundingGrowth}%`,
      icon: data.fundingGrowth >= 0 ? ArrowUpRight : ArrowDownRight,
      color: data.fundingGrowth >= 0 ? "text-success" : "text-destructive",
    },
  ];

  const donorCoverageData = [
    { name: "With Donors", value: data.beneficiariesWithDonors },
    { name: "Without Donors", value: data.beneficiariesWithoutDonors },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <DollarSign className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold text-foreground">Donor & Funding Intelligence</h2>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpiCards.map((kpi) => (
          <Card key={kpi.label} className="border-border/50">
            <CardContent className="pt-4 pb-3 px-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground">{kpi.label}</span>
                <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
              </div>
              <p className="text-xl font-bold text-foreground">{kpi.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabbed Sections */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
          <TabsTrigger value="donors" className="text-xs">Donor Rankings</TabsTrigger>
          <TabsTrigger value="allocation" className="text-xs">Program Allocation</TabsTrigger>
          <TabsTrigger value="trends" className="text-xs">Funding Trends</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Donor Coverage */}
            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Beneficiary Donor Coverage</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPie>
                      <Pie
                        data={donorCoverageData}
                        cx="50%" cy="50%"
                        innerRadius={50} outerRadius={80}
                        paddingAngle={3} dataKey="value"
                      >
                        {donorCoverageData.map((_, i) => (
                          <Cell key={i} fill={COLORS[i]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: number) => v.toLocaleString()} />
                      <Legend />
                    </RechartsPie>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Funding Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Donations</span>
                    <span className="font-medium text-foreground">{data.totalDonations}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Average Donation</span>
                    <span className="font-medium text-foreground">{formatCurrency(data.avgDonation)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Top Donor Concentration</span>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground">{data.topDonorShare}%</span>
                      {data.topDonorShare > 50 && (
                        <Badge variant="destructive" className="text-[10px] h-4">
                          <AlertTriangle className="h-2.5 w-2.5 mr-0.5" /> High Risk
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Unallocated to Programs</span>
                    <span className="font-medium text-foreground">{formatCurrency(data.unallocatedFunds)}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-border">
                  <p className="text-xs text-muted-foreground mb-1">Program Allocation Rate</p>
                  <Progress
                    value={data.totalFunds > 0 ? Math.round(((data.totalFunds - data.unallocatedFunds) / data.totalFunds) * 100) : 0}
                    className="h-2"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {data.totalFunds > 0 ? Math.round(((data.totalFunds - data.unallocatedFunds) / data.totalFunds) * 100) : 0}% allocated
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Donor Rankings Tab */}
        <TabsContent value="donors">
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Top Donors by Contribution</CardTitle>
            </CardHeader>
            <CardContent>
              {data.donorRanking.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No donor data available</p>
              ) : (
                <>
                  <div className="h-64 mb-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.donorRanking.slice(0, 10)} layout="vertical" margin={{ left: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                        <XAxis type="number" tickFormatter={(v) => formatCurrency(v)} tick={{ fontSize: 10 }} />
                        <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
                        <Tooltip formatter={(v: number) => formatCurrency(v)} />
                        <Bar dataKey="total" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {data.donorRanking.map((d, i) => (
                      <div key={d.name} className="flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-muted/30 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-muted-foreground w-5">#{i + 1}</span>
                          <span className="font-medium text-foreground">{d.name}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <Badge variant="outline" className="text-[10px]">{d.donations} donation{d.donations !== 1 ? 's' : ''}</Badge>
                          <Badge variant="outline" className="text-[10px]">{d.beneficiaries} beneficiar{d.beneficiaries !== 1 ? 'ies' : 'y'}</Badge>
                          <span className="font-semibold text-foreground min-w-[80px] text-right">{formatCurrency(d.total)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Program Allocation Tab */}
        <TabsContent value="allocation">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Funding by Program</CardTitle>
              </CardHeader>
              <CardContent>
                {data.programAllocation.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No program allocation data</p>
                ) : (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPie>
                        <Pie
                          data={data.programAllocation}
                          cx="50%" cy="50%"
                          outerRadius={90}
                          paddingAngle={2}
                          dataKey="amount"
                          nameKey="program"
                          label={({ program, percentage }) => `${program}: ${percentage}%`}
                          labelLine={{ strokeWidth: 1 }}
                        >
                          {data.programAllocation.map((_, i) => (
                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v: number) => formatCurrency(v)} />
                      </RechartsPie>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Allocation Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.programAllocation.map((p, i) => (
                    <div key={p.program} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-foreground font-medium">{p.program}</span>
                        <span className="text-muted-foreground">{formatCurrency(p.amount)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Progress value={p.percentage} className="h-1.5 flex-1" />
                        <span className="text-xs text-muted-foreground w-10 text-right">{p.percentage}%</span>
                      </div>
                    </div>
                  ))}
                  {data.unallocatedFunds > 0 && (
                    <div className="space-y-1 pt-2 border-t border-border">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground italic">Unallocated</span>
                        <span className="text-muted-foreground">{formatCurrency(data.unallocatedFunds)}</span>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Trends Tab */}
        <TabsContent value="trends">
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Monthly Funding Trends (Last 6 Months)</CardTitle>
            </CardHeader>
            <CardContent>
              {data.monthlyTrends.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No trend data available</p>
              ) : (
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data.monthlyTrends}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                      <YAxis yAxisId="amount" tickFormatter={(v) => formatCurrency(v)} tick={{ fontSize: 10 }} />
                      <YAxis yAxisId="count" orientation="right" tick={{ fontSize: 10 }} />
                      <Tooltip formatter={(v: number, name: string) => name === 'amount' ? formatCurrency(v) : v} />
                      <Legend />
                      <Area yAxisId="amount" type="monotone" dataKey="amount" name="Amount" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.15} strokeWidth={2} />
                      <Line yAxisId="count" type="monotone" dataKey="count" name="Donations" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={{ r: 3 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

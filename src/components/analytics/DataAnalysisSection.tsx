import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { UserSearch, GraduationCap, Filter } from "lucide-react";

const COLORS = [
  'hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))',
  'hsl(var(--chart-4))', 'hsl(var(--chart-5))', 'hsl(var(--accent))',
  'hsl(var(--destructive))', 'hsl(var(--muted-foreground))',
];

interface Beneficiary {
  id: string;
  display_name: string;
  first_name: string | null;
  last_name: string | null;
  beneficiary_type: string;
  gender: string | null;
  date_of_birth: string | null;
  county: string | null;
  sub_county: string | null;
  location: string | null;
  status: string;
  academic_level: string | null;
  grade: string | null;
  institution_name: string | null;
  religion?: string | null;
  has_special_needs?: boolean | null;
}

interface Donor {
  id: string;
  donor_name: string;
  amount_received: number | null;
  program_id: string | null;
  beneficiary_id: string;
}

interface Props {
  beneficiaries: Beneficiary[];
  donors: Donor[];
  isLoading: boolean;
}

type BreakdownKey = "gender" | "age" | "sub_county" | "county" | "academic_level" | "beneficiary_type" | "religion" | "institution";

const BREAKDOWN_OPTIONS: { value: BreakdownKey; label: string }[] = [
  { value: "gender", label: "Gender" },
  { value: "age", label: "Age Group" },
  { value: "sub_county", label: "Sub County" },
  { value: "county", label: "County" },
  { value: "academic_level", label: "Academic Level" },
  { value: "beneficiary_type", label: "Beneficiary Type" },
  { value: "religion", label: "Religion" },
  { value: "institution", label: "Institution" },
];

function getAgeGroup(dob: string | null): string {
  if (!dob) return "Unknown";
  const age = Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
  if (age <= 5) return "0-5";
  if (age <= 12) return "6-12";
  if (age <= 17) return "13-17";
  if (age <= 25) return "18-25";
  return "26+";
}

function getBeneficiaryAttribute(b: Beneficiary, key: BreakdownKey): string {
  switch (key) {
    case "gender": return b.gender || "Unknown";
    case "age": return getAgeGroup(b.date_of_birth);
    case "sub_county": return b.sub_county || "Unknown";
    case "county": return b.county || "Unknown";
    case "academic_level": return b.academic_level || "Unknown";
    case "beneficiary_type": return b.beneficiary_type || "Unknown";
    case "religion": return (b as any).religion || "Unknown";
    case "institution": return b.institution_name || "Unknown";
    default: return "Unknown";
  }
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload?.length) {
    return (
      <div className="bg-card border rounded-xl p-3 shadow-elevation-2 text-sm">
        <p className="font-semibold text-foreground mb-1">{label}</p>
        {payload.map((p: any, i: number) => (
          <p key={i} className="text-muted-foreground">
            {p.name}: <span className="font-medium text-foreground">{p.value}</span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export function DataAnalysisSection({ beneficiaries, donors, isLoading }: Props) {
  const [donorBreakdown, setDonorBreakdown] = useState<BreakdownKey>("gender");
  const [selectedDonor, setSelectedDonor] = useState<string>("all");
  const [academicBreakdown, setAcademicBreakdown] = useState<BreakdownKey>("gender");

  const activeBeneficiaries = useMemo(
    () => beneficiaries.filter(b => b.status === "active"),
    [beneficiaries]
  );

  const beneficiaryMap = useMemo(
    () => new Map(beneficiaries.map(b => [b.id, b])),
    [beneficiaries]
  );

  // === DONOR/SPONSOR ANALYSIS ===
  const uniqueDonors = useMemo(() => {
    const names = new Set(donors.map(d => d.donor_name));
    return Array.from(names).sort();
  }, [donors]);

  const donorAnalysis = useMemo(() => {
    // Filter donors by selected donor
    const filteredDonors = selectedDonor === "all"
      ? donors
      : donors.filter(d => d.donor_name === selectedDonor);

    // Unique beneficiary IDs for the selected donor(s)
    const beneficiaryIds = new Set(filteredDonors.map(d => d.beneficiary_id));
    const sponsoredBeneficiaries = beneficiaries.filter(b => beneficiaryIds.has(b.id));

    // Summary stats
    const totalSponsored = sponsoredBeneficiaries.length;
    const totalAmount = filteredDonors.reduce((s, d) => s + (d.amount_received || 0), 0);

    // Breakdown
    const breakdownMap: Record<string, number> = {};
    sponsoredBeneficiaries.forEach(b => {
      const key = getBeneficiaryAttribute(b, donorBreakdown);
      breakdownMap[key] = (breakdownMap[key] || 0) + 1;
    });

    const breakdownData = Object.entries(breakdownMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    // Per-donor summary table
    const donorSummary = uniqueDonors.map(name => {
      const donorEntries = donors.filter(d => d.donor_name === name);
      const ids = new Set(donorEntries.map(d => d.beneficiary_id));
      const benefs = beneficiaries.filter(b => ids.has(b.id));
      const maleCount = benefs.filter(b => b.gender === "Male").length;
      const femaleCount = benefs.filter(b => b.gender === "Female").length;
      const amount = donorEntries.reduce((s, d) => s + (d.amount_received || 0), 0);
      return { name, beneficiaries: benefs.length, male: maleCount, female: femaleCount, amount };
    }).sort((a, b) => b.beneficiaries - a.beneficiaries);

    return { totalSponsored, totalAmount, breakdownData, donorSummary };
  }, [donors, beneficiaries, selectedDonor, donorBreakdown, uniqueDonors]);

  // === ACADEMIC LEVEL ANALYSIS ===
  const academicAnalysis = useMemo(() => {
    const students = activeBeneficiaries.filter(b => b.beneficiary_type === "student");

    // Academic level distribution
    const levelMap: Record<string, number> = {};
    students.forEach(b => {
      const level = b.academic_level || "Unknown";
      levelMap[level] = (levelMap[level] || 0) + 1;
    });
    const levelData = Object.entries(levelMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    // Cross-tabulation: academic_level × selected breakdown
    const crossTab: Record<string, Record<string, number>> = {};
    students.forEach(b => {
      const level = b.academic_level || "Unknown";
      const attr = getBeneficiaryAttribute(b, academicBreakdown);
      if (!crossTab[level]) crossTab[level] = {};
      crossTab[level][attr] = (crossTab[level][attr] || 0) + 1;
    });

    // Get all unique attribute values
    const allAttributes = new Set<string>();
    Object.values(crossTab).forEach(row => Object.keys(row).forEach(k => allAttributes.add(k)));
    const attributes = Array.from(allAttributes).sort();

    // Build table rows
    const crossTabRows = Object.entries(crossTab)
      .map(([level, attrs]) => ({
        level,
        total: Object.values(attrs).reduce((s, v) => s + v, 0),
        ...attrs,
      }))
      .sort((a, b) => b.total - a.total);

    // Stacked bar chart data
    const stackedData = crossTabRows.map(row => {
      const item: Record<string, any> = { level: row.level };
      attributes.forEach(attr => { item[attr] = (row as any)[attr] || 0; });
      return item;
    });

    return { totalStudents: students.length, levelData, crossTabRows, attributes, stackedData };
  }, [activeBeneficiaries, academicBreakdown]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Filter className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold text-foreground">Data Analysis & Cross-Tabulation</h2>
      </div>

      <Tabs defaultValue="donors" className="space-y-4">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="donors" className="text-xs gap-1.5">
            <UserSearch className="h-3.5 w-3.5" />
            Sponsor Analysis
          </TabsTrigger>
          <TabsTrigger value="academic" className="text-xs gap-1.5">
            <GraduationCap className="h-3.5 w-3.5" />
            Academic Level Analysis
          </TabsTrigger>
        </TabsList>

        {/* SPONSOR ANALYSIS TAB */}
        <TabsContent value="donors" className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Sponsor:</span>
              <Select value={selectedDonor} onValueChange={setSelectedDonor}>
                <SelectTrigger className="w-full sm:w-[200px] h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sponsors</SelectItem>
                  {uniqueDonors.map(d => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Break down by:</span>
              <Select value={donorBreakdown} onValueChange={(v) => setDonorBreakdown(v as BreakdownKey)}>
                <SelectTrigger className="w-full sm:w-[180px] h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BREAKDOWN_OPTIONS.map(o => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="border-border/50">
              <CardContent className="pt-4 pb-3 px-4">
                <span className="text-xs text-muted-foreground">Total Sponsors</span>
                <p className="text-xl font-bold text-foreground">{uniqueDonors.length}</p>
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardContent className="pt-4 pb-3 px-4">
                <span className="text-xs text-muted-foreground">Beneficiaries Sponsored</span>
                <p className="text-xl font-bold text-foreground">{donorAnalysis.totalSponsored}</p>
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardContent className="pt-4 pb-3 px-4">
                <span className="text-xs text-muted-foreground">Total Funding</span>
                <p className="text-xl font-bold text-foreground">KSh {donorAnalysis.totalAmount.toLocaleString()}</p>
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardContent className="pt-4 pb-3 px-4">
                <span className="text-xs text-muted-foreground">Avg per Beneficiary</span>
                <p className="text-xl font-bold text-foreground">
                  KSh {donorAnalysis.totalSponsored > 0 ? Math.round(donorAnalysis.totalAmount / donorAnalysis.totalSponsored).toLocaleString() : 0}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Breakdown Chart */}
            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  Sponsored Beneficiaries by {BREAKDOWN_OPTIONS.find(o => o.value === donorBreakdown)?.label}
                  {selectedDonor !== "all" && <Badge variant="secondary" className="ml-2 text-[10px]">{selectedDonor}</Badge>}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {donorAnalysis.breakdownData.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-10">No data available</p>
                ) : donorAnalysis.breakdownData.length <= 6 ? (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={donorAnalysis.breakdownData} cx="50%" cy="50%" innerRadius={50} outerRadius={90} dataKey="value" paddingAngle={2}
                          label={({ name, value }) => `${name}: ${value}`} labelLine={{ strokeWidth: 1 }}>
                          {donorAnalysis.breakdownData.map((_, i) => (
                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={donorAnalysis.breakdownData.slice(0, 15)} layout="vertical" margin={{ left: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                        <XAxis type="number" tick={{ fontSize: 10 }} />
                        <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="value" name="Count" radius={[0, 4, 4, 0]}>
                          {donorAnalysis.breakdownData.slice(0, 15).map((_, i) => (
                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Donor Summary Table */}
            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Sponsor Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="max-h-[300px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Sponsor</TableHead>
                        <TableHead className="text-xs text-right">Beneficiaries</TableHead>
                        <TableHead className="text-xs text-right">Male</TableHead>
                        <TableHead className="text-xs text-right">Female</TableHead>
                        <TableHead className="text-xs text-right">Amount (KSh)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {donorAnalysis.donorSummary.map(d => (
                        <TableRow key={d.name} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedDonor(d.name)}>
                          <TableCell className="text-xs font-medium">{d.name}</TableCell>
                          <TableCell className="text-xs text-right">{d.beneficiaries}</TableCell>
                          <TableCell className="text-xs text-right">{d.male}</TableCell>
                          <TableCell className="text-xs text-right">{d.female}</TableCell>
                          <TableCell className="text-xs text-right">{d.amount.toLocaleString()}</TableCell>
                        </TableRow>
                      ))}
                      {donorAnalysis.donorSummary.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground text-xs py-8">No sponsor data</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ACADEMIC LEVEL ANALYSIS TAB */}
        <TabsContent value="academic" className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Cross-tabulate by:</span>
              <Select value={academicBreakdown} onValueChange={(v) => setAcademicBreakdown(v as BreakdownKey)}>
                <SelectTrigger className="w-full sm:w-[180px] h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BREAKDOWN_OPTIONS.filter(o => o.value !== "academic_level").map(o => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Badge variant="outline" className="text-xs">
              {academicAnalysis.totalStudents} Total Students
            </Badge>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Academic Level Distribution */}
            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Students by Academic Level</CardTitle>
              </CardHeader>
              <CardContent>
                {academicAnalysis.levelData.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-10">No student data available</p>
                ) : (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={academicAnalysis.levelData}>
                        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                        <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" height={50} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="value" name="Students" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]}>
                          {academicAnalysis.levelData.map((_, i) => (
                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Stacked Bar: Academic Level × Breakdown */}
            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  Academic Level × {BREAKDOWN_OPTIONS.find(o => o.value === academicBreakdown)?.label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {academicAnalysis.stackedData.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-10">No data available</p>
                ) : (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={academicAnalysis.stackedData}>
                        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                        <XAxis dataKey="level" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" height={50} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        {academicAnalysis.attributes.map((attr, i) => (
                          <Bar key={attr} dataKey={attr} name={attr} stackId="a"
                            fill={COLORS[i % COLORS.length]} radius={i === academicAnalysis.attributes.length - 1 ? [4, 4, 0, 0] : undefined} />
                        ))}
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Cross-tab Table */}
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Cross-Tabulation: Academic Level × {BREAKDOWN_OPTIONS.find(o => o.value === academicBreakdown)?.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs font-semibold">Academic Level</TableHead>
                      {academicAnalysis.attributes.map(attr => (
                        <TableHead key={attr} className="text-xs text-right">{attr}</TableHead>
                      ))}
                      <TableHead className="text-xs text-right font-semibold">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {academicAnalysis.crossTabRows.map(row => (
                      <TableRow key={row.level}>
                        <TableCell className="text-xs font-medium">{row.level}</TableCell>
                        {academicAnalysis.attributes.map(attr => (
                          <TableCell key={attr} className="text-xs text-right">
                            {(row as any)[attr] || 0}
                          </TableCell>
                        ))}
                        <TableCell className="text-xs text-right font-semibold">{row.total}</TableCell>
                      </TableRow>
                    ))}
                    {academicAnalysis.crossTabRows.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={academicAnalysis.attributes.length + 2} className="text-center text-muted-foreground text-xs py-8">
                          No student data available
                        </TableCell>
                      </TableRow>
                    )}
                    {/* Totals row */}
                    {academicAnalysis.crossTabRows.length > 0 && (
                      <TableRow className="bg-muted/30 font-semibold">
                        <TableCell className="text-xs">Total</TableCell>
                        {academicAnalysis.attributes.map(attr => (
                          <TableCell key={attr} className="text-xs text-right">
                            {academicAnalysis.crossTabRows.reduce((s, r) => s + ((r as any)[attr] || 0), 0)}
                          </TableCell>
                        ))}
                        <TableCell className="text-xs text-right">
                          {academicAnalysis.crossTabRows.reduce((s, r) => s + r.total, 0)}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

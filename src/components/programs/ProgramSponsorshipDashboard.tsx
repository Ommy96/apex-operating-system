import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, DollarSign, TrendingDown, Target, AlertTriangle } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { useProgramCoverage } from '@/hooks/useSponsorshipCoverage';
import { useNavigate } from 'react-router-dom';

interface Props {
  programId: string | undefined;
}

const COLORS = ['hsl(var(--success))', 'hsl(var(--warning))', 'hsl(var(--destructive))'];

export function ProgramSponsorshipDashboard({ programId }: Props) {
  const { data: coverage, isLoading } = useProgramCoverage(programId);
  const navigate = useNavigate();

  if (isLoading) {
    return <div className="space-y-4">{[1, 2, 3].map(i => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}</div>;
  }

  if (!coverage || coverage.totalRequired === 0) {
    return (
      <Card className="border-muted">
        <CardContent className="py-12 text-center text-muted-foreground">
          <Target className="h-10 w-10 mx-auto mb-3 opacity-50" />
          <p className="font-medium">No sponsorship needs configured</p>
          <p className="text-sm mt-1">Set estimated costs on projects and mark them as sponsorship-required to enable coverage tracking.</p>
        </CardContent>
      </Card>
    );
  }

  const pieData = [
    { name: 'Fully Funded', value: coverage.fullyFunded },
    { name: 'Partially Funded', value: coverage.partiallyFunded },
    { name: 'Unfunded', value: coverage.unfunded },
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Beneficiaries</p>
              <p className="text-lg font-bold text-foreground">{coverage.totalBeneficiaries}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-success/10">
              <DollarSign className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Coverage Rate</p>
              <p className="text-lg font-bold text-foreground">{coverage.coverageRate}%</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-warning/10">
              <Target className="h-5 w-5 text-warning" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Required</p>
              <p className="text-lg font-bold text-foreground">KES {coverage.totalRequired.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/10">
              <TrendingDown className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Funding Gap</p>
              <p className="text-lg font-bold text-destructive">KES {coverage.gap.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Coverage Bar */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-foreground">Sponsorship Coverage</h4>
            <span className="text-sm font-bold text-primary">{coverage.coverageRate}%</span>
          </div>
          <Progress value={coverage.coverageRate} className="h-3" />
          <div className="grid grid-cols-3 gap-4 mt-3 text-center text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Received</p>
              <p className="font-bold text-success">KES {coverage.totalReceived.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Required</p>
              <p className="font-bold text-foreground">KES {coverage.totalRequired.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Gap</p>
              <p className="font-bold text-destructive">KES {coverage.gap.toLocaleString()}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Coverage Distribution Pie */}
        {pieData.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Coverage Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-6">
                <ResponsiveContainer width={160} height={160}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="value" strokeWidth={2}>
                      {pieData.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full" style={{ background: COLORS[0] }} />
                    <span className="text-sm">Fully Funded: {coverage.fullyFunded}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full" style={{ background: COLORS[1] }} />
                    <span className="text-sm">Partially Funded: {coverage.partiallyFunded}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full" style={{ background: COLORS[2] }} />
                    <span className="text-sm">Unfunded: {coverage.unfunded}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Funding Gaps by Project */}
        {coverage.projectGaps.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Funding Gaps by Need</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={coverage.projectGaps} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis dataKey="projectName" type="category" width={120} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => `KES ${v.toLocaleString()}`} />
                  <Bar dataKey="received" fill="hsl(var(--success))" name="Received" stackId="a" />
                  <Bar dataKey="gap" fill="hsl(var(--destructive))" name="Gap" stackId="a" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Donor Opportunities */}
      {coverage.opportunities.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-warning" />
              Sponsorship Opportunities
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Beneficiary</TableHead>
                  <TableHead>Need</TableHead>
                  <TableHead className="text-right">Amount Needed</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {coverage.opportunities.slice(0, 15).map((opp, i) => (
                  <TableRow
                    key={i}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => navigate(`/beneficiaries/${opp.beneficiaryId}`)}
                  >
                    <TableCell className="font-medium">{opp.beneficiaryName}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">{opp.projectName}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium text-destructive">
                      KES {opp.amount.toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

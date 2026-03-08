import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { DollarSign, Target, TrendingDown } from 'lucide-react';
import { useBeneficiaryCoverage, type BeneficiaryCoverage } from '@/hooks/useSponsorshipCoverage';
import { FundingCoverageBar } from './FundingCoverageBar';

interface SponsorshipCoverageSectionProps {
  beneficiaryId: string;
}

function getStatusBadge(status: BeneficiaryCoverage['status']) {
  switch (status) {
    case 'fully_funded':
      return <Badge className="bg-success/20 text-success border-success/30">🟢 Fully Funded</Badge>;
    case 'partially_funded':
      return <Badge className="bg-warning/20 text-warning border-warning/30">🟡 Partially Funded</Badge>;
    case 'unfunded':
      return <Badge className="bg-destructive/20 text-destructive border-destructive/30">🔴 Unfunded</Badge>;
  }
}

export function SponsorshipCoverageSection({ beneficiaryId }: SponsorshipCoverageSectionProps) {
  const { data: coverages = [], isLoading } = useBeneficiaryCoverage(beneficiaryId);

  if (isLoading) {
    return <Skeleton className="h-48 w-full rounded-xl" />;
  }

  if (coverages.length === 0) {
    return (
      <Card className="border-muted">
        <CardContent className="py-8 text-center text-muted-foreground">
          <Target className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No sponsorship needs configured for enrolled programs.</p>
          <p className="text-xs mt-1">Set up project costs in program settings to enable coverage tracking.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {coverages.map((coverage) => (
        <Card key={coverage.programId} className="border-primary/10">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-primary" />
                {coverage.programName}
              </CardTitle>
              {getStatusBadge(coverage.status)}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Coverage Bar */}
            <FundingCoverageBar
              totalReceived={coverage.totalReceived}
              totalRequired={coverage.totalRequired}
            />

            {/* Needs Breakdown Table */}
            {coverage.needs.length > 0 && (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Need</TableHead>
                      <TableHead className="text-right">Required</TableHead>
                      <TableHead className="text-right">Funded</TableHead>
                      <TableHead className="text-right">Gap</TableHead>
                      <TableHead className="w-24">Coverage</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {coverage.needs.map((need) => (
                      <TableRow key={need.id}>
                        <TableCell className="font-medium">{need.name}</TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          KES {need.estimated_cost.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right text-success">
                          KES {need.funded.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          {need.gap > 0 ? (
                            <span className="text-destructive font-medium">KES {need.gap.toLocaleString()}</span>
                          ) : (
                            <span className="text-success">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress value={need.coverage} className="h-2 w-16" />
                            <span className="text-xs font-medium text-muted-foreground">{need.coverage}%</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {/* Total row */}
                    <TableRow className="font-bold border-t-2">
                      <TableCell>Total</TableCell>
                      <TableCell className="text-right">KES {coverage.totalRequired.toLocaleString()}</TableCell>
                      <TableCell className="text-right text-success">KES {coverage.totalReceived.toLocaleString()}</TableCell>
                      <TableCell className="text-right text-destructive">KES {coverage.gap.toLocaleString()}</TableCell>
                      <TableCell>
                        <span className="text-sm">{coverage.coverage}%</span>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

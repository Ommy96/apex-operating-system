import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DollarSign } from 'lucide-react';
import { FundingCoverageBar } from './FundingCoverageBar';

interface Donor {
  id: string;
  donor_name: string;
  amount_received: number | null;
  donation_date: string | null;
  notes: string | null;
  program_id: string | null;
  program?: { name: string } | null;
}

interface SponsorshipFundingTabProps {
  donors: Donor[];
  fundingRequired?: number;
}

export function SponsorshipFundingTab({ donors, fundingRequired }: SponsorshipFundingTabProps) {
  const totalFunding = donors.reduce((sum, d) => sum + (d.amount_received || 0), 0);

  // Use beneficiary-level funding required
  const totalRequired = fundingRequired && fundingRequired > 0 ? fundingRequired : undefined;

  // Group by program
  const programBreakdown = donors.reduce((acc, d) => {
    const prog = d.program?.name || 'General';
    acc[prog] = (acc[prog] || 0) + (d.amount_received || 0);
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-4">
      {/* Coverage Bar */}
      <Card className="border-primary/10">
        <CardContent className="p-5">
          <FundingCoverageBar totalReceived={totalFunding} totalRequired={totalRequired} />
        </CardContent>
      </Card>

      {/* Breakdown by Program */}
      {Object.keys(programBreakdown).length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {Object.entries(programBreakdown).map(([prog, amount]) => (
            <Card key={prog} className="border-muted">
              <CardContent className="p-4 text-center">
                <p className="text-xs text-muted-foreground truncate">{prog}</p>
                <p className="text-lg font-bold text-foreground mt-1">KES {amount.toLocaleString()}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Donor Table */}
      <Card className="border-muted">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-success" />
            Donor Records ({donors.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {donors.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No donor records found</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Donor</TableHead>
                    <TableHead>Program</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="hidden md:table-cell">Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {donors.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell className="font-medium">{d.donor_name}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs">
                          {d.program?.name || 'General'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono text-success">
                        {d.amount_received ? `KES ${d.amount_received.toLocaleString()}` : '-'}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {d.donation_date ? new Date(d.donation_date).toLocaleDateString() : '-'}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground max-w-[200px] truncate">
                        {d.notes || '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

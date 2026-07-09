import { useDonorPortal } from "@/hooks/useDonorPortal";
import { DonorReportRouter } from "@/components/reports/DonorReportRouter";
import { Card, CardContent } from "@/components/ui/card";
import { FileBarChart } from "lucide-react";

/**
 * Portal-scoped donor reports. Locks the router to the current donor's
 * account so they only see report shapes matching their own funding scope.
 */
export function DonorReportsTab() {
  const { donorAccount, isLoading } = useDonorPortal();

  if (isLoading) {
    return (
      <Card><CardContent className="py-10 text-center text-muted-foreground text-sm">Loading…</CardContent></Card>
    );
  }
  if (!donorAccount?.id) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-muted-foreground text-sm">
          <FileBarChart className="h-8 w-8 mx-auto mb-2 opacity-30" />
          Reports will appear here once the organisation has recorded your contributions.
        </CardContent>
      </Card>
    );
  }
  return <DonorReportRouter fixedDonorAccountId={donorAccount.id} />;
}
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, Heart } from "lucide-react";
import { Link } from "react-router-dom";
import { RestrictionBadge } from "@/components/funding/RestrictionBadge";

interface SponsoredEntry {
  beneficiaryId: string;
  beneficiaryName: string;
  totalGiven: number;
}

interface Props {
  organizationName?: string;
  periodStart: string;
  periodEnd: string;
  sponsored: SponsoredEntry[];
  restriction?: "restricted" | "unrestricted" | "time_restricted";
}

/**
 * Sponsor-scope wrapper. Lists sponsored beneficiaries and links to the
 * existing magazine-style profile + impact feed for each one. The magazine
 * PDF generator (beneficiaryReportGenerator) is triggered from the
 * beneficiary profile — this component keeps the two paths consistent
 * without duplicating the magazine renderer.
 */
export function SponsorBeneficiaryReport({
  organizationName,
  periodStart,
  periodEnd,
  sponsored,
  restriction = "restricted",
}: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Heart className="h-4 w-4 text-primary" />
          Sponsored beneficiaries ({sponsored.length})
          <RestrictionBadge restriction={restriction} className="ml-2" />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          {organizationName || "Organisation"} · Period: {periodStart} to {periodEnd}. Each beneficiary has a
          magazine-style profile with academics, progression and impact feed.
        </p>
        {sponsored.length === 0 ? (
          <p className="text-sm text-muted-foreground">No sponsored beneficiaries for this donor.</p>
        ) : (
          <ul className="space-y-2">
            {sponsored.map((s) => (
              <li
                key={s.beneficiaryId}
                className="flex items-center justify-between border rounded-md px-3 py-2 text-sm"
              >
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-[10px]">Sponsored</Badge>
                  <span className="font-medium">{s.beneficiaryName}</span>
                </div>
                <Button asChild size="sm" variant="outline">
                  <Link to={`/beneficiaries/${s.beneficiaryId}`}>
                    Open profile <ExternalLink className="h-3 w-3 ml-1" />
                  </Link>
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
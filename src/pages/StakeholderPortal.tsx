import { useParams } from "react-router-dom";
import { useStakeholderPortal } from "@/hooks/useStakeholderAccess";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { AlertCircle, Download, Building2, Target, Banknote, Users } from "lucide-react";
import { format } from "date-fns";

function StatusBadge({ pct }: { pct: number }) {
  if (pct >= 80) return <Badge className="bg-success/10 text-success">On track</Badge>;
  if (pct >= 50) return <Badge className="bg-warning/10 text-warning">At risk</Badge>;
  return <Badge className="bg-destructive/10 text-destructive">Off track</Badge>;
}

export default function StakeholderPortal() {
  const { token } = useParams<{ token: string }>();
  const { data, isLoading, error } = useStakeholderPortal(token);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-6xl mx-auto space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (error || !data || (data as any).error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-3">
            <AlertCircle className="h-12 w-12 mx-auto text-destructive" />
            <h2 className="text-xl font-semibold">Access link invalid or expired</h2>
            <p className="text-sm text-muted-foreground">
              Please contact the organization that shared this link with you.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { access, organization, programs = [], indicators = [], grants = [], beneficiary_summary } = data as any;

  const downloadJson = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${organization?.slug || "report"}-stakeholder-report.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {organization?.logo_url && (
              <img src={organization.logo_url} alt={organization.name} className="h-10 w-10 rounded object-cover" />
            )}
            <div>
              <h1 className="text-xl font-semibold flex items-center gap-2">
                <Building2 className="h-5 w-5" /> {organization?.name}
              </h1>
              <p className="text-xs text-muted-foreground">
                Stakeholder portal · Welcome, {access?.full_name}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{access?.access_level}</Badge>
            {access?.can_download_reports && (
              <Button size="sm" variant="outline" onClick={downloadJson}>
                <Download className="h-4 w-4 mr-2" /> Download
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        {access?.token_expires_at && (
          <p className="text-xs text-muted-foreground">
            Access expires {format(new Date(access.token_expires_at), "PPP")}
          </p>
        )}

        <div className="grid md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Target className="h-4 w-4" /> Programs</CardTitle></CardHeader>
            <CardContent><div className="text-3xl font-bold">{programs.length}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Target className="h-4 w-4" /> Indicators</CardTitle></CardHeader>
            <CardContent><div className="text-3xl font-bold">{indicators.length}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Users className="h-4 w-4" /> Beneficiaries</CardTitle></CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {beneficiary_summary?.total ?? "—"}
              </div>
              {beneficiary_summary?.active != null && (
                <p className="text-xs text-muted-foreground mt-1">{beneficiary_summary.active} active</p>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader><CardTitle>Programs</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {programs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No programs available.</p>
            ) : programs.map((p: any) => (
              <div key={p.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="font-medium">{p.name}</div>
                  <Badge variant="outline">{p.status}</Badge>
                </div>
                {p.description && <p className="text-sm text-muted-foreground mt-1">{p.description}</p>}
                <p className="text-xs text-muted-foreground mt-2">
                  {p.start_date && format(new Date(p.start_date), "PP")}{p.end_date && ` → ${format(new Date(p.end_date), "PP")}`}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Indicator performance</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {indicators.length === 0 ? (
              <p className="text-sm text-muted-foreground">No published indicators yet.</p>
            ) : indicators.map((i: any) => {
              const target = Number(i.target_value) || 0;
              const latest = Number(i.latest_value) || 0;
              const pct = target > 0 ? Math.min(100, (latest / target) * 100) : 0;
              return (
                <div key={i.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-medium truncate">{i.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {i.level || "indicator"} · {latest}{i.unit ? ` ${i.unit}` : ""} of {target || "—"}
                      </div>
                    </div>
                    <StatusBadge pct={pct} />
                  </div>
                  <Progress value={pct} className="h-2 mt-3" />
                </div>
              );
            })}
          </CardContent>
        </Card>

        {grants.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Banknote className="h-5 w-5" /> Grants</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {grants.map((g: any) => (
                <div key={g.id} className="flex items-center justify-between border rounded-lg p-3">
                  <div>
                    <div className="font-medium">{g.name}</div>
                    <div className="text-xs text-muted-foreground">{g.donor_name}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">{g.currency || ""} {Number(g.amount || 0).toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground">{g.status}</div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <footer className="text-center text-xs text-muted-foreground pt-8 pb-4">
          Powered by ApexOS · This is a confidential view shared with you by {organization?.name}
        </footer>
      </main>
    </div>
  );
}
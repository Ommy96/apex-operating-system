import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ShieldCheck, AlertTriangle, Clock } from "lucide-react";
import { format, parseISO, differenceInDays } from "date-fns";

export default function ConsentOverview() {
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.organization_id;

  const { data: docs = [], isLoading } = useQuery({
    queryKey: ["consent-overview", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("consent_documents")
        .select("*, beneficiary:beneficiaries(id, display_name), household:households(id, household_code)")
        .eq("organization_id", orgId)
        .is("deleted_at", null)
        .order("expires_at", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return data || [];
    },
  });

  const now = new Date();
  const active = docs.filter((d: any) => d.status === "active" && (!d.expires_at || parseISO(d.expires_at) > now));
  const expiring = docs.filter((d: any) => d.expires_at && differenceInDays(parseISO(d.expires_at), now) >= 0 && differenceInDays(parseISO(d.expires_at), now) <= 30 && d.status !== "expired");
  const expired = docs.filter((d: any) => d.status === "expired" || (d.expires_at && parseISO(d.expires_at) < now));

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2"><ShieldCheck className="h-8 w-8 text-primary" /> Consent Overview</h1>
        <p className="text-muted-foreground">Organization-wide consent status and upcoming expiries.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Active</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold text-emerald-600">{active.length}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-1"><Clock className="h-4 w-4" /> Expiring (30d)</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold text-amber-600">{expiring.length}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-1"><AlertTriangle className="h-4 w-4" /> Expired</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold text-destructive">{expired.length}</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>All consent documents</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : (
            <Table>
              <TableHeader><TableRow><TableHead>Subject</TableHead><TableHead>Type</TableHead><TableHead>Signed</TableHead><TableHead>Expires</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
              <TableBody>
                {docs.map((d: any) => {
                  const expiresDays = d.expires_at ? differenceInDays(parseISO(d.expires_at), now) : null;
                  const isExpired = d.status === "expired" || (expiresDays !== null && expiresDays < 0);
                  return (
                    <TableRow key={d.id}>
                      <TableCell>{d.beneficiary?.display_name || d.household?.household_code || "—"}</TableCell>
                      <TableCell className="capitalize">{d.doc_type?.replaceAll("_", " ")}</TableCell>
                      <TableCell>{d.signed_at ? format(parseISO(d.signed_at), "MMM d, yyyy") : "—"}</TableCell>
                      <TableCell>{d.expires_at ? format(parseISO(d.expires_at), "MMM d, yyyy") : "—"}</TableCell>
                      <TableCell>
                        {isExpired ? <Badge variant="destructive">Expired</Badge>
                          : expiresDays !== null && expiresDays <= 30 ? <Badge variant="secondary">Expiring</Badge>
                          : <Badge variant="outline">Active</Badge>}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {docs.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-6">No consent documents yet.</TableCell></TableRow>}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
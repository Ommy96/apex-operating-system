import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Copy, ExternalLink, Plus, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import {
  useStakeholderAccessList,
  useCreateStakeholderAccess,
  useRevokeStakeholderAccess,
  type StakeholderAccess,
} from "@/hooks/useStakeholderAccess";
import { format } from "date-fns";

function portalUrl(token: string) {
  return `${window.location.origin}/stakeholder/${token}`;
}

export default function StakeholderAccessManagement() {
  const { data: list, isLoading } = useStakeholderAccessList();
  const createMut = useCreateStakeholderAccess();
  const revokeMut = useRevokeStakeholderAccess();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    stakeholder_type: "donor",
    access_level: "summary",
    can_view_beneficiary_data: false,
    can_download_reports: true,
    expires_in_days: "90",
  });

  const submit = async () => {
    if (!form.full_name || !form.email) {
      toast.error("Name and email are required");
      return;
    }
    const expDays = parseInt(form.expires_in_days || "0", 10);
    const expiry = expDays > 0
      ? new Date(Date.now() + expDays * 86400 * 1000).toISOString()
      : null;
    const created = await createMut.mutateAsync({
      full_name: form.full_name,
      email: form.email,
      stakeholder_type: form.stakeholder_type,
      access_level: form.access_level,
      can_view_beneficiary_data: form.can_view_beneficiary_data,
      can_download_reports: form.can_download_reports,
      token_expires_at: expiry,
    });
    setOpen(false);
    setForm({ ...form, full_name: "", email: "" });
    if (created?.access_token) {
      navigator.clipboard.writeText(portalUrl(created.access_token)).catch(() => {});
      toast.success("Portal link copied to clipboard");
    }
  };

  const copyLink = (s: StakeholderAccess) => {
    navigator.clipboard.writeText(portalUrl(s.access_token));
    toast.success("Link copied");
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Users className="h-7 w-7" /> Stakeholder Access
          </h1>
          <p className="text-muted-foreground mt-1">
            Issue tokenized portal links to donors, board members, partners and auditors.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> New stakeholder</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Grant portal access</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Full name</Label>
                <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
              </div>
              <div>
                <Label>Email</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label>Type</Label>
                  <Select value={form.stakeholder_type} onValueChange={(v) => setForm({ ...form, stakeholder_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["donor","sponsor","board_member","partner","government","auditor","other"].map((t) => (
                        <SelectItem key={t} value={t}>{t.replace("_"," ")}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Access level</Label>
                  <Select value={form.access_level} onValueChange={(v) => setForm({ ...form, access_level: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="summary">Summary</SelectItem>
                      <SelectItem value="detailed">Detailed</SelectItem>
                      <SelectItem value="full">Full</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Expires in (days)</Label>
                <Input
                  type="number" min={0}
                  value={form.expires_in_days}
                  onChange={(e) => setForm({ ...form, expires_in_days: e.target.value })}
                />
                <p className="text-xs text-muted-foreground mt-1">Use 0 for no expiry.</p>
              </div>
              <div className="flex items-center justify-between rounded-md border p-3">
                <div>
                  <Label>Show beneficiary data</Label>
                  <p className="text-xs text-muted-foreground">Aggregated counts only.</p>
                </div>
                <Switch
                  checked={form.can_view_beneficiary_data}
                  onCheckedChange={(v) => setForm({ ...form, can_view_beneficiary_data: v })}
                />
              </div>
              <div className="flex items-center justify-between rounded-md border p-3">
                <div>
                  <Label>Allow report downloads</Label>
                  <p className="text-xs text-muted-foreground">JSON export of portal data.</p>
                </div>
                <Switch
                  checked={form.can_download_reports}
                  onCheckedChange={(v) => setForm({ ...form, can_download_reports: v })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={submit} disabled={createMut.isPending}>
                {createMut.isPending ? "Creating..." : "Create & copy link"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader><CardTitle>Active stakeholders</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : !list?.length ? (
            <p className="text-muted-foreground text-sm py-8 text-center">
              No stakeholders yet. Create your first portal link.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Stakeholder</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Access</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last viewed</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>
                      <div className="font-medium">{s.full_name}</div>
                      <div className="text-xs text-muted-foreground">{s.email}</div>
                    </TableCell>
                    <TableCell><Badge variant="secondary">{s.stakeholder_type}</Badge></TableCell>
                    <TableCell><Badge>{s.access_level}</Badge></TableCell>
                    <TableCell>
                      {s.is_active ? <Badge className="bg-success/10 text-success">Active</Badge>
                                   : <Badge variant="outline">Revoked</Badge>}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {s.last_accessed_at ? format(new Date(s.last_accessed_at), "PP") : "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {s.token_expires_at ? format(new Date(s.token_expires_at), "PP") : "Never"}
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button size="icon" variant="ghost" onClick={() => copyLink(s)} title="Copy link">
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" asChild title="Open">
                        <a href={portalUrl(s.access_token)} target="_blank" rel="noreferrer">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                      {s.is_active && (
                        <Button size="icon" variant="ghost" onClick={() => revokeMut.mutate(s.id)} title="Revoke">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
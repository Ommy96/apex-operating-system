import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Handshake, Plus, Trash2, Pencil, Users, Building2, FileSignature } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

const ROLES = [
  { value: "lead", label: "Lead Partner" },
  { value: "implementing", label: "Implementing" },
  { value: "funder", label: "Funder" },
  { value: "technical", label: "Technical" },
  { value: "community", label: "Community" },
  { value: "government", label: "Government" },
];

const STAKEHOLDER_TYPES = [
  { value: "community", label: "Community" },
  { value: "government", label: "Government" },
  { value: "donor", label: "Donor" },
  { value: "media", label: "Media" },
  { value: "private_sector", label: "Private Sector" },
  { value: "academic", label: "Academic" },
  { value: "other", label: "Other" },
];

interface Props {
  programId: string;
  orgId?: string;
  projectId?: string;
}

const blankPartner = {
  partner_id: "",
  role: "implementing",
  contribution_type: "",
  contribution_value: "",
  mou_reference: "",
  mou_start_date: "",
  mou_end_date: "",
  status: "active",
  notes: "",
};

const blankStakeholder = {
  name: "",
  organization_name: "",
  stakeholder_type: "community",
  role_title: "",
  influence: 3,
  interest: 3,
  engagement_strategy: "",
  contact_email: "",
  contact_phone: "",
  notes: "",
};

function quadrant(influence: number, interest: number): { label: string; color: string } {
  const hi = influence >= 4;
  const hii = interest >= 4;
  if (hi && hii) return { label: "Manage Closely", color: "bg-destructive/10 text-destructive border-destructive/30" };
  if (hi && !hii) return { label: "Keep Satisfied", color: "bg-warning/10 text-warning border-warning/30" };
  if (!hi && hii) return { label: "Keep Informed", color: "bg-primary/10 text-primary border-primary/30" };
  return { label: "Monitor", color: "bg-muted text-muted-foreground border-border" };
}

export const ProgramPartners = ({ programId, orgId, projectId }: Props) => {
  const qc = useQueryClient();
  const filterCol = projectId ? "project_id" : "program_id";
  const filterVal = projectId || programId;

  const [partnerOpen, setPartnerOpen] = useState(false);
  const [editingPartner, setEditingPartner] = useState<any>(null);
  const [pForm, setPForm] = useState<any>(blankPartner);

  const [stakeholderOpen, setStakeholderOpen] = useState(false);
  const [editingStakeholder, setEditingStakeholder] = useState<any>(null);
  const [sForm, setSForm] = useState<any>(blankStakeholder);

  const { data: orgPartners = [] } = useQuery({
    queryKey: ["partner-orgs", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("partner_organizations")
        .select("id, partner_name, partner_type")
        .eq("organization_id", orgId!)
        .order("partner_name");
      if (error) throw error;
      return data || [];
    },
    enabled: !!orgId,
  });

  const { data: links = [], isLoading: loadingLinks } = useQuery({
    queryKey: ["program-partners", filterCol, filterVal],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("program_partners" as any)
        .select("*, partner:partner_organizations(id, partner_name, partner_type, country)")
        .eq(filterCol, filterVal)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!filterVal,
  });

  const { data: stakeholders = [], isLoading: loadingStakeholders } = useQuery({
    queryKey: ["program-stakeholders", filterCol, filterVal],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("program_stakeholders" as any)
        .select("*")
        .eq(filterCol, filterVal)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!filterVal,
  });

  const upsertPartner = useMutation({
    mutationFn: async () => {
      if (!orgId) throw new Error("Missing organization");
      const payload: any = {
        org_id: orgId,
        program_id: projectId ? null : programId,
        project_id: projectId || null,
        partner_id: pForm.partner_id,
        role: pForm.role,
        contribution_type: pForm.contribution_type || null,
        contribution_value: pForm.contribution_value ? Number(pForm.contribution_value) : null,
        mou_reference: pForm.mou_reference || null,
        mou_start_date: pForm.mou_start_date || null,
        mou_end_date: pForm.mou_end_date || null,
        status: pForm.status,
        notes: pForm.notes || null,
      };
      const user = (await supabase.auth.getUser()).data.user;
      if (editingPartner) {
        payload.updated_by = user?.id;
        const { error } = await supabase.from("program_partners" as any).update(payload).eq("id", editingPartner.id);
        if (error) throw error;
      } else {
        payload.created_by = user?.id;
        const { error } = await supabase.from("program_partners" as any).insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["program-partners"] });
      toast.success(editingPartner ? "Partner updated" : "Partner added");
      setPartnerOpen(false);
      setEditingPartner(null);
      setPForm(blankPartner);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const removePartner = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("program_partners" as any).update({ deleted_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["program-partners"] }); toast.success("Partner removed"); },
  });

  const upsertStakeholder = useMutation({
    mutationFn: async () => {
      if (!orgId) throw new Error("Missing organization");
      const payload: any = {
        org_id: orgId,
        program_id: projectId ? null : programId,
        project_id: projectId || null,
        name: sForm.name,
        organization_name: sForm.organization_name || null,
        stakeholder_type: sForm.stakeholder_type,
        role_title: sForm.role_title || null,
        influence: Number(sForm.influence),
        interest: Number(sForm.interest),
        engagement_strategy: sForm.engagement_strategy || null,
        contact_email: sForm.contact_email || null,
        contact_phone: sForm.contact_phone || null,
        notes: sForm.notes || null,
      };
      const user = (await supabase.auth.getUser()).data.user;
      if (editingStakeholder) {
        payload.updated_by = user?.id;
        const { error } = await supabase.from("program_stakeholders" as any).update(payload).eq("id", editingStakeholder.id);
        if (error) throw error;
      } else {
        payload.created_by = user?.id;
        const { error } = await supabase.from("program_stakeholders" as any).insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["program-stakeholders"] });
      toast.success(editingStakeholder ? "Stakeholder updated" : "Stakeholder added");
      setStakeholderOpen(false);
      setEditingStakeholder(null);
      setSForm(blankStakeholder);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const removeStakeholder = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("program_stakeholders" as any).update({ deleted_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["program-stakeholders"] }); toast.success("Stakeholder removed"); },
  });

  const totalContribution = useMemo(
    () => links.reduce((s, l) => s + Number(l.contribution_value || 0), 0),
    [links]
  );

  const openEditPartner = (p: any) => {
    setEditingPartner(p);
    setPForm({
      partner_id: p.partner_id,
      role: p.role,
      contribution_type: p.contribution_type || "",
      contribution_value: p.contribution_value || "",
      mou_reference: p.mou_reference || "",
      mou_start_date: p.mou_start_date || "",
      mou_end_date: p.mou_end_date || "",
      status: p.status,
      notes: p.notes || "",
    });
    setPartnerOpen(true);
  };

  const openEditStakeholder = (s: any) => {
    setEditingStakeholder(s);
    setSForm({
      name: s.name,
      organization_name: s.organization_name || "",
      stakeholder_type: s.stakeholder_type,
      role_title: s.role_title || "",
      influence: s.influence,
      interest: s.interest,
      engagement_strategy: s.engagement_strategy || "",
      contact_email: s.contact_email || "",
      contact_phone: s.contact_phone || "",
      notes: s.notes || "",
    });
    setStakeholderOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-border/60">
          <CardContent className="p-5 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Handshake className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Partners</p>
              <p className="text-2xl font-bold">{links.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardContent className="p-5 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-success/10 flex items-center justify-center">
              <FileSignature className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Contribution</p>
              <p className="text-2xl font-bold">{totalContribution.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardContent className="p-5 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-accent/10 flex items-center justify-center">
              <Users className="h-5 w-5 text-accent" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Stakeholders</p>
              <p className="text-2xl font-bold">{stakeholders.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Partners */}
      <Card className="border-border/60">
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold flex items-center gap-2"><Handshake className="h-4 w-4 text-primary" /> Implementing Partners</h3>
              <p className="text-xs text-muted-foreground">Organizations collaborating on this {projectId ? "project" : "program"}</p>
            </div>
            <Sheet open={partnerOpen} onOpenChange={(v) => { setPartnerOpen(v); if (!v) { setEditingPartner(null); setPForm(blankPartner); } }}>
              <SheetTrigger asChild>
                <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Link Partner</Button>
              </SheetTrigger>
              <SheetContent className="overflow-y-auto sm:max-w-lg">
                <SheetHeader><SheetTitle>{editingPartner ? "Edit Partner" : "Link Partner"}</SheetTitle></SheetHeader>
                <div className="space-y-3 mt-4">
                  <div>
                    <Label>Partner Organization *</Label>
                    <Select value={pForm.partner_id} onValueChange={(v) => setPForm({ ...pForm, partner_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Select partner" /></SelectTrigger>
                      <SelectContent>
                        {orgPartners.length === 0 ? (
                          <div className="px-3 py-2 text-xs text-muted-foreground">No partners yet. Add via Partner Collaboration.</div>
                        ) : orgPartners.map((p: any) => (
                          <SelectItem key={p.id} value={p.id}>{p.partner_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label>Role</Label>
                      <Select value={pForm.role} onValueChange={(v) => setPForm({ ...pForm, role: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{ROLES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Status</Label>
                      <Select value={pForm.status} onValueChange={(v) => setPForm({ ...pForm, status: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="terminated">Terminated</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div><Label>Contribution Type</Label><Input value={pForm.contribution_type} onChange={(e) => setPForm({ ...pForm, contribution_type: e.target.value })} placeholder="Funding, Staff, Equipment..." /></div>
                    <div><Label>Contribution Value</Label><Input type="number" value={pForm.contribution_value} onChange={(e) => setPForm({ ...pForm, contribution_value: e.target.value })} /></div>
                  </div>
                  <div><Label>MoU Reference</Label><Input value={pForm.mou_reference} onChange={(e) => setPForm({ ...pForm, mou_reference: e.target.value })} /></div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div><Label>MoU Start</Label><Input type="date" value={pForm.mou_start_date} onChange={(e) => setPForm({ ...pForm, mou_start_date: e.target.value })} /></div>
                    <div><Label>MoU End</Label><Input type="date" value={pForm.mou_end_date} onChange={(e) => setPForm({ ...pForm, mou_end_date: e.target.value })} /></div>
                  </div>
                  <div><Label>Notes</Label><Textarea rows={2} value={pForm.notes} onChange={(e) => setPForm({ ...pForm, notes: e.target.value })} /></div>
                  <Button onClick={() => upsertPartner.mutate()} disabled={!pForm.partner_id || upsertPartner.isPending} className="w-full">
                    {editingPartner ? "Save Changes" : "Link Partner"}
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>

          {loadingLinks ? (
            <div className="space-y-2">{[1, 2].map((i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}</div>
          ) : links.length === 0 ? (
            <div className="text-center py-10 text-sm text-muted-foreground">
              <Building2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
              No partners linked yet.
            </div>
          ) : (
            <div className="space-y-2">
              {links.map((l) => (
                <div key={l.id} className="flex items-start gap-3 p-3 rounded-xl border border-border/60 hover:bg-muted/40 transition-colors">
                  <div className="shrink-0 h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-semibold text-sm">
                    {l.partner?.partner_name?.[0]?.toUpperCase() || "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-sm">{l.partner?.partner_name || "Unknown"}</p>
                      <Badge variant="outline" className="text-[10px] capitalize">{l.role}</Badge>
                      <Badge variant="secondary" className="text-[10px] capitalize">{l.status}</Badge>
                      {l.partner?.partner_type && <Badge variant="outline" className="text-[10px] capitalize">{l.partner.partner_type}</Badge>}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground flex-wrap">
                      {l.contribution_type && <span>{l.contribution_type}</span>}
                      {l.contribution_value && <span>{Number(l.contribution_value).toLocaleString()} {l.contribution_currency}</span>}
                      {l.mou_reference && <span>MoU: {l.mou_reference}</span>}
                      {l.mou_end_date && <span>Ends {format(new Date(l.mou_end_date), "MMM d, yyyy")}</span>}
                    </div>
                    {l.notes && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{l.notes}</p>}
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditPartner(l)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => removePartner.mutate(l.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stakeholders */}
      <Card className="border-border/60">
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold flex items-center gap-2"><Users className="h-4 w-4 text-accent" /> Stakeholder Map</h3>
              <p className="text-xs text-muted-foreground">Influence × Interest grid drives engagement strategy</p>
            </div>
            <Sheet open={stakeholderOpen} onOpenChange={(v) => { setStakeholderOpen(v); if (!v) { setEditingStakeholder(null); setSForm(blankStakeholder); } }}>
              <SheetTrigger asChild>
                <Button size="sm" variant="outline"><Plus className="h-4 w-4 mr-1" /> Add Stakeholder</Button>
              </SheetTrigger>
              <SheetContent className="overflow-y-auto sm:max-w-lg">
                <SheetHeader><SheetTitle>{editingStakeholder ? "Edit Stakeholder" : "New Stakeholder"}</SheetTitle></SheetHeader>
                <div className="space-y-3 mt-4">
                  <div><Label>Name *</Label><Input value={sForm.name} onChange={(e) => setSForm({ ...sForm, name: e.target.value })} /></div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div><Label>Organization</Label><Input value={sForm.organization_name} onChange={(e) => setSForm({ ...sForm, organization_name: e.target.value })} /></div>
                    <div><Label>Role / Title</Label><Input value={sForm.role_title} onChange={(e) => setSForm({ ...sForm, role_title: e.target.value })} /></div>
                  </div>
                  <div>
                    <Label>Type</Label>
                    <Select value={sForm.stakeholder_type} onValueChange={(v) => setSForm({ ...sForm, stakeholder_type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{STAKEHOLDER_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label>Influence (1-5)</Label>
                      <Select value={String(sForm.influence)} onValueChange={(v) => setSForm({ ...sForm, influence: Number(v) })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{[1, 2, 3, 4, 5].map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Interest (1-5)</Label>
                      <Select value={String(sForm.interest)} onValueChange={(v) => setSForm({ ...sForm, interest: Number(v) })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{[1, 2, 3, 4, 5].map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div><Label>Engagement Strategy</Label><Textarea rows={2} value={sForm.engagement_strategy} onChange={(e) => setSForm({ ...sForm, engagement_strategy: e.target.value })} /></div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div><Label>Email</Label><Input type="email" value={sForm.contact_email} onChange={(e) => setSForm({ ...sForm, contact_email: e.target.value })} /></div>
                    <div><Label>Phone</Label><Input value={sForm.contact_phone} onChange={(e) => setSForm({ ...sForm, contact_phone: e.target.value })} /></div>
                  </div>
                  <div><Label>Notes</Label><Textarea rows={2} value={sForm.notes} onChange={(e) => setSForm({ ...sForm, notes: e.target.value })} /></div>
                  <Button onClick={() => upsertStakeholder.mutate()} disabled={!sForm.name || upsertStakeholder.isPending} className="w-full">
                    {editingStakeholder ? "Save Changes" : "Add Stakeholder"}
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>

          {/* 2x2 Power-Interest Grid */}
          {stakeholders.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
              {[
                { label: "Keep Satisfied", filter: (s: any) => s.influence >= 4 && s.interest < 4, color: "bg-warning/5 border-warning/30" },
                { label: "Manage Closely", filter: (s: any) => s.influence >= 4 && s.interest >= 4, color: "bg-destructive/5 border-destructive/30" },
                { label: "Monitor", filter: (s: any) => s.influence < 4 && s.interest < 4, color: "bg-muted/50 border-border" },
                { label: "Keep Informed", filter: (s: any) => s.influence < 4 && s.interest >= 4, color: "bg-primary/5 border-primary/30" },
              ].map((q) => {
                const items = stakeholders.filter(q.filter);
                return (
                  <div key={q.label} className={`p-3 rounded-xl border ${q.color} min-h-[80px]`}>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">{q.label}</p>
                    <p className="text-lg font-bold">{items.length}</p>
                    <div className="text-[11px] text-muted-foreground line-clamp-2">
                      {items.slice(0, 3).map((s) => s.name).join(", ")}
                      {items.length > 3 && ` +${items.length - 3}`}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {loadingStakeholders ? (
            <div className="space-y-2">{[1, 2].map((i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}</div>
          ) : stakeholders.length === 0 ? (
            <div className="text-center py-10 text-sm text-muted-foreground">
              <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
              No stakeholders mapped yet.
            </div>
          ) : (
            <div className="space-y-2">
              {stakeholders.map((s) => {
                const q = quadrant(s.influence, s.interest);
                return (
                  <div key={s.id} className="flex items-start gap-3 p-3 rounded-xl border border-border/60 hover:bg-muted/40 transition-colors">
                    <div className="shrink-0 h-10 w-10 rounded-lg bg-accent/10 text-accent flex items-center justify-center font-semibold text-sm">
                      {s.name?.[0]?.toUpperCase() || "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-sm">{s.name}</p>
                        {s.role_title && <span className="text-xs text-muted-foreground">· {s.role_title}</span>}
                        <Badge variant="outline" className={`text-[10px] ${q.color}`}>{q.label}</Badge>
                        <Badge variant="secondary" className="text-[10px] capitalize">{s.stakeholder_type.replace("_", " ")}</Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground flex-wrap">
                        {s.organization_name && <span>{s.organization_name}</span>}
                        <span>Influence {s.influence} · Interest {s.interest}</span>
                        {s.contact_email && <span>{s.contact_email}</span>}
                      </div>
                      {s.engagement_strategy && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{s.engagement_strategy}</p>}
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditStakeholder(s)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => removeStakeholder.mutate(s.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ProgramPartners;
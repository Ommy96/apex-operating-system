import { useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { FileText, Plus, AlertTriangle, ShieldCheck, Trash2, Download } from "lucide-react";
import { toast } from "sonner";
import { format, differenceInDays, parseISO } from "date-fns";

const DOC_TYPES = [
  { value: "consent_form", label: "Consent form" },
  { value: "child_protection", label: "Child protection" },
  { value: "photo_release", label: "Photo release" },
  { value: "data_consent", label: "Data consent" },
  { value: "agreement", label: "Agreement" },
  { value: "other", label: "Other" },
];

interface Props {
  beneficiaryId?: string;
  householdId?: string;
}

export function ConsentVaultSection({ beneficiaryId, householdId }: Props) {
  const { currentOrganization } = useOrganization();
  const { user } = useAuth();
  const orgId = currentOrganization?.organization_id;
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const queryKey = ["consent-documents", beneficiaryId || householdId];
  const { data: docs = [], isLoading } = useQuery({
    queryKey,
    enabled: !!orgId && !!(beneficiaryId || householdId),
    queryFn: async () => {
      let q = (supabase as any).from("consent_documents").select("*").is("deleted_at", null).order("created_at", { ascending: false });
      if (beneficiaryId) q = q.eq("beneficiary_id", beneficiaryId);
      if (householdId) q = q.eq("household_id", householdId);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("consent_documents").update({ deleted_at: new Date().toISOString(), updated_by: user?.id }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Consent document removed"); qc.invalidateQueries({ queryKey }); },
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-primary" /> Consent & Documents
        </CardTitle>
        <Button size="sm" onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1" /> Add document</Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {!isLoading && docs.length === 0 && (
          <p className="text-sm text-muted-foreground">No consent documents on file. Add consent, photo-release or agreement forms here.</p>
        )}
        {docs.map((d: any) => {
          const expiring = d.expires_at ? differenceInDays(parseISO(d.expires_at), new Date()) : null;
          const isExpired = d.status === "expired" || (expiring !== null && expiring < 0);
          const isSoon = expiring !== null && expiring >= 0 && expiring <= 30;
          return (
            <div key={d.id} className="flex items-center gap-3 border rounded-md p-3">
              <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm truncate">{d.title || d.file_name || DOC_TYPES.find(t => t.value === d.doc_type)?.label}</span>
                  <Badge variant="outline" className="text-[10px]">{DOC_TYPES.find(t => t.value === d.doc_type)?.label || d.doc_type}</Badge>
                  {isExpired && <Badge variant="destructive" className="text-[10px]"><AlertTriangle className="h-3 w-3 mr-1" />Expired</Badge>}
                  {!isExpired && isSoon && <Badge variant="secondary" className="text-[10px]">Expires in {expiring}d</Badge>}
                  {!isExpired && !isSoon && d.status === "active" && <Badge variant="secondary" className="text-[10px] bg-success/10 text-success">Active</Badge>}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {d.signed_at && `Signed ${format(parseISO(d.signed_at), "MMM d, yyyy")}`}
                  {d.expires_at && ` · Expires ${format(parseISO(d.expires_at), "MMM d, yyyy")}`}
                  {d.signed_by && ` · by ${d.signed_by}`}
                </div>
              </div>
              {d.file_url && (
                <Button size="sm" variant="ghost" asChild>
                  <a href={d.file_url} target="_blank" rel="noreferrer"><Download className="h-4 w-4" /></a>
                </Button>
              )}
              <Button size="sm" variant="ghost" onClick={() => remove.mutate(d.id)}><Trash2 className="h-4 w-4" /></Button>
            </div>
          );
        })}
      </CardContent>

      <UploadDialog open={open} onOpenChange={setOpen} beneficiaryId={beneficiaryId} householdId={householdId} onDone={() => qc.invalidateQueries({ queryKey })} />
    </Card>
  );
}

function UploadDialog({ open, onOpenChange, beneficiaryId, householdId, onDone }: any) {
  const { currentOrganization } = useOrganization();
  const { user } = useAuth();
  const orgId = currentOrganization?.organization_id;
  const [saving, setSaving] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [form, setForm] = useState({
    doc_type: "consent_form",
    title: "",
    signed_by: "",
    signed_at: new Date().toISOString().slice(0, 10),
    expires_at: "",
    notes: "",
  });

  const submit = async () => {
    if (!orgId) return;
    setSaving(true);
    try {
      let file_url: string | null = null;
      let file_name: string | null = null;
      if (file) {
        const path = `${beneficiaryId || householdId}/consent/${Date.now()}_${file.name}`;
        const { error: upErr } = await supabase.storage.from("beneficiary-documents").upload(path, file);
        if (upErr) throw upErr;
        const { data } = supabase.storage.from("beneficiary-documents").getPublicUrl(path);
        file_url = data.publicUrl;
        file_name = file.name;
      }
      const { error } = await (supabase as any).from("consent_documents").insert({
        organization_id: orgId,
        beneficiary_id: beneficiaryId || null,
        household_id: householdId || null,
        doc_type: form.doc_type,
        title: form.title || null,
        signed_by: form.signed_by || null,
        signed_at: form.signed_at || null,
        expires_at: form.expires_at || null,
        notes: form.notes || null,
        file_url,
        file_name,
        uploaded_by: user?.id,
        status: "active",
      });
      if (error) throw error;
      toast.success("Consent document saved");
      onDone?.();
      onOpenChange(false);
      setFile(null);
      setForm({ doc_type: "consent_form", title: "", signed_by: "", signed_at: new Date().toISOString().slice(0, 10), expires_at: "", notes: "" });
    } catch (e: any) {
      toast.error(e.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add consent document</DialogTitle>
          <DialogDescription>Upload signed consent, agreements, or child-protection documents.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Document type</Label>
            <Select value={form.doc_type} onValueChange={(v) => setForm({ ...form, doc_type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {DOC_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Title (optional)</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><Label>Signed on</Label><Input type="date" value={form.signed_at} onChange={(e) => setForm({ ...form, signed_at: e.target.value })} /></div>
            <div><Label>Expires on</Label><Input type="date" value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} /></div>
          </div>
          <div><Label>Signed by</Label><Input value={form.signed_by} onChange={(e) => setForm({ ...form, signed_by: e.target.value })} placeholder="Name of signer" /></div>
          <div><Label>Notes</Label><Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          <div><Label>File</Label><Input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={saving}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
import { useState, useEffect, useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Trash2, GripVertical, Save, Eye, FileText, Settings as SettingsIcon, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import {
  useMEForm, useMEFormFields, useUpdateForm, useUpsertFormField, useDeleteFormField, useReorderFormFields, useMEFormSubmissions,
  type MEFormField, type FormFieldType,
} from "@/hooks/useMEForms";
import { toast } from "@/hooks/use-toast";

const FIELD_TYPES: { value: FormFieldType; label: string }[] = [
  { value: "text", label: "Short text" },
  { value: "number", label: "Number" },
  { value: "decimal", label: "Decimal" },
  { value: "date", label: "Date" },
  { value: "datetime", label: "Date & time" },
  { value: "select", label: "Single select" },
  { value: "multiselect", label: "Multi select" },
  { value: "boolean", label: "Yes / No" },
  { value: "scale", label: "Scale (1-5)" },
  { value: "photo", label: "Photo upload" },
  { value: "document", label: "Document upload" },
  { value: "beneficiary_link", label: "Beneficiary link" },
  { value: "location", label: "GPS location" },
  { value: "calculated", label: "Calculated" },
  { value: "section_header", label: "Section header" },
];

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 60);
}

export default function FormBuilderEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: form, isLoading } = useMEForm(id);
  const { data: fields, isLoading: fieldsLoading } = useMEFormFields(id);
  const { data: submissions } = useMEFormSubmissions(id);
  const updateForm = useUpdateForm();
  const upsertField = useUpsertFormField();
  const deleteField = useDeleteFormField();
  const reorderFields = useReorderFormFields();

  const [editing, setEditing] = useState<Partial<MEFormField> | null>(null);

  // Local meta state
  const [meta, setMeta] = useState({ name: "", description: "", form_purpose: "" });
  const [requiresLink, setRequiresLink] = useState(false);
  const [requiresLoc, setRequiresLoc] = useState(false);
  const [requiresPhoto, setRequiresPhoto] = useState(false);
  const [allowOffline, setAllowOffline] = useState(true);

  useEffect(() => {
    if (form) {
      setMeta({ name: form.name, description: form.description ?? "", form_purpose: form.form_purpose ?? "" });
      setRequiresLink(form.requires_beneficiary_link);
      setRequiresLoc(form.requires_location);
      setRequiresPhoto(form.requires_photo);
      setAllowOffline(form.allow_offline);
    }
  }, [form]);

  const sortedFields = useMemo(() => [...(fields ?? [])].sort((a, b) => a.display_order - b.display_order), [fields]);

  if (isLoading || !form) {
    return <div className="p-6 space-y-3"><Skeleton className="h-12 w-64" /><Skeleton className="h-96 w-full" /></div>;
  }

  const handleSaveMeta = () => {
    updateForm.mutate({ id: form.id, patch: {
      name: meta.name, description: meta.description || null, form_purpose: meta.form_purpose || null,
      requires_beneficiary_link: requiresLink, requires_location: requiresLoc,
      requires_photo: requiresPhoto, allow_offline: allowOffline,
    } });
  };

  const handlePublish = () => {
    if (!sortedFields.length) {
      toast({ title: "Add at least one field before publishing", variant: "destructive" });
      return;
    }
    updateForm.mutate({ id: form.id, patch: { status: "active" } });
  };

  const handleRetire = () => updateForm.mutate({ id: form.id, patch: { status: "retired" } });
  const handleReopenDraft = () => updateForm.mutate({ id: form.id, patch: { status: "draft" } });

  const handleAddField = () => {
    setEditing({
      form_id: form.id,
      field_label: "",
      field_key: "",
      field_type: "text",
      is_required: false,
      display_order: sortedFields.length,
      field_options: {},
    });
  };

  const handleSaveField = async () => {
    if (!editing) return;
    if (!editing.field_label?.trim()) { toast({ title: "Label is required", variant: "destructive" }); return; }
    const payload: any = {
      ...editing,
      field_label: editing.field_label!.trim(),
      field_key: editing.field_key?.trim() || slugify(editing.field_label!),
    };
    await upsertField.mutateAsync(payload);
    setEditing(null);
  };

  const move = async (idx: number, dir: -1 | 1) => {
    const next = idx + dir;
    if (next < 0 || next >= sortedFields.length) return;
    const a = sortedFields[idx];
    const b = sortedFields[next];
    await reorderFields.mutateAsync({ formId: form.id, ordered: [
      { id: a.id, display_order: b.display_order },
      { id: b.id, display_order: a.display_order },
    ]});
  };

  return (
    <div className="space-y-6 p-6 max-w-6xl mx-auto">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-2">
          <Button asChild variant="ghost" size="sm" className="-ml-2">
            <Link to="/me/forms"><ArrowLeft className="h-4 w-4 mr-1" /> All forms</Link>
          </Button>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-semibold flex items-center gap-2"><FileText className="h-6 w-6 text-primary" /> {form.name}</h1>
            <Badge>{form.status}</Badge>
            <span className="text-sm text-muted-foreground">v{form.version}</span>
          </div>
          {form.form_purpose && <p className="text-sm text-muted-foreground">{form.form_purpose}</p>}
        </div>
        <div className="flex items-center gap-2">
          {form.status === "draft" && (
            <Button onClick={handlePublish} disabled={updateForm.isPending}>Publish</Button>
          )}
          {form.status === "active" && (
            <Button variant="outline" onClick={handleRetire} disabled={updateForm.isPending}>Retire</Button>
          )}
          {form.status === "retired" && (
            <Button variant="outline" onClick={handleReopenDraft} disabled={updateForm.isPending}>Reopen as draft</Button>
          )}
        </div>
      </div>

      <Tabs defaultValue="fields">
        <TabsList>
          <TabsTrigger value="fields"><GripVertical className="h-4 w-4 mr-1" /> Fields</TabsTrigger>
          <TabsTrigger value="settings"><SettingsIcon className="h-4 w-4 mr-1" /> Settings</TabsTrigger>
          <TabsTrigger value="preview"><Eye className="h-4 w-4 mr-1" /> Preview</TabsTrigger>
          <TabsTrigger value="submissions"><Inbox className="h-4 w-4 mr-1" /> Submissions {submissions ? `(${submissions.length})` : ""}</TabsTrigger>
        </TabsList>

        <TabsContent value="fields" className="space-y-3 pt-4">
          {fieldsLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : sortedFields.length === 0 ? (
            <Card><CardContent className="p-12 text-center">
              <p className="text-muted-foreground mb-4">This form has no fields yet.</p>
              <Button onClick={handleAddField}><Plus className="h-4 w-4 mr-1" /> Add first field</Button>
            </CardContent></Card>
          ) : (
            <div className="space-y-2">
              {sortedFields.map((f, idx) => (
                <Card key={f.id}>
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className="flex flex-col">
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => move(idx, -1)} disabled={idx === 0}>↑</Button>
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => move(idx, 1)} disabled={idx === sortedFields.length - 1}>↓</Button>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{f.field_label}</span>
                        <Badge variant="outline" className="text-[10px]">{f.field_type}</Badge>
                        {f.is_required && <Badge className="bg-destructive/10 text-destructive text-[10px]">required</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">key: {f.field_key} {f.helper_text ? `· ${f.helper_text}` : ""}</p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setEditing(f)}>Edit</Button>
                    <Button variant="ghost" size="sm" className="text-destructive" onClick={() => {
                      if (confirm(`Delete field "${f.field_label}"?`)) deleteField.mutate({ id: f.id, formId: form.id });
                    }}><Trash2 className="h-4 w-4" /></Button>
                  </CardContent>
                </Card>
              ))}
              <Button variant="outline" onClick={handleAddField} className="w-full"><Plus className="h-4 w-4 mr-1" /> Add field</Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="settings" className="pt-4">
          <Card>
            <CardHeader><CardTitle>Form settings</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Name</Label>
                <Input value={meta.name} onChange={(e) => setMeta({ ...meta, name: e.target.value })} />
              </div>
              <div>
                <Label>Purpose</Label>
                <Input value={meta.form_purpose} onChange={(e) => setMeta({ ...meta, form_purpose: e.target.value })} />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea rows={3} value={meta.description} onChange={(e) => setMeta({ ...meta, description: e.target.value })} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <SettingToggle label="Requires beneficiary link" value={requiresLink} onChange={setRequiresLink} />
                <SettingToggle label="Requires location (GPS)" value={requiresLoc} onChange={setRequiresLoc} />
                <SettingToggle label="Requires at least one photo" value={requiresPhoto} onChange={setRequiresPhoto} />
                <SettingToggle label="Allow offline submission" value={allowOffline} onChange={setAllowOffline} />
              </div>
              <Button onClick={handleSaveMeta} disabled={updateForm.isPending}><Save className="h-4 w-4 mr-1" /> Save settings</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preview" className="pt-4">
          <Card><CardContent className="p-6 space-y-4 max-w-xl">
            <div>
              <h3 className="font-semibold text-lg">{form.name}</h3>
              {form.description && <p className="text-sm text-muted-foreground">{form.description}</p>}
            </div>
            {sortedFields.length === 0 && <p className="text-sm text-muted-foreground">Add fields to see a preview.</p>}
            {sortedFields.map((f) => <FieldPreview key={f.id} field={f} />)}
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="submissions" className="pt-4">
          {!submissions || submissions.length === 0 ? (
            <Card><CardContent className="p-12 text-center text-sm text-muted-foreground">No submissions yet.</CardContent></Card>
          ) : (
            <Card><CardContent className="p-0">
              <div className="divide-y">
                {submissions.map((s) => (
                  <div key={s.id} className="p-4 text-sm grid grid-cols-3 gap-2">
                    <div><span className="text-muted-foreground">Date:</span> {s.submission_date}</div>
                    <div><span className="text-muted-foreground">Beneficiaries:</span> {s.beneficiary_ids?.length ?? 0}</div>
                    <div><span className="text-muted-foreground">Location:</span> {s.location_county ?? "—"}</div>
                  </div>
                ))}
              </div>
            </CardContent></Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Field editor sheet */}
      <Sheet open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <SheetContent className="overflow-y-auto sm:max-w-lg">
          <SheetHeader><SheetTitle>{editing?.id ? "Edit field" : "New field"}</SheetTitle></SheetHeader>
          {editing && (
            <div className="space-y-4 py-4">
              <div>
                <Label>Label *</Label>
                <Input value={editing.field_label ?? ""} onChange={(e) => setEditing({ ...editing, field_label: e.target.value, field_key: editing.field_key || slugify(e.target.value) })} />
              </div>
              <div>
                <Label>Field key (machine name)</Label>
                <Input value={editing.field_key ?? ""} onChange={(e) => setEditing({ ...editing, field_key: slugify(e.target.value) })} />
              </div>
              <div>
                <Label>Type</Label>
                <Select value={editing.field_type} onValueChange={(v: FormFieldType) => setEditing({ ...editing, field_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FIELD_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {(editing.field_type === "select" || editing.field_type === "multiselect") && (
                <div>
                  <Label>Options (one per line)</Label>
                  <Textarea
                    rows={4}
                    value={(editing.field_options?.options ?? []).join("\n")}
                    onChange={(e) => setEditing({ ...editing, field_options: { ...editing.field_options, options: e.target.value.split("\n").map(s => s.trim()).filter(Boolean) } })}
                  />
                </div>
              )}
              <div>
                <Label>Helper text</Label>
                <Input value={editing.helper_text ?? ""} onChange={(e) => setEditing({ ...editing, helper_text: e.target.value })} />
              </div>
              <SettingToggle label="Required" value={!!editing.is_required} onChange={(v) => setEditing({ ...editing, is_required: v })} />
            </div>
          )}
          <SheetFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={handleSaveField} disabled={upsertField.isPending}>Save field</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function SettingToggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between rounded-md border p-3">
      <Label className="text-sm">{label}</Label>
      <Switch checked={value} onCheckedChange={onChange} />
    </div>
  );
}

function FieldPreview({ field }: { field: MEFormField }) {
  if (field.field_type === "section_header") {
    return <h4 className="font-semibold text-base pt-2 border-t">{field.field_label}</h4>;
  }
  return (
    <div className="space-y-1">
      <Label>{field.field_label}{field.is_required && <span className="text-destructive"> *</span>}</Label>
      {field.field_type === "text" && <Input disabled placeholder="Text input" />}
      {field.field_type === "number" && <Input type="number" disabled placeholder="0" />}
      {field.field_type === "decimal" && <Input type="number" step="0.01" disabled placeholder="0.00" />}
      {field.field_type === "date" && <Input type="date" disabled />}
      {field.field_type === "datetime" && <Input type="datetime-local" disabled />}
      {field.field_type === "boolean" && <div className="text-sm text-muted-foreground">○ Yes ○ No</div>}
      {field.field_type === "select" && (
        <Select disabled>
          <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
          <SelectContent>{(field.field_options?.options ?? []).map((o: string) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
        </Select>
      )}
      {field.field_type === "multiselect" && (
        <div className="flex flex-wrap gap-1">
          {(field.field_options?.options ?? []).map((o: string) => <Badge key={o} variant="outline">{o}</Badge>)}
          {!(field.field_options?.options ?? []).length && <span className="text-xs text-muted-foreground">No options yet</span>}
        </div>
      )}
      {field.field_type === "scale" && <div className="flex gap-2">{[1,2,3,4,5].map(n => <div key={n} className="h-8 w-8 rounded-md border flex items-center justify-center text-sm">{n}</div>)}</div>}
      {field.field_type === "photo" && <div className="border-2 border-dashed rounded-md p-4 text-center text-sm text-muted-foreground">📷 Photo upload</div>}
      {field.field_type === "document" && <div className="border-2 border-dashed rounded-md p-4 text-center text-sm text-muted-foreground">📄 Document upload</div>}
      {field.field_type === "beneficiary_link" && <Input disabled placeholder="🔗 Search beneficiary…" />}
      {field.field_type === "location" && <Input disabled placeholder="📍 Capture GPS" />}
      {field.field_type === "calculated" && <Input disabled placeholder="(calculated)" />}
      {field.helper_text && <p className="text-xs text-muted-foreground">{field.helper_text}</p>}
    </div>
  );
}
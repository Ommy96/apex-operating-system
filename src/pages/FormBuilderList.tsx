import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus, FileText, Search, ArrowRight, Trash2 } from "lucide-react";
import { PageHeroHeader } from "@/components/PageHeroHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useMEForms, useCreateForm, useDeleteForm } from "@/hooks/useMEForms";
import { useNavigate } from "react-router-dom";

const statusColor: Record<string, string> = {
  draft: "bg-amber-100 text-amber-700",
  active: "bg-teal-100 text-teal-700",
  retired: "bg-muted text-muted-foreground",
};

export default function FormBuilderList() {
  const { data: forms, isLoading } = useMEForms();
  const createForm = useCreateForm();
  const deleteForm = useDeleteForm();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [purpose, setPurpose] = useState("");
  const [description, setDescription] = useState("");

  const filtered = (forms ?? []).filter((f) =>
    !search || f.name.toLowerCase().includes(search.toLowerCase()) ||
    (f.form_purpose ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = async () => {
    if (!name.trim()) return;
    const created = await createForm.mutateAsync({
      name: name.trim(),
      form_purpose: purpose.trim() || null,
      description: description.trim() || null,
    });
    setOpen(false);
    setName(""); setPurpose(""); setDescription("");
    navigate(`/me/forms/${created.id}`);
  };

  return (
    <div className="space-y-6 p-6">
      <PageHeroHeader
        title="Form builder"
        description="Design configurable data collection forms for field officers"
        icon={FileText}
        actions={<Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1" /> New form</Button>}
      />

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Search forms" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <FileText className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <h3 className="font-medium mb-1">No forms yet</h3>
            <p className="text-sm text-muted-foreground mb-4">Create your first data collection form.</p>
            <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1" /> New form</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((f) => (
            <Card key={f.id} className="hover:shadow-md transition-shadow group">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <Link to={`/me/forms/${f.id}`} className="font-semibold hover:underline block truncate">{f.name}</Link>
                    {f.form_purpose && <p className="text-xs text-muted-foreground truncate">{f.form_purpose}</p>}
                  </div>
                  <Badge className={statusColor[f.status] ?? ""}>{f.status}</Badge>
                </div>
                {f.description && <p className="text-sm text-muted-foreground line-clamp-2">{f.description}</p>}
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>v{f.version}</span>
                  {f.requires_beneficiary_link && <span>· Beneficiary linked</span>}
                  {f.requires_location && <span>· Location</span>}
                </div>
                <div className="flex items-center justify-between pt-2 border-t">
                  <Button asChild variant="ghost" size="sm">
                    <Link to={`/me/forms/${f.id}`}>Open <ArrowRight className="h-3 w-3 ml-1" /></Link>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-rose-600 opacity-0 group-hover:opacity-100"
                    onClick={() => {
                      if (confirm(`Delete "${f.name}"?`)) deleteForm.mutate(f.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create form</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Form name *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Household visit checklist" />
            </div>
            <div>
              <Label>Purpose</Label>
              <Input value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="What decision will this data support?" />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!name.trim() || createForm.isPending}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
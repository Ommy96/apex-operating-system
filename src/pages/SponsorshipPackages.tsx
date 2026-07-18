import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Plus, Package, Pencil } from "lucide-react";
import { formatMoney } from "@/lib/allocationEngine";
import {
  useSponsorshipPackages, useUpsertPackage, useDeletePackage,
  useUpsertPackageItem, useDeletePackageItem, syncPackageCostFromItems,
  ITEM_TYPES, type SponsorshipPackage, type PackageItem,
} from "@/hooks/useSponsorshipPackages";

export default function SponsorshipPackages() {
  const { data: packages = [], isLoading, refetch } = useSponsorshipPackages();
  const upsertPkg = useUpsertPackage();
  const deletePkg = useDeletePackage();
  const upsertItem = useUpsertPackageItem();
  const deleteItem = useDeletePackageItem();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<SponsorshipPackage | null>(null);
  const [form, setForm] = useState({ name: "", description: "", currency: "KES" });

  const openNew = () => {
    setEditing(null);
    setForm({ name: "", description: "", currency: "KES" });
    setOpen(true);
  };
  const openEdit = (p: SponsorshipPackage) => {
    setEditing(p);
    setForm({ name: p.name, description: p.description || "", currency: p.currency });
    setOpen(true);
  };
  const savePkg = async () => {
    if (!form.name.trim()) return;
    await upsertPkg.mutateAsync({ id: editing?.id, ...form });
    setOpen(false);
  };

  const addItem = async (pkgId: string) => {
    await upsertItem.mutateAsync({
      package_id: pkgId,
      item_type: "school_fees",
      item_label: "School fees",
      cost: 0,
      sort_order: 0,
    });
    await syncPackageCostFromItems(pkgId);
    refetch();
  };
  const saveItem = async (item: PackageItem, patch: Partial<PackageItem>) => {
    await upsertItem.mutateAsync({ ...item, ...patch });
    await syncPackageCostFromItems(item.package_id);
    refetch();
  };
  const removeItem = async (item: PackageItem) => {
    await deleteItem.mutateAsync(item.id);
    await syncPackageCostFromItems(item.package_id);
    refetch();
  };

  return (
    <div className="space-y-6 p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Package className="h-6 w-6 text-primary" /> Sponsorship packages
          </h1>
          <p className="text-sm text-muted-foreground">
            Bundle fees, transport, medical, mentorship and more into reusable sponsorship packages.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNew}><Plus className="h-4 w-4 mr-1" /> New package</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? "Edit package" : "New package"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Name</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Package A" />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div>
                <Label>Currency</Label>
                <Input value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={savePkg} disabled={upsertPkg.isPending}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : packages.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground text-sm">No packages yet.</CardContent></Card>
      ) : (
        <div className="grid gap-4">
          {packages.map((p) => (
            <Card key={p.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      {p.name}
                      {!p.active && <Badge variant="outline">Inactive</Badge>}
                    </CardTitle>
                    {p.description && (
                      <p className="text-xs text-muted-foreground mt-1">{p.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <div className="text-xs text-muted-foreground">Monthly cost</div>
                      <div className="font-semibold">{formatMoney(p.monthly_cost, p.currency)}</div>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => deletePkg.mutate(p.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {(p.items || []).map((item) => (
                  <div key={item.id} className="grid grid-cols-12 gap-2 items-center">
                    <Select value={item.item_type} onValueChange={(v) => saveItem(item, { item_type: v })}>
                      <SelectTrigger className="col-span-3 h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {ITEM_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Input
                      className="col-span-6 h-9"
                      value={item.item_label}
                      onChange={(e) => saveItem(item, { item_label: e.target.value })}
                    />
                    <Input
                      className="col-span-2 h-9"
                      type="number"
                      value={item.cost}
                      onChange={(e) => saveItem(item, { cost: Number(e.target.value) })}
                    />
                    <Button size="sm" variant="ghost" onClick={() => removeItem(item)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
                <Button size="sm" variant="outline" onClick={() => addItem(p.id)}>
                  <Plus className="h-4 w-4 mr-1" /> Add line item
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
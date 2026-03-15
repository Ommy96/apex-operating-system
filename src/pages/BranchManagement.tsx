import { useState } from "react";
import { useBranches } from "@/hooks/useBranches";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeroHeader } from "@/components/PageHeroHeader";
import { Building2, Plus, MapPin, Users, Globe } from "lucide-react";

export default function BranchManagement() {
  const { regions, branches, branchStaff, loadingRegions, loadingBranches, createRegion, createBranch } = useBranches();

  const [activeTab, setActiveTab] = useState("branches");
  const [showNewRegion, setShowNewRegion] = useState(false);
  const [showNewBranch, setShowNewBranch] = useState(false);

  const [regionForm, setRegionForm] = useState({ name: "", description: "", country: "", county: "" });
  const [branchForm, setBranchForm] = useState({ name: "", code: "", region_id: "", address: "", phone: "", email: "", manager_name: "" });

  const handleCreateRegion = () => {
    if (!regionForm.name) return;
    createRegion.mutate(regionForm, {
      onSuccess: () => { setShowNewRegion(false); setRegionForm({ name: "", description: "", country: "", county: "" }); },
    });
  };

  const handleCreateBranch = () => {
    if (!branchForm.name) return;
    const payload: any = { ...branchForm };
    if (!payload.region_id) delete payload.region_id;
    createBranch.mutate(payload, {
      onSuccess: () => { setShowNewBranch(false); setBranchForm({ name: "", code: "", region_id: "", address: "", phone: "", email: "", manager_name: "" }); },
    });
  };

  const activeBranches = branches.filter((b) => b.is_active).length;

  return (
    <div className="space-y-6">
      <PageHeroHeader
        title="Branches & Regions"
        description="Manage multi-branch operations, regional groupings, and staff assignments across locations."
        icon={Building2}
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Regions", value: regions.length, icon: Globe, color: "primary" },
          { label: "Total Branches", value: branches.length, icon: Building2, color: "info" },
          { label: "Active Branches", value: activeBranches, icon: MapPin, color: "success" },
          { label: "Staff Assigned", value: branchStaff.length, icon: Users, color: "warning" },
        ].map((s) => (
          <Card key={s.label} className="workspace-card">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`h-10 w-10 rounded-xl bg-${s.color}/10 flex items-center justify-center`}>
                <s.icon className={`h-5 w-5 text-${s.color}`} />
              </div>
              <div>
                <p className="text-lg sm:text-2xl font-bold text-foreground">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
          <TabsList className="inline-flex w-max md:w-auto">
            <TabsTrigger value="branches"><Building2 className="h-4 w-4 mr-1.5" />Branches</TabsTrigger>
            <TabsTrigger value="regions"><Globe className="h-4 w-4 mr-1.5" />Regions</TabsTrigger>
          </TabsList>
        </div>

        {/* Branches Tab */}
        <TabsContent value="branches" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-foreground">Branches</h3>
            <Dialog open={showNewBranch} onOpenChange={setShowNewBranch}>
              <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1.5" />Add Branch</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Add Branch</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Branch Name *</Label><Input value={branchForm.name} onChange={(e) => setBranchForm((p) => ({ ...p, name: e.target.value }))} /></div>
                    <div><Label>Code</Label><Input value={branchForm.code} onChange={(e) => setBranchForm((p) => ({ ...p, code: e.target.value }))} placeholder="NBO-01" /></div>
                  </div>
                  <div>
                    <Label>Region</Label>
                    <Select value={branchForm.region_id} onValueChange={(v) => setBranchForm((p) => ({ ...p, region_id: v }))}>
                      <SelectTrigger><SelectValue placeholder="Select region (optional)" /></SelectTrigger>
                      <SelectContent>
                        {regions.map((r) => (<SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Address</Label><Input value={branchForm.address} onChange={(e) => setBranchForm((p) => ({ ...p, address: e.target.value }))} /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Phone</Label><Input value={branchForm.phone} onChange={(e) => setBranchForm((p) => ({ ...p, phone: e.target.value }))} /></div>
                    <div><Label>Email</Label><Input value={branchForm.email} onChange={(e) => setBranchForm((p) => ({ ...p, email: e.target.value }))} /></div>
                  </div>
                  <div><Label>Manager Name</Label><Input value={branchForm.manager_name} onChange={(e) => setBranchForm((p) => ({ ...p, manager_name: e.target.value }))} /></div>
                  <Button onClick={handleCreateBranch} disabled={createBranch.isPending} className="w-full">{createBranch.isPending ? "Creating..." : "Add Branch"}</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {loadingBranches ? (
              <p className="col-span-full text-center py-8 text-muted-foreground">Loading...</p>
            ) : branches.length === 0 ? (
              <Card className="workspace-card col-span-full"><CardContent className="p-8 text-center text-muted-foreground">No branches yet. Create your first branch above.</CardContent></Card>
            ) : (
              branches.map((b) => (
                <Card key={b.id} className="workspace-card">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-foreground">{b.name}</h4>
                      <Badge variant={b.is_active ? "default" : "secondary"} className="text-xs">{b.is_active ? "Active" : "Inactive"}</Badge>
                    </div>
                    {b.code && <p className="text-xs text-muted-foreground mb-1">Code: {b.code}</p>}
                    {(b.regions as any)?.name && (
                      <Badge variant="outline" className="text-xs mb-2"><Globe className="h-3 w-3 mr-1" />{(b.regions as any).name}</Badge>
                    )}
                    {b.address && <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" />{b.address}</p>}
                    {b.manager_name && <p className="text-xs text-muted-foreground mt-1">👤 {b.manager_name}</p>}
                    <div className="flex gap-2 mt-2 text-xs text-muted-foreground">
                      {b.phone && <span>📞 {b.phone}</span>}
                      {b.email && <span>✉️ {b.email}</span>}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* Regions Tab */}
        <TabsContent value="regions" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-foreground">Regions</h3>
            <Dialog open={showNewRegion} onOpenChange={setShowNewRegion}>
              <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1.5" />Add Region</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Add Region</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div><Label>Region Name *</Label><Input value={regionForm.name} onChange={(e) => setRegionForm((p) => ({ ...p, name: e.target.value }))} /></div>
                  <div><Label>Description</Label><Textarea value={regionForm.description} onChange={(e) => setRegionForm((p) => ({ ...p, description: e.target.value }))} rows={2} /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Country</Label><Input value={regionForm.country} onChange={(e) => setRegionForm((p) => ({ ...p, country: e.target.value }))} /></div>
                    <div><Label>County</Label><Input value={regionForm.county} onChange={(e) => setRegionForm((p) => ({ ...p, county: e.target.value }))} /></div>
                  </div>
                  <Button onClick={handleCreateRegion} disabled={createRegion.isPending} className="w-full">{createRegion.isPending ? "Creating..." : "Add Region"}</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <Card className="workspace-card">
            <CardContent className="p-0 overflow-x-auto">
              <Table className="min-w-[600px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Region</TableHead>
                    <TableHead>Country</TableHead>
                    <TableHead>County</TableHead>
                    <TableHead>Branches</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingRegions ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
                  ) : regions.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No regions yet.</TableCell></TableRow>
                  ) : (
                    regions.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{r.name}</p>
                            {r.description && <p className="text-xs text-muted-foreground">{r.description}</p>}
                          </div>
                        </TableCell>
                        <TableCell>{r.country || "—"}</TableCell>
                        <TableCell>{r.county || "—"}</TableCell>
                        <TableCell>{branches.filter((b) => b.region_id === r.id).length}</TableCell>
                        <TableCell><Badge variant={r.is_active ? "default" : "secondary"}>{r.is_active ? "Active" : "Inactive"}</Badge></TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

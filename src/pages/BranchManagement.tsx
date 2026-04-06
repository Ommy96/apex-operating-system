import { useState } from "react";
import { useBranches } from "@/hooks/useBranches";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
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
import { Building2, Plus, MapPin, Users, Globe, ArrowLeft, FileText, Download, Search } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";

function BranchDetail({ branch, onBack }: { branch: any; onBack: () => void }) {
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.organization_id;
  const [tab, setTab] = useState("staff");
  const [search, setSearch] = useState("");

  const { data: staff = [] } = useQuery({
    queryKey: ["branch-staff", branch.id, orgId],
    queryFn: async () => {
      const { data } = await supabase.from("organization_members").select("*").eq("organization_id", orgId!).eq("branch_id", branch.id);
      return data || [];
    },
    enabled: !!orgId,
  });

  const { data: beneficiaries = [] } = useQuery({
    queryKey: ["branch-beneficiaries", branch.id, orgId],
    queryFn: async () => {
      const { data } = await supabase.from("beneficiaries").select("id, display_name, status, beneficiary_type").eq("organization_id", orgId!).eq("branch_id", branch.id).is("deleted_at", null);
      return data || [];
    },
    enabled: !!orgId,
  });

  const filteredBeneficiaries = beneficiaries.filter(b => !search || b.display_name?.toLowerCase().includes(search.toLowerCase()));

  const exportBeneficiaries = () => {
    if (beneficiaries.length === 0) { toast.error("No data to export"); return; }
    const ws = XLSX.utils.json_to_sheet(beneficiaries.map(b => ({ Name: b.display_name, Type: b.beneficiary_type, Status: b.status })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Beneficiaries");
    XLSX.writeFile(wb, `${branch.name}_beneficiaries.xlsx`);
    toast.success("Exported");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack}><ArrowLeft className="h-4 w-4 mr-1" />Back</Button>
        <div>
          <h2 className="text-lg font-semibold text-foreground">{branch.name}</h2>
          <p className="text-xs text-muted-foreground">{branch.address || "No address"} {branch.manager_name ? `• Manager: ${branch.manager_name}` : ""}</p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="staff"><Users className="h-3.5 w-3.5 mr-1" />Staff ({staff.length})</TabsTrigger>
          <TabsTrigger value="beneficiaries"><Users className="h-3.5 w-3.5 mr-1" />Beneficiaries ({beneficiaries.length})</TabsTrigger>
          <TabsTrigger value="reports"><FileText className="h-3.5 w-3.5 mr-1" />Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="staff" className="mt-4">
          {staff.length === 0 ? (
            <Card className="workspace-card"><CardContent className="py-8 text-center text-muted-foreground">No staff assigned to this branch</CardContent></Card>
          ) : (
            <Card className="workspace-card">
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Role</TableHead><TableHead>Email</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {staff.map((s: any) => (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium">{s.full_name || "—"}</TableCell>
                        <TableCell><Badge variant="secondary" className="text-xs capitalize">{s.role}</Badge></TableCell>
                        <TableCell className="text-muted-foreground text-sm">{s.email || "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="beneficiaries" className="mt-4 space-y-3">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search beneficiaries..." className="pl-10" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Button variant="outline" size="sm" onClick={exportBeneficiaries}><Download className="h-3.5 w-3.5 mr-1" />Export</Button>
          </div>
          {filteredBeneficiaries.length === 0 ? (
            <Card className="workspace-card"><CardContent className="py-8 text-center text-muted-foreground">No beneficiaries in this branch</CardContent></Card>
          ) : (
            <Card className="workspace-card">
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Type</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {filteredBeneficiaries.map(b => (
                      <TableRow key={b.id}>
                        <TableCell className="font-medium">{b.display_name}</TableCell>
                        <TableCell className="capitalize text-sm">{b.beneficiary_type}</TableCell>
                        <TableCell><Badge variant="outline" className="text-xs capitalize">{b.status}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="reports" className="mt-4 space-y-3">
          <Card className="workspace-card">
            <CardContent className="p-6 space-y-4">
              <h4 className="font-semibold text-foreground">Branch Reports</h4>
              <p className="text-sm text-muted-foreground">Download branch-level reports for this location.</p>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={exportBeneficiaries}><Download className="h-3.5 w-3.5 mr-1" />Beneficiary Report</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function BranchManagement() {
  const { regions, branches, branchStaff, loadingRegions, loadingBranches, createRegion, createBranch } = useBranches();
  const [activeTab, setActiveTab] = useState("branches");
  const [showNewRegion, setShowNewRegion] = useState(false);
  const [showNewBranch, setShowNewBranch] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<any>(null);

  const [regionForm, setRegionForm] = useState({ name: "", description: "", country: "", county: "" });
  const [branchForm, setBranchForm] = useState({ name: "", code: "", region_id: "", address: "", phone: "", email: "", manager_name: "" });

  const handleCreateRegion = () => {
    if (!regionForm.name) return;
    createRegion.mutate(regionForm, { onSuccess: () => { setShowNewRegion(false); setRegionForm({ name: "", description: "", country: "", county: "" }); } });
  };

  const handleCreateBranch = () => {
    if (!branchForm.name) return;
    const payload: any = { ...branchForm };
    if (!payload.region_id) delete payload.region_id;
    createBranch.mutate(payload, { onSuccess: () => { setShowNewBranch(false); setBranchForm({ name: "", code: "", region_id: "", address: "", phone: "", email: "", manager_name: "" }); } });
  };

  if (selectedBranch) {
    return (
      <div className="space-y-6">
        <PageHeroHeader title="Branches & Regions" description="Manage multi-branch operations, regional groupings, and staff assignments." icon={Building2} />
        <BranchDetail branch={selectedBranch} onBack={() => setSelectedBranch(null)} />
      </div>
    );
  }

  const activeBranches = branches.filter(b => b.is_active).length;

  return (
    <div className="space-y-6">
      <PageHeroHeader title="Branches & Regions" description="Manage multi-branch operations, regional groupings, and staff assignments across locations." icon={Building2} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Regions", value: regions.length, icon: Globe, color: "primary" },
          { label: "Total Branches", value: branches.length, icon: Building2, color: "info" },
          { label: "Active Branches", value: activeBranches, icon: MapPin, color: "success" },
          { label: "Staff Assigned", value: branchStaff.length, icon: Users, color: "warning" },
        ].map(s => (
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
        <div className="overflow-x-auto no-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
          <TabsList className="inline-flex w-max md:w-auto">
            <TabsTrigger value="branches"><Building2 className="h-4 w-4 mr-1.5" />Branches</TabsTrigger>
            <TabsTrigger value="regions"><Globe className="h-4 w-4 mr-1.5" />Regions</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="branches" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-foreground">Branches</h3>
            <Dialog open={showNewBranch} onOpenChange={setShowNewBranch}>
              <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1.5" />Add Branch</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Add Branch</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Branch Name *</Label><Input value={branchForm.name} onChange={e => setBranchForm(p => ({ ...p, name: e.target.value }))} /></div>
                    <div><Label>Code</Label><Input value={branchForm.code} onChange={e => setBranchForm(p => ({ ...p, code: e.target.value }))} placeholder="NBO-01" /></div>
                  </div>
                  <div>
                    <Label>Region</Label>
                    <Select value={branchForm.region_id} onValueChange={v => setBranchForm(p => ({ ...p, region_id: v }))}>
                      <SelectTrigger><SelectValue placeholder="Select region (optional)" /></SelectTrigger>
                      <SelectContent>{regions.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>Address</Label><Input value={branchForm.address} onChange={e => setBranchForm(p => ({ ...p, address: e.target.value }))} /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Phone</Label><Input value={branchForm.phone} onChange={e => setBranchForm(p => ({ ...p, phone: e.target.value }))} /></div>
                    <div><Label>Email</Label><Input value={branchForm.email} onChange={e => setBranchForm(p => ({ ...p, email: e.target.value }))} /></div>
                  </div>
                  <div><Label>Manager Name</Label><Input value={branchForm.manager_name} onChange={e => setBranchForm(p => ({ ...p, manager_name: e.target.value }))} /></div>
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
              branches.map(b => (
                <Card key={b.id} className="workspace-card cursor-pointer hover:border-primary/30 transition-colors" onClick={() => setSelectedBranch(b)}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-foreground">{b.name}</h4>
                      <Badge variant={b.is_active ? "default" : "secondary"} className="text-xs">{b.is_active ? "Active" : "Inactive"}</Badge>
                    </div>
                    {b.code && <p className="text-xs text-muted-foreground mb-1">Code: {b.code}</p>}
                    {(b.regions as any)?.name && <Badge variant="outline" className="text-xs mb-2"><Globe className="h-3 w-3 mr-1" />{(b.regions as any).name}</Badge>}
                    {b.address && <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" />{b.address}</p>}
                    {b.manager_name && <p className="text-xs text-muted-foreground mt-1">👤 {b.manager_name}</p>}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="regions" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-foreground">Regions</h3>
            <Dialog open={showNewRegion} onOpenChange={setShowNewRegion}>
              <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1.5" />Add Region</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Add Region</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div><Label>Region Name *</Label><Input value={regionForm.name} onChange={e => setRegionForm(p => ({ ...p, name: e.target.value }))} /></div>
                  <div><Label>Description</Label><Textarea value={regionForm.description} onChange={e => setRegionForm(p => ({ ...p, description: e.target.value }))} rows={2} /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Country</Label><Input value={regionForm.country} onChange={e => setRegionForm(p => ({ ...p, country: e.target.value }))} /></div>
                    <div><Label>County</Label><Input value={regionForm.county} onChange={e => setRegionForm(p => ({ ...p, county: e.target.value }))} /></div>
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
                    <TableHead>Region</TableHead><TableHead>Country</TableHead><TableHead>County</TableHead><TableHead>Branches</TableHead><TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingRegions ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
                  ) : regions.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No regions yet.</TableCell></TableRow>
                  ) : (
                    regions.map(r => (
                      <TableRow key={r.id}>
                        <TableCell><div><p className="font-medium">{r.name}</p>{r.description && <p className="text-xs text-muted-foreground">{r.description}</p>}</div></TableCell>
                        <TableCell>{r.country || "—"}</TableCell>
                        <TableCell>{r.county || "—"}</TableCell>
                        <TableCell>{branches.filter(b => b.region_id === r.id).length}</TableCell>
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

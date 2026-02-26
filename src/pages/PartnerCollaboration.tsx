import { useState } from "react";
import { usePartners } from "@/hooks/usePartners";
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
import { Handshake, Plus, Building, Package, CalendarDays, Globe, DollarSign, Trash2 } from "lucide-react";
import { format } from "date-fns";

const partnerTypes = [
  { value: "implementing", label: "Implementing Partner" },
  { value: "funding", label: "Funding Partner" },
  { value: "technical", label: "Technical Partner" },
  { value: "government", label: "Government Agency" },
  { value: "academic", label: "Academic Institution" },
  { value: "community", label: "Community Organization" },
];

const resourceTypes = [
  { value: "funding", label: "Funding" },
  { value: "equipment", label: "Equipment" },
  { value: "expertise", label: "Technical Expertise" },
  { value: "venue", label: "Venue / Space" },
  { value: "personnel", label: "Personnel" },
  { value: "data", label: "Data / Research" },
];

export default function PartnerCollaboration() {
  const { partners, sharedResources, jointActivities, loadingPartners, loadingResources, loadingActivities, createPartner, createResource, createActivity, deletePartner, deleteResource, deleteActivity, totalResourceValue } = usePartners();

  const [activeTab, setActiveTab] = useState("partners");
  const [showNewPartner, setShowNewPartner] = useState(false);
  const [showNewResource, setShowNewResource] = useState(false);
  const [showNewActivity, setShowNewActivity] = useState(false);

  const [partnerForm, setPartnerForm] = useState({ partner_name: "", partner_type: "implementing", contact_person: "", contact_email: "", contact_phone: "", website: "", description: "", country: "", partnership_start: "" });
  const [resourceForm, setResourceForm] = useState({ partner_id: "", resource_type: "funding", title: "", description: "", value_amount: "", direction: "received" });
  const [activityForm, setActivityForm] = useState({ partner_id: "", title: "", description: "", activity_date: "", location: "", participants_count: "" });

  const handleCreatePartner = () => {
    if (!partnerForm.partner_name) return;
    createPartner.mutate(partnerForm, { onSuccess: () => { setShowNewPartner(false); setPartnerForm({ partner_name: "", partner_type: "implementing", contact_person: "", contact_email: "", contact_phone: "", website: "", description: "", country: "", partnership_start: "" }); } });
  };

  const handleCreateResource = () => {
    if (!resourceForm.partner_id || !resourceForm.title) return;
    createResource.mutate({ ...resourceForm, value_amount: resourceForm.value_amount ? parseFloat(resourceForm.value_amount) : undefined }, { onSuccess: () => { setShowNewResource(false); setResourceForm({ partner_id: "", resource_type: "funding", title: "", description: "", value_amount: "", direction: "received" }); } });
  };

  const handleCreateActivity = () => {
    if (!activityForm.partner_id || !activityForm.title) return;
    createActivity.mutate({ ...activityForm, participants_count: activityForm.participants_count ? parseInt(activityForm.participants_count) : undefined }, { onSuccess: () => { setShowNewActivity(false); setActivityForm({ partner_id: "", title: "", description: "", activity_date: "", location: "", participants_count: "" }); } });
  };

  const activePartners = partners.filter((p) => p.status === "active").length;

  return (
    <div className="space-y-6">
      <PageHeroHeader title="Partner Collaboration" description="Manage partnerships, shared resources, and joint activities with collaborating organizations." icon={Handshake} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Partners", value: partners.length, icon: Building, color: "primary" },
          { label: "Active", value: activePartners, icon: Handshake, color: "success" },
          { label: "Resources", value: sharedResources.length, icon: Package, color: "info" },
          { label: "Resource Value", value: `${(totalResourceValue / 1000).toFixed(0)}K`, icon: DollarSign, color: "warning" },
        ].map((s) => (
          <Card key={s.label} className="workspace-card">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`h-10 w-10 rounded-xl bg-${s.color}/10 flex items-center justify-center`}><s.icon className={`h-5 w-5 text-${s.color}`} /></div>
              <div><p className="text-2xl font-bold text-foreground">{s.value}</p><p className="text-xs text-muted-foreground">{s.label}</p></div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
          <TabsList className="inline-flex w-max md:w-auto">
            <TabsTrigger value="partners"><Building className="h-4 w-4 mr-1.5" />Partners</TabsTrigger>
            <TabsTrigger value="resources"><Package className="h-4 w-4 mr-1.5" />Shared Resources</TabsTrigger>
            <TabsTrigger value="activities"><CalendarDays className="h-4 w-4 mr-1.5" />Joint Activities</TabsTrigger>
          </TabsList>
        </div>

        {/* Partners Tab */}
        <TabsContent value="partners" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-foreground">Partner Organizations</h3>
            <Dialog open={showNewPartner} onOpenChange={setShowNewPartner}>
              <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1.5" />Add Partner</Button></DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader><DialogTitle>Add Partner Organization</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div><Label>Organization Name *</Label><Input value={partnerForm.partner_name} onChange={(e) => setPartnerForm((p) => ({ ...p, partner_name: e.target.value }))} /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Type</Label>
                      <Select value={partnerForm.partner_type} onValueChange={(v) => setPartnerForm((p) => ({ ...p, partner_type: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{partnerTypes.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div><Label>Country</Label><Input value={partnerForm.country} onChange={(e) => setPartnerForm((p) => ({ ...p, country: e.target.value }))} /></div>
                  </div>
                  <div><Label>Contact Person</Label><Input value={partnerForm.contact_person} onChange={(e) => setPartnerForm((p) => ({ ...p, contact_person: e.target.value }))} /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Email</Label><Input type="email" value={partnerForm.contact_email} onChange={(e) => setPartnerForm((p) => ({ ...p, contact_email: e.target.value }))} /></div>
                    <div><Label>Phone</Label><Input value={partnerForm.contact_phone} onChange={(e) => setPartnerForm((p) => ({ ...p, contact_phone: e.target.value }))} /></div>
                  </div>
                  <div><Label>Website</Label><Input value={partnerForm.website} onChange={(e) => setPartnerForm((p) => ({ ...p, website: e.target.value }))} placeholder="https://..." /></div>
                  <div><Label>Partnership Start</Label><Input type="date" value={partnerForm.partnership_start} onChange={(e) => setPartnerForm((p) => ({ ...p, partnership_start: e.target.value }))} /></div>
                  <div><Label>Description</Label><Textarea value={partnerForm.description} onChange={(e) => setPartnerForm((p) => ({ ...p, description: e.target.value }))} rows={2} /></div>
                  <Button onClick={handleCreatePartner} disabled={createPartner.isPending} className="w-full">{createPartner.isPending ? "Adding..." : "Add Partner"}</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {loadingPartners ? <p className="col-span-full text-center py-8 text-muted-foreground">Loading...</p> : partners.length === 0 ? (
              <Card className="workspace-card col-span-full"><CardContent className="p-8 text-center text-muted-foreground">No partners yet.</CardContent></Card>
            ) : partners.map((p) => (
              <Card key={p.id} className="workspace-card">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-foreground truncate">{p.partner_name}</h4>
                    <div className="flex items-center gap-1.5">
                      <Badge variant={p.status === "active" ? "default" : "secondary"} className="text-xs capitalize">{p.status}</Badge>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => { if (confirm("Delete this partner?")) deletePartner.mutate(p.id); }}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs capitalize mb-2">{partnerTypes.find((t) => t.value === p.partner_type)?.label || p.partner_type}</Badge>
                  {p.contact_person && <p className="text-xs text-muted-foreground">👤 {p.contact_person}</p>}
                  {p.contact_email && <p className="text-xs text-muted-foreground">✉️ {p.contact_email}</p>}
                  {p.country && <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1"><Globe className="h-3 w-3" />{p.country}</p>}
                  {p.partnership_start && <p className="text-xs text-muted-foreground mt-1">Since {format(new Date(p.partnership_start), "MMM yyyy")}</p>}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Resources Tab */}
        <TabsContent value="resources" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-foreground">Shared Resources</h3>
            <Dialog open={showNewResource} onOpenChange={setShowNewResource}>
              <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1.5" />Add Resource</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Add Shared Resource</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div><Label>Partner *</Label>
                    <Select value={resourceForm.partner_id} onValueChange={(v) => setResourceForm((p) => ({ ...p, partner_id: v }))}>
                      <SelectTrigger><SelectValue placeholder="Select partner" /></SelectTrigger>
                      <SelectContent>{partners.map((p) => <SelectItem key={p.id} value={p.id}>{p.partner_name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>Title *</Label><Input value={resourceForm.title} onChange={(e) => setResourceForm((p) => ({ ...p, title: e.target.value }))} /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Type</Label>
                      <Select value={resourceForm.resource_type} onValueChange={(v) => setResourceForm((p) => ({ ...p, resource_type: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{resourceTypes.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div><Label>Direction</Label>
                      <Select value={resourceForm.direction} onValueChange={(v) => setResourceForm((p) => ({ ...p, direction: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="received">Received</SelectItem>
                          <SelectItem value="provided">Provided</SelectItem>
                          <SelectItem value="mutual">Mutual</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div><Label>Value (KES)</Label><Input type="number" value={resourceForm.value_amount} onChange={(e) => setResourceForm((p) => ({ ...p, value_amount: e.target.value }))} /></div>
                  <div><Label>Description</Label><Textarea value={resourceForm.description} onChange={(e) => setResourceForm((p) => ({ ...p, description: e.target.value }))} rows={2} /></div>
                  <Button onClick={handleCreateResource} disabled={createResource.isPending} className="w-full">{createResource.isPending ? "Adding..." : "Add Resource"}</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <Card className="workspace-card"><CardContent className="p-0">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Partner</TableHead><TableHead>Resource</TableHead><TableHead>Type</TableHead><TableHead>Direction</TableHead><TableHead>Value</TableHead><TableHead className="w-10"></TableHead>
              </TableRow></TableHeader>
              <TableBody>
                 {loadingResources ? <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
                 : sharedResources.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No shared resources yet.</TableCell></TableRow>
                : sharedResources.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{(r.partner_organizations as any)?.partner_name || "—"}</TableCell>
                    <TableCell>{r.title}</TableCell>
                    <TableCell><Badge variant="outline" className="text-xs capitalize">{r.resource_type}</Badge></TableCell>
                    <TableCell><Badge variant="secondary" className="text-xs capitalize">{r.direction}</Badge></TableCell>
                     <TableCell>{r.value_amount ? `KES ${Number(r.value_amount).toLocaleString()}` : "—"}</TableCell>
                     <TableCell><Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => { if (confirm("Delete this resource?")) deleteResource.mutate(r.id); }}><Trash2 className="h-3.5 w-3.5" /></Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        {/* Activities Tab */}
        <TabsContent value="activities" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-foreground">Joint Activities</h3>
            <Dialog open={showNewActivity} onOpenChange={setShowNewActivity}>
              <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1.5" />New Activity</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Create Joint Activity</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div><Label>Partner *</Label>
                    <Select value={activityForm.partner_id} onValueChange={(v) => setActivityForm((p) => ({ ...p, partner_id: v }))}>
                      <SelectTrigger><SelectValue placeholder="Select partner" /></SelectTrigger>
                      <SelectContent>{partners.map((p) => <SelectItem key={p.id} value={p.id}>{p.partner_name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>Activity Title *</Label><Input value={activityForm.title} onChange={(e) => setActivityForm((p) => ({ ...p, title: e.target.value }))} /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Date</Label><Input type="date" value={activityForm.activity_date} onChange={(e) => setActivityForm((p) => ({ ...p, activity_date: e.target.value }))} /></div>
                    <div><Label>Participants</Label><Input type="number" value={activityForm.participants_count} onChange={(e) => setActivityForm((p) => ({ ...p, participants_count: e.target.value }))} /></div>
                  </div>
                  <div><Label>Location</Label><Input value={activityForm.location} onChange={(e) => setActivityForm((p) => ({ ...p, location: e.target.value }))} /></div>
                  <div><Label>Description</Label><Textarea value={activityForm.description} onChange={(e) => setActivityForm((p) => ({ ...p, description: e.target.value }))} rows={2} /></div>
                  <Button onClick={handleCreateActivity} disabled={createActivity.isPending} className="w-full">{createActivity.isPending ? "Creating..." : "Create Activity"}</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <Card className="workspace-card"><CardContent className="p-0">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Partner</TableHead><TableHead>Activity</TableHead><TableHead>Date</TableHead><TableHead>Location</TableHead><TableHead>Status</TableHead><TableHead className="w-10"></TableHead>
              </TableRow></TableHeader>
              <TableBody>
                 {loadingActivities ? <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
                 : jointActivities.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No joint activities yet.</TableCell></TableRow>
                : jointActivities.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{(a.partner_organizations as any)?.partner_name || "—"}</TableCell>
                    <TableCell>{a.title}</TableCell>
                    <TableCell>{a.activity_date ? format(new Date(a.activity_date), "MMM d, yyyy") : "—"}</TableCell>
                    <TableCell>{a.location || "—"}</TableCell>
                     <TableCell><Badge variant={a.status === "completed" ? "default" : "secondary"} className="text-xs capitalize">{a.status}</Badge></TableCell>
                     <TableCell><Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => { if (confirm("Delete this activity?")) deleteActivity.mutate(a.id); }}><Trash2 className="h-3.5 w-3.5" /></Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

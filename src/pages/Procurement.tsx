import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, ShoppingCart, Check, X, Trash2, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  inactive: 'bg-muted text-muted-foreground',
  blacklisted: 'bg-destructive/10 text-destructive',
  draft: 'bg-muted text-muted-foreground',
  submitted: 'bg-primary/10 text-primary',
  approved: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  rejected: 'bg-destructive/10 text-destructive',
  ordered: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  issued: 'bg-primary/10 text-primary',
  delivered: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  cancelled: 'bg-destructive/10 text-destructive',
  partial: 'bg-amber-100 text-amber-800',
};

const fmtAmount = (n: number) => new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(n);

export default function Procurement() {
  const { currentOrganization } = useOrganization();
  const { user } = useAuth();
  const { can } = usePermissions();
  const queryClient = useQueryClient();
  const orgId = currentOrganization?.organization_id;
  const [activeTab, setActiveTab] = useState('vendors');
  const [vendorOpen, setVendorOpen] = useState(false);
  const [reqOpen, setReqOpen] = useState(false);
  const [poOpen, setPoOpen] = useState(false);
  const [selectedReq, setSelectedReq] = useState<any>(null);

  // Vendor form
  const [vendorForm, setVendorForm] = useState({ name: '', contact_person: '', phone: '', email: '', category: 'general', kra_pin: '', notes: '' });
  // Requisition form
  const [reqForm, setReqForm] = useState({ title: '', project_id: '', grant_id: '', justification: '' });
  const [reqItems, setReqItems] = useState<Array<{ description: string; quantity: string; unit_price: string; unit: string }>>([]);

  // Queries
  const vendors = useQuery({
    queryKey: ['vendors', orgId],
    queryFn: async () => {
      const { data, error } = await supabase.from('vendors').select('*').eq('org_id', orgId!).is('deleted_at', null).order('name');
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  const requisitions = useQuery({
    queryKey: ['purchase-requisitions', orgId],
    queryFn: async () => {
      const { data, error } = await supabase.from('purchase_requisitions').select('*').eq('org_id', orgId!).is('deleted_at', null).order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  const purchaseOrders = useQuery({
    queryKey: ['purchase-orders', orgId],
    queryFn: async () => {
      const { data, error } = await supabase.from('purchase_orders').select('*, vendors(name)').eq('org_id', orgId!).order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  const projects = useQuery({
    queryKey: ['projects-list-proc', orgId],
    queryFn: async () => {
      const { data } = await supabase.from('projects').select('id, name').eq('organization_id', orgId!).is('deleted_at', null);
      return data || [];
    },
    enabled: !!orgId,
  });

  const grants = useQuery({
    queryKey: ['grants-list-proc', orgId],
    queryFn: async () => {
      const { data } = await supabase.from('grants').select('id, grant_name').eq('organization_id', orgId!);
      return data || [];
    },
    enabled: !!orgId,
  });

  // Mutations
  const createVendor = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('vendors').insert({ ...vendorForm, org_id: orgId! });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      toast.success('Vendor added');
      setVendorOpen(false);
      setVendorForm({ name: '', contact_person: '', phone: '', email: '', category: 'general', kra_pin: '', notes: '' });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const createRequisition = useMutation({
    mutationFn: async (submit: boolean) => {
      const items = reqItems.map(it => ({ ...it, quantity: Number(it.quantity), unit_price: Number(it.unit_price), total: Number(it.quantity) * Number(it.unit_price) }));
      const total = items.reduce((s, i) => s + i.total, 0);
      const { error } = await supabase.from('purchase_requisitions').insert({
        org_id: orgId!,
        title: reqForm.title,
        project_id: reqForm.project_id || null,
        grant_id: reqForm.grant_id || null,
        justification: reqForm.justification,
        requested_by: user!.id,
        items: items as any,
        total_amount: total,
        status: submit ? 'submitted' : 'draft',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-requisitions'] });
      toast.success('Requisition created');
      setReqOpen(false);
      setReqForm({ title: '', project_id: '', grant_id: '', justification: '' });
      setReqItems([]);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const approveReq = useMutation({
    mutationFn: async ({ id, status, reason }: { id: string; status: string; reason?: string }) => {
      const { error } = await supabase.from('purchase_requisitions').update({
        status,
        approved_by: status === 'approved' ? user!.id : null,
        approved_at: status === 'approved' ? new Date().toISOString() : null,
        rejection_reason: reason || null,
      }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-requisitions'] });
      toast.success('Requisition updated');
    },
  });

  const createPO = useMutation({
    mutationFn: async ({ reqId, vendorId, deliveryDate, deliveryLocation }: any) => {
      const req = (requisitions.data || []).find((r: any) => r.id === reqId);
      if (!req) throw new Error('Requisition not found');
      // Generate PO number
      const year = new Date().getFullYear();
      const { count } = await supabase.from('purchase_orders').select('*', { count: 'exact', head: true }).eq('org_id', orgId!);
      const num = String((count || 0) + 1).padStart(4, '0');
      const poNumber = `PO-${year}-${num}`;

      const { error } = await supabase.from('purchase_orders').insert({
        org_id: orgId!,
        requisition_id: reqId,
        vendor_id: vendorId,
        po_number: poNumber,
        items: req.items,
        total_amount: req.total_amount,
        delivery_date: deliveryDate || null,
        delivery_location: deliveryLocation || null,
      });
      if (error) throw error;
      // Mark requisition as ordered
      await supabase.from('purchase_requisitions').update({ status: 'ordered' }).eq('id', reqId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders', 'purchase-requisitions'] });
      toast.success('Purchase order created');
      setPoOpen(false);
      setSelectedReq(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const reqTotal = reqItems.reduce((s, i) => s + (Number(i.quantity) * Number(i.unit_price)), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><ShoppingCart className="h-6 w-6" /> Procurement</h1>
          <p className="text-sm text-muted-foreground">Manage vendors, requisitions and purchase orders</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="vendors">Vendors</TabsTrigger>
          <TabsTrigger value="requisitions">Requisitions</TabsTrigger>
          <TabsTrigger value="purchase-orders">Purchase Orders</TabsTrigger>
        </TabsList>

        {/* VENDORS TAB */}
        <TabsContent value="vendors" className="mt-4">
          <div className="flex justify-end mb-3">
            <Button size="sm" onClick={() => setVendorOpen(true)}><Plus className="h-4 w-4 mr-1" /> Add Vendor</Button>
          </div>
          {vendors.isLoading ? (
            <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(vendors.data || []).map((v: any) => (
                      <TableRow key={v.id}>
                        <TableCell className="font-medium">{v.name}</TableCell>
                        <TableCell><Badge variant="secondary" className="text-xs">{v.category}</Badge></TableCell>
                        <TableCell className="text-muted-foreground text-sm">{v.contact_person || '—'}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">{v.phone || '—'}</TableCell>
                        <TableCell><Badge className={STATUS_COLORS[v.status] || ''}>{v.status}</Badge></TableCell>
                      </TableRow>
                    ))}
                    {(vendors.data || []).length === 0 && (
                      <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No vendors yet</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* REQUISITIONS TAB */}
        <TabsContent value="requisitions" className="mt-4">
          <div className="flex justify-end mb-3">
            <Button size="sm" onClick={() => setReqOpen(true)}><Plus className="h-4 w-4 mr-1" /> New Requisition</Button>
          </div>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(requisitions.data || []).map((r: any) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.title}</TableCell>
                      <TableCell>{fmtAmount(Number(r.total_amount))}</TableCell>
                      <TableCell><Badge className={STATUS_COLORS[r.status] || ''}>{r.status}</Badge></TableCell>
                      <TableCell className="text-muted-foreground text-sm">{new Date(r.created_at).toLocaleDateString('en-KE')}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {r.status === 'submitted' && can.manageFinancials && (
                            <>
                              <Button size="sm" variant="ghost" onClick={() => approveReq.mutate({ id: r.id, status: 'approved' })}><Check className="h-4 w-4" /></Button>
                              <Button size="sm" variant="ghost" onClick={() => approveReq.mutate({ id: r.id, status: 'rejected', reason: 'Rejected' })}><X className="h-4 w-4" /></Button>
                            </>
                          )}
                          {r.status === 'approved' && (
                            <Button size="sm" variant="outline" onClick={() => { setSelectedReq(r); setPoOpen(true); }}>
                              <FileText className="h-4 w-4 mr-1" /> Create PO
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(requisitions.data || []).length === 0 && (
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No requisitions</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* PURCHASE ORDERS TAB */}
        <TabsContent value="purchase-orders" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>PO Number</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Delivery</TableHead>
                    <TableHead>Issued</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(purchaseOrders.data || []).map((po: any) => (
                    <TableRow key={po.id}>
                      <TableCell className="font-mono text-sm">{po.po_number}</TableCell>
                      <TableCell className="font-medium">{(po.vendors as any)?.name || '—'}</TableCell>
                      <TableCell>{fmtAmount(Number(po.total_amount))}</TableCell>
                      <TableCell><Badge className={STATUS_COLORS[po.status] || ''}>{po.status}</Badge></TableCell>
                      <TableCell className="text-sm text-muted-foreground">{po.delivery_date ? new Date(po.delivery_date).toLocaleDateString('en-KE') : '—'}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{new Date(po.issued_at).toLocaleDateString('en-KE')}</TableCell>
                    </TableRow>
                  ))}
                  {(purchaseOrders.data || []).length === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No purchase orders</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Vendor Sheet */}
      <Sheet open={vendorOpen} onOpenChange={setVendorOpen}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader><SheetTitle>Add Vendor</SheetTitle></SheetHeader>
          <div className="space-y-3 mt-4">
            <div><Label>Name *</Label><Input value={vendorForm.name} onChange={e => setVendorForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div><Label>Contact Person</Label><Input value={vendorForm.contact_person} onChange={e => setVendorForm(f => ({ ...f, contact_person: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Phone</Label><Input value={vendorForm.phone} onChange={e => setVendorForm(f => ({ ...f, phone: e.target.value }))} /></div>
              <div><Label>Email</Label><Input value={vendorForm.email} onChange={e => setVendorForm(f => ({ ...f, email: e.target.value }))} /></div>
            </div>
            <div><Label>Category</Label>
              <Select value={vendorForm.category} onValueChange={v => setVendorForm(f => ({ ...f, category: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['supplies', 'services', 'equipment', 'construction', 'transport', 'general'].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>KRA PIN</Label><Input value={vendorForm.kra_pin} onChange={e => setVendorForm(f => ({ ...f, kra_pin: e.target.value }))} /></div>
            <div><Label>Notes</Label><Textarea value={vendorForm.notes} onChange={e => setVendorForm(f => ({ ...f, notes: e.target.value }))} /></div>
            <Button onClick={() => createVendor.mutate()} disabled={!vendorForm.name || createVendor.isPending} className="w-full">Add Vendor</Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Requisition Sheet */}
      <Sheet open={reqOpen} onOpenChange={setReqOpen}>
        <SheetContent className="overflow-y-auto sm:max-w-lg">
          <SheetHeader><SheetTitle>New Purchase Requisition</SheetTitle></SheetHeader>
          <div className="space-y-3 mt-4">
            <div><Label>Title *</Label><Input value={reqForm.title} onChange={e => setReqForm(f => ({ ...f, title: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Project</Label>
                <Select value={reqForm.project_id} onValueChange={v => setReqForm(f => ({ ...f, project_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{(projects.data || []).map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Grant</Label>
                <Select value={reqForm.grant_id} onValueChange={v => setReqForm(f => ({ ...f, grant_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{(grants.data || []).map((g: any) => <SelectItem key={g.id} value={g.id}>{g.grant_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Justification</Label><Textarea value={reqForm.justification} onChange={e => setReqForm(f => ({ ...f, justification: e.target.value }))} /></div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-base">Line Items</Label>
                <Button size="sm" variant="outline" onClick={() => setReqItems(prev => [...prev, { description: '', quantity: '1', unit_price: '0', unit: 'pcs' }])}>
                  <Plus className="h-4 w-4 mr-1" /> Add Item
                </Button>
              </div>
              {reqItems.map((it, i) => (
                <div key={i} className="flex gap-1.5 items-end">
                  <div className="flex-1"><Input placeholder="Description" value={it.description} onChange={e => setReqItems(p => p.map((x, idx) => idx === i ? { ...x, description: e.target.value } : x))} /></div>
                  <div className="w-16"><Input type="number" placeholder="Qty" value={it.quantity} onChange={e => setReqItems(p => p.map((x, idx) => idx === i ? { ...x, quantity: e.target.value } : x))} /></div>
                  <div className="w-20"><Input type="number" placeholder="Price" value={it.unit_price} onChange={e => setReqItems(p => p.map((x, idx) => idx === i ? { ...x, unit_price: e.target.value } : x))} /></div>
                  <Button size="icon" variant="ghost" onClick={() => setReqItems(p => p.filter((_, idx) => idx !== i))}><Trash2 className="h-4 w-4" /></Button>
                </div>
              ))}
              {reqItems.length > 0 && <div className="text-right font-bold text-sm">Total: {fmtAmount(reqTotal)}</div>}
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => createRequisition.mutate(false)} disabled={!reqForm.title || createRequisition.isPending}>Save Draft</Button>
              <Button onClick={() => createRequisition.mutate(true)} disabled={!reqForm.title || createRequisition.isPending}>Submit</Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* PO Creation Sheet */}
      <Sheet open={poOpen} onOpenChange={setPoOpen}>
        <SheetContent>
          <SheetHeader><SheetTitle>Create Purchase Order</SheetTitle></SheetHeader>
          {selectedReq && <POForm req={selectedReq} vendors={vendors.data || []} onSubmit={(data: any) => createPO.mutate({ reqId: selectedReq.id, ...data })} isPending={createPO.isPending} />}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function POForm({ req, vendors, onSubmit, isPending }: { req: any; vendors: any[]; onSubmit: (d: any) => void; isPending: boolean }) {
  const [vendorId, setVendorId] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [deliveryLocation, setDeliveryLocation] = useState('');

  return (
    <div className="space-y-3 mt-4">
      <div><Label>Requisition</Label><p className="text-sm font-medium">{req.title} — {new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(Number(req.total_amount))}</p></div>
      <div><Label>Vendor *</Label>
        <Select value={vendorId} onValueChange={setVendorId}>
          <SelectTrigger><SelectValue placeholder="Select vendor" /></SelectTrigger>
          <SelectContent>{vendors.map((v: any) => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div><Label>Delivery Date</Label><Input type="date" value={deliveryDate} onChange={e => setDeliveryDate(e.target.value)} /></div>
      <div><Label>Delivery Location</Label><Input value={deliveryLocation} onChange={e => setDeliveryLocation(e.target.value)} /></div>
      <Button onClick={() => onSubmit({ vendorId, deliveryDate, deliveryLocation })} disabled={!vendorId || isPending} className="w-full">
        <FileText className="h-4 w-4 mr-1" /> Issue Purchase Order
      </Button>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { Plus, Phone, Trash2, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';

interface Contact {
  id: string;
  full_name: string;
  relationship_type: string | null;
  phone: string | null;
  notes: string | null;
}

interface Props {
  beneficiaryId: string;
}

export function OutOfSystemContacts({ beneficiaryId }: Props) {
  const { currentOrganization } = useOrganization();
  const { user } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ full_name: '', relationship_type: '', phone: '', notes: '' });

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('beneficiary_out_of_system_contacts' as any)
      .select('*')
      .eq('beneficiary_id', beneficiaryId)
      .order('created_at', { ascending: false });
    setContacts((data || []) as any);
    setLoading(false);
  };

  useEffect(() => { load(); }, [beneficiaryId]);

  const save = async () => {
    if (!form.full_name.trim() || !currentOrganization?.organization_id) return;
    setSaving(true);
    const { error } = await supabase.from('beneficiary_out_of_system_contacts' as any).insert({
      beneficiary_id: beneficiaryId,
      organization_id: currentOrganization.organization_id,
      full_name: form.full_name.trim(),
      relationship_type: form.relationship_type || null,
      phone: form.phone || null,
      notes: form.notes || null,
      created_by: user?.id,
    });
    setSaving(false);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Contact added' });
    setForm({ full_name: '', relationship_type: '', phone: '', notes: '' });
    setOpen(false);
    load();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from('beneficiary_out_of_system_contacts' as any).delete().eq('id', id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return;
    }
    load();
  };

  return (
    <div className="bg-card rounded-[16px] border border-border overflow-hidden">
      <div className="px-[18px] py-[14px] border-b border-border flex items-center justify-between">
        <div>
          <span className="text-[13px] font-semibold text-foreground">Out-of-system contacts</span>
          <p className="text-[11px] text-muted-foreground mt-0.5">Family / kin not registered as beneficiaries</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="ghost" className="h-7 px-2 text-[11px]"><Plus className="h-3.5 w-3.5 mr-1" />Add</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add out-of-system contact</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Full name *</Label><Input value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} /></div>
              <div><Label>Relationship</Label><Input placeholder="e.g. Mother, Cousin" value={form.relationship_type} onChange={e => setForm({ ...form, relationship_type: e.target.value })} /></div>
              <div><Label>Phone</Label><Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
              <div><Label>Notes</Label><Textarea rows={3} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={save} disabled={saving || !form.full_name.trim()}>{saving && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <div className="px-[18px] py-[10px]">
        {loading ? (
          <p className="text-[12px] text-muted-foreground py-2">Loading…</p>
        ) : contacts.length === 0 ? (
          <p className="text-[12px] text-muted-foreground py-2">No external contacts recorded.</p>
        ) : (
          contacts.map((c, i) => (
            <div key={c.id} className={`flex items-start gap-3 py-[10px] ${i < contacts.length - 1 ? 'border-b border-border' : ''}`}>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-foreground truncate">{c.full_name}</p>
                <p className="text-[11px] text-muted-foreground capitalize">{c.relationship_type || 'Contact'}</p>
                {c.phone && <p className="text-[12px] text-primary font-mono flex items-center gap-1"><Phone className="h-3 w-3" />{c.phone}</p>}
                {c.notes && <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{c.notes}</p>}
              </div>
              <button onClick={() => remove(c.id)} className="text-muted-foreground hover:text-destructive p-1">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
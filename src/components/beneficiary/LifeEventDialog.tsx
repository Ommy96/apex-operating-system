import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import { useOrganization } from '@/hooks/useOrganization';
import { supabase } from '@/integrations/supabase/client';
import { beneficiaryDocumentPath } from '@/lib/secureDocuments';
import { logger } from '@/lib/logger';
import {
  useLifeEventTypes, useSaveLifeEvent, type LifeEvent, type LifeEventSeverity,
} from '@/hooks/useLifeEvents';

const BUCKET = 'beneficiary-documents';
const SEVERITIES: LifeEventSeverity[] = ['low', 'moderate', 'high', 'critical'];

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  beneficiaryId: string;
  existing?: LifeEvent | null;
}

export function LifeEventDialog({ open, onOpenChange, beneficiaryId, existing }: Props) {
  const { currentOrganization } = useOrganization();
  const { data: types = [] } = useLifeEventTypes();
  const save = useSaveLifeEvent(beneficiaryId);

  const [typeKey, setTypeKey] = useState('');
  const [occurredOn, setOccurredOn] = useState(new Date().toISOString().slice(0, 10));
  const [severity, setSeverity] = useState<LifeEventSeverity>('moderate');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [relatedPerson, setRelatedPerson] = useState('');
  const [followUp, setFollowUp] = useState(false);
  const [followUpDue, setFollowUpDue] = useState('');
  const [sensitive, setSensitive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTypeKey(existing?.event_type || '');
    setOccurredOn(existing?.occurred_on || new Date().toISOString().slice(0, 10));
    setSeverity(existing?.severity || 'moderate');
    setTitle(existing?.title || '');
    setDescription(existing?.description || '');
    setRelatedPerson(existing?.related_person || '');
    setFollowUp(existing?.requires_follow_up ?? false);
    setFollowUpDue(existing?.follow_up_due || '');
    setSensitive(existing?.is_sensitive ?? false);
    setFile(null);
  }, [open, existing]);

  const onPickType = (key: string) => {
    setTypeKey(key);
    const t = types.find((x) => x.key === key);
    if (t && !existing) {
      setSeverity(t.default_severity);
      setSensitive(t.is_sensitive_default);
      if (!title.trim()) setTitle(t.label);
    }
  };

  const handleSave = async () => {
    if (!typeKey) return toast.error('Choose an event type');
    if (!title.trim()) return toast.error('A short title is required');
    const orgId = currentOrganization?.organization_id;
    if (!orgId) return toast.error('No active organisation');

    setBusy(true);
    try {
      let attachments = existing?.attachment_urls ?? [];
      if (file) {
        const path = beneficiaryDocumentPath(orgId, beneficiaryId, file.name);
        const { error: upErr } = await supabase.storage
          .from(BUCKET)
          .upload(path, file, { contentType: file.type || undefined, upsert: false });
        if (upErr) {
          logger.error('life event attachment upload failed', upErr);
          throw new Error(upErr.message);
        }
        attachments = [...attachments, path];
      }

      const type = types.find((t) => t.key === typeKey);
      await save.mutateAsync({
        id: existing?.id,
        beneficiary_id: beneficiaryId,
        event_type: typeKey,
        life_event_type_id: type?.id ?? null,
        occurred_on: occurredOn,
        severity,
        title: title.trim(),
        description: description.trim() || null,
        related_person: relatedPerson.trim() || null,
        requires_follow_up: followUp,
        follow_up_due: followUp && followUpDue ? followUpDue : null,
        follow_up_status: followUp ? (existing?.follow_up_status || 'open') : null,
        is_sensitive: sensitive,
        attachment_urls: attachments,
      } as any);

      toast.success(existing ? 'Life event updated' : 'Life event recorded');
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message || 'Could not save the life event');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{existing ? 'Edit life event' : 'Record life event'}</DialogTitle>
          <DialogDescription>
            Something that happened to this person — not something the organisation did.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label>Event type *</Label>
              <Select value={typeKey} onValueChange={onPickType}>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  {types.map((t) => <SelectItem key={t.id} value={t.key}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Date it occurred *</Label>
              <Input type="date" value={occurredOn} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setOccurredOn(e.target.value)} />
            </div>
          </div>

          <div>
            <Label>Severity</Label>
            <Select value={severity} onValueChange={(v) => setSeverity(v as LifeEventSeverity)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {SEVERITIES.map((s) => <SelectItem key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Short title *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Lost her father" />
          </div>

          <div>
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="What happened, and what it means for their support" />
          </div>

          <div>
            <Label>Who else it involves</Label>
            <Input value={relatedPerson} onChange={(e) => setRelatedPerson(e.target.value)} placeholder="Free text, e.g. 'Father' or 'Class teacher'" />
          </div>

          <div className="rounded-md border p-3 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <Label className="text-sm">Follow-up needed</Label>
                <p className="text-xs text-muted-foreground">Appears in the field work queue until resolved.</p>
              </div>
              <Switch checked={followUp} onCheckedChange={setFollowUp} />
            </div>
            {followUp && (
              <div>
                <Label>Follow-up due</Label>
                <Input type="date" value={followUpDue} onChange={(e) => setFollowUpDue(e.target.value)} />
              </div>
            )}
          </div>

          <div className="rounded-md border p-3 flex items-center justify-between gap-3">
            <div>
              <Label className="text-sm flex items-center gap-1.5"><ShieldAlert className="h-3.5 w-3.5" /> Sensitive</Label>
              <p className="text-xs text-muted-foreground">Restricted to authorised roles. Never shown to donors or in exports.</p>
            </div>
            <Switch checked={sensitive} onCheckedChange={setSensitive} />
          </div>

          <div>
            <Label>Attachment (optional)</Label>
            <Input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
          <Button onClick={handleSave} disabled={busy}>
            {busy && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            {existing ? 'Save changes' : 'Record event'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

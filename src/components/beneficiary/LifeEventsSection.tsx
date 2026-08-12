import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, HeartPulse, ShieldAlert, Pencil, Trash2, Loader2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';
import { LifeEventDialog } from './LifeEventDialog';
import {
  useLifeEvents, useLifeEventTypes, useSaveLifeEvent, useDeleteLifeEvent,
  SEVERITY_META, type LifeEvent, type FollowUpStatus,
} from '@/hooks/useLifeEvents';

const FOLLOW_UP_LABEL: Record<FollowUpStatus, string> = {
  open: 'Follow-up open',
  in_progress: 'Follow-up in progress',
  resolved: 'Follow-up resolved',
};

export function LifeEventsSection({ beneficiaryId }: { beneficiaryId: string }) {
  const { data: events = [], isLoading } = useLifeEvents(beneficiaryId);
  const { data: types = [] } = useLifeEventTypes(true);
  const save = useSaveLifeEvent(beneficiaryId);
  const remove = useDeleteLifeEvent();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<LifeEvent | null>(null);

  const typeLabel = (key: string) => types.find((t) => t.key === key)?.label || key;

  const setStatus = async (e: LifeEvent, status: FollowUpStatus) => {
    try {
      await save.mutateAsync({ id: e.id, follow_up_status: status } as any);
      toast.success('Follow-up updated');
    } catch (err: any) {
      toast.error(err?.message || 'Could not update the follow-up');
    }
  };

  const onDelete = async (e: LifeEvent) => {
    if (!confirm(`Remove "${e.title}"? The record is archived, not destroyed.`)) return;
    try {
      await remove.mutateAsync(e.id);
      toast.success('Life event removed');
    } catch (err: any) {
      toast.error(err?.message || 'Could not remove the event');
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3 gap-3">
        <CardTitle className="text-base flex items-center gap-2">
          <HeartPulse className="h-4 w-4 text-primary" /> Life events
        </CardTitle>
        <Button size="sm" onClick={() => { setEditing(null); setOpen(true); }}>
          <Plus className="h-4 w-4 mr-1" /> Record life event
        </Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {isLoading && <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>}
        {!isLoading && events.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Nothing recorded yet. Life events capture what happened <em>to</em> this person — bereavement, illness,
            relocation, leaving or returning to school, achievements.
          </p>
        )}
        {events.map((e) => {
          const sev = SEVERITY_META[e.severity];
          return (
            <div key={e.id} className="rounded-md border p-3" style={{ borderLeft: `3px solid ${sev.colour}` }}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-sm">{e.title}</span>
                    <Badge variant="outline" className="text-[10px]">{typeLabel(e.event_type)}</Badge>
                    <span className="text-[10px] px-2 py-0.5 rounded" style={{ background: sev.bg, color: sev.colour }}>{sev.label}</span>
                    {e.is_sensitive && (
                      <span className="text-[10px] px-2 py-0.5 rounded flex items-center gap-1 bg-destructive/10 text-destructive">
                        <ShieldAlert className="h-3 w-3" /> Sensitive
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {format(parseISO(e.occurred_on), 'd MMM yyyy')}
                    {e.related_person ? ` · involves ${e.related_person}` : ''}
                  </p>
                  {e.description && <p className="text-sm mt-1.5">{e.description}</p>}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="ghost" size="sm" aria-label="Edit" onClick={() => { setEditing(e); setOpen(true); }}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="sm" aria-label="Remove" onClick={() => onDelete(e)}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              </div>

              {e.requires_follow_up && (
                <div className="flex flex-wrap items-center gap-2 mt-2.5 pt-2.5 border-t">
                  <span className="text-xs text-muted-foreground">
                    {FOLLOW_UP_LABEL[(e.follow_up_status || 'open') as FollowUpStatus]}
                    {e.follow_up_due ? ` · due ${format(parseISO(e.follow_up_due), 'd MMM yyyy')}` : ''}
                  </span>
                  <Select value={e.follow_up_status || 'open'} onValueChange={(v) => setStatus(e, v as FollowUpStatus)}>
                    <SelectTrigger className="h-7 w-[150px] text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="in_progress">In progress</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          );
        })}
      </CardContent>

      <LifeEventDialog open={open} onOpenChange={setOpen} beneficiaryId={beneficiaryId} existing={editing} />
    </Card>
  );
}

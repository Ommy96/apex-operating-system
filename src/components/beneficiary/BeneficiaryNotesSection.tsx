import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { StickyNote, Loader2, Trash2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';

interface NoteRow {
  id: string;
  log_date: string;
  title: string;
  description: string | null;
  created_at: string;
}

export function BeneficiaryNotesSection({ beneficiaryId }: { beneficiaryId: string }) {
  const { currentOrganization } = useOrganization();
  const { user } = useAuth();
  const orgId = currentOrganization?.organization_id;
  const qc = useQueryClient();
  const key = ['beneficiary-notes', orgId, beneficiaryId];

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');

  const { data: notes = [], isLoading } = useQuery({
    queryKey: key,
    enabled: !!orgId && !!beneficiaryId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('beneficiary_progress_logs')
        .select('id, log_date, title, description, created_at')
        .eq('organization_id', orgId!)
        .eq('beneficiary_id', beneficiaryId)
        .eq('category', 'note')
        .order('log_date', { ascending: false });
      if (error) throw error;
      return (data || []) as NoteRow[];
    },
  });

  const add = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('beneficiary_progress_logs').insert({
        organization_id: orgId!,
        beneficiary_id: beneficiaryId,
        category: 'note',
        log_date: new Date().toISOString().slice(0, 10),
        title: title.trim(),
        description: body.trim() || null,
        logged_by: user?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setTitle(''); setBody('');
      toast.success('Note added');
      qc.invalidateQueries({ queryKey: key });
    },
    onError: (e: any) => toast.error(e?.message || 'Could not save the note'),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('beneficiary_progress_logs').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success('Note deleted'); qc.invalidateQueries({ queryKey: key }); },
    onError: (e: any) => toast.error(e?.message || 'Could not delete the note'),
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <StickyNote className="h-4 w-4 text-primary" /> Notes
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Note title" />
          <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={2} placeholder="Free-form staff note, not tied to a visit or event" />
          <div className="flex justify-end">
            <Button size="sm" disabled={!title.trim() || add.isPending} onClick={() => add.mutate()}>
              {add.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} Add note
            </Button>
          </div>
        </div>

        {isLoading && <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>}
        {!isLoading && notes.length === 0 && <p className="text-sm text-muted-foreground">No notes yet.</p>}
        {notes.map((n) => (
          <div key={n.id} className="rounded-md border p-3 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium">{n.title}</p>
              <p className="text-xs text-muted-foreground">{format(parseISO(n.log_date), 'd MMM yyyy')}</p>
              {n.description && <p className="text-sm mt-1 whitespace-pre-wrap">{n.description}</p>}
            </div>
            <Button variant="ghost" size="sm" aria-label="Delete note" onClick={() => remove.mutate(n.id)}>
              <Trash2 className="h-3.5 w-3.5 text-destructive" />
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

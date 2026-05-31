import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Sparkles, Loader2, Download } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { toast } from 'sonner';

type DocType = 'concept_note' | 'proposal' | 'donor_report' | 'impact_summary';

interface Props {
  programId?: string;
  projectId?: string;
  grantId?: string;
  opportunityId?: string;
  defaultType?: DocType;
  variant?: 'default' | 'outline' | 'secondary' | 'ghost';
  size?: 'sm' | 'default' | 'lg';
  label?: string;
}

const TYPES: { value: DocType; label: string }[] = [
  { value: 'concept_note', label: 'Concept note' },
  { value: 'proposal', label: 'Full grant proposal' },
  { value: 'donor_report', label: 'Donor report' },
  { value: 'impact_summary', label: 'Impact summary' },
];

export function GenerateWithAIButton(props: Props) {
  const { currentOrganization } = useOrganization();
  const [open, setOpen] = useState(false);
  const [docType, setDocType] = useState<DocType>(props.defaultType ?? 'concept_note');
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [content, setContent] = useState('');

  const generate = async () => {
    if (!currentOrganization?.organization_id) return;
    setLoading(true);
    setContent('');
    try {
      const { data, error } = await supabase.functions.invoke('proposal-generator', {
        body: {
          organizationId: currentOrganization.organization_id,
          programId: props.programId,
          projectId: props.projectId,
          grantId: props.grantId,
          opportunityId: props.opportunityId,
          documentType: docType,
          title: title || undefined,
        },
      });
      if (error) throw new Error(error.message);
      if (data?.error) { toast.error(data.error); return; }
      setContent(data?.draft?.content ?? '');
      toast.success('Draft generated and saved');
    } catch (e: any) {
      toast.error(e.message ?? 'Generation failed');
    } finally {
      setLoading(false);
    }
  };

  const download = () => {
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title || docType}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <Button variant={props.variant ?? 'outline'} size={props.size ?? 'sm'} onClick={() => setOpen(true)} className="gap-2">
        <Sparkles className="h-4 w-4" />{props.label ?? 'Generate with AI'}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Generate document with AI</DialogTitle>
            <DialogDescription>Drafts a tailored document using your org, program, and indicator data. You can edit and export.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label>Document type</Label>
                <Select value={docType} onValueChange={(v) => setDocType(v as DocType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Title (optional)</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Kibera Education Concept Note" />
              </div>
            </div>
            {content && (
              <div>
                <Label>Draft (editable)</Label>
                <Textarea value={content} onChange={(e) => setContent(e.target.value)} className="min-h-[360px] font-mono text-xs" />
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            {content && <Button variant="outline" onClick={download} className="gap-2"><Download className="h-4 w-4" />Download .md</Button>}
            <Button onClick={generate} disabled={loading} className="gap-2">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {loading ? 'Generating...' : content ? 'Regenerate' : 'Generate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
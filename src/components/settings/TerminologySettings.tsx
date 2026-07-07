import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useOrganization } from '@/hooks/useOrganization';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { useTierLabels } from '@/hooks/useTierLabels';

const DEFAULTS = { program: 'Programme', project: 'Project', activity: 'Activity' };

export function TerminologySettings() {
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.organization_id;
  const labels = useTierLabels();
  const qc = useQueryClient();

  const [form, setForm] = useState(DEFAULTS);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!labels.isLoading && !loaded) {
      setForm({ program: labels.program, project: labels.project, activity: labels.activity });
      setLoaded(true);
    }
  }, [labels.isLoading, labels.program, labels.project, labels.activity, loaded]);

  const reset = () => setForm(DEFAULTS);

  const save = async () => {
    if (!orgId) return;
    setSaving(true);
    try {
      const { error } = await (supabase as any)
        .from('organizations')
        .update({
          tier_label_program: form.program.trim() || DEFAULTS.program,
          tier_label_project: form.project.trim() || DEFAULTS.project,
          tier_label_activity: form.activity.trim() || DEFAULTS.activity,
        })
        .eq('id', orgId);
      if (error) throw error;
      await qc.invalidateQueries({ queryKey: ['org-tier-labels', orgId] });
      toast({ title: 'Terminology saved' });
    } catch (e: any) {
      toast({ title: 'Save failed', description: e?.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Hierarchy terminology</h2>
        <p className="text-sm text-muted-foreground">
          Rename the three tiers to match how your organisation talks about its work. These are display-only —
          data structure and links stay the same.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tier labels</CardTitle>
          <CardDescription>
            Common patterns: <em>Portfolio / Programme / Project</em>, <em>Programme / Project / Activity</em>,
            or <em>Initiative / Project / Task</em>.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Top tier (default: Programme)</Label>
              <Input value={form.program} onChange={(e) => setForm(f => ({ ...f, program: e.target.value }))} placeholder="Programme" />
            </div>
            <div className="space-y-2">
              <Label>Middle tier (default: Project)</Label>
              <Input value={form.project} onChange={(e) => setForm(f => ({ ...f, project: e.target.value }))} placeholder="Project" />
            </div>
            <div className="space-y-2">
              <Label>Bottom tier (default: Activity)</Label>
              <Input value={form.activity} onChange={(e) => setForm(f => ({ ...f, activity: e.target.value }))} placeholder="Activity" />
            </div>
          </div>

          <div className="rounded-md border bg-muted/30 p-4 text-sm">
            <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Live preview</div>
            <div className="font-medium">
              {(form.program || 'Programme')} → {(form.project || 'Project')} → {(form.activity || 'Activity')}
            </div>
            <div className="text-muted-foreground mt-1">
              Example breadcrumb: <span className="text-foreground">
                {(form.program || 'Programme')} · Health outreach / {(form.project || 'Project')} · Q1 clinic drive / {(form.activity || 'Activity')} · Vaccination day
              </span>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={reset} disabled={saving}>Reset to defaults</Button>
            <Button onClick={save} disabled={saving} data-settings-save="true">
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save changes
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
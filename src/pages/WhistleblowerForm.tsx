import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { CheckCircle, ShieldAlert } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const REPORT_TYPES = [
  { value: 'financial_misconduct', label: 'Financial Misconduct' },
  { value: 'fraud', label: 'Fraud' },
  { value: 'harassment', label: 'Harassment' },
  { value: 'conflict_of_interest', label: 'Conflict of Interest' },
  { value: 'policy_violation', label: 'Policy Violation' },
  { value: 'safeguarding', label: 'Safeguarding Concern' },
  { value: 'other', label: 'Other' },
];

export default function WhistleblowerForm() {
  const { orgSlug } = useParams();
  const [submitted, setSubmitted] = useState(false);
  const [referenceId, setReferenceId] = useState('');
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    report_type: '',
    description: '',
    evidence_description: '',
    is_anonymous: true,
    contact_info: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.report_type || !form.description) return;

    setLoading(true);
    try {
      const { data: org } = await supabase
        .from('organizations')
        .select('id')
        .eq('slug', orgSlug)
        .single();

      if (!org) { alert('Organization not found'); return; }

      const { data, error } = await supabase.functions.invoke('submit-whistleblower-report', {
        body: { organization_id: org.id, ...form },
      });

      if (error) throw error;
      setReferenceId(data.reference_id);
      setSubmitted(true);
    } catch {
      alert('Failed to submit. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-4">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
            <h2 className="text-xl font-bold">Report Submitted</h2>
            <p className="text-muted-foreground">Your report has been received and will be reviewed by authorized personnel.</p>
            <div className="bg-muted rounded-lg p-3">
              <p className="text-sm text-muted-foreground">Reference Number</p>
              <p className="font-mono font-bold text-lg">{referenceId?.slice(0, 8).toUpperCase()}</p>
            </div>
            <p className="text-xs text-muted-foreground">Save this reference number for your records. No personal information has been stored with this submission.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-lg w-full">
        <CardHeader>
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-6 w-6 text-destructive" />
            <CardTitle>Confidential Report</CardTitle>
          </div>
          <CardDescription>This report is confidential. You may submit anonymously. All reports are reviewed by authorized personnel only.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Report Type *</Label>
              <Select value={form.report_type} onValueChange={v => setForm(p => ({ ...p, report_type: v }))}>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  {REPORT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Description *</Label>
              <Textarea
                placeholder="Describe the incident or concern in detail..."
                value={form.description}
                onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                rows={5}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Supporting Evidence (optional)</Label>
              <Textarea
                placeholder="Describe any documents, dates, or evidence..."
                value={form.evidence_description}
                onChange={e => setForm(p => ({ ...p, evidence_description: e.target.value }))}
                rows={3}
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <Label htmlFor="anon-toggle" className="text-sm font-medium">Submit Anonymously</Label>
              <Switch
                id="anon-toggle"
                checked={form.is_anonymous}
                onCheckedChange={v => setForm(p => ({ ...p, is_anonymous: v }))}
              />
            </div>

            {!form.is_anonymous && (
              <div className="space-y-2">
                <Label>Contact Information</Label>
                <Input
                  value={form.contact_info}
                  onChange={e => setForm(p => ({ ...p, contact_info: e.target.value }))}
                  placeholder="Phone or email (for follow-up)"
                />
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading || !form.report_type || !form.description}>
              {loading ? 'Submitting...' : 'Submit Report'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

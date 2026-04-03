import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { CheckCircle, MessageSquare } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const CATEGORIES = [
  { value: 'service_quality', label: 'Service Quality' },
  { value: 'staff_conduct', label: 'Staff Conduct' },
  { value: 'data_privacy', label: 'Data Privacy' },
  { value: 'safety', label: 'Safety Concern' },
  { value: 'programme_design', label: 'Programme Design' },
  { value: 'other', label: 'Other' },
];

export default function ComplaintIntake() {
  const { orgSlug } = useParams();
  const [submitted, setSubmitted] = useState(false);
  const [referenceId, setReferenceId] = useState('');
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    category: '',
    description: '',
    submitted_by_name: '',
    submitted_by_contact: '',
    is_anonymous: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.category || !form.description) return;

    setLoading(true);
    try {
      // Look up org by slug
      const { data: org } = await supabase
        .from('organizations')
        .select('id')
        .eq('slug', orgSlug)
        .single();

      if (!org) {
        alert('Organization not found');
        return;
      }

      const { data, error } = await supabase.functions.invoke('create-complaint', {
        body: { organization_id: org.id, ...form },
      });

      if (error) throw error;
      setReferenceId(data.reference_id);
      setSubmitted(true);
    } catch (err) {
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
            <h2 className="text-xl font-bold">Feedback Submitted</h2>
            <p className="text-muted-foreground">Your feedback has been recorded. Thank you for helping us improve.</p>
            <div className="bg-muted rounded-lg p-3">
              <p className="text-sm text-muted-foreground">Reference Number</p>
              <p className="font-mono font-bold text-lg">{referenceId?.slice(0, 8).toUpperCase()}</p>
            </div>
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
            <MessageSquare className="h-6 w-6 text-primary" />
            <CardTitle>Share Your Feedback</CardTitle>
          </div>
          <CardDescription>Your feedback helps us improve our services. All submissions are treated confidentially.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Category *</Label>
              <Select value={form.category} onValueChange={v => setForm(p => ({ ...p, category: v }))}>
                <SelectTrigger><SelectValue placeholder="Select a category" /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Description *</Label>
              <Textarea
                placeholder="Please describe your feedback or complaint..."
                value={form.description}
                onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                rows={5}
                required
              />
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="anonymous"
                checked={form.is_anonymous}
                onCheckedChange={v => setForm(p => ({ ...p, is_anonymous: !!v }))}
              />
              <Label htmlFor="anonymous" className="text-sm">Submit anonymously</Label>
            </div>

            {!form.is_anonymous && (
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>Your Name (optional)</Label>
                  <Input
                    value={form.submitted_by_name}
                    onChange={e => setForm(p => ({ ...p, submitted_by_name: e.target.value }))}
                    placeholder="Your name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Contact (optional)</Label>
                  <Input
                    value={form.submitted_by_contact}
                    onChange={e => setForm(p => ({ ...p, submitted_by_contact: e.target.value }))}
                    placeholder="Phone or email"
                  />
                </div>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading || !form.category || !form.description}>
              {loading ? 'Submitting...' : 'Submit Feedback'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

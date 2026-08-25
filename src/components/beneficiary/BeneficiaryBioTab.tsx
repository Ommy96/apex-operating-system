import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { BookOpen, Save, Loader2, AlertTriangle, Clock } from 'lucide-react';
import { formatDistanceToNow, differenceInMonths } from 'date-fns';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useInterestTypes } from '@/hooks/useInterestTypes';
import { ChipMultiSelect } from './ChipMultiSelect';
import { logger } from '@/lib/logger';

interface Props {
  beneficiary: any;
  canEdit?: boolean;
  onUpdated?: (patch: Record<string, any>) => void;
}

const IDEAL_MIN = 100;
const IDEAL_MAX = 300;

export function BeneficiaryBioTab({ beneficiary, canEdit = true, onUpdated }: Props) {
  const { user } = useAuth();
  const { data: hobbyTypes = [] } = useInterestTypes('hobby');
  const { data: interestTypes = [] } = useInterestTypes('interest');

  const [form, setForm] = useState({
    bio: beneficiary?.bio || '',
    hobbies_list: (beneficiary?.hobbies_list as string[]) || [],
    interests: (beneficiary?.interests as string[]) || [],
    career_ambition: beneficiary?.career_ambition || '',
    favourite_subject: beneficiary?.favourite_subject || '',
    personal_strengths: beneficiary?.personal_strengths || '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm({
      bio: beneficiary?.bio || '',
      hobbies_list: (beneficiary?.hobbies_list as string[]) || [],
      interests: (beneficiary?.interests as string[]) || [],
      career_ambition: beneficiary?.career_ambition || '',
      favourite_subject: beneficiary?.favourite_subject || '',
      personal_strengths: beneficiary?.personal_strengths || '',
    });
  }, [beneficiary?.id]);

  const words = useMemo(() => form.bio.trim().split(/\s+/).filter(Boolean).length, [form.bio]);
  const dirty = useMemo(() => (
    form.bio !== (beneficiary?.bio || '') ||
    form.career_ambition !== (beneficiary?.career_ambition || '') ||
    form.favourite_subject !== (beneficiary?.favourite_subject || '') ||
    form.personal_strengths !== (beneficiary?.personal_strengths || '') ||
    JSON.stringify(form.hobbies_list) !== JSON.stringify(beneficiary?.hobbies_list || []) ||
    JSON.stringify(form.interests) !== JSON.stringify(beneficiary?.interests || [])
  ), [form, beneficiary]);

  const updatedAt = beneficiary?.bio_updated_at ? new Date(beneficiary.bio_updated_at) : null;
  const stale = updatedAt ? differenceInMonths(new Date(), updatedAt) >= 12 : false;

  const save = async () => {
    setSaving(true);
    try {
      const patch = {
        ...form,
        bio_updated_at: new Date().toISOString(),
        bio_updated_by: user?.id ?? null,
      };
      const { error } = await supabase
        .from('beneficiaries')
        .update(patch as any)
        .eq('id', beneficiary.id)
        .eq('organization_id', beneficiary.organization_id);
      if (error) throw error;
      onUpdated?.(patch);
      toast.success('Bio saved');
    } catch (e: any) {
      logger.error('bio save failed', e);
      toast.error('Could not save bio', { description: e?.message });
    } finally {
      setSaving(false);
    }
  };

  const countTone = words === 0 ? 'text-muted-foreground'
    : words < IDEAL_MIN ? 'text-warning'
    : words > IDEAL_MAX ? 'text-warning'
    : 'text-success';

  return (
    <div className="space-y-4">
      {stale && (
        <Alert className="border-warning/40 bg-warning/5">
          <AlertTriangle className="h-4 w-4 text-warning" />
          <AlertDescription className="text-sm">
            This bio was written {formatDistanceToNow(updatedAt!)} ago — children change. Consider refreshing it.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader className="pb-3 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 space-y-0">
          <div className="min-w-0">
            <CardTitle className="text-base flex items-center gap-2"><BookOpen className="h-4 w-4 text-primary" /> Their story</CardTitle>
            <CardDescription>A short narrative in plain language. This is the centrepiece of any shared profile.</CardDescription>
          </div>
          {updatedAt && (
            <Badge variant="outline" className="gap-1 shrink-0 self-start">
              <Clock className="h-3 w-3" /> Updated {formatDistanceToNow(updatedAt, { addSuffix: true })}
            </Badge>
          )}
        </CardHeader>
        <CardContent className="space-y-2">
          <Textarea
            value={form.bio}
            disabled={!canEdit}
            onChange={(e) => setForm({ ...form, bio: e.target.value })}
            placeholder="Who are they? What is their situation, what are they working towards, what has changed since they joined?"
            className="min-h-[220px] leading-relaxed"
          />
          <div className="flex items-center justify-between text-xs">
            <span className={countTone}>{words} words</span>
            <span className="text-muted-foreground">Aim for {IDEAL_MIN}–{IDEAL_MAX} words</span>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Hobbies</CardTitle>
            <CardDescription>Pick from the catalogue or type your own.</CardDescription>
          </CardHeader>
          <CardContent>
            <ChipMultiSelect
              value={form.hobbies_list}
              options={hobbyTypes.map((h) => h.label)}
              disabled={!canEdit}
              placeholder="e.g. Football"
              onChange={(v) => setForm({ ...form, hobbies_list: v })}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Interests</CardTitle>
            <CardDescription>Subjects and fields they care about.</CardDescription>
          </CardHeader>
          <CardContent>
            <ChipMultiSelect
              value={form.interests}
              options={interestTypes.map((h) => h.label)}
              disabled={!canEdit}
              placeholder="e.g. Coding"
              onChange={(v) => setForm({ ...form, interests: v })}
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Ambition & strengths</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Career ambition</Label>
            <Input
              value={form.career_ambition}
              disabled={!canEdit}
              placeholder="e.g. a nurse"
              onChange={(e) => setForm({ ...form, career_ambition: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Favourite subject</Label>
            <Input
              value={form.favourite_subject}
              disabled={!canEdit}
              placeholder="e.g. Mathematics"
              onChange={(e) => setForm({ ...form, favourite_subject: e.target.value })}
            />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label>Personal strengths</Label>
            <Textarea
              value={form.personal_strengths}
              disabled={!canEdit}
              placeholder="e.g. Determined, helps younger siblings with homework, natural team captain"
              className="min-h-[80px]"
              onChange={(e) => setForm({ ...form, personal_strengths: e.target.value })}
            />
          </div>
        </CardContent>
      </Card>

      {canEdit && (
        <div className="flex justify-end sticky bottom-2">
          <Button onClick={save} disabled={!dirty || saving} data-settings-save="true">
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Save bio
          </Button>
        </div>
      )}
    </div>
  );
}

import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { FundingCoverageBar } from './FundingCoverageBar';
import {
  FolderKanban,
  Heart,
  Plus,
  Send,
  FileText,
  ExternalLink,
  Sparkles,
  CalendarDays,
  Activity as ActivityIcon,
} from 'lucide-react';
import { format, formatDistanceToNow, differenceInDays } from 'date-fns';
import { cn } from '@/lib/utils';

interface Props {
  beneficiaryId: string;
  organizationId: string | null;
  canEdit: boolean;
  onEnrol: () => void;
  onAddDonor?: () => void;
}

type EnrollmentRow = {
  id: string;
  enrolled_date: string;
  exit_date: string | null;
  status: string | null;
  notes: string | null;
  programs: {
    id: string;
    name: string;
    icon: string | null;
    color: string | null;
    start_date: string | null;
    end_date: string | null;
  } | null;
  projects: { id: string; name: string; funding_model: string | null } | null;
};

type DonorRow = {
  id: string;
  donor_name: string;
  amount_received: number | null;
  donation_date: string | null;
  notes: string | null;
  program_id: string | null;
  program?: { id: string; name: string } | null;
};

function statusTone(status: string | null | undefined) {
  const s = (status || '').toLowerCase();
  if (['active'].includes(s)) return { label: 'Active', cls: 'bg-success/10 text-success border-success/30' };
  if (['completed'].includes(s)) return { label: 'Completed', cls: 'bg-primary/10 text-primary border-primary/30' };
  if (['paused', 'transferred'].includes(s)) return { label: status || 'Paused', cls: 'bg-warning/10 text-warning border-warning/30' };
  if (['exited', 'dropped'].includes(s)) return { label: status === 'Dropped' ? 'Exited' : (status || 'Exited'), cls: 'bg-destructive/10 text-destructive border-destructive/30' };
  return { label: status || 'Unknown', cls: 'bg-muted text-muted-foreground border-border' };
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || '')
    .join('');
}

export function ProgrammeCardsView({ beneficiaryId, organizationId, canEdit, onEnrol, onAddDonor }: Props) {
  const navigate = useNavigate();

  const { data: enrollments = [], isLoading: enrollLoading } = useQuery({
    queryKey: ['programme-cards-enrollments', beneficiaryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('beneficiary_services')
        .select(`
          id, enrolled_date, exit_date, status, notes,
          programs:program_id (id, name, icon, color, start_date, end_date),
          projects:project_id (id, name, funding_model)
        `)
        .eq('beneficiary_id', beneficiaryId)
        .order('enrolled_date', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as EnrollmentRow[];
    },
    enabled: !!beneficiaryId,
  });

  const { data: donors = [] } = useQuery({
    queryKey: ['programme-cards-donors', beneficiaryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('beneficiary_donors')
        .select('*, program:programs(id, name)')
        .eq('beneficiary_id', beneficiaryId)
        .order('donation_date', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as DonorRow[];
    },
    enabled: !!beneficiaryId,
  });

  const { data: lastVisits = {} } = useQuery({
    queryKey: ['programme-cards-visits', beneficiaryId],
    queryFn: async () => {
      const { data } = await supabase
        .from('beneficiary_visitations')
        .select('visit_date')
        .eq('beneficiary_id', beneficiaryId)
        .order('visit_date', { ascending: false })
        .limit(1);
      const map: Record<string, string> = {};
      (data || []).forEach((v: any) => {
        if (!map._latest) map._latest = v.visit_date;
      });
      return map;
    },
    enabled: !!beneficiaryId,
  });

  // ---- Sponsorship grouping ----
  const sponsorships = useMemo(() => {
    const byDonor: Record<string, { name: string; entries: DonorRow[]; total: number; first?: string; last?: string }> = {};
    donors.forEach((d) => {
      const key = (d.donor_name || 'Unknown').trim();
      if (!byDonor[key]) byDonor[key] = { name: key, entries: [], total: 0 };
      byDonor[key].entries.push(d);
      byDonor[key].total += d.amount_received || 0;
      if (d.donation_date) {
        if (!byDonor[key].first || d.donation_date < byDonor[key].first!) byDonor[key].first = d.donation_date;
        if (!byDonor[key].last || d.donation_date > byDonor[key].last!) byDonor[key].last = d.donation_date;
      }
    });
    return Object.values(byDonor);
  }, [donors]);

  const yearStart = new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10);

  // ---- Group enrollments by program ----
  const programmes = useMemo(() => {
    const groups: Record<string, { program: EnrollmentRow['programs']; entries: EnrollmentRow[] }> = {};
    enrollments.forEach((e) => {
      const pid = e.programs?.id || 'none';
      if (!groups[pid]) groups[pid] = { program: e.programs, entries: [] };
      groups[pid].entries.push(e);
    });
    return Object.values(groups);
  }, [enrollments]);

  return (
    <div className="space-y-6">
      {/* SPONSORSHIP STRIP */}
      {sponsorships.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {sponsorships.map((s) => {
            const thisYear = s.entries
              .filter((e) => e.donation_date && e.donation_date >= yearStart)
              .reduce((sum, e) => sum + (e.amount_received || 0), 0);
            const lastUpdate = s.entries[0]?.notes || (s.last ? `Last contribution ${format(new Date(s.last), 'MMM d, yyyy')}` : null);
            return (
              <Card key={s.name} className="border-l-[3px]" style={{ borderLeftColor: 'hsl(var(--primary))' }}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <div
                      className="h-11 w-11 rounded-full flex items-center justify-center text-sm font-semibold shrink-0"
                      style={{ background: 'hsl(var(--primary) / 0.1)', color: 'hsl(var(--primary))' }}
                    >
                      {initials(s.name) || <Heart className="h-5 w-5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-[15px]" style={{ fontFamily: 'DM Sans, sans-serif' }}>{s.name}</span>
                        <Badge variant="outline" className="text-[10px] h-5">Sponsor</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2 flex-wrap">
                        {s.first && <span className="inline-flex items-center gap-1"><CalendarDays className="h-3 w-3" />Since {format(new Date(s.first), 'MMM yyyy')}</span>}
                        <span>· {s.entries.length} contribution{s.entries.length !== 1 ? 's' : ''}</span>
                      </div>
                    </div>
                  </div>

                  <FundingCoverageBar totalReceived={s.total} compact />

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-md bg-muted/40 px-2 py-1.5">
                      <div className="text-muted-foreground text-[10px]">This year</div>
                      <div className="font-semibold font-mono">KES {thisYear.toLocaleString()}</div>
                    </div>
                    <div className="rounded-md bg-muted/40 px-2 py-1.5">
                      <div className="text-muted-foreground text-[10px]">Lifetime</div>
                      <div className="font-semibold font-mono">KES {s.total.toLocaleString()}</div>
                    </div>
                  </div>

                  {lastUpdate && (
                    <p className="text-xs text-muted-foreground line-clamp-2 italic">“{lastUpdate}”</p>
                  )}

                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {canEdit && (
                      <>
                        <Button size="sm" variant="outline" className="h-7 text-xs gap-1" disabled title="Coming soon">
                          <Send className="h-3 w-3" /> Send update
                        </Button>
                        <Button size="sm" variant="outline" className="h-7 text-xs gap-1" disabled title="Coming soon">
                          <FileText className="h-3 w-3" /> Sponsor report
                        </Button>
                      </>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs gap-1"
                      onClick={() => navigate('/donors')}
                    >
                      <ExternalLink className="h-3 w-3" /> View sponsor
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="border-dashed border-primary/30 bg-primary/5">
          <CardContent className="p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="text-sm font-semibold">Available for sponsorship</div>
                <p className="text-xs text-muted-foreground">No sponsor linked yet — match this beneficiary with a donor.</p>
              </div>
            </div>
            {canEdit && onAddDonor && (
              <Button size="sm" variant="primary" onClick={onAddDonor} className="gap-1">
                <Heart className="h-3.5 w-3.5" /> Find sponsor
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* PROGRAMME GRID */}
      <div className="flex items-center justify-between">
        <h3 className="text-[14px] font-semibold" style={{ color: '#1C1917' }}>Programme enrolments</h3>
        {canEdit && programmes.length > 0 && (
          <Button size="sm" variant="outline" className="gap-1.5 h-8" onClick={onEnrol}>
            <Plus className="h-3.5 w-3.5" /> Enrol in programme
          </Button>
        )}
      </div>

      {enrollLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Skeleton className="h-44" />
          <Skeleton className="h-44" />
        </div>
      ) : programmes.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-10 text-center text-muted-foreground">
            <FolderKanban className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p className="text-sm">Not enrolled in any programmes yet</p>
            {canEdit && (
              <Button variant="primary" onClick={onEnrol} className="mt-3 gap-1.5">
                <Plus className="h-4 w-4" /> Enrol in a programme
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {programmes.map(({ program, entries }) => {
            const primaryEntry = entries.find((e) => (e.status || '').toLowerCase() === 'active') || entries[0];
            const tone = statusTone(primaryEntry?.status);
            const enrolled = primaryEntry?.enrolled_date;
            const exited = primaryEntry?.exit_date;
            const start = program?.start_date;
            const end = program?.end_date;
            const accent = program?.color || null;
            const projects = entries.filter((e) => e.projects).map((e) => e.projects!.name);

            // Progress
            let progress: number | null = null;
            let progressLabel = 'Ongoing';
            if (start && end) {
              const total = differenceInDays(new Date(end), new Date(start));
              const elapsed = differenceInDays(new Date(), new Date(start));
              if (total > 0) {
                progress = Math.max(0, Math.min(100, Math.round((elapsed / total) * 100)));
                progressLabel = `${progress}% of programme timeline`;
              }
            } else if (enrolled && exited) {
              progress = 100;
              progressLabel = 'Completed';
            }

            const visitKey = program?.id || '';
            const lastVisit = lastVisits[visitKey] || lastVisits._latest;
            const latestActivity = lastVisit
              ? `Last visit ${formatDistanceToNow(new Date(lastVisit), { addSuffix: true })}`
              : entries.length > 0
                ? `${entries.length} service${entries.length !== 1 ? 's' : ''} received`
                : 'No recent activity';

            return (
              <Card
                key={program?.id || 'none'}
                role="button"
                tabIndex={0}
                onClick={() => program?.id && navigate(`/programs/dashboard/${program.id}`)}
                onKeyDown={(e) => {
                  if ((e.key === 'Enter' || e.key === ' ') && program?.id) {
                    e.preventDefault();
                    navigate(`/programs/dashboard/${program.id}`);
                  }
                }}
                className={cn(
                  'cursor-pointer transition-all hover:shadow-elevation-3 border-l-[3px]',
                  !accent && 'border-l-border',
                )}
                style={accent ? { borderLeftColor: accent } : undefined}
              >
                <CardContent className="p-4 space-y-3">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2 min-w-0">
                      <div
                        className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0"
                        style={{
                          background: accent ? `${accent}1a` : 'hsl(var(--muted))',
                          color: accent || 'hsl(var(--muted-foreground))',
                        }}
                      >
                        {program?.icon ? (
                          <span className="text-base leading-none">{program.icon}</span>
                        ) : (
                          <FolderKanban className="h-4 w-4" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div
                          className="font-semibold text-[16px] leading-tight truncate"
                          style={{ fontFamily: 'DM Sans, sans-serif' }}
                        >
                          {program?.name || 'Unknown programme'}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {enrolled ? `Enrolled ${format(new Date(enrolled), 'MMM d, yyyy')}` : '—'}
                        </div>
                      </div>
                    </div>
                    <Badge variant="outline" className={cn('shrink-0', tone.cls)}>{tone.label}</Badge>
                  </div>

                  {/* Progress */}
                  <div className="space-y-1">
                    {progress !== null ? (
                      <Progress value={progress} className="h-1.5" />
                    ) : (
                      <div className="h-1.5 rounded-full bg-muted/60" />
                    )}
                    <div className="text-[11px] text-muted-foreground">{progressLabel}</div>
                  </div>

                  {/* Latest activity */}
                  <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <ActivityIcon className="h-3 w-3" />
                    {latestActivity}
                  </div>

                  {/* Metric chips */}
                  <div className="flex flex-wrap gap-1.5">
                    <Badge variant="secondary" className="text-[10px]">
                      {entries.length} enrol{entries.length !== 1 ? 'ments' : 'ment'}
                    </Badge>
                    {projects.length > 0 && (
                      <Badge variant="secondary" className="text-[10px]">
                        {projects.length} project{projects.length !== 1 ? 's' : ''}
                      </Badge>
                    )}
                    {entries.filter((e) => (e.status || '').toLowerCase() === 'active').length > 0 && (
                      <Badge variant="secondary" className="text-[10px]">
                        {entries.filter((e) => (e.status || '').toLowerCase() === 'active').length} active
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

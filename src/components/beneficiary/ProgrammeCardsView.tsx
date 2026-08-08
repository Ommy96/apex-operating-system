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
import * as LucideIcons from 'lucide-react';
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
import { BeneficiaryBaselinesPopover } from '@/components/baselines/BeneficiaryBaselinesPopover';

/**
 * Resolves a lucide-react icon name (stored as a string on `programs.icon`)
 * into an actual icon component. Falls back to FolderKanban when missing or
 * unknown — this fixes the "the word 'Sparkles' renders as text overlapping
 * the programme name" bug (Fix 3a).
 */
function renderProgramIcon(iconName: string | null | undefined) {
  if (!iconName) return <FolderKanban className="h-4 w-4" />;
  const IconComponent = (LucideIcons as any)[iconName];
  if (!IconComponent || typeof IconComponent !== 'function') {
    return <FolderKanban className="h-4 w-4" />;
  }
  return <IconComponent className="h-4 w-4" />;
}

/**
 * Strict grid layout shared by both programme cards and sponsorship cards
 * so the two read as one visual family. See Fix 6.
 */
const CARD_GRID_STYLE: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '40px 1fr auto',
  gridTemplateAreas: `
    "avatar  name     status"
    "avatar  meta     meta"
    "stats   stats    stats"
    "actions actions  actions"
  `,
  columnGap: 12,
  rowGap: 8,
  alignItems: 'center',
};

interface Props {
  beneficiaryId: string;
  organizationId: string | null;
  canEdit: boolean;
  onEnrol: () => void;
  onAddDonor?: () => void;
  /** Context-aware "Add donor" — receives the programme (and optional project) the user came from. */
  onAddDonorForProgramme?: (programmeId: string, projectId?: string | null) => void;
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

export function ProgrammeCardsView({ beneficiaryId, organizationId, canEdit, onEnrol, onAddDonor, onAddDonorForProgramme }: Props) {
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

  /**
   * Unified programme + sponsorship model.
   *
   * Previously the profile rendered two disconnected lists: "Programme
   * enrolments" and, far below, a "Sponsorship" strip — so nobody could tell
   * WHO was paying for WHICH programme. Now each programme card carries its
   * own funding: the sponsors attributed to that programme, what they have
   * given this year, and the coverage bar. Sponsors with no programme
   * attribution are collected into a single "General sponsorship" card so
   * nothing is hidden.
   */
  const cards = useMemo(() => {
    const attributed = new Set<string>();

    const programmeCards = programmes.map(({ program, entries }) => {
      const linked = donors.filter((d) => (d.program_id || d.program?.id) === program?.id);
      linked.forEach((d) => attributed.add(d.id));
      return { kind: 'programme' as const, program, entries, donorRows: linked };
    });

    const orphanDonors = donors.filter((d) => !attributed.has(d.id));
    if (orphanDonors.length > 0) {
      programmeCards.push({
        kind: 'general' as any,
        program: null,
        entries: [],
        donorRows: orphanDonors,
      } as any);
    }
    return programmeCards;
  }, [programmes, donors]);

  const totalLifetime = donors.reduce((s, d) => s + (d.amount_received || 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h3 className="text-[14px] font-semibold text-foreground">Programmes &amp; funding</h3>
          <p className="text-[12px] text-muted-foreground">
            {programmes.length} programme{programmes.length === 1 ? '' : 's'}
            {donors.length > 0 && ` · KES ${totalLifetime.toLocaleString()} received lifetime`}
          </p>
        </div>
        {canEdit && (
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="gap-1.5 h-8" onClick={onEnrol}>
              <Plus className="h-3.5 w-3.5" /> Enrol
            </Button>
            {onAddDonor && (
              <Button size="sm" variant="outline" className="gap-1.5 h-8" onClick={onAddDonor}>
                <Heart className="h-3.5 w-3.5" /> Add sponsor
              </Button>
            )}
          </div>
        )}
      </div>

      {enrollLoading ? (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
          <Skeleton className="h-56" />
          <Skeleton className="h-56" />
        </div>
      ) : cards.length === 0 ? (
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
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
          {cards.map((card: any) => {
            const { program, entries, donorRows } = card;
            const isGeneral = card.kind === 'general';
            const primaryEntry =
              entries.find((e: EnrollmentRow) => (e.status || '').toLowerCase() === 'active') || entries[0];
            const tone = statusTone(isGeneral ? 'active' : primaryEntry?.status);
            const enrolled = primaryEntry?.enrolled_date;
            const accent = program?.color || null;
            const projects = entries.filter((e: EnrollmentRow) => e.projects).map((e: EnrollmentRow) => e.projects!.name);

            const lifetime = donorRows.reduce((s: number, d: DonorRow) => s + (d.amount_received || 0), 0);
            const thisYear = donorRows
              .filter((d: DonorRow) => d.donation_date && d.donation_date >= yearStart)
              .reduce((s: number, d: DonorRow) => s + (d.amount_received || 0), 0);
            const sponsorNames = Array.from(
              new Set(donorRows.map((d: DonorRow) => (d.donor_name || 'Unknown').trim())),
            ) as string[];

            const start = program?.start_date;
            const end = program?.end_date;
            let progress: number | null = null;
            let progressLabel = 'Ongoing';
            if (start && end) {
              const total = differenceInDays(new Date(end), new Date(start));
              const elapsed = differenceInDays(new Date(), new Date(start));
              if (total > 0) {
                progress = Math.max(0, Math.min(100, Math.round((elapsed / total) * 100)));
                progressLabel = `${progress}% of programme timeline`;
              }
            } else if (enrolled && primaryEntry?.exit_date) {
              progress = 100;
              progressLabel = 'Completed';
            }

            const lastVisit = lastVisits._latest;
            const latestActivity = lastVisit
              ? `Last visit ${formatDistanceToNow(new Date(lastVisit), { addSuffix: true })}`
              : entries.length > 0
                ? `${entries.length} service${entries.length !== 1 ? 's' : ''} received`
                : 'No recent activity';

            const openProgramme = () => {
              if (!isGeneral && program?.id) navigate(`/programs/dashboard/${program.id}`);
            };

            return (
              <Card
                key={isGeneral ? 'general-sponsorship' : program?.id || 'none'}
                className={cn(
                  'overflow-hidden border-l-[3px] transition-all',
                  !isGeneral && 'hover:shadow-elevation-3',
                  !accent && !isGeneral && 'border-l-border',
                  isGeneral && 'border-l-primary border-dashed',
                )}
                style={accent && !isGeneral ? { borderLeftColor: accent } : undefined}
              >
                <CardContent className="p-4 space-y-3">
                  {/* ── Header: identity + status ── */}
                  <div className="flex items-start gap-3">
                    <div
                      className="h-10 w-10 shrink-0 rounded-lg flex items-center justify-center"
                      style={{
                        background: isGeneral ? 'hsl(var(--primary) / 0.1)' : accent ? `${accent}1a` : 'hsl(var(--muted))',
                        color: isGeneral ? 'hsl(var(--primary))' : accent || 'hsl(var(--muted-foreground))',
                      }}
                    >
                      {isGeneral ? <Heart className="h-4 w-4" /> : renderProgramIcon(program?.icon)}
                    </div>

                    <div className="min-w-0 flex-1">
                      <button
                        type="button"
                        onClick={openProgramme}
                        disabled={isGeneral || !program?.id}
                        title={isGeneral ? 'General sponsorship' : program?.name || 'Unknown programme'}
                        className={cn(
                          'text-[14px] font-semibold leading-[1.2] truncate max-w-full text-left',
                          !isGeneral && program?.id && 'hover:underline',
                        )}
                      >
                        {isGeneral ? 'General sponsorship' : program?.name || 'Unknown programme'}
                      </button>
                      <div className="text-[12px] text-muted-foreground leading-[1.3] truncate">
                        {isGeneral
                          ? 'Support not tied to a specific programme'
                          : (
                            <>
                              {enrolled ? `Enrolled ${format(new Date(enrolled), 'MMM d, yyyy')}` : '—'}
                              <span className="mx-1.5 text-muted-foreground/60">·</span>
                              {latestActivity}
                            </>
                          )}
                      </div>
                    </div>

                    <Badge
                      variant="outline"
                      className={cn('h-[22px] px-2 text-[10px] leading-none flex items-center shrink-0', tone.cls)}
                    >
                      {isGeneral ? 'Sponsorship' : tone.label}
                    </Badge>
                  </div>

                  {/* ── Delivery + funding in one row of tiles ── */}
                  <div className="grid grid-cols-3 gap-2">
                    {!isGeneral && (
                      <div className="rounded-md bg-muted/40 px-3 py-2 h-[52px] flex flex-col justify-center">
                        <div className="text-muted-foreground text-[10px] uppercase tracking-wide">Projects</div>
                        <div className="font-semibold text-[13px] tabular-nums font-mono">{projects.length}</div>
                      </div>
                    )}
                    <div className="rounded-md bg-muted/40 px-3 py-2 h-[52px] flex flex-col justify-center">
                      <div className="text-muted-foreground text-[10px] uppercase tracking-wide">Sponsors</div>
                      <div className="font-semibold text-[13px] tabular-nums font-mono">{sponsorNames.length}</div>
                    </div>
                    <div className="rounded-md bg-muted/40 px-3 py-2 h-[52px] flex flex-col justify-center">
                      <div className="text-muted-foreground text-[10px] uppercase tracking-wide">This year</div>
                      <div className="font-semibold text-[13px] tabular-nums font-mono">
                        <span className="text-muted-foreground font-normal text-[10px] mr-1">KES</span>
                        {thisYear.toLocaleString()}
                      </div>
                    </div>
                    {isGeneral && (
                      <div className="rounded-md bg-muted/40 px-3 py-2 h-[52px] flex flex-col justify-center">
                        <div className="text-muted-foreground text-[10px] uppercase tracking-wide">Lifetime</div>
                        <div className="font-semibold text-[13px] tabular-nums font-mono">
                          <span className="text-muted-foreground font-normal text-[10px] mr-1">KES</span>
                          {lifetime.toLocaleString()}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* ── Who is funding this programme ── */}
                  {sponsorNames.length > 0 ? (
                    <div className="rounded-md border border-border/70 bg-background/60 px-3 py-2">
                      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-muted-foreground mb-1.5">
                        <Heart className="h-3 w-3" /> Funded by
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {sponsorNames.slice(0, 4).map((n) => (
                          <span
                            key={n}
                            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/50 pl-1 pr-2 py-0.5 text-[11px]"
                          >
                            <span
                              className="h-4 w-4 rounded-full flex items-center justify-center text-[8px] font-semibold"
                              style={{ background: 'hsl(var(--primary) / 0.15)', color: 'hsl(var(--primary))' }}
                            >
                              {initials(n) || '?'}
                            </span>
                            <span className="truncate max-w-[120px]">{n}</span>
                          </span>
                        ))}
                        {sponsorNames.length > 4 && (
                          <span className="text-[11px] text-muted-foreground self-center">
                            +{sponsorNames.length - 4} more
                          </span>
                        )}
                      </div>
                      <FundingCoverageBar totalReceived={lifetime} className="mt-2" compact />
                    </div>
                  ) : (
                    <div className="rounded-md border border-dashed border-primary/30 bg-primary/5 px-3 py-2 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <Sparkles className="h-3.5 w-3.5 text-primary shrink-0" />
                        <span className="text-[11px] text-muted-foreground truncate">
                          No sponsor funding this programme yet
                        </span>
                      </div>
                      {canEdit && (onAddDonorForProgramme || onAddDonor) && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-[11px] gap-1 shrink-0"
                          onClick={() =>
                            program?.id && onAddDonorForProgramme
                              ? onAddDonorForProgramme(program.id, entries[0]?.projects?.id ?? null)
                              : onAddDonor?.()
                          }
                        >
                          <Heart className="h-3 w-3" /> Find sponsor
                        </Button>
                      )}
                    </div>
                  )}

                  {/* ── Timeline + actions ── */}
                  {!isGeneral && progress !== null && (
                    <div className="space-y-1">
                      <Progress value={progress} className="h-1.5" />
                      <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                        <ActivityIcon className="h-3 w-3" />
                        {progressLabel}
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap justify-end gap-2 pt-1">
                    {!isGeneral && canEdit && program?.id && (
                      <BeneficiaryBaselinesPopover
                        beneficiaryId={beneficiaryId}
                        programId={program.id}
                        projectIds={entries.map((e: EnrollmentRow) => e.projects?.id).filter(Boolean) as string[]}
                        onCaptureNow={onEnrol}
                      />
                    )}
                    {canEdit && sponsorNames.length > 0 && (onAddDonorForProgramme || onAddDonor) && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-[11px] gap-1"
                        onClick={() =>
                          !isGeneral && program?.id && onAddDonorForProgramme
                            ? onAddDonorForProgramme(program.id, entries[0]?.projects?.id ?? null)
                            : onAddDonor?.()
                        }
                      >
                        <Heart className="h-3 w-3" /> Add sponsor
                      </Button>
                    )}
                    {sponsorNames.length > 0 && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-[11px] gap-1"
                        onClick={() => navigate('/donors')}
                      >
                        <ExternalLink className="h-3 w-3" /> Donors
                      </Button>
                    )}
                    {!isGeneral && program?.id && (
                      <Button size="sm" variant="ghost" className="h-7 text-[11px] gap-1" onClick={openProgramme}>
                        <CalendarDays className="h-3 w-3" /> Open programme
                      </Button>
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

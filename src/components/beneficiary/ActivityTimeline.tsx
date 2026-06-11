import { logger } from "@/lib/logger";
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import {
  Loader2, FolderKanban, DollarSign, MessageSquare, GraduationCap, Upload, Clock,
  UserPlus, Heart, MapPin, ShieldAlert, Activity, CheckCircle2, LogOut,
} from 'lucide-react';

type EventCategory = 'registration' | 'programme' | 'visit' | 'risk' | 'academic' | 'service' | 'document' | 'note' | 'status' | 'sponsor';

interface TimelineEvent {
  id: string;
  date: string;
  category: EventCategory;
  title: string;
  description?: string;
  icon: typeof Clock;
}

interface ActivityTimelineProps {
  beneficiaryId: string;
  beneficiary?: { created_at?: string | null; inactive_date?: string | null; inactive_reason?: string | null; display_name?: string } | null;
  donors?: Array<{ id: string; donor_name: string; donation_date: string | null; amount_received: number | null; program?: { name: string } | null }>;
  canLogVisit?: boolean;
  onLogVisit?: () => void;
  /** Optional signature impact line (e.g. "2 months sponsored by NSP-AID") rendered above the summary. */
  signatureLine?: React.ReactNode;
}

const CATEGORY_META: Record<EventCategory, { label: string; dot: string }> = {
  registration: { label: 'Registration', dot: '#78716C' },
  programme:    { label: 'Programmes',   dot: 'var(--brand-primary, #0F7B6C)' },
  sponsor:      { label: 'Sponsors',     dot: '#1D9E8A' },
  visit:        { label: 'Visits',       dot: 'var(--brand-primary, #0F7B6C)' },
  risk:         { label: 'Risk',         dot: '#BE185D' },
  academic:     { label: 'Academic',     dot: '#1D4ED8' },
  service:      { label: 'Services',     dot: '#1D9E8A' },
  document:     { label: 'Documents',    dot: '#A8A29E' },
  note:         { label: 'Notes',        dot: '#A8A29E' },
  status:       { label: 'Status',       dot: '#B45309' },
};

const FILTERS: Array<{ key: 'all' | EventCategory; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'programme', label: 'Programmes' },
  { key: 'visit', label: 'Visits' },
  { key: 'risk', label: 'Risk' },
  { key: 'academic', label: 'Academic' },
  { key: 'document', label: 'Documents' },
  { key: 'note', label: 'Notes' },
];

const PAGE = 20;

export function ActivityTimeline({ beneficiaryId, beneficiary, donors, canLogVisit, onLogVisit, signatureLine }: ActivityTimelineProps) {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | EventCategory>('all');
  const [visible, setVisible] = useState(PAGE);

  useEffect(() => {
    fetchTimeline();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [beneficiaryId, beneficiary?.created_at, beneficiary?.inactive_date, donors?.length]);

  const fetchTimeline = async () => {
    setLoading(true);
    const allEvents: TimelineEvent[] = [];

    try {
      // Registration synthetic event
      if (beneficiary?.created_at) {
        allEvents.push({
          id: 'registered',
          date: beneficiary.created_at,
          category: 'registration',
          title: 'Registered as a beneficiary',
          icon: UserPlus,
        });
      }

      // Sponsor matched (earliest per sponsor)
      const propDonors = donors;
      if (propDonors && propDonors.length > 0) {
        const byName = new Map<string, { date: string | null; donor_name: string }>();
        for (const d of propDonors) {
          const cur = byName.get(d.donor_name);
          if (!cur || (d.donation_date && (!cur.date || d.donation_date < cur.date))) {
            byName.set(d.donor_name, { date: d.donation_date, donor_name: d.donor_name });
          }
        }
        for (const [name, info] of byName) {
          if (!info.date) continue;
          allEvents.push({
            id: `sponsor-${name}`,
            date: info.date,
            category: 'sponsor',
            title: `Matched with ${name}`,
            icon: Heart,
          });
        }
      }

      // Enrollments + service delivered
      const { data: enrollments } = await supabase
        .from('beneficiary_services')
        .select('id, enrolled_date, completed_date, status, program:programs(name), project:projects(name)')
        .eq('beneficiary_id', beneficiaryId)
        .order('enrolled_date', { ascending: false });

      enrollments?.forEach((e: any) => {
        allEvents.push({
          id: `enroll-${e.id}`,
          date: e.enrolled_date,
          category: 'programme',
          title: `Enrolled in ${e.program?.name || 'Program'}`,
          description: e.project?.name ? `Project: ${e.project.name}` : `Status: ${e.status || 'Active'}`,
          icon: FolderKanban,
        });
        if ((e.status === 'completed' || e.completed_date) && e.completed_date) {
          allEvents.push({
            id: `svc-${e.id}`,
            date: e.completed_date,
            category: 'service',
            title: `Service delivered: ${e.program?.name || 'Program'}`,
            description: e.project?.name || undefined,
            icon: CheckCircle2,
          });
        }
      });

      // Funding receipts
      const { data: fundingRows } = await supabase
        .from('beneficiary_donors')
        .select('id, donor_name, amount_received, donation_date, program:programs(name)')
        .eq('beneficiary_id', beneficiaryId)
        .order('donation_date', { ascending: false });

      fundingRows?.forEach((d: any) => {
        allEvents.push({
          id: `fund-${d.id}`,
          date: d.donation_date,
          category: 'sponsor',
          title: `Funding from ${d.donor_name}`,
          description: d.amount_received ? `KES ${d.amount_received.toLocaleString()} — ${d.program?.name || 'General'}` : d.program?.name || '',
          icon: DollarSign,
        });
      });

      // Academic progression
      const { data: progressions } = await supabase
        .from('beneficiary_progression_history')
        .select('id, progression_date, previous_grade, new_grade, previous_academic_level, new_academic_level, progression_type')
        .eq('beneficiary_id', beneficiaryId)
        .order('progression_date', { ascending: false });

      progressions?.forEach((p: any) => {
        allEvents.push({
          id: `prog-${p.id}`,
          date: p.progression_date,
          category: 'academic',
          title: `Academic ${p.progression_type || 'Progression'}`,
          description: `${p.previous_grade || '?'} → ${p.new_grade || '?'}${p.new_academic_level ? ` (${p.new_academic_level})` : ''}`,
          icon: GraduationCap,
        });
      });

      // Academic history + performance
      const { data: academicHistory } = await (supabase as any)
        .from('academic_history')
        .select('id, start_date, end_date, created_at, school_name, grade, academic_level')
        .eq('beneficiary_id', beneficiaryId);
      academicHistory?.forEach((a: any) => {
        const date = a.end_date || a.start_date || a.created_at;
        if (!date) return;
        allEvents.push({
          id: `ah-${a.id}`,
          date,
          category: 'academic',
          title: a.school_name ? `Attended ${a.school_name}` : 'Academic record',
          description: [a.grade, a.academic_level].filter(Boolean).join(' · ') || undefined,
          icon: GraduationCap,
        });
      });

      const { data: academicPerf } = await (supabase as any)
        .from('academic_performance')
        .select('id, assessment_date, term_end, created_at, term, grade, average_grade, average_score')
        .eq('beneficiary_id', beneficiaryId);
      academicPerf?.forEach((p: any) => {
        const date = p.assessment_date || p.term_end || p.created_at;
        if (!date) return;
        const grade = p.grade || p.average_grade || p.average_score;
        allEvents.push({
          id: `ap-${p.id}`,
          date,
          category: 'academic',
          title: p.term ? `${p.term} results` : 'Academic results',
          description: grade ? `Grade: ${grade}` : undefined,
          icon: GraduationCap,
        });
      });

      // Visits
      const { data: visits } = await supabase
        .from('beneficiary_visitations')
        .select('id, visit_date, created_at, visit_type, notes, location, outcome')
        .eq('beneficiary_id', beneficiaryId);
      visits?.forEach((v: any) => {
        const date = v.visit_date || v.created_at;
        if (!date) return;
        allEvents.push({
          id: `visit-${v.id}`,
          date,
          category: 'visit',
          title: v.visit_type ? `${v.visit_type} visit` : 'Field visit',
          description: v.notes || v.location || v.outcome || undefined,
          icon: MapPin,
        });
      });

      // Risk scores
      const { data: risks } = await supabase
        .from('beneficiary_risk_scores')
        .select('id, assessment_date, created_at, overall_risk_level, notes')
        .eq('beneficiary_id', beneficiaryId);
      risks?.forEach((r: any) => {
        const date = r.assessment_date || r.created_at;
        if (!date) return;
        const level = r.overall_risk_level;
        if (!level || (level !== 'medium' && level !== 'high' && level !== 'critical')) return;
        allEvents.push({
          id: `risk-${r.id}`,
          date,
          category: 'risk',
          title: `Risk flag raised: ${String(level).toUpperCase()}`,
          description: r.notes || undefined,
          icon: ShieldAlert,
        });
      });

      // Uploads
      const { data: uploads } = await supabase
        .from('beneficiary_uploads')
        .select('id, document_name, created_at, document_type')
        .eq('beneficiary_id', beneficiaryId)
        .order('created_at', { ascending: false });

      uploads?.forEach((u: any) => {
        allEvents.push({
          id: `upload-${u.id}`,
          date: u.created_at,
          category: 'document',
          title: `Document uploaded: ${u.document_name}`,
          description: u.document_type || 'File',
          icon: Upload,
        });
      });

      // Observations / notes
      const { data: observations } = await supabase
        .from('program_observations')
        .select('id, observation_date, category, notes, program:programs(name)')
        .eq('beneficiary_id', beneficiaryId)
        .order('observation_date', { ascending: false });

      observations?.forEach((o: any) => {
        allEvents.push({
          id: `obs-${o.id}`,
          date: o.observation_date,
          category: 'note',
          title: `Observation: ${o.category || 'General'}`,
          description: o.notes?.substring(0, 80) || o.program?.name || '',
          icon: MessageSquare,
        });
      });

      // Status change — exit
      if (beneficiary?.inactive_date) {
        allEvents.push({
          id: 'exit',
          date: beneficiary.inactive_date,
          category: 'status',
          title: 'Exited programme',
          description: beneficiary.inactive_reason || undefined,
          icon: LogOut,
        });
      }

      // Sort by date descending
      allEvents.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
      setEvents(allEvents.filter(e => !!e.date));
    } catch (err) {
      logger.error('Timeline fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="rounded-[14px] py-14 text-center" style={{ background: '#FFFEF9', border: '1px solid #E7E2DA' }}>
        <CheckCircle2 className="h-10 w-10 mx-auto mb-3" style={{ color: '#A8A29E' }} />
        <p className="text-[14px]" style={{ color: '#57534E', fontWeight: 500 }}>No activity recorded yet</p>
        {canLogVisit && onLogVisit && (
          <button onClick={onLogVisit} className="mt-3 text-[12px] underline" style={{ color: '#0F7B6C' }}>
            Log first visit →
          </button>
        )}
      </div>
    );
  }

  const filtered = filter === 'all' ? events : events.filter(e => e.category === filter);
  const shown = filtered.slice(0, visible);
  const newest = events[0]?.date ? new Date(events[0].date) : null;
  const oldest = events[events.length - 1]?.date ? new Date(events[events.length - 1].date) : null;
  const spanDays = newest && oldest ? Math.max(1, Math.floor((newest.getTime() - oldest.getTime()) / 86400000)) : 0;
  const spanLabel = spanDays >= 730 ? `${(spanDays / 365).toFixed(1)} yrs` : spanDays >= 60 ? `${Math.round(spanDays / 30)} months` : `${spanDays} days`;
  const daysAgo = newest ? Math.max(0, Math.floor((Date.now() - newest.getTime()) / 86400000)) : null;
  const recentLabel = daysAgo === 0 ? 'today' : daysAgo === 1 ? 'yesterday' : daysAgo !== null ? `${daysAgo} days ago` : '';

  return (
    <div>
      {signatureLine && (
        <div className="text-[15px] mb-1.5" style={{ color: '#1C1917', fontWeight: 500 }}>
          {signatureLine}
        </div>
      )}
      {/* Summary line */}
      <div className="text-[12px] mb-3" style={{ color: '#78716C' }}>
        {events.length} events over {spanLabel}{recentLabel ? `, most recent ${recentLabel}` : ''}
      </div>

      {/* Filter chips */}
      <div className="flex gap-1.5 flex-wrap mb-4 no-print">
        {FILTERS.map(f => {
          const active = filter === f.key;
          const count = f.key === 'all' ? events.length : events.filter(e => e.category === f.key).length;
          return (
            <button
              key={f.key}
              onClick={() => { setFilter(f.key); setVisible(PAGE); }}
              className="text-[12px] px-2.5 py-1 rounded-full transition-colors"
              style={
                active
                  ? { background: 'var(--brand-primary, #0F7B6C)', color: '#FFFFFF', fontWeight: 500 }
                  : { background: '#F5F0E8', color: '#57534E', fontWeight: 500 }
              }
            >
              {f.label}{count > 0 && f.key !== 'all' ? ` · ${count}` : ''}
            </button>
          );
        })}
      </div>

      {/* Timeline rows */}
      <div className="divide-y" style={{ borderColor: '#EDE5D8' }}>
        {shown.map(event => {
          const Icon = event.icon;
          const meta = CATEGORY_META[event.category];
          return (
            <div key={event.id} className="flex items-start gap-3 py-4">
              <span
                className="h-6 w-6 rounded-full flex items-center justify-center shrink-0"
                style={{ background: `color-mix(in srgb, ${meta.dot} 14%, transparent)`, color: meta.dot }}
              >
                <Icon className="h-3.5 w-3.5" />
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-[14px]" style={{ color: '#1C1917', fontWeight: 600 }}>{event.title}</div>
                {event.description && (
                  <div className="text-[12px] mt-0.5 truncate" style={{ color: '#78716C', fontWeight: 500 }}>{event.description}</div>
                )}
              </div>
              <div className="text-[12px] tabular-nums shrink-0 pt-1" style={{ color: '#78716C' }}>
                {new Date(event.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
              </div>
            </div>
          );
        })}
        {shown.length === 0 && (
          <div className="py-10 text-center text-[12px]" style={{ color: '#A8A29E' }}>
            No events match this filter.
          </div>
        )}
      </div>

      {filtered.length > visible && (
        <div className="text-center mt-3 no-print">
          <button
            onClick={() => setVisible(v => v + PAGE)}
            className="text-[12px] px-3 py-1.5 rounded-md"
            style={{ background: '#F5F0E8', color: '#44403C', fontWeight: 500 }}
          >
            Load more ({filtered.length - visible} remaining)
          </button>
        </div>
      )}
    </div>
  );
}

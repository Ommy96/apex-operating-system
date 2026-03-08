import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, FolderKanban, DollarSign, MessageSquare, GraduationCap, Upload, Clock } from 'lucide-react';

interface TimelineEvent {
  id: string;
  date: string;
  type: 'enrollment' | 'funding' | 'observation' | 'progression' | 'upload';
  title: string;
  description: string;
  icon: typeof Clock;
  color: string;
}

interface ActivityTimelineProps {
  beneficiaryId: string;
}

export function ActivityTimeline({ beneficiaryId }: ActivityTimelineProps) {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTimeline();
  }, [beneficiaryId]);

  const fetchTimeline = async () => {
    setLoading(true);
    const allEvents: TimelineEvent[] = [];

    try {
      // Enrollments
      const { data: enrollments } = await supabase
        .from('beneficiary_services')
        .select('id, enrolled_date, status, program:programs(name), project:projects(name)')
        .eq('beneficiary_id', beneficiaryId)
        .order('enrolled_date', { ascending: false });

      enrollments?.forEach((e: any) => {
        allEvents.push({
          id: `enroll-${e.id}`,
          date: e.enrolled_date || e.created_at,
          type: 'enrollment',
          title: `Enrolled in ${e.program?.name || 'Program'}`,
          description: e.project?.name ? `Project: ${e.project.name}` : `Status: ${e.status || 'Active'}`,
          icon: FolderKanban,
          color: 'text-info',
        });
      });

      // Donors/Funding
      const { data: donors } = await supabase
        .from('beneficiary_donors')
        .select('id, donor_name, amount_received, donation_date, program:programs(name)')
        .eq('beneficiary_id', beneficiaryId)
        .order('donation_date', { ascending: false });

      donors?.forEach((d: any) => {
        allEvents.push({
          id: `fund-${d.id}`,
          date: d.donation_date || '',
          type: 'funding',
          title: `Funding from ${d.donor_name}`,
          description: d.amount_received ? `KES ${d.amount_received.toLocaleString()} — ${d.program?.name || 'General'}` : d.program?.name || '',
          icon: DollarSign,
          color: 'text-success',
        });
      });

      // Progression history
      const { data: progressions } = await supabase
        .from('beneficiary_progression_history')
        .select('id, progression_date, previous_grade, new_grade, previous_academic_level, new_academic_level, progression_type')
        .eq('beneficiary_id', beneficiaryId)
        .order('progression_date', { ascending: false });

      progressions?.forEach((p: any) => {
        allEvents.push({
          id: `prog-${p.id}`,
          date: p.progression_date,
          type: 'progression',
          title: `Academic ${p.progression_type || 'Progression'}`,
          description: `${p.previous_grade || '?'} → ${p.new_grade || '?'}${p.new_academic_level ? ` (${p.new_academic_level})` : ''}`,
          icon: GraduationCap,
          color: 'text-warning',
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
          type: 'upload',
          title: `Document uploaded: ${u.document_name}`,
          description: u.document_type || 'File',
          icon: Upload,
          color: 'text-muted-foreground',
        });
      });

      // Observations
      const { data: observations } = await supabase
        .from('program_observations')
        .select('id, observation_date, category, notes, program:programs(name)')
        .eq('beneficiary_id', beneficiaryId)
        .order('observation_date', { ascending: false });

      observations?.forEach((o: any) => {
        allEvents.push({
          id: `obs-${o.id}`,
          date: o.observation_date,
          type: 'observation',
          title: `Observation: ${o.category || 'General'}`,
          description: o.notes?.substring(0, 80) || o.program?.name || '',
          icon: MessageSquare,
          color: 'text-primary',
        });
      });

      // Sort by date descending
      allEvents.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
      setEvents(allEvents);
    } catch (err) {
      console.error('Timeline fetch error:', err);
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
      <Card className="border-muted">
        <CardContent className="py-12 text-center text-muted-foreground">
          <Clock className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p>No activity recorded yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/10">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          Activity Timeline
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative pl-6 border-l-2 border-border space-y-6">
          {events.map((event) => {
            const Icon = event.icon;
            return (
              <div key={event.id} className="relative">
                <div className={`absolute -left-[calc(1.5rem+1px)] top-0.5 h-6 w-6 rounded-full bg-background border-2 border-border flex items-center justify-center`}>
                  <Icon className={`h-3 w-3 ${event.color}`} />
                </div>
                <div className="ml-2">
                  <p className="text-sm font-medium text-foreground">{event.title}</p>
                  {event.description && (
                    <p className="text-xs text-muted-foreground mt-0.5">{event.description}</p>
                  )}
                  <p className="text-xs text-muted-foreground/60 mt-1">
                    {event.date ? new Date(event.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'Date unknown'}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

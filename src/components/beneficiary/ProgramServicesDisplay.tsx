import { useQuery } from '@tanstack/react-query';
import { FolderKanban, ChevronRight, Calendar, CheckCircle2, XCircle, Clock, ArrowUpRight, HandHeart } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { useNavigate } from 'react-router-dom';

interface ProgramEnrollment {
  id: string;
  program_id: string;
  project_id: string | null;
  enrolled_date: string | null;
  exit_date: string | null;
  status: string;
  notes: string | null;
  sponsor_donor_id?: string | null;
  sponsor_name?: string | null;
  sponsorship_amount?: number | null;
  sponsorship_currency?: string | null;
  sponsorship_start_date?: string | null;
  sponsorship_end_date?: string | null;
  sponsorship_status?: string | null;
  programs: {
    id: string;
    name: string;
    description: string | null;
  } | null;
  projects: {
    id: string;
    name: string;
  } | null;
}

interface ProgramServicesDisplayProps {
  beneficiaryId: string;
}

export function ProgramServicesDisplay({ beneficiaryId }: ProgramServicesDisplayProps) {
  const { currentOrganization } = useOrganization();
  const navigate = useNavigate();

  const { data: enrollments = [], isLoading } = useQuery({
    queryKey: ['beneficiary-enrollments', beneficiaryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('beneficiary_services')
        .select(`
          id,
          program_id,
          project_id,
          enrolled_date,
          exit_date,
          status,
          notes,
          sponsor_donor_id,
          sponsor_name,
          sponsorship_amount,
          sponsorship_currency,
          sponsorship_start_date,
          sponsorship_end_date,
          sponsorship_status,
          programs:program_id (
            id,
            name,
            description
          ),
          projects:project_id (
            id,
            name
          )
        `)
        .eq('beneficiary_id', beneficiaryId)
        .order('enrolled_date', { ascending: false });

      if (error) throw error;
      return (data || []) as ProgramEnrollment[];
    },
    enabled: !!beneficiaryId,
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle2 className="h-4 w-4 text-primary" />;
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-secondary-foreground" />;
      case 'dropped':
        return <XCircle className="h-4 w-4 text-destructive" />;
      case 'transferred':
        return <ArrowUpRight className="h-4 w-4 text-accent-foreground" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadgeVariant = (status: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (status) {
      case 'active':
        return 'default';
      case 'completed':
        return 'secondary';
      case 'dropped':
        return 'destructive';
      default:
        return 'outline';
    }
  };


  const getFundingBadge = (enrollment: ProgramEnrollment) => {
    const hasSponsor = !!(enrollment.sponsor_donor_id || enrollment.sponsor_name);
    const hasProgramme = !!enrollment.program_id;
    if (hasSponsor && hasProgramme) return { label: 'Mixed', variant: 'warning' as const };
    if (hasSponsor) return { label: 'Individually sponsored', variant: 'success' as const };
    return { label: 'Programme funded', variant: 'info' as const };
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground mt-2">Loading enrollments...</p>
        </CardContent>
      </Card>
    );
  }

  if (enrollments.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <FolderKanban className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
          <p className="text-muted-foreground">No program enrollments</p>
          <p className="text-sm text-muted-foreground">
            This beneficiary is not enrolled in any programs yet
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <FolderKanban className="h-5 w-5" />
          Program Enrollments
        </h3>
        <Badge variant="secondary">{enrollments.length} program(s)</Badge>
      </div>

      {enrollments.map((enrollment) => {
        const funding = getFundingBadge(enrollment);
        return (
        <Card key={enrollment.id} className="hover:border-primary/50 transition-colors">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  {getStatusIcon(enrollment.status)}
                  <h4 className="font-medium">
                    {enrollment.programs?.name || 'Unknown Program'}
                  </h4>
                  <Badge variant={funding.variant}>{funding.label}</Badge>
                </div>
                
                {enrollment.projects && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <ChevronRight className="h-3 w-3" />
                    Project: {enrollment.projects.name}
                  </p>
                )}

                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  {enrollment.enrolled_date && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Enrolled: {new Date(enrollment.enrolled_date).toLocaleDateString()}
                    </span>
                  )}
                  {enrollment.exit_date && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Exit: {new Date(enrollment.exit_date).toLocaleDateString()}
                    </span>
                  )}
                </div>

                {(enrollment.sponsor_donor_id || enrollment.sponsor_name) && (
                  <div className="mt-2 rounded-lg bg-secondary/60 p-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1 font-medium text-foreground"><HandHeart className="h-3.5 w-3.5 text-primary" />{enrollment.sponsor_name || 'Individual sponsor'}</div>
                    <div>{[enrollment.sponsorship_amount ? `${enrollment.sponsorship_currency || ''} ${enrollment.sponsorship_amount}`.trim() : null, enrollment.sponsorship_start_date ? `Start ${new Date(enrollment.sponsorship_start_date).toLocaleDateString()}` : null, enrollment.sponsorship_status || null].filter(Boolean).join(' · ')}</div>
                  </div>
                )}

                {enrollment.notes && (
                  <p className="text-sm text-muted-foreground mt-2">{enrollment.notes}</p>
                )}
              </div>

              <Badge variant={getStatusBadgeVariant(enrollment.status)} className="capitalize">
                {enrollment.status}
              </Badge>
            </div>
          </CardContent>
        </Card>
        );
      })}
    </div>
  );
}

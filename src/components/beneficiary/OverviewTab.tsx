import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FolderKanban, DollarSign, MessageSquare, Users, Heart, GraduationCap, Building2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { FundingCoverageBar } from './FundingCoverageBar';
import { useBeneficiaryCoverage } from '@/hooks/useSponsorshipCoverage';

interface OverviewTabProps {
  beneficiaryId: string;
  beneficiary: any;
  guardians: any[];
  donors: any[];
}

export function OverviewTab({ beneficiaryId, beneficiary, guardians, donors }: OverviewTabProps) {
  const [enrollmentCount, setEnrollmentCount] = useState(0);
  const [observationCount, setObservationCount] = useState(0);
  const { data: coverages = [] } = useBeneficiaryCoverage(beneficiaryId);

  useEffect(() => {
    fetchCounts();
  }, [beneficiaryId]);

  const fetchCounts = async () => {
    const [{ count: enrollments }, { count: observations }] = await Promise.all([
      supabase.from('beneficiary_services').select('*', { count: 'exact', head: true }).eq('beneficiary_id', beneficiaryId),
      supabase.from('program_observations').select('*', { count: 'exact', head: true }).eq('beneficiary_id', beneficiaryId),
    ]);
    setEnrollmentCount(enrollments || 0);
    setObservationCount(observations || 0);
  };

  const totalFunding = donors.reduce((sum, d) => sum + (d.amount_received || 0), 0);
  
  // Use coverage data if available, otherwise fall back to simple totals
  const hasCoverage = coverages.length > 0;
  const totalRequired = hasCoverage ? coverages.reduce((s, c) => s + c.totalRequired, 0) : undefined;
  const totalReceived = hasCoverage ? coverages.reduce((s, c) => s + c.totalReceived, 0) : totalFunding;
  const fundingGap = hasCoverage ? coverages.reduce((s, c) => s + c.gap, 0) : 0;

  return (
    <div className="space-y-4">
      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-primary/20">
          <CardContent className="p-4 text-center">
            <FolderKanban className="h-5 w-5 text-primary mx-auto mb-1" />
            <p className="text-2xl font-bold text-foreground">{enrollmentCount}</p>
            <p className="text-xs text-muted-foreground">Programs Enrolled</p>
          </CardContent>
        </Card>
        <Card className="border-success/20">
          <CardContent className="p-4 text-center">
            <DollarSign className="h-5 w-5 text-success mx-auto mb-1" />
            <p className="text-2xl font-bold text-foreground">KES {totalFunding.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Total Funding</p>
          </CardContent>
        </Card>
        <Card className="border-info/20">
          <CardContent className="p-4 text-center">
            <MessageSquare className="h-5 w-5 text-info mx-auto mb-1" />
            <p className="text-2xl font-bold text-foreground">{observationCount}</p>
            <p className="text-xs text-muted-foreground">Observations</p>
          </CardContent>
        </Card>
        <Card className="border-warning/20">
          <CardContent className="p-4 text-center">
            <Users className="h-5 w-5 text-warning mx-auto mb-1" />
            <p className="text-2xl font-bold text-foreground">{donors.length}</p>
            <p className="text-xs text-muted-foreground">Donors</p>
          </CardContent>
        </Card>
      </div>

      {/* Funding Coverage */}
      {(donors.length > 0 || hasCoverage) && (
        <Card className="border-primary/10">
          <CardContent className="p-5">
            <FundingCoverageBar totalReceived={totalReceived} totalRequired={totalRequired} />
          </CardContent>
        </Card>
      )}

      {/* Coverage status badges per program */}
      {hasCoverage && (
        <div className="flex flex-wrap gap-2">
          {coverages.map(c => (
            <Badge
              key={c.programId}
              className={
                c.status === 'fully_funded' ? 'bg-success/20 text-success border-success/30' :
                c.status === 'partially_funded' ? 'bg-warning/20 text-warning border-warning/30' :
                'bg-destructive/20 text-destructive border-destructive/30'
              }
            >
              {c.programName}: {c.status === 'fully_funded' ? '🟢' : c.status === 'partially_funded' ? '🟡' : '🔴'} {c.coverage}%
            </Badge>
          ))}
        </div>
      )}

      {/* Basic Info Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Personal Info */}
        <Card className="border-muted">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Personal Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {beneficiary.date_of_birth && (
              <div className="flex justify-between"><span className="text-muted-foreground">Date of Birth</span><span className="font-medium">{new Date(beneficiary.date_of_birth).toLocaleDateString()}</span></div>
            )}
            {beneficiary.gender && (
              <div className="flex justify-between"><span className="text-muted-foreground">Gender</span><span className="font-medium capitalize">{beneficiary.gender}</span></div>
            )}
            {beneficiary.religion && (
              <div className="flex justify-between"><span className="text-muted-foreground">Religion</span><span className="font-medium">{beneficiary.religion}</span></div>
            )}
            {beneficiary.county && (
              <div className="flex justify-between"><span className="text-muted-foreground">County</span><span className="font-medium">{beneficiary.county}</span></div>
            )}
            {beneficiary.sub_county && (
              <div className="flex justify-between"><span className="text-muted-foreground">Sub-County</span><span className="font-medium">{beneficiary.sub_county}</span></div>
            )}
            {beneficiary.estate_village && (
              <div className="flex justify-between"><span className="text-muted-foreground">Estate/Village</span><span className="font-medium">{beneficiary.estate_village}</span></div>
            )}
            {beneficiary.hobbies && (
              <div className="flex justify-between"><span className="text-muted-foreground">Hobbies</span><span className="font-medium">{beneficiary.hobbies}</span></div>
            )}
            {beneficiary.future_ambition && (
              <div className="flex justify-between"><span className="text-muted-foreground">Ambition</span><span className="font-medium">{beneficiary.future_ambition}</span></div>
            )}
          </CardContent>
        </Card>

        {/* Guardians (if student) */}
        {beneficiary.beneficiary_type === 'student' && guardians.length > 0 && (
          <Card className="border-muted">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Guardians</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {guardians.map((g) => (
                <div key={g.id} className="flex items-center gap-3 p-2 rounded-md bg-muted/30">
                  <Heart className="h-4 w-4 text-primary shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{g.full_name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{g.relationship} · {g.phone || 'No phone'}</p>
                  </div>
                  <Badge variant="secondary" className="ml-auto text-xs shrink-0">
                    {g.is_alive ? 'Alive' : 'Deceased'}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Academic Summary (students) */}
        {beneficiary.beneficiary_type === 'student' && (
          <Card className="border-muted">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Academic Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Level</span><span className="font-medium">{beneficiary.academic_level || '-'}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Grade</span><span className="font-medium">{beneficiary.grade || '-'}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Institution</span><span className="font-medium">{beneficiary.institution_name || '-'}</span></div>
              {beneficiary.course_name && (
                <div className="flex justify-between"><span className="text-muted-foreground">Course</span><span className="font-medium">{beneficiary.course_name}</span></div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Background Narrative */}
        {beneficiary.background_narrative && (
          <Card className="border-muted md:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Background</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-foreground whitespace-pre-wrap">{beneficiary.background_narrative}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

import { logger } from "@/lib/logger";
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit2, Trash2, GraduationCap, Users, MapPin, Building2, Heart, Loader2, FolderKanban, MessageSquare, FileText, Clock, Printer, ChevronRight, Home, User, Pencil, UsersRound, Check, X, AlertTriangle, Camera, Shield, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { useOrganization } from '@/hooks/useOrganization';
import { useBeneficiaryTerminology } from '@/hooks/useBeneficiaryTerminology';
import { useOrgBeneficiaryConfig } from '@/hooks/useOrgBeneficiaryConfig';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { BeneficiaryEnrollmentForm } from '@/components/beneficiary/BeneficiaryEnrollmentForm';
import { BeneficiaryForm } from '@/components/beneficiary/BeneficiaryForm';
import { BeneficiaryAcademicsTab } from '@/components/beneficiary/BeneficiaryAcademicsTab';
import { BeneficiaryUploadsTab } from '@/components/beneficiary/BeneficiaryUploadsTab';
import { ProgramObservations } from '@/components/programs/ProgramObservations';
import { generateBeneficiaryReport } from '@/lib/beneficiaryReportGenerator';
import { formatDisplayDate } from '@/lib/dateUtils';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { AcademicProgressionInfo } from '@/components/beneficiary/AcademicProgressionInfo';
import { ActivityTimeline } from '@/components/beneficiary/ActivityTimeline';
import { BeneficiaryRiskPanel } from '@/components/beneficiary/BeneficiaryRiskPanel';
import { RelationshipsTab } from '@/components/beneficiary/RelationshipsTab';
import { OutOfSystemContacts } from '@/components/beneficiary/OutOfSystemContacts';
import { ProfileCompletenessMeter } from '@/components/beneficiary/ProfileCompletenessMeter';
import { PhotoUploadButton } from '@/components/beneficiary/PhotoUploadButton';
import { useFieldVisibility } from '@/hooks/useFieldVisibility';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Beneficiary {
  id: string;
  beneficiary_type: 'student' | 'adult' | 'group';
  display_name: string;
  first_name: string | null;
  middle_name: string | null;
  last_name: string | null;
  group_name: string | null;
  date_of_birth: string | null;
  gender: string | null;
  photo_url: string | null;
  status: string;
  is_active?: boolean | null;
  beneficiary_category?: 'individual' | 'household' | 'group' | 'organisation' | null;
  primary_need?: string | null;
  vulnerability_level?: string | null;
  vulnerability_tags?: string[] | null;
  registration_source?: string | null;
  consent_given?: boolean | null;
  consent_date?: string | null;
  household_size?: number | null;
  household_id?: string | null;
  occupation?: string | null;
  income_level?: string | null;
  marital_status?: string | null;
  disability_status?: string | null;
  location: string | null;
  county: string | null;
  sub_county: string | null;
  estate_village: string | null;
  home_county: string | null;
  academic_level: string | null;
  grade: string | null;
  institution_name: string | null;
  course_name: string | null;
  student_id_number: string | null;
  year_enrolled: number | null;
  member_count: number | null;
  group_schedule: string | null;
  group_activities: string[] | null;
  leader_name: string | null;
  leader_phone: string | null;
  source_of_income: string | null;
  amount_given: number | null;
  hiv_status: string | null;
  hiv_positive_since: number | null;
  has_special_needs: boolean | null;
  special_needs_details: string | null;
  other_medical_conditions: string | null;
  hobbies: string | null;
  future_ambition: string | null;
  religion: string | null;
  background_narrative: string | null;
  background_image_url: string | null;
  inactive_date: string | null;
  inactive_reason: string | null;
  updated_at?: string | null;
  created_at: string;
}

interface Guardian {
  id: string;
  full_name: string;
  guardian_type: string;
  phone: string | null;
  email: string | null;
  is_alive: boolean | null;
  employment_type: string | null;
  source_of_income: string | null;
  relationship: string;
  national_id: string | null;
  age: number | null;
  date_of_birth: string | null;
  address: string | null;
  employment_details: string | null;
  date_of_death: string | null;
}

interface Donor {
  id: string;
  donor_name: string;
  amount_received: number | null;
  donation_date: string | null;
  notes: string | null;
  program_id: string | null;
  program?: { name: string } | null;
}

export default function BeneficiaryProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const { currentOrganization } = useOrganization();
  const { term, termPlural } = useBeneficiaryTerminology();
  const { config: orgConfig } = useOrgBeneficiaryConfig();
  
  const [beneficiary, setBeneficiary] = useState<Beneficiary | null>(null);
  const [guardians, setGuardians] = useState<Guardian[]>([]);
  const [donors, setDonors] = useState<Donor[]>([]);
  const [dependants, setDependants] = useState<any[]>([]);
  const [siblings, setSiblings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [activeTab, setActiveTab] = useState('programmes');
  const [editOpen, setEditOpen] = useState(false);
  const [showAllVulnerabilityTags, setShowAllVulnerabilityTags] = useState(false);

  // Quick stats
  const [enrollmentCount, setEnrollmentCount] = useState(0);
  const [attendanceCount, setAttendanceCount] = useState(0);
  const [earliestEnrollDate, setEarliestEnrollDate] = useState<string | null>(null);
  const [lastVisitDate, setLastVisitDate] = useState<string | null>(null);
  const [overallStatus, setOverallStatus] = useState<'Good' | 'Review' | 'Critical'>('Good');

  const visibility = useFieldVisibility(beneficiary?.date_of_birth ?? null, orgConfig as any);

  const fetchQuickStats = useCallback(async () => {
    if (!id) return;
    const [
      { count: enroll },
      { count: attend },
      { data: earliest },
      { data: riskData },
      { data: recentVisits },
    ] = await Promise.all([
      supabase.from('beneficiary_services').select('*', { count: 'exact', head: true }).eq('beneficiary_id', id).eq('status', 'active'),
      supabase.from('activity_attendance').select('*', { count: 'exact', head: true }).eq('beneficiary_id', id),
      supabase.from('beneficiary_services').select('enrolled_date').eq('beneficiary_id', id).order('enrolled_date', { ascending: true }).limit(1),
      supabase.from('beneficiary_risk_scores').select('overall_risk_level').eq('beneficiary_id', id).order('assessment_date', { ascending: false }).limit(1),
      supabase.from('beneficiary_visitations').select('visit_date').eq('beneficiary_id', id).order('visit_date', { ascending: false }).limit(1),
    ]);
    setEnrollmentCount(enroll || 0);
    setAttendanceCount(attend || 0);
    setEarliestEnrollDate(earliest?.[0]?.enrolled_date || null);
    setLastVisitDate(recentVisits?.[0]?.visit_date || null);

    // Derive overall status from risk score + visitation recency + beneficiary status
    const riskLevel = riskData?.[0]?.overall_risk_level;
    const lastVisitDate = recentVisits?.[0]?.visit_date;
    const daysSinceVisit = lastVisitDate ? Math.floor((Date.now() - new Date(lastVisitDate).getTime()) / 86400000) : null;

    if (beneficiary?.status !== 'active' || riskLevel === 'high' || riskLevel === 'critical') {
      setOverallStatus('Critical');
    } else if (riskLevel === 'medium' || (daysSinceVisit !== null && daysSinceVisit > 90) || (enroll || 0) === 0) {
      setOverallStatus('Review');
    } else {
      setOverallStatus('Good');
    }
  }, [id, beneficiary?.status]);

  // Real-time subscription for live stat updates
  useEffect(() => {
    if (!id) return;
    const channel = supabase
      .channel(`profile-stats-${id}`)
      .on('postgres_changes' as any, { event: '*', schema: 'public', table: 'beneficiary_services', filter: `beneficiary_id=eq.${id}` }, () => fetchQuickStats())
      .on('postgres_changes' as any, { event: '*', schema: 'public', table: 'activity_attendance', filter: `beneficiary_id=eq.${id}` }, () => fetchQuickStats())
      .on('postgres_changes' as any, { event: '*', schema: 'public', table: 'beneficiary_risk_scores', filter: `beneficiary_id=eq.${id}` }, () => fetchQuickStats())
      .on('postgres_changes' as any, { event: '*', schema: 'public', table: 'beneficiary_visitations', filter: `beneficiary_id=eq.${id}` }, () => fetchQuickStats())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id, fetchQuickStats]);

  useEffect(() => {
    if (id && currentOrganization?.organization_id) {
      fetchBeneficiaryData();
    }
  }, [id, currentOrganization?.organization_id]);

  useEffect(() => {
    if (id) fetchQuickStats();
  }, [id, fetchQuickStats]);

  const fetchBeneficiaryData = async () => {
    if (!id) return;
    setLoading(true);
    
    try {
      const { data: beneficiaryData, error: beneficiaryError } = await supabase
        .from('beneficiaries')
        .select('*')
        .eq('id', id)
        .eq('organization_id', currentOrganization?.organization_id)
        .single();

      if (beneficiaryError) throw beneficiaryError;
      setBeneficiary(beneficiaryData as Beneficiary);

      const { data: guardiansData } = await supabase
        .from('beneficiary_guardians')
        .select(
          `id, relationship, guardians (id, full_name, guardian_type, phone, email, is_alive, employment_type, source_of_income, national_id, age, date_of_birth, address, employment_details, date_of_death)`,
        )
        .eq('beneficiary_id', id);

      if (guardiansData) {
        setGuardians(guardiansData.map((g: any) => ({ ...g.guardians, relationship: g.relationship })));
      }

      const { data: donorsData } = await supabase
        .from('beneficiary_donors')
        .select('*, program:programs(name)')
        .eq('beneficiary_id', id);

      if (donorsData) setDonors(donorsData);

      if (beneficiaryData.beneficiary_type === 'student') {
        const { data: siblingsData } = await supabase
          .from('beneficiary_siblings')
          .select('*, sibling:sibling_id(id, display_name, beneficiary_type, gender, status, photo_url, institution_name, grade)')
          .eq('beneficiary_id', id);

        if (siblingsData) {
          setSiblings(siblingsData.map((s: any) => ({ ...s.sibling, relationship: s.relationship })));
        }
      }

      if (beneficiaryData.beneficiary_type === 'adult') {
        const { data: dependantsData } = await supabase
          .from('adult_dependants')
          .select('*, student:student_id(id, display_name, beneficiary_type, gender, status, photo_url, institution_name, grade)')
          .eq('adult_id', id);

        if (dependantsData) {
          setDependants(dependantsData.map((d: any) => d.student).filter(Boolean));
        }
      }
    } catch (error) {
      logger.error('Error fetching beneficiary:', error);
      toast({ title: "Error", description: "Failed to load beneficiary details", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    try {
      const { error } = await supabase.from('beneficiaries').update({ deleted_at: new Date().toISOString() } as any).eq('id', id).eq('organization_id', currentOrganization?.organization_id);
      if (error) throw error;
      toast({ title: "Success", description: `${term} deleted successfully` });
      navigate('/beneficiaries');
    } catch (error) {
      logger.error('Error deleting beneficiary:', error);
      toast({ title: "Error", description: `Failed to delete ${term.toLowerCase()}`, variant: "destructive" });
    }
  };

  const handleEdit = () => {
    if (!beneficiary) return;
    setEditOpen(true);
  };

  const handleEditSuccess = async () => {
    await fetchBeneficiaryData();
    setEditOpen(false);
  };

  const handleDownloadReport = async () => {
    if (!beneficiary) return;
    setGeneratingReport(true);
    try {
      await generateBeneficiaryReport({
        beneficiary, guardians, donors, academics: [],
        organizationName: currentOrganization?.organization_name || 'Organization',
      });
      toast({ title: "Success", description: "Report downloaded successfully" });
    } catch (error) {
      logger.error('Error generating report:', error);
      toast({ title: "Error", description: "Failed to generate report", variant: "destructive" });
    } finally {
      setGeneratingReport(false);
    }
  };

  const calculateAge = (birthDate: string | null) => {
    if (!birthDate) return null;
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  };

  const getInitials = (name: string) => name.split(' ').map(n => n.charAt(0)).join('').toUpperCase().slice(0, 2);

  const getLastVisitLabel = () => {
    if (!lastVisitDate) return '—';
    const days = Math.floor((Date.now() - new Date(lastVisitDate).getTime()) / 86400000);
    if (days <= 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 30) return `${days}d ago`;
    if (days < 365) return `${Math.floor(days / 30)}mo ago`;
    return `${(days / 365).toFixed(1)}y ago`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!beneficiary) {
    return (
      <div className="text-center py-12">
        <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium text-foreground">{term} not found</h3>
        <Button variant="outline" onClick={() => navigate('/beneficiaries')} className="mt-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to {termPlural}
        </Button>
      </div>
    );
  }

  const age = calculateAge(beneficiary.date_of_birth);
  const category = beneficiary.beneficiary_category || (beneficiary.beneficiary_type === 'group' ? 'group' : 'individual');
  const CategoryIcon = category === 'household' ? Home : category === 'group' ? Users : category === 'organisation' ? Building2 : User;
  const statusLabel = beneficiary.inactive_date ? 'Exited' : beneficiary.is_active === false || beneficiary.status !== 'active' ? 'Inactive' : 'Active';
  const vulnerabilityTags = beneficiary.vulnerability_tags || [];
  const familyMembers = [...guardians.map(g => ({ ...g, _type: 'guardian' as const })), ...siblings.map(s => ({ ...s, _type: 'sibling' as const })), ...dependants.map(d => ({ ...d, _type: 'dependant' as const }))];
  const hasEducationData = !!(beneficiary.academic_level || beneficiary.grade || beneficiary.institution_name);
  const hasHealthData = !!(beneficiary.hiv_status || beneficiary.other_medical_conditions || beneficiary.has_special_needs);
  const hasEconomicData = !!(beneficiary.occupation || beneficiary.income_level || beneficiary.household_size || beneficiary.source_of_income);
  const isMinorAge = visibility.isMinor;
  const isTertiary = age !== null && age >= 18 && (beneficiary.academic_level || '').toLowerCase().includes('tertiary');

  // Profile completeness
  const completenessChecks = [
    { key: 'photo', label: 'Photo', ok: !!beneficiary.photo_url },
    { key: 'dob', label: 'Date of birth', ok: !!beneficiary.date_of_birth },
    { key: 'gender', label: 'Gender', ok: !!beneficiary.gender },
    { key: 'county', label: 'County', ok: !!beneficiary.county },
    { key: 'sub_county', label: 'Sub-county', ok: !!beneficiary.sub_county },
    { key: 'village', label: 'Village', ok: !!beneficiary.estate_village },
    { key: 'primary_need', label: 'Primary need', ok: !!beneficiary.primary_need },
    { key: 'vulnerability_level', label: 'Vulnerability level', ok: !!beneficiary.vulnerability_level },
    { key: 'consent', label: 'Consent', ok: !!beneficiary.consent_given },
    { key: 'tags', label: 'Vulnerability tags', ok: vulnerabilityTags.length > 0 },
    { key: 'programmes', label: 'Programme enrolment', ok: enrollmentCount > 0 },
    ...(orgConfig.collect_education_data ? [{ key: 'academic_level', label: 'Academic level', ok: !!beneficiary.academic_level }] : []),
    ...(isMinorAge ? [{ key: 'guardian', label: 'Guardian / contact', ok: guardians.length > 0 }] : [{ key: 'phone', label: 'Phone', ok: !!(beneficiary as any).phone }, { key: 'nat_id', label: 'National ID', ok: !!(beneficiary as any).national_id }]),
  ];
  const completePct = Math.round((completenessChecks.filter(c => c.ok).length / completenessChecks.length) * 100 / 5) * 5;
  const missingFields = completenessChecks.filter(c => !c.ok).map(c => c.label);
  const pctColour = completePct >= 80 ? '#1D9E8A' : completePct >= 60 ? '#B45309' : '#BE185D';

  // Days since last visit
  const daysSinceVisit = lastVisitDate ? Math.floor((Date.now() - new Date(lastVisitDate).getTime()) / 86400000) : null;
  const visitColour = daysSinceVisit === null ? '#A8A29E' : daysSinceVisit <= 30 ? '#1D9E8A' : daysSinceVisit <= 90 ? '#B45309' : '#BE185D';
  const visitLabel = daysSinceVisit === null ? 'Never' : daysSinceVisit <= 0 ? 'Today' : daysSinceVisit === 1 ? '1d' : daysSinceVisit < 30 ? `${daysSinceVisit}d` : daysSinceVisit < 365 ? `${Math.floor(daysSinceVisit / 30)}mo` : `${(daysSinceVisit / 365).toFixed(1)}y`;

  // Overall status badge
  const computedStatus = beneficiary.inactive_date ? { label: 'Exited', colour: '#78716C' }
    : (beneficiary.vulnerability_level === 'high' || beneficiary.vulnerability_level === 'critical') ? { label: 'High risk', colour: '#BE185D' }
    : (daysSinceVisit !== null && daysSinceVisit > 90) ? { label: 'Overdue', colour: '#B45309' }
    : (enrollmentCount === 0 && (Date.now() - new Date(beneficiary.created_at).getTime()) / 86400000 < 30) ? { label: 'New', colour: '#1D4ED8' }
    : { label: 'Good', colour: '#1D9E8A' };

  const tabs = [
    { value: 'programmes', label: 'Programmes', icon: FolderKanban, show: true, legacy: false },
    { value: 'academics', label: 'Education', icon: GraduationCap, show: orgConfig.collect_education_data && (isMinorAge || isTertiary || hasEducationData), legacy: !orgConfig.collect_education_data && hasEducationData },
    { value: 'health', label: 'Health', icon: Heart, show: orgConfig.collect_health_data || hasHealthData, legacy: !orgConfig.collect_health_data && hasHealthData },
    { value: 'economic', label: 'Economic', icon: Building2, show: (orgConfig.collect_economic_data && !isMinorAge) || hasEconomicData, legacy: !orgConfig.collect_economic_data && hasEconomicData },
    { value: 'history-risk', label: 'History & Risk', icon: Clock, show: true, legacy: false },
    { value: 'documents', label: 'Documents', icon: FileText, show: true, legacy: false },
    { value: 'notes', label: 'Notes', icon: MessageSquare, show: true, legacy: false },
  ].filter(tab => tab.show);

  // Personal details rows (age-aware)
  const personalRows: [string, any][] = [
    ['Date of birth', beneficiary.date_of_birth ? `${formatDisplayDate(beneficiary.date_of_birth)} · ${age} yrs` : null],
    ['Gender', beneficiary.gender],
    ...(orgConfig.collect_religion ? [['Religion', beneficiary.religion]] as [string, any][] : []),
    ...(!isMinorAge ? [
      ['Marital status', beneficiary.marital_status],
      ['Phone', (beneficiary as any).phone],
      ['National ID', (beneficiary as any).national_id],
    ] as [string, any][] : [
      ...((beneficiary as any).phone ? [['Phone', (beneficiary as any).phone]] as [string, any][] : []),
    ]),
    ...(!isMinorAge && !isTertiary && beneficiary.academic_level ? [['Highest education', beneficiary.academic_level]] as [string, any][] : []),
    ['Family status', (beneficiary as any).family_status],
  ];

  return (
    <div className="min-h-screen" style={{ background: '#FAFAF9', fontFamily: "'DM Sans', sans-serif", color: '#1C1917' }}>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-stack { display: block !important; }
          .bp-card { break-inside: avoid; background: white !important; }
        }
        .bp-name { font-family: 'Lora', serif; letter-spacing: -0.3px; }
        .bp-mono { font-family: 'DM Mono', monospace; }
        .bp-avatar-photo:hover .bp-camera-overlay { opacity: 1; }
      `}</style>
      <div className="max-w-[1200px] mx-auto px-4 py-4 space-y-4">
        {/* Back nav */}
        <button onClick={() => navigate('/beneficiaries')} className="no-print inline-flex items-center gap-1.5 text-[12px]" style={{ color: '#78716C' }}>
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to {termPlural}
        </button>

        {/* ─── HERO CARD ─── */}
        <div className="bp-card rounded-[20px] overflow-hidden" style={{ background: '#FFFEF9', border: '1px solid #E7E2DA', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          {/* Decorative band */}
          <div
            className="h-[88px] relative"
            style={{
              background: 'linear-gradient(135deg, #1C1917 0%, #292524 40%, #1C2A20 100%)',
            }}
          >
            <div className="absolute inset-0" style={{ background: 'radial-gradient(circle at 20% 30%, rgba(29,158,138,0.18), transparent 50%), radial-gradient(circle at 80% 60%, rgba(180,83,9,0.16), transparent 55%)' }} />
            <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.85) 1px, transparent 1px)', backgroundSize: '18px 18px', opacity: 0.06 }} />
          </div>

          {/* Hero body */}
          <div className="px-7 pb-[22px]">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4" style={{ marginTop: '-42px' }}>
              <div className="flex items-end gap-4 flex-1 min-w-0">
                {/* Avatar */}
                <div className="relative shrink-0 bp-avatar-photo group">
                  <div className="h-[82px] w-[82px] rounded-full overflow-hidden" style={{ border: '4px solid #FFFFFF', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>
                    {beneficiary.photo_url ? (
                      <img src={beneficiary.photo_url} alt={beneficiary.display_name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-white" style={{ background: 'linear-gradient(145deg, #B45309, #1D9E8A)', fontFamily: "'Lora', serif", fontSize: '28px', fontWeight: 600 }}>
                        {getInitials(beneficiary.display_name)}
                      </div>
                    )}
                  </div>
                  {/* Status indicator dot */}
                  <div
                    className="absolute bottom-0 right-0 h-[18px] w-[18px] rounded-full flex items-center justify-center text-white"
                    style={{
                      border: '2.5px solid #FFFFFF',
                      background: statusLabel === 'Active' ? '#1D9E8A' : statusLabel === 'Exited' ? '#78716C' : '#B45309',
                    }}
                  >
                    {statusLabel === 'Active' ? <Check className="h-2.5 w-2.5" strokeWidth={3} /> : statusLabel === 'Exited' ? <X className="h-2.5 w-2.5" strokeWidth={3} /> : <span className="text-[9px] font-bold">!</span>}
                  </div>
                  {currentOrganization?.organization_id && (
                    <div className="bp-camera-overlay no-print absolute inset-0 rounded-full flex items-center justify-center opacity-0 transition-opacity" style={{ background: 'rgba(0,0,0,0.45)' }}>
                      <PhotoUploadButton
                        beneficiaryId={beneficiary.id}
                        organizationId={currentOrganization.organization_id}
                        onUploaded={(url) => setBeneficiary(b => b ? { ...b, photo_url: url } : b)}
                      />
                    </div>
                  )}
                </div>

                {/* Name block */}
                <div className="pb-[6px] flex-1 min-w-0">
                  <h1 className="bp-name text-[24px] leading-tight" style={{ fontWeight: 600, color: '#1C1917' }}>{beneficiary.display_name}</h1>
                  <div className="flex items-center gap-[8px] flex-wrap mt-1">
                    <span className="bp-mono text-[11px]" style={{ color: '#A8A29E' }}>
                      {beneficiary.student_id_number || `UFN-${beneficiary.id.slice(0, 8).toUpperCase()}`}
                    </span>
                    {beneficiary.gender && <><span style={{ color: '#D6C9B5' }}>•</span><span className="text-[11px]" style={{ color: '#78716C' }}>{beneficiary.gender}</span></>}
                    <span style={{ color: '#D6C9B5' }}>•</span>
                    <span className="text-[11px]" style={{ color: '#78716C' }}>{age !== null ? `${age} years old` : 'Age unknown'}</span>
                    {beneficiary.county && <><span style={{ color: '#D6C9B5' }}>•</span><span className="text-[11px]" style={{ color: '#78716C' }}>{beneficiary.county}</span></>}
                    <span style={{ color: '#D6C9B5' }}>•</span>
                    <span className="text-[11px]" style={{ color: '#A8A29E' }}>Registered {formatDisplayDate(beneficiary.created_at)}</span>
                  </div>
                  {beneficiary.inactive_date && (
                    <div className="mt-2 inline-flex items-center px-2.5 py-1 rounded-[6px] text-[11px]" style={{ background: '#FDF2F8', color: '#831843' }}>
                      Exited {formatDisplayDate(beneficiary.inactive_date)}{beneficiary.inactive_reason ? ` · ${beneficiary.inactive_reason}` : ''}
                    </div>
                  )}
                </div>
              </div>

              {/* Action buttons */}
              <div className="no-print flex items-center gap-2 pb-[6px]">
                <button
                  onClick={handleDownloadReport}
                  disabled={generatingReport}
                  title="Print record"
                  className="h-[34px] w-[34px] rounded-[9px] flex items-center justify-center disabled:opacity-50"
                  style={{ background: '#FFFFFF', border: '1px solid #E7E2DA', color: '#44403C' }}
                >
                  {generatingReport ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Printer className="h-3.5 w-3.5" />}
                </button>
                <button
                  onClick={handleEdit}
                  className="inline-flex items-center gap-1.5 rounded-[9px] px-[14px] h-[34px] text-[13px]"
                  style={{ background: '#0F7B6C', color: '#FFFFFF', fontWeight: 500 }}
                >
                  <Edit2 className="h-3.5 w-3.5" />
                  Edit profile
                </button>
                {isAdmin && (
                  <button
                    onClick={() => setShowDeleteDialog(true)}
                    title="Delete"
                    className="h-[34px] w-[34px] rounded-[9px] flex items-center justify-center"
                    style={{ background: '#FFFFFF', border: '1px solid #E7E2DA', color: '#78716C' }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Pills row */}
            <div className="flex flex-wrap gap-1.5 mt-4 mb-4">
              <Pill bg={statusLabel === 'Active' ? '#E6F5F3' : statusLabel === 'Exited' ? '#E7E2DA' : '#F5F0E8'} fg={statusLabel === 'Active' ? '#0A5449' : '#44403C'} dot={statusLabel === 'Active' ? '#1D9E8A' : '#78716C'}>{statusLabel}</Pill>
              <Pill bg="#F5F0E8" fg="#44403C"><CategoryIcon className="h-3 w-3 mr-1 inline" />{isMinorAge ? 'Child beneficiary' : category === 'individual' ? 'Adult' : category[0].toUpperCase() + category.slice(1)}</Pill>
              {(beneficiary.county || beneficiary.sub_county) && <Pill bg="#FEF3CD" fg="#7A3A0A"><MapPin className="h-3 w-3 mr-1 inline" />{[beneficiary.county, beneficiary.sub_county].filter(Boolean).join(' · ')}</Pill>}
              {beneficiary.vulnerability_level && (
                <Pill
                  bg={beneficiary.vulnerability_level === 'critical' ? '#FDF2F8' : beneficiary.vulnerability_level === 'high' ? '#FDF2F8' : beneficiary.vulnerability_level === 'medium' ? '#FEF3CD' : '#E6F5F3'}
                  fg={beneficiary.vulnerability_level === 'critical' || beneficiary.vulnerability_level === 'high' ? '#831843' : beneficiary.vulnerability_level === 'medium' ? '#7A3A0A' : '#0A5449'}
                >
                  <span className="capitalize">{beneficiary.vulnerability_level}</span> vulnerability
                </Pill>
              )}
              {(beneficiary as any).family_status && /orphan|child-headed/i.test(String((beneficiary as any).family_status)) && (
                <Pill bg="#FDF2F8" fg="#831843" dot="#BE185D">{(beneficiary as any).family_status}</Pill>
              )}
              {vulnerabilityTags.slice(0, 3).map(t => <Pill key={t} bg="#FDF2F8" fg="#831843">{t}</Pill>)}
              {vulnerabilityTags.length > 3 && <Pill bg="#F5F0E8" fg="#78716C">+{vulnerabilityTags.length - 3}</Pill>}
            </div>

            {/* Completeness bar */}
            <div className="flex items-center gap-[10px]">
              <span className="text-[11px] flex-shrink-0" style={{ color: '#78716C' }}>Profile completeness</span>
              <div className="flex-1 h-[5px] rounded-full overflow-hidden" style={{ background: '#EDE5D8' }}>
                <div className="h-full transition-all" style={{ width: `${completePct}%`, background: '#0F7B6C' }} />
              </div>
              <span className="text-[11px] tabular-nums" style={{ color: pctColour, fontWeight: 500 }}>{completePct}%</span>
              {missingFields.length > 0 && (
                <span className="text-[11px] hidden md:inline truncate max-w-[260px]" style={{ color: '#A8A29E' }}>
                  Missing: {missingFields.slice(0, 2).join(', ')}{missingFields.length > 2 ? '…' : ''}
                </span>
              )}
            </div>

            {/* Quick stats row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 mt-4" style={{ borderTop: '1px solid #E7E2DA' }}>
              {[
                { label: 'Programmes', value: String(enrollmentCount), colour: '#1C1917' },
                { label: 'Activities', value: String(attendanceCount), colour: '#1C1917' },
                { label: 'Last visit', value: visitLabel, colour: visitColour },
                { label: 'Overall', value: computedStatus.label, colour: computedStatus.colour },
              ].map((s, i, arr) => (
                <div key={s.label} className="text-center py-[14px]" style={{ borderRight: i < arr.length - 1 ? '1px solid #E7E2DA' : 'none' }}>
                  <div className="tabular-nums" style={{ fontSize: '22px', fontWeight: 600, color: s.colour, fontFamily: s.label === 'Overall' ? "'DM Sans'" : "'DM Sans'" }}>{s.value}</div>
                  <div className="uppercase mt-[3px]" style={{ fontSize: '10px', letterSpacing: '0.4px', color: '#A8A29E' }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ─── TWO-COLUMN LAYOUT ─── */}
        <div className="grid grid-cols-1 md:grid-cols-[268px_1fr] gap-4 items-start print-stack">
          
          {/* ─── SIDEBAR ─── */}
          <aside className="flex flex-col gap-3 order-2 md:order-1">
            {/* Personal Details */}
            <SidebarCard
              icon={<div className="h-[22px] w-[22px] rounded-[6px] flex items-center justify-center" style={{ background: '#F5F0E8' }}><User className="h-3 w-3" style={{ color: '#44403C' }} /></div>}
              title="Personal details"
              onEdit={handleEdit}
            >
              {personalRows.map(([label, value]) => (
                <InfoRow key={label} label={label} value={value} mono={label === 'National ID' || label === 'Phone'} />
              ))}
              <div className="flex justify-between items-baseline py-[6px]" style={{ borderTop: '1px solid #EDE5D8', marginTop: '4px' }}>
                <span className="text-[11px]" style={{ color: '#78716C' }}>Consent</span>
                {beneficiary.consent_given ? (
                  <span className="text-[12px]" style={{ color: '#0A5449', fontWeight: 500 }}>✓ {beneficiary.consent_date ? formatDisplayDate(beneficiary.consent_date) : 'Recorded'}</span>
                ) : (
                  <button onClick={handleEdit} className="text-[12px]" style={{ color: '#B45309' }}>⚠ Record consent →</button>
                )}
              </div>
              {beneficiary.registration_source && (
                <div className="text-[10px] mt-2" style={{ color: '#A8A29E' }}>Registered via {beneficiary.registration_source}</div>
              )}
            </SidebarCard>

            {/* Location */}
            <SidebarCard
              icon={<div className="h-[22px] w-[22px] rounded-[6px] flex items-center justify-center" style={{ background: '#ECFDF5' }}><MapPin className="h-3 w-3" style={{ color: '#4D7C5A' }} /></div>}
              title="Location"
              onEdit={handleEdit}
            >
              {!beneficiary.county && !beneficiary.sub_county && !beneficiary.estate_village ? (
                <div className="text-center py-3">
                  <p className="text-[12px] italic" style={{ color: '#A8A29E' }}>Location not yet recorded</p>
                  <button onClick={handleEdit} className="text-[12px] mt-1.5" style={{ color: '#0F7B6C' }}>Add location →</button>
                </div>
              ) : (
                <>
                  <InfoRow label="County" value={beneficiary.county} />
                  <InfoRow label="Sub-county" value={beneficiary.sub_county} />
                  <InfoRow label="Village / Estate" value={beneficiary.estate_village} />
                  {(beneficiary as any).country && <InfoRow label="Country" value={(beneficiary as any).country} />}
                  {beneficiary.home_county && <InfoRow label="Home county" value={beneficiary.home_county} />}
                </>
              )}
            </SidebarCard>

            {/* Vulnerability */}
            <SidebarCard
              icon={<div className="h-[22px] w-[22px] rounded-[6px] flex items-center justify-center" style={{ background: '#FEF3CD' }}><Zap className="h-3 w-3" style={{ color: '#B45309' }} /></div>}
              title="Vulnerability"
              onEdit={handleEdit}
            >
              <div className="rounded-[10px] p-[12px_14px] mb-3" style={{ background: '#F5F0E8' }}>
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ background: beneficiary.vulnerability_level === 'critical' ? '#BE185D' : beneficiary.vulnerability_level === 'high' ? '#B45309' : beneficiary.vulnerability_level === 'medium' ? '#D4A04E' : beneficiary.vulnerability_level === 'low' ? '#1D9E8A' : '#A8A29E' }} />
                  <span className="text-[12px] capitalize" style={{ color: '#1C1917', fontWeight: 500 }}>{beneficiary.vulnerability_level ? `${beneficiary.vulnerability_level} vulnerability` : 'Not assessed'}</span>
                </div>
                {beneficiary.primary_need && (
                  <div className="mt-2 inline-flex items-center px-2 py-0.5 rounded-[5px] text-[11px]" style={{ background: '#EFF6FF', color: '#1E3A8A' }}>{beneficiary.primary_need}</div>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {vulnerabilityTags.length === 0 ? (
                  <span className="text-[11px] italic" style={{ color: '#A8A29E' }}>No vulnerability tags recorded</span>
                ) : vulnerabilityTags.map(t => (
                  <span key={t} className="text-[10px] px-2 py-0.5 rounded-[5px]" style={{ background: '#FDF2F8', color: '#831843' }}>{t}</span>
                ))}
              </div>
            </SidebarCard>

            {/* Family & Connections */}
            <SidebarCard
              icon={<div className="h-[22px] w-[22px] rounded-[6px] flex items-center justify-center" style={{ background: '#F5F0E8' }}><UsersRound className="h-3 w-3" style={{ color: '#44403C' }} /></div>}
              title="Family & connections"
              right={<button onClick={handleEdit} className="text-[11px]" style={{ color: '#0F7B6C' }}>+ Add</button>}
            >
              {siblings.length > 0 && (
                <>
                  <div className="text-[10px] uppercase mb-1.5" style={{ letterSpacing: '0.4px', color: '#A8A29E', fontWeight: 600 }}>In this system</div>
                  {siblings.map((s: any) => (
                    <div key={s.id} className="flex items-center gap-2.5 py-2" style={{ borderBottom: '1px solid #F5F0E8' }}>
                      <div className="h-9 w-9 rounded-full flex items-center justify-center text-white text-[11px]" style={{ background: 'linear-gradient(145deg, #B45309, #1D9E8A)', fontFamily: "'Lora', serif", fontWeight: 600 }}>{getInitials(s.display_name || '?')}</div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[12px] truncate" style={{ fontWeight: 500 }}>{s.display_name}</div>
                        <div className="text-[11px]" style={{ color: '#78716C' }}>{s.relationship || 'Sibling'}</div>
                      </div>
                      <button onClick={() => navigate(`/beneficiaries/${s.id}`)} className="text-[11px]" style={{ color: '#0F7B6C' }}>View →</button>
                    </div>
                  ))}
                </>
              )}
              {(guardians.length > 0 || isMinorAge) && (
                <>
                  <div className="text-[10px] uppercase mt-3 mb-1.5" style={{ letterSpacing: '0.4px', color: '#A8A29E', fontWeight: 600 }}>Parents / Guardians</div>
                  {guardians.length === 0 && isMinorAge && (
                    <div className="rounded-md p-3 text-[12px] text-center space-y-2" style={{ background: '#FEF3C7', color: '#92400E' }}>
                      <p>No parent or guardian recorded for this minor.</p>
                      <button
                        onClick={() => setEditOpen(true)}
                        className="text-[12px] font-medium underline"
                        style={{ color: '#0F7B6C' }}
                      >
                        Add guardian →
                      </button>
                    </div>
                  )}
                  {guardians.map((g) => {
                    const relLabel =
                      g.relationship ||
                      (g.guardian_type === 'father'
                        ? 'Father'
                        : g.guardian_type === 'mother'
                        ? 'Mother'
                        : 'Guardian');
                    return (
                      <div key={g.id} className="flex items-start gap-2.5 py-2" style={{ borderBottom: '1px solid #F5F0E8' }}>
                        <div className="h-9 w-9 rounded-full flex items-center justify-center shrink-0" style={{ background: '#EDE5D8' }}>
                          <User className="h-4 w-4" style={{ color: '#78716C' }} />
                        </div>
                        <div className="flex-1 min-w-0 space-y-0.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[12px] truncate" style={{ fontWeight: 600 }}>{g.full_name}</span>
                            <span
                              className="text-[10px] px-1.5 py-0.5 rounded-full"
                              style={
                                g.is_alive === false
                                  ? { background: '#FEE2E2', color: '#991B1B' }
                                  : { background: '#DCFCE7', color: '#166534' }
                              }
                            >
                              {g.is_alive === false ? 'Deceased' : 'Alive'}
                            </span>
                          </div>
                          <div className="text-[11px]" style={{ color: '#78716C' }}>{relLabel}</div>
                          {g.phone && (
                            <div className="text-[11px]" style={{ color: '#44403C' }}>📞 {g.phone}</div>
                          )}
                          {g.national_id && (
                            <div className="text-[11px]" style={{ color: '#78716C' }}>ID: {g.national_id}</div>
                          )}
                          {(g.employment_type || g.source_of_income) && (
                            <div className="text-[11px]" style={{ color: '#78716C' }}>
                              {[g.employment_type, g.source_of_income].filter(Boolean).join(' · ')}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
              {siblings.length === 0 && guardians.length === 0 && dependants.length === 0 && !isMinorAge && (
                <p className="text-[12px] italic text-center py-2" style={{ color: '#A8A29E' }}>No family connections recorded</p>
              )}
              {beneficiary.household_id && (
                <div className="flex items-center gap-2 mt-3 pt-3" style={{ borderTop: '1px solid #EDE5D8' }}>
                  <Home className="h-3.5 w-3.5" style={{ color: '#78716C' }} />
                  <button onClick={() => navigate(`/households/${beneficiary.household_id}`)} className="text-[12px] flex-1 text-left" style={{ color: '#0F7B6C' }}>View household →</button>
                </div>
              )}
              <div className="mt-3">
                <OutOfSystemContacts beneficiaryId={beneficiary.id} />
              </div>
            </SidebarCard>

            {/* Background */}
            {beneficiary.background_narrative && (
              <SidebarCard title="Background">
                <p className="text-[12px] leading-relaxed whitespace-pre-wrap" style={{ color: '#44403C' }}>{beneficiary.background_narrative}</p>
              </SidebarCard>
            )}
          </aside>

          {/* ─── MAIN CONTENT (Tabs) ─── */}
          <div className="order-1 md:order-2 bp-card rounded-[16px] overflow-hidden" style={{ background: '#FFFFFF', border: '1px solid #E7E2DA' }}>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              {/* Sand tab bar */}
              <div className="no-print rounded-[10px] p-[3px] flex gap-[2px] mx-4 mt-4 overflow-x-auto no-scrollbar" style={{ background: '#F5F0E8' }}>
                {tabs.map(tab => (
                  <button
                    key={tab.value}
                    onClick={() => setActiveTab(tab.value)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-[7px] px-[10px] rounded-[8px] text-[12px] whitespace-nowrap transition-all"
                    style={activeTab === tab.value
                      ? { background: '#FFFFFF', color: '#1C1917', fontWeight: 500, boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }
                      : { color: '#78716C' }
                    }
                  >
                    <tab.icon className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">{tab.label}</span>
                  </button>
                ))}
              </div>

              {/* TAB: Programmes */}
              <TabsContent value="programmes" className="mt-0 p-4 space-y-3">
                <BeneficiaryEnrollmentForm beneficiaryId={beneficiary.id} />
                <div className="pt-2">
                  <div className="text-[11px] uppercase mb-3" style={{ color: '#A8A29E', letterSpacing: '0.5px', fontWeight: 600 }}>Recent activity</div>
                  <ActivityTimeline beneficiaryId={beneficiary.id} />
                </div>
              </TabsContent>

              {/* TAB: History & Risk */}
              <TabsContent value="history-risk" className="mt-0 p-4 space-y-4">
                <RelationshipsTab beneficiary={beneficiary as any} />
                <div className="flex items-center gap-3 my-3">
                  <div className="flex-1 h-px" style={{ background: '#E7E2DA' }} />
                  <span className="text-[10px] uppercase" style={{ letterSpacing: '0.5px', color: '#A8A29E', fontWeight: 600 }}>Risk signals</span>
                  <div className="flex-1 h-px" style={{ background: '#E7E2DA' }} />
                </div>
                <BeneficiaryRiskPanel beneficiaryId={beneficiary.id} />
              </TabsContent>

              {/* TAB: Documents */}
              <TabsContent value="documents" className="mt-0 p-4">
                <BeneficiaryUploadsTab beneficiaryId={beneficiary.id} />
              </TabsContent>

              {/* TAB: Notes */}
              <TabsContent value="notes" className="mt-0 p-4 space-y-3">
                <ProgramObservations beneficiaryId={beneficiary.id} />
              </TabsContent>

              {tabs.some(t => t.value === 'health') && (
                <TabsContent value="health" className="mt-0 p-4 space-y-3">
                  {tabs.find(t => t.value === 'health')?.legacy && <div className="rounded-lg p-3 text-xs italic" style={{ background: '#FEF3CD', color: '#7A3A0A' }}>(historical data — not active for this organisation)</div>}
                  <div className="flex items-center justify-between">
                    <h3 className="text-[14px]" style={{ fontWeight: 600 }}>Health information</h3>
                    <span className="text-[10px] px-2 py-0.5 rounded-[5px]" style={{ background: '#FDF2F8', color: '#831843' }}>Private — not shared publicly</span>
                  </div>
                  <div>
                    <div className="text-[11px] mb-1.5" style={{ color: '#78716C' }}>Known allergies</div>
                    <div className="flex flex-wrap gap-1.5">{((beneficiary as any).allergies || []).length ? ((beneficiary as any).allergies || []).map((a: string) => <span key={a} className="text-[11px] px-2 py-0.5 rounded-[5px]" style={{ background: '#FDF2F8', color: '#831843' }}>{a}</span>) : <span className="text-[11px] italic" style={{ color: '#A8A29E' }}>None recorded</span>}</div>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-3 text-[12px]">
                    <div><div style={{ color: '#78716C' }}>Medical notes</div><div style={{ color: '#1C1917' }}>{beneficiary.other_medical_conditions || '—'}</div></div>
                    <div><div style={{ color: '#78716C' }}>Special needs</div><div style={{ color: '#1C1917' }}>{beneficiary.has_special_needs ? beneficiary.special_needs_details || 'Yes' : 'None'}</div></div>
                    {visibility.showHivStatus && (
                      <div className="sm:col-span-2 rounded-[8px] p-3" style={{ borderLeft: '3px solid #BE185D', background: '#FDF2F8' }}>
                        <div className="text-[11px]" style={{ color: '#831843' }}>HIV status — restricted access</div>
                        <div className="text-[13px]" style={{ color: '#1C1917', fontWeight: 500 }}>{beneficiary.hiv_status || 'Not recorded'}</div>
                      </div>
                    )}
                  </div>
                </TabsContent>
              )}

              {tabs.some(t => t.value === 'economic') && (
                <TabsContent value="economic" className="mt-0 p-4 space-y-3">
                  {tabs.find(t => t.value === 'economic')?.legacy && <div className="rounded-lg p-3 text-xs italic" style={{ background: '#FEF3CD', color: '#7A3A0A' }}>(historical data — not active for this organisation)</div>}
                  <h3 className="text-[14px]" style={{ fontWeight: 600 }}>Economic profile</h3>
                  <div className="grid sm:grid-cols-2 gap-3 text-[12px]">
                    <div><div style={{ color: '#78716C' }}>Occupation</div><div>{beneficiary.occupation || '—'}</div></div>
                    <div><div style={{ color: '#78716C' }}>Income level</div><div>{beneficiary.income_level || '—'}</div></div>
                    <div><div style={{ color: '#78716C' }}>Household size</div><div>{beneficiary.household_size || '—'}</div></div>
                    <div><div style={{ color: '#78716C' }}>Income source</div><div>{beneficiary.source_of_income || '—'}</div></div>
                  </div>
                </TabsContent>
              )}

              {/* TAB: Education */}
              {tabs.some(t => t.value === 'academics') && (
                <TabsContent value="academics" className="mt-0 p-4 space-y-3">
                  {tabs.find(t => t.value === 'academics')?.legacy && <div className="rounded-lg p-3 text-xs italic" style={{ background: '#FEF3CD', color: '#7A3A0A' }}>(historical data — not active for this organisation)</div>}
                  <AcademicProgressionInfo
                    beneficiaryId={beneficiary.id}
                    currentGrade={beneficiary.grade}
                    currentLevel={beneficiary.academic_level}
                    status={beneficiary.status}
                  />
                  <BeneficiaryAcademicsTab beneficiaryId={beneficiary.id} />
                </TabsContent>
              )}
            </Tabs>
          </div>
        </div>

        {/* Audit footer */}
        <div className="text-[10px] text-center pt-4 pb-2" style={{ color: '#A8A29E' }}>
          Record created {formatDisplayDate(beneficiary.created_at)}
          {beneficiary.updated_at ? ` · Last updated ${formatDisplayDate(beneficiary.updated_at)}` : ''}
        </div>
      </div>


      <Sheet open={editOpen} onOpenChange={setEditOpen}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-3xl">
          <SheetHeader>
            <SheetTitle>Edit {beneficiary.display_name}</SheetTitle>
            <SheetDescription>Existing values are prefilled and untouched fields are preserved.</SheetDescription>
          </SheetHeader>
          <div className="mt-5 pb-6">
            <BeneficiaryForm beneficiary={beneficiary} onSuccess={handleEditSuccess} onCancel={() => setEditOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {term}</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {beneficiary.display_name}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Pill({ children, bg, fg, dot }: { children: React.ReactNode; bg: string; fg: string; dot?: string }) {
  return (
    <span className="inline-flex items-center text-[11px] px-2.5 py-1 rounded-[6px]" style={{ background: bg, color: fg, fontWeight: 500 }}>
      {dot && <span className="h-1.5 w-1.5 rounded-full mr-1.5" style={{ background: dot }} />}
      {children}
    </span>
  );
}

function SidebarCard({ icon, title, right, onEdit, children }: { icon?: React.ReactNode; title: string; right?: React.ReactNode; onEdit?: () => void; children: React.ReactNode }) {
  return (
    <div className="bp-card rounded-[16px] overflow-hidden" style={{ background: '#FFFEF9', border: '1px solid #E7E2DA' }}>
      <div className="flex items-center justify-between" style={{ padding: '13px 18px 11px', borderBottom: '1px solid #E7E2DA' }}>
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-[12px]" style={{ color: '#1C1917', fontWeight: 600 }}>{title}</span>
        </div>
        {right ?? (onEdit && <button onClick={onEdit} className="text-[11px]" style={{ color: '#0F7B6C' }}>Edit</button>)}
      </div>
      <div style={{ padding: '13px 18px' }}>{children}</div>
    </div>
  );
}

function InfoRow({ label, value, mono }: { label: string; value: any; mono?: boolean }) {
  const empty = value === null || value === undefined || value === '';
  return (
    <div className="flex justify-between items-baseline gap-2 py-[5px]">
      <span className="text-[11px] flex-shrink-0" style={{ color: '#78716C' }}>{label}</span>
      <span
        className={`text-[12px] text-right truncate ${empty ? 'italic' : ''}`}
        style={{
          color: empty ? '#A8A29E' : '#1C1917',
          fontWeight: empty ? 400 : 500,
          fontFamily: mono && !empty ? "'DM Mono', monospace" : undefined,
          maxWidth: '160px',
        }}
      >
        {empty ? '—' : String(value)}
      </span>
    </div>
  );
}

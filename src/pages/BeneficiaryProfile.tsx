import { logger } from "@/lib/logger";
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useResolvedRecordId } from "@/hooks/useResolvedRecordId";
import { RecordNotFound } from "@/components/RecordNotFound";
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { ArrowLeft, Edit2, Trash2, GraduationCap, Users, MapPin, Building2, Heart, Loader2, FolderKanban, MessageSquare, FileText, Clock, Printer, Home, User, Check, X, Shield, MoreVertical } from 'lucide-react';
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
import { ProgrammeCardsView } from '@/components/beneficiary/ProgrammeCardsView';
import { BeneficiaryForm } from '@/components/beneficiary/BeneficiaryForm';
import { BeneficiaryAcademicsTab } from '@/components/beneficiary/BeneficiaryAcademicsTab';
import { BeneficiaryUploadsTab } from '@/components/beneficiary/BeneficiaryUploadsTab';
import { ProgramObservations } from '@/components/programs/ProgramObservations';
import { generateBeneficiaryReport } from '@/lib/beneficiaryReportGenerator';
import { formatDisplayDate } from '@/lib/dateUtils';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { AcademicProgressionInfo } from '@/components/beneficiary/AcademicProgressionInfo';
import { ActivityTimeline } from '@/components/beneficiary/ActivityTimeline';
import { BeneficiaryActivitiesSection } from '@/components/beneficiaries/BeneficiaryActivitiesSection';
import { BeneficiaryOverviewTab } from '@/components/beneficiary/BeneficiaryOverviewTab';
import { NeedsSection } from '@/components/beneficiary/NeedsSection';
import { BeneficiaryRiskPanel } from '@/components/beneficiary/BeneficiaryRiskPanel';
import { RelationshipsTab } from '@/components/beneficiary/RelationshipsTab';
import { ProfileCompletenessMeter } from '@/components/beneficiary/ProfileCompletenessMeter';
import { PhotoUploadButton } from '@/components/beneficiary/PhotoUploadButton';
import { FundingCoverageBar } from '@/components/beneficiary/FundingCoverageBar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useFieldVisibility } from '@/hooks/useFieldVisibility';
import { useBeneficiaryGuardians } from '@/hooks/useBeneficiaryGuardians';
import { useBranding } from '@/hooks/useBranding';
import { usePermissions } from '@/hooks/usePermissions';
import { InlineEditableField } from '@/components/beneficiary/InlineEditableField';
import { saveBeneficiaryField } from '@/lib/saveBeneficiaryField';
import { HomeVisitDialog } from '@/components/visits/HomeVisitDialog';
import { SchoolVisitDialog } from '@/components/visits/SchoolVisitDialog';
import { ConsentVaultSection } from '@/components/consent/ConsentVaultSection';
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
  // Care arrangement
  care_arrangement?: 'unknown' | 'independent' | 'under_guardian_care' | 'head_of_household_with_dependents' | 'institutional_care' | null;
  institution_type?: string | null;
  institution_contact_person?: string | null;
  institution_contact_phone?: string | null;
  institution_placement_date?: string | null;
  case_worker_name?: string | null;
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
  const { id: routeParam } = useParams<{ id: string }>();
  const { id: id, notFound: recordNotFound } = useResolvedRecordId(routeParam, "beneficiary", {
    toPath: (ref) => `/beneficiaries/${ref}`,
  });
  const navigate = useNavigate();
  const { isAdmin, user } = useAuth();
  const { currentOrganization } = useOrganization();
  const { term, termPlural } = useBeneficiaryTerminology();
  const { config: orgConfig } = useOrgBeneficiaryConfig();
  const { primaryColor, logoUrl, orgName } = useBranding();
  const brandHex = primaryColor || '#0F7B6C';
  const { can } = usePermissions();
  const canEditInline = !!can.editBeneficiaries;
  
  const [beneficiary, setBeneficiary] = useState<Beneficiary | null>(null);
  const [donors, setDonors] = useState<Donor[]>([]);
  const [dependants, setDependants] = useState<any[]>([]);
  const [siblings, setSiblings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [homeVisitOpen, setHomeVisitOpen] = useState(false);
  const [schoolVisitOpen, setSchoolVisitOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [enrolmentOpen, setEnrolmentOpen] = useState(false);
  const [showAllVulnerabilityTags, setShowAllVulnerabilityTags] = useState(false);
  const [donorOpen, setDonorOpen] = useState(false);
  const [prefillProgramId, setPrefillProgramId] = useState<string | null>(null);
  const [prefillProjectId, setPrefillProjectId] = useState<string | null>(null);

  // Quick stats
  const [enrollmentCount, setEnrollmentCount] = useState(0);
  const [attendanceCount, setAttendanceCount] = useState(0);
  const [earliestEnrollDate, setEarliestEnrollDate] = useState<string | null>(null);
  const [lastVisitDate, setLastVisitDate] = useState<string | null>(null);
  const [overallStatus, setOverallStatus] = useState<'Good' | 'Review' | 'Critical'>('Good');

  const _titleName = beneficiary
    ? (beneficiary.display_name || [beneficiary.first_name, beneficiary.last_name].filter(Boolean).join(' ') || (beneficiary as any).beneficiary_code || (beneficiary as any).unique_id || null)
    : null;
  useDocumentTitle(_titleName);

  const visibility = useFieldVisibility(beneficiary?.date_of_birth ?? null, orgConfig as any);
  const {
    data: guardians = [],
    error: guardiansError,
    refetch: refetchGuardians,
  } = useBeneficiaryGuardians(id);

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
      (supabase as any).from('activity_participants').select('*', { count: 'exact', head: true }).eq('beneficiary_id', id),
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
      .on('postgres_changes' as any, { event: '*', schema: 'public', table: 'activity_participants', filter: `beneficiary_id=eq.${id}` }, () => fetchQuickStats())
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

  const applyLocal = (partial: Record<string, any>) => {
    setBeneficiary((prev) => prev ? ({ ...prev, ...partial }) as Beneficiary : prev);
  };

  const saveNameInline = async (newValue: any) => {
    if (!id || !currentOrganization?.organization_id || !beneficiary) return;
    await saveBeneficiaryField({
      beneficiaryId: id,
      organizationId: currentOrganization.organization_id,
      field: 'display_name',
      label: 'Name',
      newValue,
      oldValue: beneficiary.display_name,
      userId: user?.id ?? null,
      applyLocal: (v) => applyLocal({ display_name: v }),
    });
  };

  const handleDownloadReport = async () => {
    if (!beneficiary) return;
    setGeneratingReport(true);
    try {
      await generateBeneficiaryReport({
        beneficiary, guardians, donors, academics: [],
        organizationName: orgName || currentOrganization?.organization_name || 'Organization',
        primaryColor: brandHex,
        logoUrl: logoUrl || undefined,
        servicesReceived: enrollmentCount,
        attendancePct: attendanceCount > 0 ? Math.min(100, Math.round((attendanceCount / Math.max(1, enrollmentCount * 4)) * 100)) : undefined,
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

  if (recordNotFound) return <RecordNotFound label="Beneficiary" backTo="/beneficiaries" />;
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
    { value: 'overview', label: 'Overview', icon: Clock, show: true, legacy: false },
    { value: 'programmes', label: 'Programmes', icon: FolderKanban, show: true, legacy: false },
    { value: 'academics', label: 'Education', icon: GraduationCap, show: orgConfig.collect_education_data && (isMinorAge || isTertiary || hasEducationData), legacy: !orgConfig.collect_education_data && hasEducationData },
    { value: 'health', label: 'Health', icon: Heart, show: orgConfig.collect_health_data || hasHealthData, legacy: !orgConfig.collect_health_data && hasHealthData },
    { value: 'economic', label: 'Economic', icon: Building2, show: (orgConfig.collect_economic_data && !isMinorAge) || hasEconomicData, legacy: !orgConfig.collect_economic_data && hasEconomicData },
    { value: 'history-risk', label: 'History & Risk', icon: Clock, show: true, legacy: false },
    { value: 'documents', label: 'Documents', icon: FileText, show: true, legacy: false },
    { value: 'visits-consent', label: 'Visits & Consent', icon: Home, show: true, legacy: false },
    { value: 'notes', label: 'Notes', icon: MessageSquare, show: true, legacy: false },
  ].filter(tab => tab.show);

  return (
    <TooltipProvider delayDuration={150}>
    <div className="bp-page min-h-screen" style={{ background: '#FFFFFF', fontFamily: "'DM Sans', sans-serif", color: '#1C1917' }}>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-stack { display: block !important; }
          .bp-card { break-inside: avoid; background: white !important; }
        }
        .bp-name { font-family: 'Lora', serif; letter-spacing: -0.3px; }
        .bp-mono { font-family: 'DM Mono', monospace; }
        .bp-avatar-photo:hover .bp-camera-overlay { opacity: 1; }
        @keyframes bp-status-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(190,24,93,0.55); }
          50% { box-shadow: 0 0 0 6px rgba(190,24,93,0); }
        }
        .bp-status-pulse { animation: bp-status-pulse 1.8s ease-in-out infinite; }

        /* ─── Dark mode polish (overrides hardcoded sand/stone palette) ─── */
        .dark .bp-page { background: hsl(var(--background)) !important; color: hsl(var(--foreground)) !important; }
        .dark .bp-card { background: hsl(var(--card)) !important; border-color: hsl(var(--border)) !important; box-shadow: inset 0 1px 0 rgba(255,255,255,0.04), 0 1px 2px rgba(0,0,0,0.4) !important; }
        .dark .bp-page [style*="background: #FFFEF9"],
        .dark .bp-page [style*="background:#FFFEF9"],
        .dark .bp-page [style*="background: #FFFFFF"],
        .dark .bp-page [style*="background:#FFFFFF"] { background: hsl(var(--card)) !important; }
        .dark .bp-page [style*="background: #F5F0E8"],
        .dark .bp-page [style*="background:#F5F0E8"],
        .dark .bp-page [style*="background: #EDE5D8"],
        .dark .bp-page [style*="background:#EDE5D8"],
        .dark .bp-page [style*="background: #F5F5F4"] { background: hsl(var(--muted)) !important; }
        .dark .bp-page [style*="border: 1px solid #E7E2DA"],
        .dark .bp-page [style*="border:1px solid #E7E2DA"],
        .dark .bp-page [style*="border-top: 1px solid #E7E2DA"],
        .dark .bp-page [style*="borderBottom: 1px solid #E7E2DA"] { border-color: hsl(var(--border)) !important; }
        .dark .bp-page [style*="border-bottom: 1px solid #F5F0E8"],
        .dark .bp-page [style*="border-top: 1px solid #EDE5D8"],
        .dark .bp-page [style*="border-right: 1px solid #E7E2DA"] { border-color: hsl(var(--border)) !important; }
        /* Text colors: warm off-white for primary, muted neutral for secondary */
        .dark .bp-page [style*="color: #1C1917"],
        .dark .bp-page [style*="color:#1C1917"],
        .dark .bp-page [style*="color: #44403C"],
        .dark .bp-page [style*="color:#44403C"] { color: hsl(var(--foreground)) !important; }
        .dark .bp-page [style*="color: #78716C"],
        .dark .bp-page [style*="color:#78716C"],
        .dark .bp-page [style*="color: #57534E"],
        .dark .bp-page [style*="color:#57534E"],
        .dark .bp-page [style*="color: #A8A29E"],
        .dark .bp-page [style*="color:#A8A29E"],
        .dark .bp-page [style*="color: #D6C9B5"] { color: hsl(var(--muted-foreground)) !important; }
        /* Brand teal text */
        .dark .bp-page [style*="color: #0F7B6C"],
        .dark .bp-page [style*="color:#0F7B6C"],
        .dark .bp-page [style*="color: #0A5449"] { color: hsl(var(--primary-light)) !important; }
        /* Hero brand wash — drop the mesh opacity in dark mode */
        .dark .bp-page .bp-hero-mesh { opacity: 0.3 !important; }
        .dark .bp-page .bp-hero-band { background: hsl(var(--secondary)) !important; }
        /* Avatar gradient: desaturate */
        .dark .bp-page .bp-avatar-gradient { background: linear-gradient(145deg, #5C3B1A, #1D6D60) !important; }
        /* Status pills/chips: soften saturated bgs */
        .dark .bp-page [style*="background: #FDF2F8"],
        .dark .bp-page [style*="background:#FDF2F8"] { background: rgba(190,24,93,0.18) !important; }
        .dark .bp-page [style*="background: #FEF3CD"],
        .dark .bp-page [style*="background:#FEF3CD"],
        .dark .bp-page [style*="background: #FEF3C7"] { background: rgba(180,123,9,0.18) !important; }
        .dark .bp-page [style*="background: #E6F5F3"],
        .dark .bp-page [style*="background:#E6F5F3"] { background: rgba(29,158,138,0.18) !important; }
        .dark .bp-page [style*="background: #EFF6FF"] { background: rgba(29,78,216,0.18) !important; }
        .dark .bp-page [style*="background: #ECFDF5"] { background: rgba(77,124,90,0.18) !important; }
        .dark .bp-page [style*="color: #831843"] { color: #F472B6 !important; }
        .dark .bp-page [style*="color: #7A3A0A"],
        .dark .bp-page [style*="color: #92400E"],
        .dark .bp-page [style*="color: #B45309"] { color: #FBBF24 !important; }
        .dark .bp-page [style*="color: #0A5449"] { color: #5EEAD4 !important; }
        .dark .bp-page [style*="color: #166534"] { color: #86EFAC !important; }
        .dark .bp-page [style*="color: #991B1B"] { color: #FCA5A5 !important; }
      `}</style>
      <div className="max-w-[1200px] mx-auto px-4 py-4">
        {/* Back nav */}
        <button onClick={() => navigate('/beneficiaries')} className="no-print inline-flex items-center gap-1.5 text-[12px] mb-4" style={{ color: '#78716C' }}>
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to {termPlural}
        </button>

        {/* ─── HERO — single row, no band ─── */}
        {(() => {
          const ca = beneficiary.care_arrangement || 'unknown';
          const careLabels: Record<string, string> = {
            independent: 'Independent',
            under_guardian_care: 'Under guardian care',
            head_of_household_with_dependents: 'Head of household',
            institutional_care: 'Institutional care',
            unknown: 'Set care arrangement',
          };
          const sponsored = donors.length > 0;
          const totalReceived = donors.reduce((s, d) => s + (d.amount_received || 0), 0);
          const sponsorshipChip = !sponsored
            ? { label: 'Unsponsored', accent: '#A8A29E' }
            : totalReceived > 0
              ? { label: 'Sponsored', accent: '#1D9E8A' }
              : { label: 'Partially funded', accent: '#B45309' };
          const riskLevel = (beneficiary.vulnerability_level || '').toLowerCase();
          const riskMap: Record<string, { label: string; accent: string }> = {
            low: { label: 'Low risk', accent: '#1D9E8A' },
            medium: { label: 'Medium risk', accent: '#B45309' },
            high: { label: 'High risk', accent: '#BE185D' },
            critical: { label: 'Critical', accent: '#BE185D' },
          };
          const riskChip = riskMap[riskLevel] ?? { label: 'No risk recorded', accent: '#A8A29E' };
          const visitChip = daysSinceVisit === null
            ? { label: 'Not yet visited', accent: '#A8A29E' }
            : { label: `${visitLabel} since visit`, accent: visitColour };
          const progChip = enrollmentCount > 0
            ? { label: `${enrollmentCount} active`, accent: brandHex }
            : { label: 'Not enrolled', accent: '#A8A29E' };
          const stageChipValue = isMinorAge
            ? age !== null
              ? `${age} yrs${beneficiary.grade ? ` · ${beneficiary.grade}` : beneficiary.academic_level ? ` · ${beneficiary.academic_level}` : ''}`
              : 'Age not recorded'
            : beneficiary.occupation ? `Adult · ${beneficiary.occupation}` : 'Adult';
          const careChip = { label: careLabels[ca], accent: ca === 'institutional_care' ? '#B45309' : ca === 'unknown' ? '#A8A29E' : brandHex };

          return (
            <div className="pb-5" style={{ borderBottom: '1px solid #E7E2DA' }}>
              <div className="flex items-start gap-5">
                {/* Avatar */}
                <div className="relative shrink-0 bp-avatar-photo group">
                  <div className="h-[88px] w-[88px] sm:h-[96px] sm:w-[96px] rounded-full overflow-hidden">
                    {beneficiary.photo_url ? (
                      <img src={beneficiary.photo_url} alt={beneficiary.display_name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="bp-avatar-gradient h-full w-full flex items-center justify-center text-white text-[32px]" style={{ background: 'linear-gradient(145deg, #B45309, #1D9E8A)', fontFamily: "'Lora', serif", fontWeight: 600 }}>
                        {getInitials(beneficiary.display_name)}
                      </div>
                    )}
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

                {/* Name + meta + chips */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <h1
                      className="bp-name text-[28px] sm:text-[36px] leading-[1.1] truncate flex-1 min-w-0"
                      title={beneficiary.display_name}
                      style={{ fontWeight: 600, color: '#1C1917', letterSpacing: '-0.5px' }}
                    >
                      <InlineEditableField
                        bare
                        value={beneficiary.display_name}
                        type="text"
                        canEdit={canEditInline}
                        validate={(v) => !v || String(v).trim().length < 2 ? 'Name must be at least 2 characters' : null}
                        onSave={saveNameInline}
                      />
                    </h1>
                    {/* Top-right action icons */}
                    <div className="no-print flex items-center gap-1 shrink-0">
                      <button
                        onClick={handleDownloadReport}
                        disabled={generatingReport}
                        title="Print record"
                        aria-label="Print record"
                        className="h-9 w-9 rounded-md flex items-center justify-center hover:bg-muted disabled:opacity-50"
                        style={{ color: '#44403C' }}
                      >
                        {generatingReport ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
                      </button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            title="More actions"
                            aria-label="More actions"
                            className="h-9 w-9 rounded-md flex items-center justify-center hover:bg-muted"
                            style={{ color: '#44403C' }}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {isAdmin && (
                            <DropdownMenuItem onClick={() => setShowDeleteDialog(true)} className="text-destructive">
                              <Trash2 className="h-4 w-4 mr-2" /> Delete {term.toLowerCase()}
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={handleDownloadReport}>
                            <Printer className="h-4 w-4 mr-2" /> Print record
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  {/* Meta line */}
                  <div className="text-[13px] truncate mt-1.5" style={{ color: '#78716C', fontWeight: 500 }}>
                    {[
                      beneficiary.student_id_number || `UFN-${beneficiary.id.slice(0, 8).toUpperCase()}`,
                      beneficiary.gender,
                      age !== null ? `${age} years` : null,
                      beneficiary.county,
                    ].filter(Boolean).join(' · ')}
                  </div>

                  {/* Chips row */}
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    <HeroChip accent={careChip.accent} onClick={handleEdit}>{careChip.label}</HeroChip>
                    <HeroChip accent={sponsorshipChip.accent} onClick={() => setActiveTab('programmes')}>{sponsorshipChip.label}</HeroChip>
                    <HeroChip accent={riskChip.accent} onClick={() => setActiveTab('history-risk')}>{riskChip.label}</HeroChip>
                    <HeroChip accent={visitChip.accent} onClick={() => setActiveTab('history-risk')}>{visitChip.label}</HeroChip>
                    <HeroChip accent={progChip.accent} onClick={() => setActiveTab('programmes')}>{progChip.label}</HeroChip>
                    <HeroChip accent="#78716C">{stageChipValue}</HeroChip>
                    {beneficiary.inactive_date && (
                      <HeroChip accent="#BE185D">Exited {formatDisplayDate(beneficiary.inactive_date)}</HeroChip>
                    )}
                  </div>
                </div>
              </div>

              {/* Completeness + Edit profile row */}
              <div className="flex items-center gap-4 mt-5 pt-4" style={{ borderTop: '1px solid #E7E2DA' }}>
                <span className="text-[11px] uppercase tracking-[0.6px] shrink-0" style={{ color: '#78716C', fontWeight: 600 }}>Profile</span>
                <div className="flex-1 h-[5px] rounded-full overflow-hidden" style={{ background: '#EDE5D8' }}>
                  <div className="h-full transition-all" style={{ width: `${completePct}%`, background: brandHex }} />
                </div>
                <span className="text-[12px] tabular-nums shrink-0" style={{ color: pctColour, fontWeight: 600 }}>{completePct}%</span>
                <button
                  onClick={handleEdit}
                  className="no-print inline-flex items-center gap-1.5 rounded-md px-3.5 h-9 text-[13px] shrink-0"
                  style={{ background: brandHex, color: '#FFFFFF', fontWeight: 500 }}
                >
                  <Edit2 className="h-3.5 w-3.5" />
                  Edit profile
                </button>
              </div>
            </div>
          );
        })()}

        {/* ─── MAIN CONTENT (Tabs) — full width after side-aside removal ─── */}
        <div className="print-stack mt-6 md:mt-8">
          {beneficiary.care_arrangement === 'institutional_care' && (
            <div className="bp-card rounded-[14px] p-4 mb-4" style={{ background: '#FFFEF9', border: '1px solid #E7E2DA' }}>
              <div className="text-[12px] font-semibold mb-2" style={{ color: '#92400E' }}>Institution</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-[13px]" style={{ color: '#1C1917' }}>
                <div><span className="text-[11px]" style={{ color: '#78716C' }}>Name </span>{beneficiary.institution_name || '—'}</div>
                <div><span className="text-[11px]" style={{ color: '#78716C' }}>Type </span>{beneficiary.institution_type || '—'}</div>
                <div><span className="text-[11px]" style={{ color: '#78716C' }}>Contact person </span>{beneficiary.institution_contact_person || '—'}</div>
                <div><span className="text-[11px]" style={{ color: '#78716C' }}>Contact phone </span>{beneficiary.institution_contact_phone || '—'}</div>
                <div><span className="text-[11px]" style={{ color: '#78716C' }}>Placement date </span>{beneficiary.institution_placement_date ? formatDisplayDate(beneficiary.institution_placement_date) : '—'}</div>
                <div><span className="text-[11px]" style={{ color: '#78716C' }}>Case worker </span>{beneficiary.case_worker_name || '—'}</div>
              </div>
            </div>
          )}
          <div>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              {/* Underline tab bar */}
              <div className="no-print flex gap-1 overflow-x-auto no-scrollbar" style={{ borderBottom: '1px solid #E7E2DA' }}>
                {tabs.map(tab => {
                  const active = activeTab === tab.value;
                  return (
                    <button
                      key={tab.value}
                      onClick={() => setActiveTab(tab.value)}
                      className="relative px-3 py-3 text-[14px] whitespace-nowrap transition-colors"
                      style={{ color: active ? '#1C1917' : '#78716C', fontWeight: 500 }}
                    >
                      {tab.label}
                      {active && (
                        <span
                          className="absolute left-0 right-0 -bottom-px h-[3px] rounded-t-sm"
                          style={{ background: brandHex }}
                        />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* TAB: Programmes */}
              <TabsContent value="programmes" className="mt-0 p-6 space-y-4">
                <ProgrammeCardsView
                  beneficiaryId={beneficiary.id}
                  organizationId={currentOrganization?.organization_id ?? null}
                  canEdit={canEditInline}
                  onEnrol={() => setEnrolmentOpen(true)}
                  onAddDonor={() => { setPrefillProgramId(null); setPrefillProjectId(null); setDonorOpen(true); }}
                  onAddDonorForProgramme={(programmeId, projectId) => {
                    setPrefillProgramId(programmeId);
                    setPrefillProjectId(projectId ?? null);
                    setDonorOpen(true);
                  }}
                />
                <div className="pt-2">
                  <div className="text-[14px] mb-3" style={{ color: '#1C1917', fontWeight: 600 }}>Recent activity</div>
                  <ActivityTimeline beneficiaryId={beneficiary.id} beneficiary={beneficiary as any} donors={donors as any} />
                </div>
                <BeneficiaryActivitiesSection beneficiaryId={beneficiary.id} />
              </TabsContent>

              {/* TAB: Overview */}
              <TabsContent value="overview" className="mt-0 p-6">
                <div className="mb-5">
                  <NeedsSection beneficiaryId={beneficiary.id} />
                </div>
                <BeneficiaryOverviewTab
                  beneficiary={beneficiary as any}
                  guardians={guardians}
                  guardiansError={!!guardiansError}
                  onRetryGuardians={() => { refetchGuardians(); }}
                  donors={donors}
                  visibility={visibility}
                  canLogVisit={true}
                  onLogVisit={() => setActiveTab('programmes')}
                  canEdit={canEditInline}
                  organizationId={currentOrganization?.organization_id ?? null}
                  userId={user?.id ?? null}
                  onLocalUpdate={applyLocal}
                  onAddGuardian={() => setEditOpen(true)}
                  signatureLine={(() => {
                    const m = pickSignatureMetric({ beneficiary, donors, enrollmentCount, earliestEnrollDate, completePct });
                    let number = '';
                    let rest = '';
                    switch (m.kind) {
                      case 'months_sponsored': number = String(m.months); rest = ` month${m.months === 1 ? '' : 's'} sponsored by ${m.sponsorName}`; break;
                      case 'current_grade': number = m.grade; rest = ' — current grade'; break;
                      case 'programmes_enrolled': number = String(m.count); rest = ` active programme${m.count === 1 ? '' : 's'}`; break;
                      case 'vulnerability_score': number = m.level ? m.level[0].toUpperCase() + m.level.slice(1) : 'Unknown'; rest = ' vulnerability'; break;
                      case 'members_reached': number = String(m.members); rest = ' members reached'; break;
                      case 'completeness': number = `${m.pct}%`; rest = ' profile complete'; break;
                    }
                    return (<><span style={{ color: brandHex, fontWeight: 600 }}>{number}</span>{rest}</>);
                  })()}
                />
              </TabsContent>

              {/* TAB: History & Risk */}
              <TabsContent value="history-risk" className="mt-0 p-6 space-y-5">
                <RelationshipsTab beneficiary={beneficiary as any} onEditGuardians={() => setEditOpen(true)} />
                <div className="pt-2">
                  <div className="text-[14px] mb-3" style={{ color: '#1C1917', fontWeight: 600 }}>Risk signals</div>
                </div>
                <BeneficiaryRiskPanel beneficiaryId={beneficiary.id} />
              </TabsContent>

              {/* TAB: Documents */}
              <TabsContent value="documents" className="mt-0 p-6">
                <BeneficiaryUploadsTab beneficiaryId={beneficiary.id} />
              </TabsContent>

              {/* TAB: Visits & Consent */}
              <TabsContent value="visits-consent" className="mt-0 p-6 space-y-5">
                <div className="flex gap-2 flex-wrap">
                  <Button size="sm" onClick={() => setHomeVisitOpen(true)}><Home className="h-4 w-4 mr-1" />Record home visit</Button>
                  <Button size="sm" variant="outline" onClick={() => setSchoolVisitOpen(true)}><GraduationCap className="h-4 w-4 mr-1" />Record school visit</Button>
                </div>
                <ConsentVaultSection beneficiaryId={beneficiary.id} householdId={(beneficiary as any).household_id || undefined} />
                <HomeVisitDialog open={homeVisitOpen} onOpenChange={setHomeVisitOpen} beneficiaryId={beneficiary.id} householdId={(beneficiary as any).household_id || null} />
                <SchoolVisitDialog open={schoolVisitOpen} onOpenChange={setSchoolVisitOpen} beneficiaryId={beneficiary.id} />
              </TabsContent>

              {/* TAB: Notes */}
              <TabsContent value="notes" className="mt-0 p-6 space-y-4">
                <ProgramObservations beneficiaryId={beneficiary.id} />
              </TabsContent>

              {tabs.some(t => t.value === 'health') && (
                <TabsContent value="health" className="mt-0 p-6 space-y-4">
                  {tabs.find(t => t.value === 'health')?.legacy && <div className="rounded-lg p-3 text-xs italic" style={{ background: '#FEF3CD', color: '#7A3A0A' }}>(historical data — not active for this organisation)</div>}
                  <div className="flex items-center justify-between">
                    <h3 className="text-[15px]" style={{ fontWeight: 600 }}>Health information</h3>
                    <span className="text-[10px] px-2 py-0.5 rounded-[5px]" style={{ background: '#FDF2F8', color: '#831843' }}>Private — not shared publicly</span>
                  </div>
                  {!hasHealthData && !((beneficiary as any).allergies || []).length ? (
                    <EmptySection
                      icon={Heart}
                      message="No health information recorded yet."
                      cta={canEditInline ? { label: 'Add health details', onClick: handleEdit } : undefined}
                    />
                  ) : (
                    <>
                      <div>
                        <div className="text-[12px] mb-1.5" style={{ color: '#78716C', fontWeight: 500 }}>Known allergies</div>
                        <div className="flex flex-wrap gap-1.5">{((beneficiary as any).allergies || []).length ? ((beneficiary as any).allergies || []).map((a: string) => <span key={a} className="text-[11px] px-2 py-0.5 rounded-[5px]" style={{ background: '#FDF2F8', color: '#831843' }}>{a}</span>) : <span className="text-[11px] italic" style={{ color: '#A8A29E' }}>None recorded</span>}</div>
                      </div>
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div><div className="text-[12px]" style={{ color: '#78716C', fontWeight: 500, marginBottom: 5 }}>Medical notes</div><div className="text-[14px]" style={{ color: '#1C1917', fontWeight: 500 }}>{beneficiary.other_medical_conditions || '—'}</div></div>
                        <div><div className="text-[12px]" style={{ color: '#78716C', fontWeight: 500, marginBottom: 5 }}>Special needs</div><div className="text-[14px]" style={{ color: '#1C1917', fontWeight: 500 }}>{beneficiary.has_special_needs ? beneficiary.special_needs_details || 'Yes' : 'None'}</div></div>
                        {visibility.showHivStatus && (
                          <div className="sm:col-span-2 rounded-[8px] p-3" style={{ borderLeft: '3px solid #BE185D', background: '#FDF2F8' }}>
                            <div className="text-[12px]" style={{ color: '#831843', fontWeight: 500, marginBottom: 5 }}>HIV status — restricted access</div>
                            <div className="text-[14px]" style={{ color: '#1C1917', fontWeight: 500 }}>{beneficiary.hiv_status || 'Not recorded'}</div>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </TabsContent>
              )}

              {tabs.some(t => t.value === 'economic') && (
                <TabsContent value="economic" className="mt-0 p-6 space-y-4">
                  {tabs.find(t => t.value === 'economic')?.legacy && <div className="rounded-lg p-3 text-xs italic" style={{ background: '#FEF3CD', color: '#7A3A0A' }}>(historical data — not active for this organisation)</div>}
                  <h3 className="text-[15px]" style={{ fontWeight: 600 }}>Economic profile</h3>
                  {!hasEconomicData ? (
                    <EmptySection
                      icon={Building2}
                      message="No economic profile yet — add occupation, income, or household size to inform support."
                      cta={canEditInline ? { label: 'Add economic details', onClick: handleEdit } : undefined}
                    />
                  ) : (
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div><div className="text-[12px]" style={{ color: '#78716C', fontWeight: 500, marginBottom: 5 }}>Occupation</div><div className="text-[14px]" style={{ color: '#1C1917', fontWeight: 500 }}>{beneficiary.occupation || '—'}</div></div>
                      <div><div className="text-[12px]" style={{ color: '#78716C', fontWeight: 500, marginBottom: 5 }}>Income level</div><div className="text-[14px]" style={{ color: '#1C1917', fontWeight: 500 }}>{beneficiary.income_level || '—'}</div></div>
                      <div><div className="text-[12px]" style={{ color: '#78716C', fontWeight: 500, marginBottom: 5 }}>Household size</div><div className="text-[14px]" style={{ color: '#1C1917', fontWeight: 500 }}>{beneficiary.household_size || '—'}</div></div>
                      <div><div className="text-[12px]" style={{ color: '#78716C', fontWeight: 500, marginBottom: 5 }}>Income source</div><div className="text-[14px]" style={{ color: '#1C1917', fontWeight: 500 }}>{beneficiary.source_of_income || '—'}</div></div>
                    </div>
                  )}
                </TabsContent>
              )}

              {/* TAB: Education */}
              {tabs.some(t => t.value === 'academics') && (
                <TabsContent value="academics" className="mt-0 p-6 space-y-4">
                  {tabs.find(t => t.value === 'academics')?.legacy && <div className="rounded-lg p-3 text-xs italic" style={{ background: '#FEF3CD', color: '#7A3A0A' }}>(historical data — not active for this organisation)</div>}
                  <AcademicProgressionInfo
                    beneficiaryId={beneficiary.id}
                    currentGrade={beneficiary.grade}
                    currentLevel={beneficiary.academic_level}
                    status={beneficiary.status}
                  />
                  <BeneficiaryAcademicsTab
                    beneficiaryId={beneficiary.id}
                    beneficiary={beneficiary as any}
                    organizationId={currentOrganization?.organization_id ?? null}
                    canEdit={canEditInline}
                    userId={user?.id ?? null}
                    onLocalUpdate={applyLocal}
                  />
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

      {/* Enrolment / donation manager */}
      <Sheet open={enrolmentOpen} onOpenChange={setEnrolmentOpen}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-3xl">
          <SheetHeader>
            <SheetTitle>Manage enrolments & sponsorship</SheetTitle>
            <SheetDescription>Enrol {beneficiary.display_name} in a programme or record a sponsor contribution.</SheetDescription>
          </SheetHeader>
          <div className="mt-5 pb-6">
            <BeneficiaryEnrollmentForm beneficiaryId={beneficiary.id} showTitle={false} autoOpenEnroll />
          </div>
        </SheetContent>
      </Sheet>

      {/* Donor sheet — opens donation dialog directly with programme prefilled */}
      <Sheet open={donorOpen} onOpenChange={setDonorOpen}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-3xl">
          <SheetHeader>
            <SheetTitle>Add donor</SheetTitle>
            <SheetDescription>Record a sponsor contribution for {beneficiary.display_name}.</SheetDescription>
          </SheetHeader>
          <div className="mt-5 pb-6">
            <BeneficiaryEnrollmentForm
              key={`donor-${prefillProgramId ?? 'none'}-${donorOpen}`}
              beneficiaryId={beneficiary.id}
              showTitle={false}
              autoOpenDonor
              prefilledDonorProgramId={prefillProgramId}
              prefilledDonorProjectId={prefillProjectId}
            />
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
    </TooltipProvider>
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

function HeroChip({
  children,
  accent,
  onClick,
}: {
  children: React.ReactNode;
  accent: string;
  onClick?: () => void;
}) {
  const Tag: any = onClick ? 'button' : 'span';
  return (
    <Tag
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 pl-2 pr-2.5 py-1 rounded-md text-[12px] transition-colors ${onClick ? 'hover:bg-muted/60' : ''}`}
      style={{ background: '#F7F5F1', color: '#1C1917', fontWeight: 500, border: '1px solid #ECE7DE' }}
    >
      <span className="h-3 w-[3px] rounded-sm" style={{ background: accent }} />
      <span className="truncate">{children}</span>
    </Tag>
  );
}

function EmptySection({
  icon: Icon,
  message,
  cta,
}: {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  message: string;
  cta?: { label: string; onClick: () => void };
}) {
  return (
    <div
      className="bp-card rounded-[12px] py-8 px-4 flex flex-col items-center text-center gap-2"
      style={{ background: '#FFFEF9', border: '1px dashed #E7E2DA' }}
    >
      <Icon className="h-5 w-5" style={{ color: '#A8A29E' }} />
      <p className="text-[12px]" style={{ color: '#78716C' }}>{message}</p>
      {cta && (
        <button
          onClick={cta.onClick}
          className="text-[12px] mt-1"
          style={{ color: '#0F7B6C', fontWeight: 500 }}
        >
          {cta.label} →
        </button>
      )}
    </div>
  );
}

/* ─── Status-at-a-glance pill ─── */
function StatusPill({
  icon,
  label,
  value,
  accent,
  tooltip,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | null;
  accent: string;
  tooltip?: string;
  onClick?: () => void;
}) {
  const unknown = value === null || value === undefined || value === '';
  const displayValue = unknown ? '—' : value;
  const clickable = !!onClick;
  const content = (
    <div
      className={`bp-card relative flex items-center gap-2.5 rounded-[12px] pl-[14px] pr-3 py-2.5 text-left overflow-hidden ${clickable ? 'transition-shadow hover:shadow-elevation-2' : ''}`}
      style={{
        background: '#FFFEF9',
        border: '1px solid #E7E2DA',
        opacity: unknown ? 0.7 : 1,
      }}
    >
      <span
        className="absolute left-0 top-0 bottom-0 w-[3px]"
        style={{ background: unknown ? '#D6CFC2' : accent }}
      />
      <span
        className="h-7 w-7 rounded-[8px] flex items-center justify-center shrink-0"
        style={{ background: '#F5F0E8', color: unknown ? '#A8A29E' : accent }}
      >
        {icon}
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-[11px] truncate" style={{ color: '#78716C', fontWeight: 500 }}>{label}</div>
        <div className="text-[14px] truncate" style={{ color: unknown ? '#A8A29E' : '#1C1917', fontWeight: 600 }}>{displayValue}</div>
      </div>
    </div>
  );
  const node = clickable ? (
    <button type="button" onClick={onClick} className="block w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 rounded-[12px]" style={{ outlineColor: accent }}>
      {content}
    </button>
  ) : content;
  if (tooltip) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{node as any}</TooltipTrigger>
        <TooltipContent side="top">{tooltip}</TooltipContent>
      </Tooltip>
    );
  }
  return node;
}

/* ─── Signature impact metric chooser ─── */
type SignatureMetric =
  | { kind: 'months_sponsored'; months: number; sponsorName: string; totalReceived: number }
  | { kind: 'current_grade'; grade: string; term: string | null }
  | { kind: 'programmes_enrolled'; count: number; recent: string | null }
  | { kind: 'vulnerability_score'; level: 'low' | 'medium' | 'high' | 'critical' | null }
  | { kind: 'members_reached'; members: number; activities: number }
  | { kind: 'completeness'; pct: number };

function pickSignatureMetric(args: {
  beneficiary: Beneficiary;
  donors: Donor[];
  enrollmentCount: number;
  earliestEnrollDate: string | null;
  completePct: number;
}): SignatureMetric {
  const { beneficiary, donors, enrollmentCount, completePct } = args;
  const totalReceived = donors.reduce((s, d) => s + (d.amount_received || 0), 0);

  // Sponsored student
  if (beneficiary.beneficiary_type === 'student' && donors.length > 0) {
    const earliestDate = donors
      .map(d => d.donation_date)
      .filter(Boolean)
      .sort()[0];
    const months = earliestDate
      ? Math.max(1, Math.floor((Date.now() - new Date(earliestDate).getTime()) / (1000 * 60 * 60 * 24 * 30)))
      : donors.length;
    const topSponsor = [...donors]
      .sort((a, b) => (b.amount_received || 0) - (a.amount_received || 0))[0];
    return {
      kind: 'months_sponsored',
      months,
      sponsorName: topSponsor?.donor_name || 'Sponsor',
      totalReceived,
    };
  }

  // Student without sponsor
  if (beneficiary.beneficiary_type === 'student') {
    const grade = beneficiary.grade || beneficiary.academic_level;
    if (grade) {
      return { kind: 'current_grade', grade, term: null };
    }
  }

  // Adult individual
  if (beneficiary.beneficiary_type === 'adult') {
    return {
      kind: 'programmes_enrolled',
      count: enrollmentCount,
      recent: null,
    };
  }

  // Household
  if (beneficiary.beneficiary_category === 'household') {
    return {
      kind: 'vulnerability_score',
      level: (beneficiary.vulnerability_level as any) || null,
    };
  }

  // Group
  if (beneficiary.beneficiary_type === 'group') {
    return {
      kind: 'members_reached',
      members: beneficiary.member_count || 0,
      activities: 0,
    };
  }

  return { kind: 'completeness', pct: completePct };
}

function SignatureImpactCard({
  metric,
  brandHex,
  className = '',
}: {
  metric: SignatureMetric;
  brandHex: string;
  className?: string;
}) {
  let label = '';
  let headline: string = '';
  let supporting: string = '';
  let footer: React.ReactNode = null;

  switch (metric.kind) {
    case 'months_sponsored':
      label = 'Months sponsored';
      headline = String(metric.months);
      supporting = `by ${metric.sponsorName}`;
      footer = metric.totalReceived > 0 ? (
        <FundingCoverageBar totalReceived={metric.totalReceived} compact />
      ) : null;
      break;
    case 'current_grade':
      label = 'Current grade';
      headline = metric.grade;
      supporting = metric.term || 'Latest recorded';
      break;
    case 'programmes_enrolled':
      label = 'Programmes enrolled';
      headline = String(metric.count);
      supporting = metric.recent || (metric.count === 0 ? 'No active enrolment' : 'Active enrolment');
      break;
    case 'vulnerability_score': {
      label = 'Vulnerability';
      const level = metric.level;
      headline = level ? level[0].toUpperCase() + level.slice(1) : '—';
      supporting = 'Household assessment';
      const idx = level === 'low' ? 0 : level === 'medium' ? 1 : (level === 'high' || level === 'critical') ? 2 : -1;
      footer = (
        <div className="flex gap-1 mt-1">
          {['#1D9E8A', '#B45309', '#BE185D'].map((c, i) => (
            <div key={i} className="h-1.5 flex-1 rounded-full" style={{ background: idx === i ? c : '#EDE5D8' }} />
          ))}
        </div>
      );
      break;
    }
    case 'members_reached':
      label = 'Members reached';
      headline = String(metric.members);
      supporting = `${metric.activities} group activities`;
      break;
    case 'completeness':
      label = 'Profile completeness';
      headline = `${metric.pct}%`;
      supporting = 'Keep it up to date';
      footer = (
        <div className="h-1.5 rounded-full overflow-hidden mt-1" style={{ background: '#EDE5D8' }}>
          <div className="h-full" style={{ width: `${metric.pct}%`, background: brandHex }} />
        </div>
      );
      break;
  }

  return (
    <div
      className={`bp-card rounded-[14px] px-4 py-3 flex flex-col justify-between ${className}`}
      style={{ background: '#FFFEF9', border: '1px solid #E7E2DA' }}
    >
      <div className="text-[12px]" style={{ color: '#78716C', fontWeight: 500 }}>{label}</div>
      <div
        className="tabular-nums leading-none mt-1"
        style={{ fontSize: 'clamp(28px, 3.2vw, 36px)', fontWeight: 600, color: brandHex, fontFamily: "'DM Sans', sans-serif" }}
      >
        {headline}
      </div>
      <div className="text-[13px] mt-1.5 truncate" style={{ color: '#78716C' }}>{supporting}</div>
      {footer && <div className="mt-2">{footer}</div>}
    </div>
  );
}

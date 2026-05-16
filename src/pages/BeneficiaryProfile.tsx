import { logger } from "@/lib/logger";
import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit2, Trash2, GraduationCap, Users, MapPin, Building2, Heart, Loader2, FolderKanban, MessageSquare, FileText, Clock, Printer, ChevronRight, Home, User, Pencil, UsersRound } from 'lucide-react';
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
        .select(`id, relationship, guardians (id, full_name, guardian_type, phone, email, is_alive, employment_type, source_of_income)`)
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
  const visibleVulnerabilityTags = showAllVulnerabilityTags ? vulnerabilityTags : vulnerabilityTags.slice(0, 4);
  const familyMembers = [...guardians.map(g => ({ ...g, _type: 'guardian' as const })), ...siblings.map(s => ({ ...s, _type: 'sibling' as const })), ...dependants.map(d => ({ ...d, _type: 'dependant' as const }))];
  const hasEducationData = !!(beneficiary.academic_level || beneficiary.grade || beneficiary.institution_name);
  const hasHealthData = !!(beneficiary.hiv_status || beneficiary.other_medical_conditions || beneficiary.has_special_needs);
  const hasEconomicData = !!(beneficiary.occupation || beneficiary.income_level || beneficiary.household_size || beneficiary.source_of_income);
  const tabs = [
    { value: 'programmes', label: 'Programmes', icon: FolderKanban, show: true, legacy: false },
    { value: 'history-risk', label: 'History & Risk', icon: Clock, show: true, legacy: false },
    { value: 'relationships', label: 'Family', icon: UsersRound, show: true, legacy: false },
    { value: 'documents', label: 'Documents', icon: FileText, show: true, legacy: false },
    { value: 'observations', label: 'Observations', icon: MessageSquare, show: true, legacy: false },
    { value: 'academics', label: 'Education', icon: GraduationCap, show: orgConfig.collect_education_data || hasEducationData, legacy: !orgConfig.collect_education_data && hasEducationData },
    { value: 'health', label: 'Health', icon: Heart, show: orgConfig.collect_health_data || hasHealthData, legacy: !orgConfig.collect_health_data && hasHealthData },
    { value: 'economic', label: 'Economic', icon: Building2, show: orgConfig.collect_economic_data || hasEconomicData, legacy: !orgConfig.collect_economic_data && hasEconomicData },
  ].filter(tab => tab.show);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-[1200px] mx-auto px-4 py-4 space-y-5">
        {/* Back nav */}
        <button onClick={() => navigate('/beneficiaries')} className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to {termPlural}
        </button>

        {/* ─── HERO CARD ─── */}
        <div className="bg-card rounded-[20px] border border-border overflow-hidden">
          {/* Decorative band */}
          <div
            className="h-[80px]"
            style={{
              backgroundColor: 'hsl(var(--secondary))',
              backgroundImage: 'radial-gradient(circle, hsl(var(--warning) / 0.28) 1px, transparent 1px)',
              backgroundSize: '20px 20px',
            }}
          />

          {/* Hero body */}
          <div className="px-5 sm:px-7 pb-6">
            {/* Avatar + Identity row */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-9">
              <div className="flex items-end gap-4">
                {/* Avatar */}
                <div className="relative shrink-0">
                  <div className="h-[72px] w-[72px] rounded-full border-[4px] border-card overflow-hidden" style={{ boxShadow: '0 0 0 4px hsl(var(--card))' }}>
                    {beneficiary.photo_url ? (
                      <img src={beneficiary.photo_url} alt={beneficiary.display_name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-primary-foreground text-lg font-semibold" style={{ background: 'var(--gradient-accent)' }}>
                        {getInitials(beneficiary.display_name)}
                      </div>
                    )}
                  </div>
                  {/* Status dot */}
                  <div className={`absolute bottom-0 right-0 h-4 w-4 rounded-full border-2 border-card ${statusLabel === 'Active' ? 'bg-primary' : 'bg-muted-foreground'}`} />
                  {currentOrganization?.organization_id && (
                    <PhotoUploadButton
                      beneficiaryId={beneficiary.id}
                      organizationId={currentOrganization.organization_id}
                      onUploaded={(url) => setBeneficiary(b => b ? { ...b, photo_url: url } : b)}
                    />
                  )}
                </div>

                {/* Name block */}
                <div className="pb-1">
                  <div className="flex items-center gap-2"><h1 className="text-[22px] font-semibold text-foreground tracking-tight leading-tight">{beneficiary.display_name}</h1><CategoryIcon className="h-4 w-4 text-primary" /></div>
                  {beneficiary.inactive_date && (
                    <p className="text-[12px] text-muted-foreground mt-0.5">Exited {formatDisplayDate(beneficiary.inactive_date)}{beneficiary.inactive_reason ? ` · ${beneficiary.inactive_reason}` : ''}</p>
                  )}
                  <p className="text-[12px] text-muted-foreground font-mono mt-0.5">
                    {beneficiary.student_id_number ? `ID: ${beneficiary.student_id_number}` : `ID: ${beneficiary.id.slice(0, 8).toUpperCase()}`}
                    {' · '}Registered {new Date(beneficiary.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                  <div className="mt-2 max-w-[260px]">
                    <ProfileCompletenessMeter beneficiary={beneficiary} guardianCount={guardians.length} />
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2 pb-1">
                <button
                  onClick={handleDownloadReport}
                  disabled={generatingReport}
                  className="inline-flex items-center gap-1.5 bg-card border border-border text-foreground rounded-[8px] px-4 py-[7px] text-[13px] hover:bg-secondary transition-colors disabled:opacity-50"
                >
                  {generatingReport ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Printer className="h-3.5 w-3.5" />}
                  Print record
                </button>
                <button
                  onClick={handleEdit}
                  className="inline-flex items-center gap-1.5 bg-primary text-primary-foreground rounded-[8px] px-4 py-[7px] text-[13px] font-medium hover:bg-primary/90 transition-colors"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                  Edit profile
                </button>
                {isAdmin && (
                  <button
                    onClick={() => setShowDeleteDialog(true)}
                    className="inline-flex items-center gap-1.5 bg-card border border-border text-muted-foreground rounded-[8px] px-3 py-[7px] text-[13px] hover:text-destructive hover:border-destructive/30 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Pills row */}
            <div className="flex flex-wrap gap-2 mt-4">
              <Badge variant={statusLabel === 'Active' ? 'success' : 'secondary'}>{statusLabel}</Badge>
              <Badge variant="outline" className="capitalize"><CategoryIcon className="h-3 w-3 mr-1" />{category}</Badge>
              {beneficiary.county && <Badge variant="warning"><MapPin className="h-3 w-3 mr-1" />{beneficiary.county}</Badge>}
              {beneficiary.primary_need && <Badge variant="info">{beneficiary.primary_need}</Badge>}
              {beneficiary.vulnerability_level && <Badge variant={beneficiary.vulnerability_level === 'critical' || beneficiary.vulnerability_level === 'high' ? 'destructive' : beneficiary.vulnerability_level === 'medium' ? 'warning' : 'success'} className="capitalize">{beneficiary.vulnerability_level}</Badge>}
            </div>
            {vulnerabilityTags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {visibleVulnerabilityTags.map(tag => <Badge key={tag} variant="destructive" className="bg-destructive/10 text-destructive border-transparent">{tag}</Badge>)}
                {!showAllVulnerabilityTags && vulnerabilityTags.length > 4 && (
                  <button type="button" onClick={() => setShowAllVulnerabilityTags(true)} className="text-[11px] text-primary hover:underline">+{vulnerabilityTags.length - 4} more</button>
                )}
              </div>
            )}

            {/* Quick stats row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5 py-4 border-t border-b border-border">
              <div className="text-center">
                <div className="text-[20px] font-semibold text-foreground tracking-tight">{category === 'group' ? (beneficiary.member_count || '—') : category === 'household' ? (beneficiary.household_size || '—') : enrollmentCount}</div>
                <div className="text-[11px] text-muted-foreground mt-[2px]">{category === 'group' ? 'Group members' : category === 'household' ? 'Household members' : 'Programmes'}</div>
              </div>
              <div className="text-center">
                <div className="text-[20px] font-semibold text-foreground tracking-tight">{category === 'individual' || category === 'group' ? attendanceCount : enrollmentCount}</div>
                <div className="text-[11px] text-muted-foreground mt-[2px]">{category === 'individual' || category === 'group' ? 'Activities attended' : 'Programmes'}</div>
              </div>
              <div className="text-center">
                <div className="text-[20px] font-semibold text-foreground tracking-tight">{getLastVisitLabel()}</div>
                <div className="text-[11px] text-muted-foreground mt-[2px]">Last visit</div>
              </div>
              <div className="text-center">
                <div className={`text-[20px] font-semibold tracking-tight ${overallStatus === 'Good' ? 'text-primary' : overallStatus === 'Review' ? 'text-warning' : 'text-destructive'}`}>
                  {beneficiary.vulnerability_level || overallStatus}
                </div>
                <div className="text-[11px] text-muted-foreground mt-[2px]">{beneficiary.vulnerability_level ? 'Vulnerability' : 'Overall status'}</div>
              </div>
            </div>
          </div>
        </div>

        {/* ─── TWO-COLUMN LAYOUT ─── */}
        <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-4 items-start">
          
          {/* ─── SIDEBAR ─── */}
          <div className="flex flex-col gap-3 order-2 md:order-1">
            {/* Card A: Personal Details */}
            <div className="bg-card rounded-[16px] border border-border overflow-hidden">
              <div className="px-[18px] py-[14px] border-b border-border flex items-center justify-between">
                <span className="text-[13px] font-semibold text-foreground">Personal Details</span>
                <button onClick={handleEdit} className="text-[11px] text-primary hover:underline">Edit</button>
              </div>
              <div className="px-[18px] py-[14px]">
                {[
                  ['Full name', beneficiary.display_name],
                  ['Date of birth', formatDisplayDate(beneficiary.date_of_birth)],
                  ['Gender', beneficiary.gender],
                  ['County', beneficiary.county],
                  ['Sub-county', beneficiary.sub_county],
                  ['Village', beneficiary.estate_village],
                  ['Consent', beneficiary.consent_given ? `✓ ${formatDisplayDate(beneficiary.consent_date)}` : '✗'],
                  ...(category === 'individual' ? [['Occupation', orgConfig.collect_economic_data ? beneficiary.occupation : null], ['Income level', beneficiary.income_level], ['Marital status', beneficiary.marital_status], ['Religion', beneficiary.religion]] : []),
                  ...(category === 'household' ? [['Household size', beneficiary.household_size], ['Primary income source', beneficiary.source_of_income]] : []),
                  ...(category === 'group' ? [['Members', beneficiary.member_count], ['Meeting frequency', beneficiary.group_schedule], ['Leader', beneficiary.leader_name]] : []),
                ].map(([label, value]) => (
                  <div key={label as string} className="flex justify-between items-baseline py-[6px] border-b border-border last:border-0">
                    <span className="text-[12px] text-muted-foreground">{label}</span>
                    <span className="text-[13px] font-medium text-foreground text-right max-w-[150px] truncate">{value || '—'}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-card rounded-[16px] border border-border overflow-hidden">
              <div className="px-[18px] py-[14px] border-b border-border flex items-center justify-between">
                <span className="text-[13px] font-semibold text-foreground">Vulnerability profile</span>
                <button onClick={handleEdit} className="text-[11px] text-primary hover:underline">Edit</button>
              </div>
              <div className="px-[18px] py-[14px] space-y-3">
                {beneficiary.primary_need && <Badge variant="info">{beneficiary.primary_need}</Badge>}
                {beneficiary.vulnerability_level && <Badge variant={beneficiary.vulnerability_level === 'critical' || beneficiary.vulnerability_level === 'high' ? 'destructive' : beneficiary.vulnerability_level === 'medium' ? 'warning' : 'success'} className="capitalize">{beneficiary.vulnerability_level}</Badge>}
                <div className="flex flex-wrap gap-1.5">
                  {vulnerabilityTags.length ? vulnerabilityTags.map(tag => <Badge key={tag} variant="destructive" className="bg-destructive/10 text-destructive border-transparent">{tag}</Badge>) : <span className="text-[12px] text-muted-foreground">No tags recorded</span>}
                </div>
                <div className="text-[12px] text-muted-foreground">Source: <span className="text-foreground">{beneficiary.registration_source || '—'}</span></div>
              </div>
            </div>

            {orgConfig.collect_economic_data && (
              <div className="bg-card rounded-[16px] border border-border overflow-hidden">
                <div className="px-[18px] py-[14px] border-b border-border"><span className="text-[13px] font-semibold text-foreground">Economic profile</span></div>
                <div className="px-[18px] py-[14px]">
                  {[["Occupation", beneficiary.occupation], ["Income level", beneficiary.income_level], ["Household size", beneficiary.household_size], ["Income source", beneficiary.source_of_income]].map(([label, value]) => (
                    <div key={label as string} className="flex justify-between items-baseline py-[6px] border-b border-border last:border-0"><span className="text-[12px] text-muted-foreground">{label}</span><span className="text-[13px] font-medium text-foreground text-right max-w-[150px] truncate">{value || '—'}</span></div>
                  ))}
                </div>
              </div>
            )}

            {/* Card B: Health Notes (non-group) */}
            {beneficiary.beneficiary_type !== 'group' && (
              <div className="bg-card rounded-[16px] border border-border overflow-hidden">
                <div className="px-[18px] py-[14px] border-b border-border">
                  <span className="text-[13px] font-semibold text-foreground">Health Notes</span>
                </div>
                <div className="px-[18px] py-[14px] space-y-3">
                  {/* Medical conditions as chips */}
                  <div>
                    <p className="text-[12px] text-muted-foreground mb-[6px]">Conditions</p>
                    {beneficiary.other_medical_conditions ? (
                      <div className="flex flex-wrap gap-1">
                        {beneficiary.other_medical_conditions.split(',').map((c, i) => (
                          <span key={i} className="bg-destructive/10 text-destructive px-[9px] py-[3px] rounded-[6px] text-[11px] font-medium">{c.trim()}</span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-[12px] text-muted-foreground">None recorded</span>
                    )}
                  </div>
                  {[
                    ['HIV Status', beneficiary.hiv_status || '—'],
                    ['Special needs', beneficiary.has_special_needs ? 'Yes' : 'No'],
                  ].map(([label, value]) => (
                    <div key={label} className="flex justify-between items-baseline py-[4px] border-b border-border last:border-0">
                      <span className="text-[12px] text-muted-foreground">{label}</span>
                      <span className="text-[13px] font-medium text-foreground">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Card C: Family */}
            {familyMembers.length > 0 && (
              <div className="bg-card rounded-[16px] border border-border overflow-hidden">
                <div className="px-[18px] py-[14px] border-b border-border flex items-center justify-between">
                  <span className="text-[13px] font-semibold text-foreground">Family</span>
                  <span className="text-[11px] text-muted-foreground">{familyMembers.length} member{familyMembers.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="px-[18px] py-[10px]">
                  {familyMembers.map((member, i) => {
                    const isGuardian = member._type === 'guardian';
                    const name = isGuardian ? (member as Guardian).full_name : (member as any).display_name || '—';
                    const initials = getInitials(name);
                    const relation = isGuardian
                      ? `${(member as Guardian).relationship} · ${(member as Guardian).guardian_type}`
                      : member._type === 'sibling' ? `Sibling · ${(member as any).relationship || ''}` : 'Dependant';
                    const phone = isGuardian ? (member as Guardian).phone : null;

                    return (
                      <div key={`${member._type}-${member.id}-${i}`} className={`flex items-center gap-3 py-[10px] ${i < familyMembers.length - 1 ? 'border-b border-border' : ''}`}>
                        <div className="h-9 w-9 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center text-[12px] font-semibold shrink-0">
                          {initials}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-medium text-foreground truncate">{name}</p>
                          <p className="text-[11px] text-muted-foreground capitalize">{relation}</p>
                          {phone && <p className="text-[12px] text-primary font-mono">{phone}</p>}
                        </div>
                        {!isGuardian && (
                          <button onClick={() => navigate(`/beneficiaries/${member.id}`)} className="text-muted-foreground hover:text-primary">
                            <ChevronRight className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Background narrative */}
            {beneficiary.background_narrative && (
              <div className="bg-card rounded-[16px] border border-border overflow-hidden">
                <div className="px-[18px] py-[14px] border-b border-border">
                  <span className="text-[13px] font-semibold text-foreground">Background</span>
                </div>
                <div className="px-[18px] py-[14px]">
                  <p className="text-[12px] text-foreground leading-relaxed whitespace-pre-wrap">{beneficiary.background_narrative}</p>
                </div>
              </div>
            )}
          </div>

          {/* ─── MAIN CONTENT (Tabs) ─── */}
          <div className="order-1 md:order-2">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              {/* Warm tab bar */}
              <div className="bg-secondary rounded-[10px] p-[3px] flex gap-[2px] mb-4 overflow-x-auto no-scrollbar">
                {tabs.map(tab => (
                  <button
                    key={tab.value}
                    onClick={() => setActiveTab(tab.value)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-[7px] px-[8px] rounded-[8px] text-[12px] font-medium whitespace-nowrap transition-all ${
                      activeTab === tab.value
                        ? 'bg-card text-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                    style={activeTab === tab.value ? { boxShadow: 'var(--shadow-sm)' } : {}}
                  >
                    <tab.icon className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">{tab.label}</span>
                  </button>
                ))}
              </div>

              {/* TAB: Programmes */}
              <TabsContent value="programmes" className="mt-0 space-y-3">
                <BeneficiaryEnrollmentForm beneficiaryId={beneficiary.id} />
              </TabsContent>

              {/* TAB: History & Risk */}
              <TabsContent value="history-risk" className="mt-0 space-y-0">
                <div className="bg-card rounded-[16px] border border-border overflow-hidden">
                  <div className="p-5">
                    <ActivityTimeline beneficiaryId={beneficiary.id} />
                  </div>
                  {/* Divider with label */}
                  <div className="flex items-center gap-3 px-5">
                    <div className="flex-1 h-px bg-border" />
                    <span className="text-[11px] uppercase text-muted-foreground tracking-[0.5px] font-medium">Risk Assessment</span>
                    <div className="flex-1 h-px bg-border" />
                  </div>
                  <div className="p-5">
                    <BeneficiaryRiskPanel beneficiaryId={beneficiary.id} />
                  </div>
                </div>
              </TabsContent>

              {/* TAB: Documents */}
              <TabsContent value="documents" className="mt-0">
                <div className="bg-card rounded-[16px] border border-border overflow-hidden p-5">
                  <BeneficiaryUploadsTab beneficiaryId={beneficiary.id} />
                </div>
              </TabsContent>

              {/* TAB: Observations */}
              <TabsContent value="observations" className="mt-0">
                <div className="bg-card rounded-[16px] border border-border overflow-hidden p-5">
                  <ProgramObservations beneficiaryId={beneficiary.id} />
                </div>
              </TabsContent>

              {/* TAB: Relationships / Family */}
              <TabsContent value="relationships" className="mt-0">
                <RelationshipsTab beneficiary={beneficiary as any} />
              </TabsContent>

              {tabs.some(t => t.value === 'health') && (
                <TabsContent value="health" className="mt-0">
                  {tabs.find(t => t.value === 'health')?.legacy && <div className="mb-3 rounded-lg border border-warning/20 bg-warning/10 p-3 text-xs text-warning">This section is not active for your organisation type but contains existing data.</div>}
                  <div className="bg-card rounded-[16px] border border-border overflow-hidden p-5 space-y-3">
                    <div className="flex items-center justify-between"><h3 className="font-semibold">Health</h3><Button variant="ghost" size="sm" onClick={handleEdit}><Pencil className="h-3.5 w-3.5" /></Button></div>
                    <div className="grid sm:grid-cols-2 gap-3 text-sm">
                      <div><span className="text-muted-foreground">Medical notes</span><p>{beneficiary.other_medical_conditions || '—'}</p></div>
                      <div><span className="text-muted-foreground">HIV status</span><p>{beneficiary.hiv_status || '—'}</p></div>
                      <div><span className="text-muted-foreground">Special needs</span><p>{beneficiary.has_special_needs ? beneficiary.special_needs_details || 'Yes' : 'No'}</p></div>
                    </div>
                  </div>
                </TabsContent>
              )}

              {tabs.some(t => t.value === 'economic') && (
                <TabsContent value="economic" className="mt-0">
                  {tabs.find(t => t.value === 'economic')?.legacy && <div className="mb-3 rounded-lg border border-warning/20 bg-warning/10 p-3 text-xs text-warning">This section is not active for your organisation type but contains existing data.</div>}
                  <div className="bg-card rounded-[16px] border border-border overflow-hidden p-5 space-y-3">
                    <div className="flex items-center justify-between"><h3 className="font-semibold">Economic profile</h3><Button variant="ghost" size="sm" onClick={handleEdit}><Pencil className="h-3.5 w-3.5" /></Button></div>
                    <div className="grid sm:grid-cols-2 gap-3 text-sm">
                      <div><span className="text-muted-foreground">Occupation</span><p>{beneficiary.occupation || '—'}</p></div>
                      <div><span className="text-muted-foreground">Income level</span><p>{beneficiary.income_level || '—'}</p></div>
                      <div><span className="text-muted-foreground">Household size</span><p>{beneficiary.household_size || '—'}</p></div>
                      <div><span className="text-muted-foreground">Income source</span><p>{beneficiary.source_of_income || '—'}</p></div>
                    </div>
                  </div>
                </TabsContent>
              )}

              {/* TAB: Education */}
              {tabs.some(t => t.value === 'academics') && (
                <TabsContent value="academics" className="mt-0 space-y-3">
                  {tabs.find(t => t.value === 'academics')?.legacy && <div className="rounded-lg border border-warning/20 bg-warning/10 p-3 text-xs text-warning">This section is not active for your organisation type but contains existing data.</div>}
                  <div className="bg-card rounded-[16px] border border-border overflow-hidden p-5">
                    <AcademicProgressionInfo 
                      beneficiaryId={beneficiary.id}
                      currentGrade={beneficiary.grade}
                      currentLevel={beneficiary.academic_level}
                      status={beneficiary.status}
                    />
                  </div>
                  <div className="bg-card rounded-[16px] border border-border overflow-hidden p-5">
                    <BeneficiaryAcademicsTab beneficiaryId={beneficiary.id} />
                  </div>
                </TabsContent>
              )}
            </Tabs>
          </div>
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

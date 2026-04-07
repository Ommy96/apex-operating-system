import { logger } from "@/lib/logger";
import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit2, Trash2, GraduationCap, UserCheck, UsersRound, Users, Calendar, MapPin, Phone, Building2, Heart, Loader2, FolderKanban, MessageSquare, FileText, Download, Upload, Clock, Activity, ShieldAlert, Printer, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useOrganization } from '@/hooks/useOrganization';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { BeneficiaryEnrollmentForm } from '@/components/beneficiary/BeneficiaryEnrollmentForm';
import { BeneficiaryAcademicsTab } from '@/components/beneficiary/BeneficiaryAcademicsTab';
import { BeneficiaryUploadsTab } from '@/components/beneficiary/BeneficiaryUploadsTab';
import { ProgramObservations } from '@/components/programs/ProgramObservations';
import { generateBeneficiaryReport } from '@/lib/beneficiaryReportGenerator';
import { AcademicProgressionInfo } from '@/components/beneficiary/AcademicProgressionInfo';
import { ActivityTimeline } from '@/components/beneficiary/ActivityTimeline';
import { BeneficiaryRiskPanel } from '@/components/beneficiary/BeneficiaryRiskPanel';
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
  
  const [beneficiary, setBeneficiary] = useState<Beneficiary | null>(null);
  const [guardians, setGuardians] = useState<Guardian[]>([]);
  const [donors, setDonors] = useState<Donor[]>([]);
  const [dependants, setDependants] = useState<any[]>([]);
  const [siblings, setSiblings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [activeTab, setActiveTab] = useState('programmes');

  // Quick stats
  const [enrollmentCount, setEnrollmentCount] = useState(0);
  const [attendanceCount, setAttendanceCount] = useState(0);
  const [earliestEnrollDate, setEarliestEnrollDate] = useState<string | null>(null);
  const [overallStatus, setOverallStatus] = useState<'Good' | 'Review' | 'Critical'>('Good');

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

  const fetchBeneficiaryData = async () => {
    if (!id) return;
    setLoading(true);
    
    try {
      const { data: beneficiaryData, error: beneficiaryError } = await supabase
        .from('beneficiaries')
        .select('*')
        .eq('id', id)
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
      const { error } = await supabase.from('beneficiaries').delete().eq('id', id);
      if (error) throw error;
      toast({ title: "Success", description: "Beneficiary deleted successfully" });
      navigate('/beneficiaries');
    } catch (error) {
      logger.error('Error deleting beneficiary:', error);
      toast({ title: "Error", description: "Failed to delete beneficiary", variant: "destructive" });
    }
  };

  const handleEdit = () => {
    if (!beneficiary) return;
    navigate(`/beneficiaries?edit=${beneficiary.id}&type=${beneficiary.beneficiary_type}`);
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

  const getTimeEnrolled = () => {
    if (!earliestEnrollDate) return '—';
    const start = new Date(earliestEnrollDate);
    const now = new Date();
    const months = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
    if (months >= 12) return `${(months / 12).toFixed(1)} yrs`;
    return `${months} mo`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-[#1D9E8A]" />
      </div>
    );
  }

  if (!beneficiary) {
    return (
      <div className="text-center py-12">
        <Users className="h-12 w-12 mx-auto text-[#8B93A8] mb-4" />
        <h3 className="text-lg font-medium text-[#1A1F2E]">Beneficiary not found</h3>
        <Button variant="outline" onClick={() => navigate('/beneficiaries')} className="mt-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Beneficiaries
        </Button>
      </div>
    );
  }

  const age = calculateAge(beneficiary.date_of_birth);
  const familyMembers = [...guardians.map(g => ({ ...g, _type: 'guardian' as const })), ...siblings.map(s => ({ ...s, _type: 'sibling' as const })), ...dependants.map(d => ({ ...d, _type: 'dependant' as const }))];

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#FBF9F6' }}>
      <div className="max-w-[1200px] mx-auto px-4 py-4 space-y-5">
        {/* Back nav */}
        <button onClick={() => navigate('/beneficiaries')} className="inline-flex items-center gap-1.5 text-[13px] text-[#8B93A8] hover:text-[#1A1F2E] transition-colors">
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Beneficiaries
        </button>

        {/* ─── HERO CARD ─── */}
        <div className="bg-white rounded-[20px] border border-[#E8EAF0] overflow-hidden">
          {/* Decorative band */}
          <div
            className="h-[80px]"
            style={{
              backgroundColor: '#F5F0E8',
              backgroundImage: 'radial-gradient(circle, rgba(201,123,26,0.3) 1px, transparent 1px)',
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
                  <div className="h-[72px] w-[72px] rounded-full border-[4px] border-white overflow-hidden" style={{ boxShadow: '0 0 0 4px white' }}>
                    {beneficiary.photo_url ? (
                      <img src={beneficiary.photo_url} alt={beneficiary.display_name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-white text-lg font-semibold" style={{ background: 'linear-gradient(135deg, #C97B1A, #1D9E8A)' }}>
                        {getInitials(beneficiary.display_name)}
                      </div>
                    )}
                  </div>
                  {/* Status dot */}
                  <div className="absolute bottom-0 right-0 h-4 w-4 rounded-full border-2 border-white" style={{ backgroundColor: beneficiary.status === 'active' ? '#1D9E8A' : '#8B93A8' }} />
                </div>

                {/* Name block */}
                <div className="pb-1">
                  <h1 className="text-[22px] font-semibold text-[#1A1F2E] tracking-tight leading-tight">{beneficiary.display_name}</h1>
                  <p className="text-[12px] text-[#8B93A8] font-mono mt-0.5">
                    {beneficiary.student_id_number ? `ID: ${beneficiary.student_id_number}` : `ID: ${beneficiary.id.slice(0, 8).toUpperCase()}`}
                    {' · '}Registered {new Date(beneficiary.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2 pb-1">
                <button
                  onClick={handleDownloadReport}
                  disabled={generatingReport}
                  className="inline-flex items-center gap-1.5 bg-white border border-[#D4D7E3] text-[#4A5168] rounded-[8px] px-4 py-[7px] text-[13px] hover:bg-[#F5F0E8] transition-colors disabled:opacity-50"
                >
                  {generatingReport ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Printer className="h-3.5 w-3.5" />}
                  Print record
                </button>
                <button
                  onClick={handleEdit}
                  className="inline-flex items-center gap-1.5 bg-[#1D9E8A] text-white rounded-[8px] px-4 py-[7px] text-[13px] font-medium hover:bg-[#178a78] transition-colors"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                  Edit profile
                </button>
                {isAdmin && (
                  <button
                    onClick={() => setShowDeleteDialog(true)}
                    className="inline-flex items-center gap-1.5 bg-white border border-[#E8EAF0] text-[#8B93A8] rounded-[8px] px-3 py-[7px] text-[13px] hover:text-red-600 hover:border-red-200 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Pills row */}
            <div className="flex flex-wrap gap-2 mt-4">
              <span className="inline-flex items-center gap-[5px] px-[10px] py-[4px] rounded-full text-[12px] font-medium bg-[#E0F4F1] text-[#0A5449]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#1D9E8A]" />
                {beneficiary.status}
              </span>
              {beneficiary.gender && (
                <span className="inline-flex items-center gap-[5px] px-[10px] py-[4px] rounded-full text-[12px] font-medium bg-[#F5F0E8] text-[#6B5A3E]">
                  {beneficiary.gender}{age ? ` · Age ${age}` : ''}
                </span>
              )}
              {beneficiary.county && (
                <span className="inline-flex items-center gap-[5px] px-[10px] py-[4px] rounded-full text-[12px] font-medium bg-[#FEF3E2] text-[#7A4A0A]">
                  <MapPin className="h-3 w-3" />
                  {beneficiary.county}
                </span>
              )}
              {enrollmentCount > 0 && (
                <span className="inline-flex items-center gap-[5px] px-[10px] py-[4px] rounded-full text-[12px] font-medium bg-[#E8EFFC] text-[#0C3A7A]">
                  {enrollmentCount} programme{enrollmentCount !== 1 ? 's' : ''} enrolled
                </span>
              )}
              <span className="inline-flex items-center gap-[5px] px-[10px] py-[4px] rounded-full text-[12px] font-medium bg-[#F5F0E8] text-[#6B5A3E] capitalize">
                {beneficiary.beneficiary_type === 'student' ? 'Child' : beneficiary.beneficiary_type}
              </span>
            </div>

            {/* Quick stats row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5 py-4 border-t border-b border-[#E8EAF0]">
              <div className="text-center">
                <div className="text-[20px] font-semibold text-[#1A1F2E] tracking-tight">{enrollmentCount}</div>
                <div className="text-[11px] text-[#8B93A8] mt-[2px]">Programmes</div>
              </div>
              <div className="text-center">
                <div className="text-[20px] font-semibold text-[#1A1F2E] tracking-tight">{attendanceCount}</div>
                <div className="text-[11px] text-[#8B93A8] mt-[2px]">Activities attended</div>
              </div>
              <div className="text-center">
                <div className="text-[20px] font-semibold text-[#1A1F2E] tracking-tight">{getTimeEnrolled()}</div>
                <div className="text-[11px] text-[#8B93A8] mt-[2px]">Time enrolled</div>
              </div>
              <div className="text-center">
                <div className="text-[20px] font-semibold text-[#1D9E8A] tracking-tight">
                  {beneficiary.status === 'active' ? 'Good' : 'Review'}
                </div>
                <div className="text-[11px] text-[#8B93A8] mt-[2px]">Overall status</div>
              </div>
            </div>
          </div>
        </div>

        {/* ─── TWO-COLUMN LAYOUT ─── */}
        <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-4 items-start">
          
          {/* ─── SIDEBAR ─── */}
          <div className="flex flex-col gap-3 order-2 md:order-1">
            {/* Card A: Personal Details */}
            <div className="bg-white rounded-[16px] border border-[#E8EAF0] overflow-hidden">
              <div className="px-[18px] py-[14px] border-b border-[#E8EAF0] flex items-center justify-between">
                <span className="text-[13px] font-semibold text-[#1A1F2E]">Personal Details</span>
                <button onClick={handleEdit} className="text-[11px] text-[#1D9E8A] hover:underline">Edit</button>
              </div>
              <div className="px-[18px] py-[14px]">
                {[
                  ['Full name', beneficiary.display_name],
                  ['Date of birth', beneficiary.date_of_birth ? new Date(beneficiary.date_of_birth).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : null],
                  ['Gender', beneficiary.gender],
                  ['County', beneficiary.county],
                  ['Sub-county', beneficiary.sub_county],
                  ['Institution', beneficiary.institution_name],
                  ['Grade / Level', beneficiary.grade ? `${beneficiary.academic_level ? beneficiary.academic_level + ' — ' : ''}${beneficiary.grade}` : null],
                  ['Disability', beneficiary.has_special_needs ? (beneficiary.special_needs_details || 'Yes') : 'None'],
                  ['Religion', beneficiary.religion],
                ].map(([label, value]) => (
                  <div key={label as string} className="flex justify-between items-baseline py-[6px] border-b border-[#E8EAF0] last:border-0">
                    <span className="text-[12px] text-[#8B93A8]">{label}</span>
                    <span className="text-[13px] font-medium text-[#1A1F2E] text-right max-w-[150px] truncate">{value || '—'}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Card B: Health Notes (non-group) */}
            {beneficiary.beneficiary_type !== 'group' && (
              <div className="bg-white rounded-[16px] border border-[#E8EAF0] overflow-hidden">
                <div className="px-[18px] py-[14px] border-b border-[#E8EAF0]">
                  <span className="text-[13px] font-semibold text-[#1A1F2E]">Health Notes</span>
                </div>
                <div className="px-[18px] py-[14px] space-y-3">
                  {/* Medical conditions as chips */}
                  <div>
                    <p className="text-[12px] text-[#8B93A8] mb-[6px]">Conditions</p>
                    {beneficiary.other_medical_conditions ? (
                      <div className="flex flex-wrap gap-1">
                        {beneficiary.other_medical_conditions.split(',').map((c, i) => (
                          <span key={i} className="bg-[#FDE8F0] text-[#7A1A3E] px-[9px] py-[3px] rounded-[6px] text-[11px] font-medium">{c.trim()}</span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-[12px] text-[#8B93A8]">None recorded</span>
                    )}
                  </div>
                  {[
                    ['HIV Status', beneficiary.hiv_status || '—'],
                    ['Special needs', beneficiary.has_special_needs ? 'Yes' : 'No'],
                  ].map(([label, value]) => (
                    <div key={label} className="flex justify-between items-baseline py-[4px] border-b border-[#E8EAF0] last:border-0">
                      <span className="text-[12px] text-[#8B93A8]">{label}</span>
                      <span className="text-[13px] font-medium text-[#1A1F2E]">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Card C: Family */}
            {familyMembers.length > 0 && (
              <div className="bg-white rounded-[16px] border border-[#E8EAF0] overflow-hidden">
                <div className="px-[18px] py-[14px] border-b border-[#E8EAF0] flex items-center justify-between">
                  <span className="text-[13px] font-semibold text-[#1A1F2E]">Family</span>
                  <span className="text-[11px] text-[#8B93A8]">{familyMembers.length} member{familyMembers.length !== 1 ? 's' : ''}</span>
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
                      <div key={`${member._type}-${member.id}-${i}`} className={`flex items-center gap-3 py-[10px] ${i < familyMembers.length - 1 ? 'border-b border-[#E8EAF0]' : ''}`}>
                        <div className="h-9 w-9 rounded-full bg-[#EDE5D8] text-[#6B5A3E] flex items-center justify-center text-[12px] font-semibold shrink-0">
                          {initials}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-medium text-[#1A1F2E] truncate">{name}</p>
                          <p className="text-[11px] text-[#8B93A8] capitalize">{relation}</p>
                          {phone && <p className="text-[12px] text-[#1D9E8A] font-mono">{phone}</p>}
                        </div>
                        {!isGuardian && (
                          <button onClick={() => navigate(`/beneficiaries/${member.id}`)} className="text-[#8B93A8] hover:text-[#1D9E8A]">
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
              <div className="bg-white rounded-[16px] border border-[#E8EAF0] overflow-hidden">
                <div className="px-[18px] py-[14px] border-b border-[#E8EAF0]">
                  <span className="text-[13px] font-semibold text-[#1A1F2E]">Background</span>
                </div>
                <div className="px-[18px] py-[14px]">
                  <p className="text-[12px] text-[#4A5168] leading-relaxed whitespace-pre-wrap">{beneficiary.background_narrative}</p>
                </div>
              </div>
            )}
          </div>

          {/* ─── MAIN CONTENT (Tabs) ─── */}
          <div className="order-1 md:order-2">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              {/* Warm tab bar */}
              <div className="bg-[#F5F0E8] rounded-[10px] p-[3px] flex gap-[2px] mb-4 overflow-x-auto no-scrollbar">
                {[
                  { value: 'programmes', label: 'Programmes', icon: FolderKanban },
                  { value: 'history-risk', label: 'History & Risk', icon: Clock },
                  { value: 'documents', label: 'Documents', icon: FileText },
                  { value: 'observations', label: 'Observations', icon: MessageSquare },
                  ...(beneficiary.beneficiary_type === 'student' ? [{ value: 'academics', label: 'Academics', icon: GraduationCap }] : []),
                ].map(tab => (
                  <button
                    key={tab.value}
                    onClick={() => setActiveTab(tab.value)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-[7px] px-[8px] rounded-[8px] text-[12px] font-medium whitespace-nowrap transition-all ${
                      activeTab === tab.value
                        ? 'bg-white text-[#1A1F2E]'
                        : 'text-[#8B93A8] hover:text-[#4A5168]'
                    }`}
                    style={activeTab === tab.value ? { boxShadow: '0 1px 3px rgba(0,0,0,0.08)' } : {}}
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
                <div className="bg-white rounded-[16px] border border-[#E8EAF0] overflow-hidden">
                  <div className="p-5">
                    <ActivityTimeline beneficiaryId={beneficiary.id} />
                  </div>
                  {/* Divider with label */}
                  <div className="flex items-center gap-3 px-5">
                    <div className="flex-1 h-px bg-[#E8EAF0]" />
                    <span className="text-[11px] uppercase text-[#8B93A8] tracking-[0.5px] font-medium">Risk Assessment</span>
                    <div className="flex-1 h-px bg-[#E8EAF0]" />
                  </div>
                  <div className="p-5">
                    <BeneficiaryRiskPanel beneficiaryId={beneficiary.id} />
                  </div>
                </div>
              </TabsContent>

              {/* TAB: Documents */}
              <TabsContent value="documents" className="mt-0">
                <div className="bg-white rounded-[16px] border border-[#E8EAF0] overflow-hidden p-5">
                  <BeneficiaryUploadsTab beneficiaryId={beneficiary.id} />
                </div>
              </TabsContent>

              {/* TAB: Observations */}
              <TabsContent value="observations" className="mt-0">
                <div className="bg-white rounded-[16px] border border-[#E8EAF0] overflow-hidden p-5">
                  <ProgramObservations beneficiaryId={beneficiary.id} />
                </div>
              </TabsContent>

              {/* TAB: Academics (students only) */}
              {beneficiary.beneficiary_type === 'student' && (
                <TabsContent value="academics" className="mt-0 space-y-3">
                  <div className="bg-white rounded-[16px] border border-[#E8EAF0] overflow-hidden p-5">
                    <AcademicProgressionInfo 
                      beneficiaryId={beneficiary.id}
                      currentGrade={beneficiary.grade}
                      currentLevel={beneficiary.academic_level}
                      status={beneficiary.status}
                    />
                  </div>
                  <div className="bg-white rounded-[16px] border border-[#E8EAF0] overflow-hidden p-5">
                    <BeneficiaryAcademicsTab beneficiaryId={beneficiary.id} />
                  </div>
                </TabsContent>
              )}
            </Tabs>
          </div>
        </div>
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Beneficiary</AlertDialogTitle>
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

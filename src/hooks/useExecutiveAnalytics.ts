import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "./useOrganization";
import { useMemo } from "react";
import { DateRange } from "react-day-picker";
import { isWithinInterval, differenceInDays, parseISO, startOfMonth, eachMonthOfInterval, subMonths, format } from "date-fns";

export interface StaffMetric {
  name: string;
  homeVisits: number;
  schoolVisits: number;
  programReports: number;
  activityReports: number;
  businessVisits: number;
  beneficiariesRegistered: number;
  observationsRecorded: number;
  followUpsCompleted: number;
  activitiesFacilitated: number;
  total: number;
  activeDays: Set<string>;
  activeDaysCount: number;
  consistency: number;
  performanceScore: number;
  workloadLevel: 'low' | 'moderate' | 'high' | 'overloaded';
}

export interface ExecutiveSummary {
  totalActiveBeneficiaries: number;
  totalPrograms: number;
  totalProjects: number;
  totalActiveStaff: number;
  totalReports: number;
  totalVisitations: number;
  totalServices: number;
  avgStaffPerformance: number;
  totalDonorFunds: number;
  riskAlerts: number;
  indicatorAchievement: number;
  newEnrollmentsThisPeriod: number;
}

function isInDateRange(dateStr: string, dateRange?: DateRange): boolean {
  if (!dateRange?.from) return true;
  try {
    const date = parseISO(dateStr);
    const end = dateRange.to || dateRange.from;
    return isWithinInterval(date, { start: dateRange.from, end });
  } catch {
    return true;
  }
}

export function useExecutiveAnalytics(dateRange?: DateRange, programFilter?: string) {
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.organization_id;

  // Beneficiaries
  const { data: beneficiaries = [], isLoading: loadingBeneficiaries } = useQuery({
    queryKey: ['exec-beneficiaries', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data } = await supabase
        .from('beneficiaries')
        .select('id, display_name, first_name, last_name, beneficiary_type, gender, date_of_birth, county, sub_county, location, estate_village, status, created_at, created_by, has_special_needs, hiv_status, other_medical_conditions, academic_level, grade, institution_name')
        .eq('organization_id', orgId);
      return data || [];
    },
    enabled: !!orgId,
  });

  // Programs
  const { data: programs = [] } = useQuery({
    queryKey: ['exec-programs', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data } = await supabase.from('programs').select('id, name, is_active').eq('organization_id', orgId);
      return data || [];
    },
    enabled: !!orgId,
  });

  // Projects
  const { data: projects = [] } = useQuery({
    queryKey: ['exec-projects', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data } = await supabase.from('projects').select('id, name, program_id, status').eq('organization_id', orgId);
      return data || [];
    },
    enabled: !!orgId,
  });

  // Enrollments / Services
  const { data: enrollments = [], isLoading: loadingEnrollments } = useQuery({
    queryKey: ['exec-enrollments', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data } = await supabase
        .from('beneficiary_services')
        .select('id, beneficiary_id, program_id, project_id, enrolled_date, exit_date, status, created_at, created_by')
        .eq('organization_id', orgId);
      return data || [];
    },
    enabled: !!orgId,
  });

  // Visitations
  const { data: visitations = [], isLoading: loadingVisitations } = useQuery({
    queryKey: ['exec-visitations', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data } = await supabase
        .from('beneficiary_visitations')
        .select('id, beneficiary_id, visit_type, visit_date, staff_name, created_at, created_by, follow_up_required, follow_up_date, challenges_identified, recommendations')
        .eq('organization_id', orgId);
      return data || [];
    },
    enabled: !!orgId,
  });

  // Reports (all types)
  const { data: reportsData, isLoading: loadingReports } = useQuery({
    queryKey: ['exec-reports', orgId],
    queryFn: async () => {
      if (!orgId) return null;
      const [homeVisits, schoolVisits, programReports, activityReports, businessVisits] = await Promise.all([
        supabase.from('home_visit_reports').select('*').eq('organization_id', orgId),
        supabase.from('school_visit_reports').select('*').eq('organization_id', orgId),
        supabase.from('program_reports').select('*').eq('organization_id', orgId),
        supabase.from('activity_reports').select('*').eq('organization_id', orgId),
        supabase.from('business_visit_reports').select('*').eq('organization_id', orgId),
      ]);
      return {
        homeVisits: homeVisits.data || [],
        schoolVisits: schoolVisits.data || [],
        programReports: programReports.data || [],
        activityReports: activityReports.data || [],
        businessVisits: businessVisits.data || [],
      };
    },
    enabled: !!orgId,
  });

  // Academics
  const { data: academicRecords = [], isLoading: loadingAcademics } = useQuery({
    queryKey: ['exec-academics', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data } = await supabase.from('beneficiary_academics').select('*').eq('organization_id', orgId);
      return data || [];
    },
    enabled: !!orgId,
  });

  // Donors
  const { data: donors = [] } = useQuery({
    queryKey: ['exec-donors', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data } = await supabase
        .from('beneficiary_donors')
        .select('id, donor_name, amount_received, program_id, donation_date, beneficiary_id, created_at')
        .eq('organization_id', orgId);
      return data || [];
    },
    enabled: !!orgId,
  });

  // Activities
  const { data: activities = [] } = useQuery({
    queryKey: ['exec-activities', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data } = await supabase
        .from('activities')
        .select('id, title, program_id, project_id, status, created_by, created_at, responsible_staff_id, actual_participants')
        .eq('organization_id', orgId);
      return data || [];
    },
    enabled: !!orgId,
  });

  // Observations
  const { data: observations = [] } = useQuery({
    queryKey: ['exec-observations', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data } = await supabase
        .from('program_observations')
        .select('id, created_by, created_at, status, follow_up_date')
        .eq('organization_id', orgId);
      return data || [];
    },
    enabled: !!orgId,
  });

  // Uploads
  const { data: uploads = [] } = useQuery({
    queryKey: ['exec-uploads', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data } = await supabase.from('beneficiary_uploads').select('id, created_at').eq('organization_id', orgId);
      return data || [];
    },
    enabled: !!orgId,
  });

  // Organization members (staff)
  const { data: orgMembers = [] } = useQuery({
    queryKey: ['exec-org-members', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data } = await supabase
        .from('organization_members')
        .select('user_id, role')
        .eq('organization_id', orgId);
      return data || [];
    },
    enabled: !!orgId,
  });

  // Profiles for staff names
  const { data: profiles = [] } = useQuery({
    queryKey: ['exec-profiles', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data } = await supabase
        .from('profiles')
        .select('user_id, full_name, email')
        .eq('organization_id', orgId);
      return data || [];
    },
    enabled: !!orgId,
  });

  // Staff metrics computation
  const staffMetrics: StaffMetric[] = useMemo(() => {
    if (!reportsData) return [];

    const staffData: Record<string, Omit<StaffMetric, 'activeDaysCount' | 'consistency' | 'performanceScore' | 'workloadLevel'>> = {};

    const getOrCreate = (name: string) => {
      if (!staffData[name]) {
        staffData[name] = {
          name,
          homeVisits: 0, schoolVisits: 0, programReports: 0,
          activityReports: 0, businessVisits: 0, beneficiariesRegistered: 0,
          observationsRecorded: 0, followUpsCompleted: 0, activitiesFacilitated: 0,
          total: 0, activeDays: new Set(),
        };
      }
      return staffData[name];
    };

    const processReports = (reports: any[], field: string) => {
      reports.forEach(r => {
        if (dateRange && !isInDateRange(r.created_at, dateRange)) return;
        const name = r.staff || 'Unknown';
        const s = getOrCreate(name);
        (s as any)[field]++;
        s.total++;
        s.activeDays.add(r.created_at?.substring(0, 10));
      });
    };

    processReports(reportsData.homeVisits, 'homeVisits');
    processReports(reportsData.schoolVisits, 'schoolVisits');
    processReports(reportsData.programReports, 'programReports');
    processReports(reportsData.activityReports, 'activityReports');
    processReports(reportsData.businessVisits, 'businessVisits');

    // Count beneficiaries registered by created_by (user_id)
    const profileMap = new Map(profiles.map(p => [p.user_id, p.full_name || p.email || 'Unknown']));
    beneficiaries.forEach(b => {
      if (dateRange && !isInDateRange(b.created_at, dateRange)) return;
      if (b.created_by) {
        const name = profileMap.get(b.created_by) || 'Unknown';
        const s = getOrCreate(name);
        s.beneficiariesRegistered++;
      }
    });

    // Observations
    observations.forEach(o => {
      if (dateRange && !isInDateRange(o.created_at, dateRange)) return;
      if (o.created_by) {
        const name = profileMap.get(o.created_by) || 'Unknown';
        const s = getOrCreate(name);
        s.observationsRecorded++;
        if (o.status === 'resolved' || o.status === 'completed') s.followUpsCompleted++;
      }
    });

    // Visitations by staff_name
    visitations.forEach(v => {
      if (dateRange && !isInDateRange(v.visit_date, dateRange)) return;
      if (v.staff_name) {
        const s = getOrCreate(v.staff_name);
        s.activeDays.add(v.visit_date?.substring(0, 10));
      }
    });

    const daysInRange = dateRange?.from && dateRange?.to
      ? Math.max(differenceInDays(dateRange.to, dateRange.from), 1)
      : 90;

    return Object.values(staffData)
      .map(s => {
        const activeDaysCount = s.activeDays.size;
        const consistency = Math.min(100, Math.round((activeDaysCount / Math.max(daysInRange * 0.6, 1)) * 100));

        // Performance Score (0-100): weighted composite
        const reportScore = Math.min(40, (s.total / Math.max(daysInRange * 0.1, 1)) * 40);
        const consistencyScore = consistency * 0.25;
        const beneficiaryScore = Math.min(15, s.beneficiariesRegistered * 1.5);
        const followUpScore = Math.min(10, s.followUpsCompleted * 2);
        const observationScore = Math.min(10, s.observationsRecorded * 1);
        const performanceScore = Math.round(Math.min(100, reportScore + consistencyScore + beneficiaryScore + followUpScore + observationScore));

        const totalLoad = s.total + s.beneficiariesRegistered + s.observationsRecorded;
        const workloadLevel: StaffMetric['workloadLevel'] =
          totalLoad > daysInRange * 0.5 ? 'overloaded' :
          totalLoad > daysInRange * 0.3 ? 'high' :
          totalLoad > daysInRange * 0.1 ? 'moderate' : 'low';

        return { ...s, activeDaysCount, consistency, performanceScore, workloadLevel };
      })
      .sort((a, b) => b.performanceScore - a.performanceScore);
  }, [reportsData, beneficiaries, observations, visitations, profiles, dateRange]);

  // Executive Summary
  const executiveSummary: ExecutiveSummary = useMemo(() => {
    const activeBeneficiaries = beneficiaries.filter(b => b.status === 'active').length;
    const activePrograms = programs.filter(p => p.is_active).length;
    const activeProjects = projects.filter(p => p.status === 'active').length;
    const totalReports = reportsData
      ? reportsData.homeVisits.length + reportsData.schoolVisits.length +
        reportsData.programReports.length + reportsData.activityReports.length +
        reportsData.businessVisits.length
      : 0;
    const totalDonorFunds = donors.reduce((sum, d) => sum + (d.amount_received || 0), 0);
    const avgPerf = staffMetrics.length > 0
      ? Math.round(staffMetrics.reduce((s, m) => s + m.performanceScore, 0) / staffMetrics.length)
      : 0;

    // Risk alerts: overloaded staff + follow-ups pending
    const overloadedStaff = staffMetrics.filter(s => s.workloadLevel === 'overloaded').length;
    const pendingFollowUps = visitations.filter(v => v.follow_up_required && !v.follow_up_date).length;
    const lowPerformers = staffMetrics.filter(s => s.performanceScore < 30).length;

    const newEnrollments = enrollments.filter(e => dateRange && isInDateRange(e.created_at, dateRange)).length;

    return {
      totalActiveBeneficiaries: activeBeneficiaries,
      totalPrograms: activePrograms,
      totalProjects: activeProjects,
      totalActiveStaff: staffMetrics.length,
      totalReports,
      totalVisitations: visitations.length,
      totalServices: enrollments.filter(e => e.status === 'active').length,
      avgStaffPerformance: avgPerf,
      totalDonorFunds,
      riskAlerts: overloadedStaff + pendingFollowUps + lowPerformers,
      indicatorAchievement: 0, // Computed separately when indicators are loaded
      newEnrollmentsThisPeriod: newEnrollments,
    };
  }, [beneficiaries, programs, projects, reportsData, donors, staffMetrics, visitations, enrollments, dateRange]);

  // Monthly trends for staff
  const monthlyStaffTrends = useMemo(() => {
    if (!reportsData) return [];
    const months = eachMonthOfInterval({ start: subMonths(new Date(), 5), end: new Date() });
    return months.map(month => {
      const monthStart = startOfMonth(month);
      const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0);
      const range: DateRange = { from: monthStart, to: monthEnd };

      const countInMonth = (reports: any[]) => reports.filter(r => isInDateRange(r.created_at, range)).length;
      const uniqueStaff = new Set<string>();
      [...reportsData.homeVisits, ...reportsData.schoolVisits, ...reportsData.programReports, ...reportsData.activityReports]
        .filter(r => isInDateRange(r.created_at, range))
        .forEach(r => uniqueStaff.add(r.staff || 'Unknown'));

      return {
        month: format(month, 'MMM yyyy'),
        monthShort: format(month, 'MMM'),
        activeStaff: uniqueStaff.size,
        totalReports: countInMonth(reportsData.homeVisits) + countInMonth(reportsData.schoolVisits) +
          countInMonth(reportsData.programReports) + countInMonth(reportsData.activityReports),
        homeVisits: countInMonth(reportsData.homeVisits),
        schoolVisits: countInMonth(reportsData.schoolVisits),
      };
    });
  }, [reportsData]);

  // Program Intelligence
  const programIntelligence = useMemo(() => {
    // Coverage: enrollments per program/project
    const programCoverage = programs.map(p => {
      const programEnrollments = enrollments.filter(e => e.program_id === p.id);
      const activeEnrollments = programEnrollments.filter(e => e.status === 'active');
      const exitedEnrollments = programEnrollments.filter(e => e.status === 'exited' || e.status === 'completed');
      const newInPeriod = programEnrollments.filter(e => dateRange && isInDateRange(e.created_at, dateRange));

      // Get unique beneficiary IDs enrolled in this program
      const enrolledBeneficiaryIds = new Set(programEnrollments.map(e => e.beneficiary_id));
      const enrolledBeneficiaries = beneficiaries.filter(b => enrolledBeneficiaryIds.has(b.id));

      // Gender distribution
      const genderDist = { male: 0, female: 0, other: 0 };
      enrolledBeneficiaries.forEach(b => {
        if (b.gender === 'Male') genderDist.male++;
        else if (b.gender === 'Female') genderDist.female++;
        else genderDist.other++;
      });

      // Age distribution
      const ageDist: Record<string, number> = { '0-5': 0, '6-12': 0, '13-17': 0, '18-25': 0, '26+': 0, 'Unknown': 0 };
      enrolledBeneficiaries.forEach(b => {
        if (!b.date_of_birth) { ageDist['Unknown']++; return; }
        const age = Math.floor((Date.now() - new Date(b.date_of_birth).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
        if (age <= 5) ageDist['0-5']++;
        else if (age <= 12) ageDist['6-12']++;
        else if (age <= 17) ageDist['13-17']++;
        else if (age <= 25) ageDist['18-25']++;
        else ageDist['26+']++;
      });

      // Geographic distribution
      const countyDist: Record<string, number> = {};
      const subCountyDist: Record<string, number> = {};
      enrolledBeneficiaries.forEach(b => {
        const county = b.county || 'Unknown';
        const subCounty = b.sub_county || 'Unknown';
        countyDist[county] = (countyDist[county] || 0) + 1;
        subCountyDist[subCounty] = (subCountyDist[subCounty] || 0) + 1;
      });

      // Program projects
      const programProjects = projects.filter(pr => pr.program_id === p.id);

      // Program visitations
      const programVisitations = visitations.filter(v => {
        const benefIds = enrolledBeneficiaryIds;
        return benefIds.has(v.beneficiary_id);
      });

      // Program activities
      const programActivities = activities.filter(a => a.program_id === p.id);

      return {
        programId: p.id,
        programName: p.name,
        isActive: p.is_active,
        totalEnrolled: programEnrollments.length,
        activeEnrolled: activeEnrollments.length,
        exitedCount: exitedEnrollments.length,
        newEnrollments: newInPeriod.length,
        exitRate: programEnrollments.length > 0 ? Math.round((exitedEnrollments.length / programEnrollments.length) * 100) : 0,
        genderDistribution: genderDist,
        ageDistribution: ageDist,
        countyDistribution: countyDist,
        subCountyDistribution: subCountyDist,
        projectCount: programProjects.length,
        projects: programProjects,
        visitationCount: programVisitations.length,
        activityCount: programActivities.length,
        participantCount: programActivities.reduce((s, a) => s + (a.actual_participants || 0), 0),
      };
    });

    // Overall demographic summary
    const activeBenefs = beneficiaries.filter(b => b.status === 'active');
    const overallGender = { male: 0, female: 0, other: 0 };
    const overallAge: Record<string, number> = { '0-5': 0, '6-12': 0, '13-17': 0, '18-25': 0, '26+': 0, 'Unknown': 0 };
    const overallCounty: Record<string, number> = {};
    const overallType: Record<string, number> = {};

    activeBenefs.forEach(b => {
      if (b.gender === 'Male') overallGender.male++;
      else if (b.gender === 'Female') overallGender.female++;
      else overallGender.other++;

      if (!b.date_of_birth) { overallAge['Unknown']++; }
      else {
        const age = Math.floor((Date.now() - new Date(b.date_of_birth).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
        if (age <= 5) overallAge['0-5']++;
        else if (age <= 12) overallAge['6-12']++;
        else if (age <= 17) overallAge['13-17']++;
        else if (age <= 25) overallAge['18-25']++;
        else overallAge['26+']++;
      }

      const county = b.county || 'Unknown';
      overallCounty[county] = (overallCounty[county] || 0) + 1;

      const type = b.beneficiary_type || 'Unknown';
      overallType[type] = (overallType[type] || 0) + 1;
    });

    // Enrollment monthly trends
    const months = eachMonthOfInterval({ start: subMonths(new Date(), 5), end: new Date() });
    const enrollmentTrends = months.map(month => {
      const monthStart = startOfMonth(month);
      const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0);
      const range: DateRange = { from: monthStart, to: monthEnd };
      const newEnrollments = enrollments.filter(e => isInDateRange(e.created_at, range));
      const exits = enrollments.filter(e => e.exit_date && isInDateRange(e.exit_date, range));
      return {
        month: format(month, 'MMM yyyy'),
        monthShort: format(month, 'MMM'),
        newEnrollments: newEnrollments.length,
        exits: exits.length,
        net: newEnrollments.length - exits.length,
      };
    });

    // Service delivery stats
    const activeServices = enrollments.filter(e => e.status === 'active').length;
    const completedServices = enrollments.filter(e => e.status === 'completed').length;
    const avgServicesPerBeneficiary = activeBenefs.length > 0
      ? Math.round((enrollments.length / activeBenefs.length) * 10) / 10
      : 0;

    return {
      programCoverage,
      overallGender,
      overallAge,
      overallCounty,
      overallType,
      enrollmentTrends,
      activeServices,
      completedServices,
      avgServicesPerBeneficiary,
    };
  }, [beneficiaries, programs, projects, enrollments, visitations, activities, dateRange]);

  // HR Alerts
  const hrAlerts = useMemo(() => {
    const alerts: { type: 'warning' | 'danger' | 'info'; title: string; description: string }[] = [];
    staffMetrics.forEach(s => {
      if (s.workloadLevel === 'overloaded') {
        alerts.push({ type: 'danger', title: `${s.name} is overloaded`, description: `${s.total} reports with very high activity density` });
      }
      if (s.performanceScore < 20 && s.total > 0) {
        alerts.push({ type: 'warning', title: `${s.name} needs support`, description: `Performance score: ${s.performanceScore}/100` });
      }
      if (s.activeDaysCount <= 2 && s.total <= 3) {
        alerts.push({ type: 'info', title: `${s.name} has low activity`, description: `Only ${s.activeDaysCount} active days in period` });
      }
    });
    return alerts.slice(0, 10);
  }, [staffMetrics]);

  const isLoading = loadingBeneficiaries || loadingReports || loadingEnrollments || loadingVisitations || loadingAcademics;

  return {
    beneficiaries,
    programs,
    projects,
    enrollments,
    visitations,
    reportsData,
    academicRecords,
    donors,
    activities,
    observations,
    uploads,
    orgMembers,
    profiles,
    staffMetrics,
    executiveSummary,
    monthlyStaffTrends,
    hrAlerts,
    isLoading,
  };
}

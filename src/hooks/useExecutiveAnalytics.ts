import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "./useOrganization";
import { useMemo } from "react";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import { DateRange } from "react-day-picker";
import { isWithinInterval, differenceInDays, parseISO, startOfMonth, eachMonthOfInterval, subMonths, format } from "date-fns";

export interface StaffMetric {
  name: string;
  homeVisits: number;
  schoolVisits: number;
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

  // Reports (remaining types only)
  // reportsData kept for backward compat with analytics components (empty arrays since tables dropped)
  const reportsData = {
    homeVisits: [] as any[],
    schoolVisits: [] as any[],
    businessVisits: [] as any[],
  };
  const loadingReports = false;

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
    const staffData: Record<string, Omit<StaffMetric, 'activeDaysCount' | 'consistency' | 'performanceScore' | 'workloadLevel'>> = {};

    const getOrCreate = (name: string) => {
      if (!staffData[name]) {
        staffData[name] = {
          name,
          homeVisits: 0, schoolVisits: 0, businessVisits: 0, beneficiariesRegistered: 0,
          observationsRecorded: 0, followUpsCompleted: 0, activitiesFacilitated: 0,
          total: 0, activeDays: new Set(),
        };
      }
      return staffData[name];
    };

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
    const totalReports = visitations.length + observations.length;
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
      indicatorAchievement: 0,
      newEnrollmentsThisPeriod: newEnrollments,
    };
  }, [beneficiaries, programs, projects, donors, staffMetrics, visitations, observations, enrollments, dateRange]);

  // Monthly trends for staff
  const monthlyStaffTrends = useMemo(() => {
    const months = eachMonthOfInterval({ start: subMonths(new Date(), 5), end: new Date() });
    return months.map(month => {
      const monthStart = startOfMonth(month);
      const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0);
      const range: DateRange = { from: monthStart, to: monthEnd };

      const uniqueStaff = new Set<string>();
      visitations
        .filter(v => isInDateRange(v.created_at, range))
        .forEach(v => uniqueStaff.add(v.staff_name || 'Unknown'));

      return {
        month: format(month, 'MMM yyyy'),
        monthShort: format(month, 'MMM'),
        activeStaff: uniqueStaff.size,
        totalReports: visitations.filter(v => isInDateRange(v.created_at, range)).length,
        homeVisits: visitations.filter(v => isInDateRange(v.created_at, range) && v.visit_type === 'home').length,
        schoolVisits: visitations.filter(v => isInDateRange(v.created_at, range) && v.visit_type === 'school').length,
      };
    });
  }, [visitations]);

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

  // Beneficiary Impact Intelligence
  const beneficiaryImpact = useMemo(() => {
    const activeBenefs = beneficiaries.filter(b => b.status === 'active');

    // Academic performance by term (using academicRecords)
    const gradeOrder = ['EE2', 'EE1', 'AE2', 'AE1', 'BE2', 'BE1', 'ME2', 'ME1'];
    const gradeToScore = (g: string | null) => {
      if (!g) return null;
      const idx = gradeOrder.indexOf(g.toUpperCase());
      return idx >= 0 ? gradeOrder.length - idx : null;
    };

    // Term performance aggregation
    const termPerformance: Record<string, { count: number; totalMarks: number; totalOutOf: number; gradeScores: number[]; gradeCounts: number }> = {};
    academicRecords.forEach(r => {
      const key = `${r.academic_year}-${r.term}`;
      if (!termPerformance[key]) termPerformance[key] = { count: 0, totalMarks: 0, totalOutOf: 0, gradeScores: [], gradeCounts: 0 };
      const tp = termPerformance[key];
      tp.count++;
      if (r.total_marks != null) tp.totalMarks += r.total_marks;
      if (r.out_of != null) tp.totalOutOf += r.out_of;
      const gs = gradeToScore(r.overall_grade);
      if (gs != null) { tp.gradeScores.push(gs); tp.gradeCounts++; }
    });

    const academicTrends = Object.entries(termPerformance)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-8)
      .map(([key, tp]) => ({
        term: key,
        students: tp.count,
        avgScore: tp.totalOutOf > 0 ? Math.round((tp.totalMarks / tp.totalOutOf) * 100) : 0,
        avgGradeScore: tp.gradeCounts > 0 ? Math.round((tp.gradeScores.reduce((s, v) => s + v, 0) / tp.gradeCounts) * 10) / 10 : 0,
      }));

    // Grade distribution across all records
    const gradeDistribution: Record<string, number> = {};
    academicRecords.forEach(r => {
      if (r.overall_grade) {
        const g = r.overall_grade.toUpperCase();
        gradeDistribution[g] = (gradeDistribution[g] || 0) + 1;
      }
    });

    // Service history per beneficiary
    const serviceCountMap: Record<string, number> = {};
    enrollments.forEach(e => {
      serviceCountMap[e.beneficiary_id] = (serviceCountMap[e.beneficiary_id] || 0) + 1;
    });
    const serviceCounts = Object.values(serviceCountMap);
    const avgServicesPerBenef = serviceCounts.length > 0
      ? Math.round((serviceCounts.reduce((s, v) => s + v, 0) / serviceCounts.length) * 10) / 10
      : 0;
    const multiServiceBenefs = serviceCounts.filter(c => c > 1).length;

    // Visit frequency per beneficiary
    const visitCountMap: Record<string, number> = {};
    const lastVisitMap: Record<string, string> = {};
    visitations.forEach(v => {
      visitCountMap[v.beneficiary_id] = (visitCountMap[v.beneficiary_id] || 0) + 1;
      if (!lastVisitMap[v.beneficiary_id] || v.visit_date > lastVisitMap[v.beneficiary_id]) {
        lastVisitMap[v.beneficiary_id] = v.visit_date;
      }
    });
    const visitCounts = Object.values(visitCountMap);
    const avgVisitsPerBenef = visitCounts.length > 0
      ? Math.round((visitCounts.reduce((s, v) => s + v, 0) / visitCounts.length) * 10) / 10
      : 0;

    // High-risk: no visit in 90+ days
    const now = Date.now();
    const overdue90 = activeBenefs.filter(b => {
      const last = lastVisitMap[b.id];
      if (!last) return true;
      return (now - new Date(last).getTime()) > 90 * 24 * 60 * 60 * 1000;
    }).length;

    // Follow-up tracking
    const totalFollowUpsRequired = visitations.filter(v => v.follow_up_required).length;
    const followUpsWithDate = visitations.filter(v => v.follow_up_required && v.follow_up_date).length;
    const followUpCompletionRate = totalFollowUpsRequired > 0
      ? Math.round((followUpsWithDate / totalFollowUpsRequired) * 100)
      : 100;

    // Vulnerability analysis
    const specialNeedsCount = activeBenefs.filter(b => b.has_special_needs).length;
    const hivPositiveCount = activeBenefs.filter(b => b.hiv_status === 'positive').length;
    const medicalConditionsCount = activeBenefs.filter(b => b.other_medical_conditions).length;
    const missingDOB = activeBenefs.filter(b => !b.date_of_birth).length;
    const missingLocation = activeBenefs.filter(b => !b.county && !b.location).length;

    // Visit type breakdown
    const visitTypeBreakdown: Record<string, number> = {};
    visitations.forEach(v => {
      if (dateRange && !isInDateRange(v.visit_date, dateRange)) return;
      const type = v.visit_type || 'Unknown';
      visitTypeBreakdown[type] = (visitTypeBreakdown[type] || 0) + 1;
    });

    // Service distribution (how many benefs have 0, 1, 2, 3+ services)
    const serviceDistribution = [
      { range: '0 services', count: activeBenefs.filter(b => !serviceCountMap[b.id]).length },
      { range: '1 service', count: serviceCounts.filter(c => c === 1).length },
      { range: '2 services', count: serviceCounts.filter(c => c === 2).length },
      { range: '3+ services', count: serviceCounts.filter(c => c >= 3).length },
    ];

    return {
      academicTrends,
      gradeDistribution,
      avgServicesPerBenef,
      multiServiceBenefs,
      avgVisitsPerBenef,
      overdue90,
      followUpCompletionRate,
      totalFollowUpsRequired,
      specialNeedsCount,
      hivPositiveCount,
      medicalConditionsCount,
      missingDOB,
      missingLocation,
      visitTypeBreakdown,
      serviceDistribution,
      totalBeneficiariesWithVisits: Object.keys(visitCountMap).length,
      visitCoverageRate: activeBenefs.length > 0
        ? Math.round((Object.keys(visitCountMap).length / activeBenefs.length) * 100)
        : 0,
    };
  }, [beneficiaries, academicRecords, enrollments, visitations, dateRange]);

  // Donor & Funding Intelligence
  const donorIntelligence = useMemo(() => {
    const activeBenefs = beneficiaries.filter(b => b.status === 'active');
    const filteredDonors = dateRange?.from
      ? donors.filter(d => d.created_at && isInDateRange(d.created_at, dateRange))
      : donors;

    const totalFunds = donors.reduce((s, d) => s + (d.amount_received || 0), 0);
    const uniqueDonorNames = new Set(donors.map(d => d.donor_name));
    const avgDonation = donors.length > 0 ? Math.round(totalFunds / donors.length) : 0;
    const costPerBeneficiary = activeBenefs.length > 0 ? Math.round(totalFunds / activeBenefs.length) : 0;

    // Donor ranking
    const donorAgg: Record<string, { total: number; donations: number; beneficiaryIds: Set<string> }> = {};
    donors.forEach(d => {
      if (!donorAgg[d.donor_name]) donorAgg[d.donor_name] = { total: 0, donations: 0, beneficiaryIds: new Set() };
      donorAgg[d.donor_name].total += d.amount_received || 0;
      donorAgg[d.donor_name].donations++;
      donorAgg[d.donor_name].beneficiaryIds.add(d.beneficiary_id);
    });
    const donorRanking = Object.entries(donorAgg)
      .map(([name, v]) => ({ name, total: v.total, donations: v.donations, beneficiaries: v.beneficiaryIds.size }))
      .sort((a, b) => b.total - a.total);

    // Top donor concentration
    const topDonorShare = totalFunds > 0 && donorRanking.length > 0
      ? Math.round((donorRanking[0].total / totalFunds) * 100)
      : 0;

    // Program allocation
    const programMap = new Map(programs.map(p => [p.id, p.name]));
    const programFunds: Record<string, number> = {};
    let unallocatedFunds = 0;
    donors.forEach(d => {
      if (d.program_id && programMap.has(d.program_id)) {
        const pName = programMap.get(d.program_id)!;
        programFunds[pName] = (programFunds[pName] || 0) + (d.amount_received || 0);
      } else {
        unallocatedFunds += d.amount_received || 0;
      }
    });
    const programAllocation = Object.entries(programFunds)
      .map(([program, amount]) => ({ program, amount, percentage: totalFunds > 0 ? Math.round((amount / totalFunds) * 100) : 0 }))
      .sort((a, b) => b.amount - a.amount);

    // Monthly trends
    const months = eachMonthOfInterval({ start: subMonths(new Date(), 5), end: new Date() });
    const monthlyTrends = months.map(month => {
      const monthStart = startOfMonth(month);
      const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0);
      const range: DateRange = { from: monthStart, to: monthEnd };
      const inMonth = donors.filter(d => d.donation_date ? isInDateRange(d.donation_date, range) : d.created_at ? isInDateRange(d.created_at, range) : false);
      return {
        month: format(month, 'MMM'),
        amount: inMonth.reduce((s, d) => s + (d.amount_received || 0), 0),
        count: inMonth.length,
      };
    });

    // Growth: compare last 3 months vs previous 3 months
    const recentMonths = monthlyTrends.slice(-3);
    const olderMonths = monthlyTrends.slice(0, 3);
    const recentTotal = recentMonths.reduce((s, m) => s + m.amount, 0);
    const olderTotal = olderMonths.reduce((s, m) => s + m.amount, 0);
    const fundingGrowth = olderTotal > 0 ? Math.round(((recentTotal - olderTotal) / olderTotal) * 100) : recentTotal > 0 ? 100 : 0;

    // Beneficiary coverage
    const beneficiaryIdsWithDonors = new Set(donors.map(d => d.beneficiary_id));
    const beneficiariesWithDonors = activeBenefs.filter(b => beneficiaryIdsWithDonors.has(b.id)).length;

    return {
      totalFunds,
      uniqueDonors: uniqueDonorNames.size,
      totalDonations: donors.length,
      avgDonation,
      costPerBeneficiary,
      donorRanking,
      programAllocation,
      monthlyTrends,
      topDonorShare,
      unallocatedFunds,
      fundingGrowth,
      beneficiariesWithDonors,
      beneficiariesWithoutDonors: activeBenefs.length - beneficiariesWithDonors,
    };
  }, [beneficiaries, donors, programs, dateRange]);

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

  // Real-time subscriptions for executive analytics data
  useRealtimeSubscription([
    { table: "beneficiaries", queryKeys: [["exec-beneficiaries", orgId || ""]], orgId, enabled: !!orgId },
    { table: "beneficiary_services", queryKeys: [["exec-enrollments", orgId || ""]], orgId, enabled: !!orgId },
    { table: "beneficiary_visitations", queryKeys: [["exec-visitations", orgId || ""]], orgId, enabled: !!orgId },
    { table: "beneficiary_academics", queryKeys: [["exec-academics", orgId || ""]], orgId, enabled: !!orgId },
    { table: "beneficiary_donors", queryKeys: [["exec-donors", orgId || ""]], orgId, enabled: !!orgId },
    { table: "programs", queryKeys: [["exec-programs", orgId || ""]], orgId, enabled: !!orgId },
  ]);

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
    programIntelligence,
    beneficiaryImpact,
    donorIntelligence,
    isLoading,
  };
}

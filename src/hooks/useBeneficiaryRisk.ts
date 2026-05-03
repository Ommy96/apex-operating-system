import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";

export interface RiskFactor {
  category: "funding" | "academic" | "participation" | "welfare";
  label: string;
  points: number;
  detail: string;
}

export interface BeneficiaryRiskResult {
  score: number;
  level: "low" | "medium" | "high";
  factors: RiskFactor[];
}

function computeRiskLevel(score: number): "low" | "medium" | "high" {
  if (score >= 71) return "high";
  if (score >= 41) return "medium";
  return "low";
}

export function useBeneficiaryRisk(beneficiaryId: string | undefined) {
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.organization_id;

  return useQuery({
    queryKey: ["beneficiary-risk", beneficiaryId, orgId],
    queryFn: async (): Promise<BeneficiaryRiskResult> => {
      if (!beneficiaryId || !orgId) return { score: 0, level: "low", factors: [] };

      const factors: RiskFactor[] = [];

      // Parallel data fetches
      const [
        { data: beneficiary },
        { data: donors },
        { data: enrollments },
        { data: observations },
        { data: academics },
        { data: progressions },
        { data: visitations },
      ] = await Promise.all([
        supabase.from("beneficiaries").select("status, date_of_birth, gender, county, grade, academic_level").eq("id", beneficiaryId).single(),
        supabase.from("beneficiary_donors").select("amount_received").eq("beneficiary_id", beneficiaryId),
        supabase.from("beneficiary_services").select("status, enrolled_date").eq("beneficiary_id", beneficiaryId),
        supabase.from("program_observations").select("id, observation_type, created_at").eq("organization_id", orgId).limit(100),
        supabase.from("beneficiary_academics").select("total_marks, out_of, academic_year, term").eq("beneficiary_id", beneficiaryId).order("academic_year", { ascending: false }),
        supabase.from("beneficiary_progression_history").select("is_repeating, progression_type, academic_year").eq("beneficiary_id", beneficiaryId),
        supabase.from("beneficiary_visitations").select("visit_date, observation_findings").eq("beneficiary_id", beneficiaryId).order("visit_date", { ascending: false }),
      ]);

      // 1. FUNDING RISK
      const totalFunding = (donors || []).reduce((s, d) => s + (d.amount_received || 0), 0);
      if (donors?.length === 0) {
        factors.push({ category: "funding", label: "Completely Unfunded", points: 25, detail: "No donors or sponsors linked" });
      } else if (totalFunding === 0) {
        factors.push({ category: "funding", label: "Zero Funding Received", points: 20, detail: "Donors linked but $0 received" });
      } else if (totalFunding < 100) {
        factors.push({ category: "funding", label: "Low Funding", points: 10, detail: `Only ${totalFunding} received` });
      }

      // 2. ACADEMIC RISK
      const repeats = (progressions || []).filter(p => p.is_repeating);
      if (repeats.length >= 2) {
        factors.push({ category: "academic", label: "Multiple Repeated Grades", points: 25, detail: `Repeated ${repeats.length} academic years` });
      } else if (repeats.length === 1) {
        factors.push({ category: "academic", label: "Repeated Grade", points: 15, detail: "Repeated one academic year" });
      }

      // Academic performance decline
      if (academics && academics.length >= 2) {
        const recent = academics[0];
        const previous = academics[1];
        if (recent.total_marks && previous.total_marks && recent.out_of && previous.out_of) {
          const recentPct = (recent.total_marks / recent.out_of) * 100;
          const prevPct = (previous.total_marks / previous.out_of) * 100;
          const decline = prevPct - recentPct;
          if (decline > 20) {
            factors.push({ category: "academic", label: "Significant Academic Decline", points: 20, detail: `Performance dropped ${Math.round(decline)}% from previous term` });
          } else if (decline > 10) {
            factors.push({ category: "academic", label: "Academic Performance Declining", points: 10, detail: `Performance dropped ${Math.round(decline)}% from previous term` });
          }
        }
      }

      // 3. PARTICIPATION RISK
      const activeEnrollments = (enrollments || []).filter(e => e.status === "active");
      if (enrollments && enrollments.length > 0 && activeEnrollments.length === 0) {
        factors.push({ category: "participation", label: "No Active Program Enrollment", points: 20, detail: "Previously enrolled but no current active programs" });
      } else if (!enrollments || enrollments.length === 0) {
        factors.push({ category: "participation", label: "Never Enrolled in Programs", points: 15, detail: "Not enrolled in any program" });
      }

      // 4. WELFARE RISK - Visitation gaps
      if (visitations && visitations.length > 0) {
        const lastVisit = new Date(visitations[0].visit_date);
        const daysSince = Math.floor((Date.now() - lastVisit.getTime()) / (1000 * 60 * 60 * 24));
        if (daysSince > 180) {
          factors.push({ category: "welfare", label: "No Recent Visit (6+ months)", points: 20, detail: `Last visited ${daysSince} days ago` });
        } else if (daysSince > 90) {
          factors.push({ category: "welfare", label: "Overdue Visit (90+ days)", points: 10, detail: `Last visited ${daysSince} days ago` });
        }
      } else {
        factors.push({ category: "welfare", label: "Never Visited", points: 15, detail: "No visitation records found" });
      }

      // Negative observations from visitations
      const negativeVisits = (visitations || []).filter(v =>
        v.observation_findings && (
          v.observation_findings.toLowerCase().includes("concern") ||
          v.observation_findings.toLowerCase().includes("poor") ||
          v.observation_findings.toLowerCase().includes("decline") ||
          v.observation_findings.toLowerCase().includes("risk") ||
          v.observation_findings.toLowerCase().includes("negative")
        )
      );
      if (negativeVisits.length >= 2) {
        factors.push({ category: "welfare", label: "Multiple Negative Observations", points: 15, detail: `${negativeVisits.length} concerning field observations recorded` });
      }

      // Data completeness risk
      if (beneficiary) {
        const missing: string[] = [];
        if (!beneficiary.date_of_birth) missing.push("DOB");
        if (!beneficiary.gender) missing.push("Gender");
        if (!beneficiary.county) missing.push("County");
        if (missing.length >= 2) {
          factors.push({ category: "welfare", label: "Incomplete Profile Data", points: 5, detail: `Missing: ${missing.join(", ")}` });
        }
      }

      const rawScore = factors.reduce((s, f) => s + f.points, 0);
      const score = Math.min(100, rawScore);

      return { score, level: computeRiskLevel(score), factors };
    },
    enabled: !!beneficiaryId && !!orgId,
    staleTime: 5 * 60 * 1000,
  });
}

// Hook for org-wide risk summary
export function useOrgRiskSummary() {
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.organization_id;

  return useQuery({
    queryKey: ["org-risk-summary", orgId],
    queryFn: async () => {
      if (!orgId) return { highRisk: 0, mediumRisk: 0, lowRisk: 0, topRisks: [] as any[], programRisks: [] as any[], fundingAtRisk: 0 };

      // Fetch all active beneficiaries with their key risk data
      const [
        { data: beneficiaries },
        { data: allDonors },
        { data: allEnrollments },
        { data: allProgressions },
        { data: allVisitations },
        { data: programs },
      ] = await Promise.all([
        supabase.from("beneficiaries").select("id, display_name, status, photo_url, beneficiary_type").eq("organization_id", orgId).eq("status", "active").is("deleted_at", null),
        supabase.from("beneficiary_donors").select("beneficiary_id, amount_received").eq("organization_id", orgId),
        supabase.from("beneficiary_services").select("beneficiary_id, status").eq("organization_id", orgId),
        supabase.from("beneficiary_progression_history").select("beneficiary_id, is_repeating").eq("organization_id", orgId),
        supabase.from("beneficiary_visitations").select("beneficiary_id, visit_date").eq("organization_id", orgId),
        supabase.from("programs").select("id, name, status").eq("organization_id", orgId),
      ]);

      if (!beneficiaries) return { highRisk: 0, mediumRisk: 0, lowRisk: 0, topRisks: [], programRisks: [], fundingAtRisk: 0 };

      // Quick risk scoring per beneficiary
      const scored = beneficiaries.map(b => {
        let score = 0;
        const bDonors = (allDonors || []).filter(d => d.beneficiary_id === b.id);
        const totalFunding = bDonors.reduce((s, d) => s + (d.amount_received || 0), 0);
        if (bDonors.length === 0) score += 25;
        else if (totalFunding === 0) score += 20;

        const bRepeats = (allProgressions || []).filter(p => p.beneficiary_id === b.id && p.is_repeating);
        if (bRepeats.length >= 1) score += 15;

        const bEnrollments = (allEnrollments || []).filter(e => e.beneficiary_id === b.id);
        if (bEnrollments.length === 0) score += 15;

        const bVisits = (allVisitations || []).filter(v => v.beneficiary_id === b.id);
        if (bVisits.length === 0) score += 15;
        else {
          const latest = bVisits.sort((a, b) => new Date(b.visit_date).getTime() - new Date(a.visit_date).getTime())[0];
          const daysSince = Math.floor((Date.now() - new Date(latest.visit_date).getTime()) / (1000 * 60 * 60 * 24));
          if (daysSince > 90) score += 10;
        }

        return { ...b, riskScore: Math.min(100, score), riskLevel: computeRiskLevel(Math.min(100, score)) };
      });

      const highRisk = scored.filter(s => s.riskLevel === "high").length;
      const mediumRisk = scored.filter(s => s.riskLevel === "medium").length;
      const lowRisk = scored.filter(s => s.riskLevel === "low").length;
      const topRisks = scored.sort((a, b) => b.riskScore - a.riskScore).slice(0, 10);

      // Funding at risk
      const unfundedCount = beneficiaries.filter(b => !(allDonors || []).some(d => d.beneficiary_id === b.id)).length;

      // Program risk
      const programRisks = (programs || []).map(p => {
        const enrolled = (allEnrollments || []).filter(e => e.status === "active");
        const total = enrolled.length || 1;
        // Simplified program risk
        return { id: p.id, name: p.name, status: p.status, enrolledCount: enrolled.length };
      });

      return { highRisk, mediumRisk, lowRisk, topRisks, programRisks, fundingAtRisk: unfundedCount };
    },
    enabled: !!orgId,
    staleTime: 5 * 60 * 1000,
  });
}

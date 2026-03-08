import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { toast } from 'sonner';

export interface BeneficiaryRisk {
  beneficiaryId: string;
  beneficiaryName: string;
  riskScore: number;
  riskLevel: 'high' | 'medium' | 'low';
  riskFactors: string[];
  suggestedIntervention: string;
  interventionReason: string;
  program?: string;
  location?: string;
}

export interface FundingGap {
  programId: string;
  programName: string;
  totalBudget: number;
  totalFunding: number;
  totalSpent?: number;
  fundingGap: number;
  utilizationPercent?: number;
  beneficiariesImpacted?: number;
  severity: 'critical' | 'warning' | 'healthy';
  recommendation: string;
  suggestedDonors?: string[];
}

export interface DonorOpportunity {
  donorName: string;
  programName: string;
  programId?: string;
  potentialAmount?: number;
  matchScore: number;
  rationale: string;
  priorityLevel: 'high' | 'medium' | 'low';
  historicalContribution?: number;
}

export interface AIInsightsData {
  beneficiaryRisks: BeneficiaryRisk[];
  fundingGaps: FundingGap[];
  donorOpportunities: DonorOpportunity[];
  executiveSummary: string;
  generatedAt: string;
}

export function useAIInsights() {
  const [data, setData] = useState<AIInsightsData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { currentOrganization } = useOrganization();

  const generateInsights = useCallback(async (insightType: string = 'all') => {
    if (!currentOrganization?.organization_id) {
      toast.error('No organization selected');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data: result, error: fnError } = await supabase.functions.invoke('ai-smart-insights', {
        body: { organizationId: currentOrganization.organization_id, insightType },
      });

      if (fnError) throw new Error(fnError.message);
      if (result?.error) {
        if (result.error.includes('Rate limit')) toast.error('Rate limit exceeded. Try again shortly.');
        else if (result.error.includes('credits')) toast.error('AI credits exhausted. Add funds in workspace settings.');
        else throw new Error(result.error);
        return;
      }

      setData({
        ...result.insights,
        generatedAt: result.generatedAt,
      });
    } catch (e: any) {
      const msg = e.message || 'Failed to generate insights';
      setError(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  }, [currentOrganization?.organization_id]);

  return { data, isLoading, error, generateInsights };
}

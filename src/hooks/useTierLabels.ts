import { useQuery } from '@tanstack/react-query';
import { useOrganization } from './useOrganization';
import { supabase } from '@/integrations/supabase/client';

const DEFAULTS = {
  program: 'Programme',
  project: 'Project',
  activity: 'Activity',
};

function pluralise(term: string): string {
  if (!term) return term;
  if (/y$/i.test(term) && !/[aeiou]y$/i.test(term)) return term.replace(/y$/i, 'ies');
  if (/(s|x|z|ch|sh)$/i.test(term)) return term + 'es';
  return term + 's';
}

export interface TierLabels {
  program: string;
  project: string;
  activity: string;
  programPlural: string;
  projectPlural: string;
  activityPlural: string;
  programLower: string;
  projectLower: string;
  activityLower: string;
  programPluralLower: string;
  projectPluralLower: string;
  activityPluralLower: string;
  isLoading: boolean;
}

export function useTierLabels(): TierLabels {
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.organization_id;

  const query = useQuery({
    queryKey: ['org-tier-labels', orgId],
    queryFn: async () => {
      if (!orgId) return DEFAULTS;
      const { data, error } = await (supabase as any)
        .from('organizations')
        .select('tier_label_program, tier_label_project, tier_label_activity')
        .eq('id', orgId)
        .maybeSingle();
      if (error || !data) return DEFAULTS;
      return {
        program: (data.tier_label_program || DEFAULTS.program).trim() || DEFAULTS.program,
        project: (data.tier_label_project || DEFAULTS.project).trim() || DEFAULTS.project,
        activity: (data.tier_label_activity || DEFAULTS.activity).trim() || DEFAULTS.activity,
      };
    },
    enabled: !!orgId,
    staleTime: 5 * 60 * 1000,
  });

  const values = query.data ?? DEFAULTS;
  const programPlural = pluralise(values.program);
  const projectPlural = pluralise(values.project);
  const activityPlural = pluralise(values.activity);

  return {
    program: values.program,
    project: values.project,
    activity: values.activity,
    programPlural,
    projectPlural,
    activityPlural,
    programLower: values.program.toLowerCase(),
    projectLower: values.project.toLowerCase(),
    activityLower: values.activity.toLowerCase(),
    programPluralLower: programPlural.toLowerCase(),
    projectPluralLower: projectPlural.toLowerCase(),
    activityPluralLower: activityPlural.toLowerCase(),
    isLoading: query.isLoading,
  };
}
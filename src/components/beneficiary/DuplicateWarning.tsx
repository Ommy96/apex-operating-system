import { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle, ExternalLink } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface DuplicateWarningProps {
  firstName: string;
  lastName: string;
  dateOfBirth?: string;
  phone?: string;
  nationalId?: string;
}

export function DuplicateWarning({ firstName, lastName, dateOfBirth, phone, nationalId }: DuplicateWarningProps) {
  const { currentOrganization } = useOrganization();
  const { user } = useAuth();
  const orgId = currentOrganization?.organization_id;
  const [dismissed, setDismissed] = useState(false);

  const searchKey = `${firstName}-${lastName}-${dateOfBirth}`.toLowerCase();

  const { data: duplicates = [] } = useQuery({
    queryKey: ['dedup-check', orgId, searchKey, phone, nationalId],
    queryFn: async () => {
      if (!firstName || !lastName) return [];
      let query = supabase
        .from('beneficiaries')
        .select('id, first_name, last_name, date_of_birth, status')
        .eq('organization_id', orgId!)
        .is('deleted_at', null)
        .ilike('first_name', firstName)
        .ilike('last_name', lastName)
        .limit(5);

      const { data } = await query;
      return data || [];
    },
    enabled: !!orgId && !!firstName && !!lastName && firstName.length >= 2 && lastName.length >= 2 && !dismissed,
    staleTime: 5000,
  });

  if (dismissed || duplicates.length === 0) return null;

  const handleDismiss = async () => {
    setDismissed(true);
    // Log to audit
    await supabase.from('audit_logs').insert({
      event_type: 'deduplication_dismissed',
      entity_type: 'beneficiary',
      user_id: user?.id,
      metadata: { new_name: `${firstName} ${lastName}`, matched_ids: duplicates.map((d: any) => d.id) },
    });
  };

  return (
    <Alert className="border-yellow-300 bg-yellow-50 dark:bg-yellow-950/20">
      <AlertTriangle className="h-4 w-4 text-yellow-600" />
      <AlertDescription>
        <p className="font-medium text-yellow-800 dark:text-yellow-200 mb-2">Possible duplicate beneficiaries found</p>
        <div className="space-y-1">
          {duplicates.map((d: any) => (
            <div key={d.id} className="flex items-center justify-between text-sm">
              <span>{d.first_name} {d.last_name} {d.date_of_birth ? `(DOB: ${d.date_of_birth})` : ''} — {d.status}</span>
              <Button variant="link" size="sm" className="h-auto p-0" onClick={() => window.open(`/beneficiary/${d.id}`, '_blank')}>
                View <ExternalLink className="h-3 w-3 ml-1" />
              </Button>
            </div>
          ))}
        </div>
        <Button variant="outline" size="sm" className="mt-2" onClick={handleDismiss}>
          Not a duplicate — continue registration
        </Button>
      </AlertDescription>
    </Alert>
  );
}

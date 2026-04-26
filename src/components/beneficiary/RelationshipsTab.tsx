import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { Loader2, Plus, Trash2, Users, Home, ExternalLink } from 'lucide-react';
import {
  useBeneficiaryRelationships,
  useRemoveRelationship,
  useHousehold,
} from '@/hooks/useBeneficiaryRelationships';
import { RELATIONSHIP_LABELS, type RelationshipType } from '@/lib/householdUtils';
import { AddRelationshipSheet } from './AddRelationshipSheet';
import { calculateAge } from '@/lib/ageUtils';

interface RelationshipsTabProps {
  beneficiary: {
    id: string;
    display_name: string;
    last_name?: string | null;
    county?: string | null;
    household_id?: string | null;
    date_of_birth?: string | null;
  };
}

export function RelationshipsTab({ beneficiary }: RelationshipsTabProps) {
  const navigate = useNavigate();
  const { data: rels = [], isLoading } = useBeneficiaryRelationships(beneficiary.id);
  const { data: household } = useHousehold(beneficiary.household_id || undefined);
  const removeRel = useRemoveRelationship();
  const [addOpen, setAddOpen] = useState(false);

  return (
    <div className="space-y-4">
      {household && (
        <Card className="p-4 bg-primary/5 border-primary/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/15 flex items-center justify-center">
                <Home className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="text-sm font-semibold">{household.household_name || 'Household'}</div>
                <div className="text-xs text-muted-foreground">
                  {household.member_count ?? 0} member{household.member_count === 1 ? '' : 's'}
                  {household.county ? ` · ${household.county}` : ''}
                </div>
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={() => navigate(`/households/${household.id}`)}>
              <ExternalLink className="h-3.5 w-3.5 mr-1" /> Open household
            </Button>
          </div>
        </Card>
      )}

      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold flex items-center gap-2">
            <Users className="h-4 w-4" /> Relationships
          </h3>
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Add relationship
          </Button>
        </div>

        {isLoading && (
          <div className="py-6 text-center text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin inline mr-2" /> Loading…
          </div>
        )}

        {!isLoading && rels.length === 0 && (
          <p className="text-sm text-muted-foreground py-4">
            No relationships recorded yet. Link {beneficiary.display_name} to a parent, child, sibling, spouse or guardian.
          </p>
        )}

        <div className="space-y-2">
          {rels.map((rel) => {
            const related = rel.related;
            const age = calculateAge(related?.date_of_birth || null);
            const label = RELATIONSHIP_LABELS[rel.relationship_type as RelationshipType] || 'Related to';
            return (
              <div
                key={rel.id}
                className="flex items-center gap-3 p-3 rounded-lg border hover:bg-secondary/30 transition-colors"
              >
                <div className="h-9 w-9 rounded-full bg-secondary flex items-center justify-center text-xs font-semibold shrink-0">
                  {related?.display_name?.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{related?.display_name || 'Unknown'}</div>
                  <div className="text-xs text-muted-foreground">
                    <Badge variant="outline" className="mr-1.5">
                      {label.replace(' of', '')}
                    </Badge>
                    {age !== null ? `${age}y` : ''}
                    {related?.household_id ? ' · In household' : ''}
                  </div>
                </div>
                {related?.id && (
                  <Button size="sm" variant="ghost" onClick={() => navigate(`/beneficiaries/${related.id}`)}>
                    View
                  </Button>
                )}
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  onClick={() => removeRel.mutate({ id: rel.id })}
                >
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </div>
            );
          })}
        </div>
      </Card>

      <AddRelationshipSheet
        open={addOpen}
        onOpenChange={setAddOpen}
        currentBeneficiary={beneficiary}
      />
    </div>
  );
}
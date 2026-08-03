import { logger } from "@/lib/logger";
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, Plus, Search, UserPlus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';

interface Sibling {
  id: string;
  display_name: string;
  relationship: string;
}

interface SiblingSelectorProps {
  selectedSiblings: Sibling[];
  onChange: (siblings: Sibling[]) => void;
  excludeId?: string;
}

export function SiblingSelector({ selectedSiblings, onChange, excludeId }: SiblingSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedRelationship, setSelectedRelationship] = useState('sibling');
  const { currentOrganization } = useOrganization();

  useEffect(() => {
    const searchBeneficiaries = async () => {
      if (!searchTerm || searchTerm.length < 2 || !currentOrganization?.organization_id) {
        setSearchResults([]);
        return;
      }

      setIsSearching(true);
      try {
        const { data, error } = await supabase
          .from('beneficiaries')
          .select('id, display_name, beneficiary_type')
          .eq('organization_id', currentOrganization.organization_id)
          .eq('beneficiary_type', 'student')
          .ilike('display_name', `%${searchTerm}%`)
          .limit(10);

        if (error) throw error;

        // Filter out already selected siblings and the current beneficiary
        const filtered = (data || []).filter(
          (b) => 
            b.id !== excludeId && 
            !selectedSiblings.some((s) => s.id === b.id)
        );
        setSearchResults(filtered);
      } catch (error) {
        logger.error('Error searching beneficiaries:', error);
      } finally {
        setIsSearching(false);
      }
    };

    const debounce = setTimeout(searchBeneficiaries, 300);
    return () => clearTimeout(debounce);
  }, [searchTerm, currentOrganization?.organization_id, selectedSiblings, excludeId]);

  const addSibling = (beneficiary: any) => {
    const newSibling: Sibling = {
      id: beneficiary.id,
      display_name: beneficiary.display_name,
      relationship: selectedRelationship,
    };
    onChange([...selectedSiblings, newSibling]);
    setSearchTerm('');
    setSearchResults([]);
  };

  const removeSibling = (id: string) => {
    onChange(selectedSiblings.filter((s) => s.id !== id));
  };

  const updateRelationship = (id: string, relationship: string) => {
    onChange(
      selectedSiblings.map((s) =>
        s.id === id ? { ...s, relationship } : s
      )
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search for siblings..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={selectedRelationship} onValueChange={setSelectedRelationship}>
            <SelectTrigger className="w-full sm:w-[140px]">
              <SelectValue placeholder="Relationship" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sibling">Sibling</SelectItem>
              <SelectItem value="brother">Brother</SelectItem>
              <SelectItem value="sister">Sister</SelectItem>
              <SelectItem value="step_sibling">Step Sibling</SelectItem>
              <SelectItem value="half_sibling">Half Sibling</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isSearching && (
          <p className="text-sm text-muted-foreground">Searching...</p>
        )}

        {searchResults.length > 0 && (
          <div className="border rounded-lg divide-y max-h-48 overflow-y-auto">
            {searchResults.map((result) => (
              <div
                key={result.id}
                className="flex items-center justify-between p-3 hover:bg-muted/50 cursor-pointer"
                onClick={() => addSibling(result)}
              >
                <div>
                  <p className="font-medium">{result.display_name}</p>
                  <p className="text-sm text-muted-foreground capitalize">
                    {result.beneficiary_type}
                  </p>
                </div>
                <Button variant="ghost" size="sm">
                  <UserPlus className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedSiblings.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">
            Selected Siblings ({selectedSiblings.length})
          </p>
          <div className="flex flex-wrap gap-2">
            {selectedSiblings.map((sibling) => (
              <Badge
                key={sibling.id}
                variant="secondary"
                className="flex items-center gap-2 py-1.5 px-3"
              >
                <span>{sibling.display_name}</span>
                <Select
                  value={sibling.relationship}
                  onValueChange={(value) => updateRelationship(sibling.id, value)}
                >
                  <SelectTrigger className="h-6 w-24 text-xs border-0 bg-transparent p-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sibling">Sibling</SelectItem>
                    <SelectItem value="brother">Brother</SelectItem>
                    <SelectItem value="sister">Sister</SelectItem>
                    <SelectItem value="step_sibling">Step Sibling</SelectItem>
                    <SelectItem value="half_sibling">Half Sibling</SelectItem>
                  </SelectContent>
                </Select>
                <button
                  type="button"
                  onClick={() => removeSibling(sibling.id)}
                  className="ml-1 hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

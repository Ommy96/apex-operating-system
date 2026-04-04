import { logger } from "@/lib/logger";
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { Search, Plus, X, User, GraduationCap } from 'lucide-react';

interface Dependant {
  id: string;
  display_name: string;
  beneficiary_type: string;
  institution_name?: string;
  grade?: string;
}

interface DependantSelectorProps {
  dependants: Dependant[];
  onDependantsChange: (dependants: Dependant[]) => void;
  excludeId?: string;
}

export function DependantSelector({ dependants, onDependantsChange, excludeId }: DependantSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Dependant[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const { currentOrganization } = useOrganization();

  const handleSearch = async () => {
    if (!searchTerm.trim() || !currentOrganization?.organization_id) return;

    setIsSearching(true);
    try {
      // Search for students only (adults can have student dependants)
      const { data, error } = await supabase
        .from('beneficiaries')
        .select('id, display_name, beneficiary_type, institution_name, grade')
        .eq('organization_id', currentOrganization.organization_id)
        .eq('beneficiary_type', 'student')
        .ilike('display_name', `%${searchTerm}%`)
        .limit(10);

      if (error) throw error;

      // Filter out already selected and self
      const filtered = (data || []).filter(
        (b) => 
          b.id !== excludeId && 
          !dependants.some((d) => d.id === b.id)
      );
      
      setSearchResults(filtered);
    } catch (error) {
      logger.error('Error searching beneficiaries:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const addDependant = (dependant: Dependant) => {
    onDependantsChange([...dependants, dependant]);
    setSearchResults(searchResults.filter((r) => r.id !== dependant.id));
    setSearchTerm('');
  };

  const removeDependant = (id: string) => {
    onDependantsChange(dependants.filter((d) => d.id !== id));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <GraduationCap className="h-5 w-5" />
          Dependants (Students)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Link student beneficiaries that this adult is responsible for.
        </p>

        {/* Search */}
        <div className="flex gap-2">
          <Input
            placeholder="Search students by name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          <Button type="button" onClick={handleSearch} disabled={isSearching}>
            <Search className="h-4 w-4" />
          </Button>
        </div>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="border rounded-lg divide-y">
            {searchResults.map((result) => (
              <div
                key={result.id}
                className="p-3 flex items-center justify-between hover:bg-muted/50"
              >
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{result.display_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {result.institution_name} {result.grade && `• Grade ${result.grade}`}
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => addDependant(result)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Selected Dependants */}
        {dependants.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Linked Dependants:</p>
            <div className="flex flex-wrap gap-2">
              {dependants.map((dep) => (
                <Badge
                  key={dep.id}
                  variant="secondary"
                  className="flex items-center gap-2 py-1.5 px-3"
                >
                  <User className="h-3 w-3" />
                  {dep.display_name}
                  <button
                    type="button"
                    onClick={() => removeDependant(dep.id)}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>
        )}

        {dependants.length === 0 && searchResults.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No dependants linked yet. Search to add students.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

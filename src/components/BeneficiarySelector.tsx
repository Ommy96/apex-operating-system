import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Search, User, UserPlus, X, Check } from "lucide-react";
import { useBeneficiaryLinking, ChildForLinking } from "@/hooks/useBeneficiaryLinking";
import { cn } from "@/lib/utils";

interface BeneficiarySelectorProps {
  selectedChild: ChildForLinking | null;
  onSelectChild: (child: ChildForLinking | null) => void;
  onCreateNew: () => void;
  isCreatingNew: boolean;
}

export function BeneficiarySelector({
  selectedChild,
  onSelectChild,
  onCreateNew,
  isCreatingNew,
}: BeneficiarySelectorProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const { children, isLoading } = useBeneficiaryLinking(searchTerm, isSearching);

  // Auto-show search when component mounts
  useEffect(() => {
    if (!selectedChild && !isCreatingNew) {
      setIsSearching(true);
    }
  }, [selectedChild, isCreatingNew]);

  const handleSelectChild = (child: ChildForLinking) => {
    onSelectChild(child);
    setIsSearching(false);
    setSearchTerm("");
  };

  const handleClearSelection = () => {
    onSelectChild(null);
    setIsSearching(true);
  };

  const handleCreateNew = () => {
    onSelectChild(null);
    setIsSearching(false);
    onCreateNew();
  };

  // If a child is selected, show the selection
  if (selectedChild) {
    return (
      <div className="space-y-2">
        <Label>Linked Beneficiary</Label>
        <Card className="p-3 border-primary/50 bg-primary/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">{selectedChild.full_name}</p>
                <div className="flex gap-2 text-sm text-muted-foreground">
                  {selectedChild.student_id && (
                    <span>ID: {selectedChild.student_id}</span>
                  )}
                  {selectedChild.academic_level && (
                    <Badge variant="outline" className="text-xs">
                      {selectedChild.academic_level}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={handleClearSelection}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // If creating new, show the indicator
  if (isCreatingNew) {
    return (
      <div className="space-y-2">
        <Label>Beneficiary</Label>
        <Card className="p-3 border-accent/50 bg-accent/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-accent/20 flex items-center justify-center">
                <UserPlus className="h-5 w-5 text-accent-foreground" />
              </div>
              <div>
                <p className="font-medium">New Beneficiary</p>
                <p className="text-sm text-muted-foreground">
                  Will be added as a new unique beneficiary
                </p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => {
              setIsSearching(true);
            }}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // Show the search interface
  return (
    <div className="space-y-3">
      <Label>Link to Existing Child or Add New</Label>
      <p className="text-sm text-muted-foreground">
        Search for an existing child to avoid duplicate counting, or add as a new beneficiary.
      </p>
      
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by name or Student ID..."
          className="pl-10"
        />
      </div>

      {/* Results */}
      <div className="space-y-2 max-h-[200px] overflow-y-auto">
        {isLoading ? (
          <div className="text-center py-4 text-muted-foreground">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary mx-auto mb-2" />
            Searching...
          </div>
        ) : children.length > 0 ? (
          <>
            <p className="text-xs text-muted-foreground px-1">
              {searchTerm ? 'Search results' : 'Recent beneficiaries'}
            </p>
            {children.map((child) => (
              <Card
                key={child.id}
                className={cn(
                  "p-3 cursor-pointer transition-colors hover:bg-accent",
                )}
                onClick={() => handleSelectChild(child)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                      <User className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{child.full_name}</p>
                      <div className="flex gap-2 text-xs text-muted-foreground">
                        {child.student_id && <span>ID: {child.student_id}</span>}
                        {child.gender && <span>• {child.gender}</span>}
                        {child.institution_name && (
                          <span className="truncate max-w-[150px]">• {child.institution_name}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <Check className="h-4 w-4 text-primary opacity-0 group-hover:opacity-100" />
                </div>
              </Card>
            ))}
          </>
        ) : searchTerm ? (
          <div className="text-center py-4 text-muted-foreground text-sm">
            No children found matching "{searchTerm}"
          </div>
        ) : null}
      </div>

      {/* Add New Button */}
      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={handleCreateNew}
      >
        <UserPlus className="h-4 w-4 mr-2" />
        Add as New Beneficiary
      </Button>
    </div>
  );
}

import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, User, Target, DollarSign, FileText, X, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";

interface SearchResult {
  id: string;
  type: "beneficiary" | "program" | "project" | "donor";
  title: string;
  subtitle?: string;
  url: string;
}

const typeConfig = {
  beneficiary: { icon: User, label: "Beneficiary", color: "text-primary" },
  program: { icon: Target, label: "Program", color: "text-accent" },
  project: { icon: FileText, label: "Project", color: "text-info" },
  donor: { icon: DollarSign, label: "Donor", color: "text-success" },
};

export function GlobalSearchBar() {
  const navigate = useNavigate();
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.organization_id;
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const search = async (term: string) => {
    if (!term.trim() || !orgId) {
      setResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const searchTerm = `%${term}%`;
      const [beneficiaries, programs, projects, donors] = await Promise.all([
        supabase
          .from("beneficiaries")
          .select("id, display_name, beneficiary_type, status")
          .eq("organization_id", orgId)
          .ilike("display_name", searchTerm)
          .limit(5),
        supabase
          .from("programs")
          .select("id, name, status")
          .eq("organization_id", orgId)
          .ilike("name", searchTerm)
          .limit(5),
        supabase
          .from("projects")
          .select("id, name, status")
          .eq("organization_id", orgId)
          .ilike("name", searchTerm)
          .limit(5),
        supabase
          .from("beneficiary_donors")
          .select("id, donor_name, beneficiary_id")
          .eq("organization_id", orgId)
          .ilike("donor_name", searchTerm)
          .limit(5),
      ]);

      const mapped: SearchResult[] = [
        ...(beneficiaries.data || []).map((b) => ({
          id: b.id,
          type: "beneficiary" as const,
          title: b.display_name,
          subtitle: `${b.beneficiary_type} · ${b.status}`,
          url: `/beneficiary/${b.id}`,
        })),
        ...(programs.data || []).map((p) => ({
          id: p.id,
          type: "program" as const,
          title: p.name,
          subtitle: p.status || "Active",
          url: `/program/${p.id}`,
        })),
        ...(projects.data || []).map((p) => ({
          id: p.id,
          type: "project" as const,
          title: p.name,
          subtitle: p.status || "Active",
          url: `/programs-management`,
        })),
        ...(donors.data || []).map((d) => ({
          id: d.id,
          type: "donor" as const,
          title: d.donor_name,
          subtitle: "Donor",
          url: `/beneficiary/${d.beneficiary_id}`,
        })),
      ];

      setResults(mapped);
    } catch (err) {
      console.error("Search error:", err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleChange = (value: string) => {
    setQuery(value);
    setShowResults(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(value), 300);
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search beneficiaries, programs, donors..."
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => query && setShowResults(true)}
          className="pl-10 pr-10 h-11 bg-card border-border"
        />
        {query && (
          <button
            onClick={() => { setQuery(""); setResults([]); setShowResults(false); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
          </button>
        )}
      </div>

      {showResults && query.trim() && (
        <div className="absolute top-full mt-1 w-full bg-popover border border-border rounded-lg shadow-lg z-50 max-h-80 overflow-auto">
          {results.length === 0 && !isSearching && (
            <div className="p-4 text-center text-sm text-muted-foreground">No results found</div>
          )}
          {results.map((r) => {
            const cfg = typeConfig[r.type];
            return (
              <button
                key={`${r.type}-${r.id}`}
                onClick={() => { navigate(r.url); setShowResults(false); setQuery(""); }}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted/50 transition-colors text-left"
              >
                <cfg.icon className={`h-4 w-4 ${cfg.color} shrink-0`} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">{r.title}</p>
                  <p className="text-xs text-muted-foreground">{cfg.label} · {r.subtitle}</p>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

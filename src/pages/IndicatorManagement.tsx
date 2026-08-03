import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, Target, Upload } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { PageHeroHeader } from "@/components/PageHeroHeader";
import { useIndicators } from "@/hooks/useIndicators";
import { NewIndicatorWizard } from "@/components/indicators/NewIndicatorWizard";

export default function IndicatorManagement() {
  const { data: indicators, isLoading } = useIndicators();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [wizardOpen, setWizardOpen] = useState(false);

  const filtered = useMemo(() => {
    const list = (indicators ?? []) as any[];
    return list.filter((i) => {
      if (search && !i.name?.toLowerCase().includes(search.toLowerCase())) return false;
      if (levelFilter !== "all" && i.level !== levelFilter) return false;
      if (statusFilter !== "all" && i.publish_status !== statusFilter) return false;
      return true;
    });
  }, [indicators, search, levelFilter, statusFilter]);

  return (
    <TooltipProvider>
      <div className="space-y-6 p-6">
        <PageHeroHeader
          title="Indicators"
          description="Manage the indicators that drive your M&E framework"
          icon={Target}
          actions={
            <div className="flex gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Button variant="outline" disabled>
                      <Upload className="h-4 w-4 mr-1" /> Import
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent>CSV import available in the next release.</TooltipContent>
              </Tooltip>
              <Button onClick={() => setWizardOpen(true)}>
                <Plus className="h-4 w-4 mr-1" /> New indicator
              </Button>
            </div>
          }
        />

        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-2 mb-4">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search indicators..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" />
              </div>
              <Select value={levelFilter} onValueChange={setLevelFilter}>
                <SelectTrigger className="w-full sm:w-[160px]"><SelectValue placeholder="Level" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All levels</SelectItem>
                  <SelectItem value="output">Output</SelectItem>
                  <SelectItem value="outcome">Outcome</SelectItem>
                  <SelectItem value="impact">Impact</SelectItem>
                  <SelectItem value="process">Process</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="retired">Retired</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-12" />
                <Skeleton className="h-12" />
                <Skeleton className="h-12" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Target className="h-10 w-10 mx-auto mb-2 opacity-30" />
                <p>No indicators yet. Create your first indicator to start measuring.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-xs text-muted-foreground border-b">
                    <tr>
                      <th className="py-2 px-2">Name</th>
                      <th className="py-2 px-2 hidden md:table-cell">Level</th>
                      <th className="py-2 px-2 hidden lg:table-cell">Unit</th>
                      <th className="py-2 px-2 hidden lg:table-cell">Target</th>
                      <th className="py-2 px-2">Status</th>
                      <th className="py-2 px-2 hidden md:table-cell">Version</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((ind: any) => (
                      <tr
                        key={ind.id}
                        className="border-b hover:bg-muted/30 cursor-pointer"
                        onClick={() => navigate(`/indicators/${ind.id}`)}
                      >
                        <td className="py-2 px-2 font-medium">
                          <span>{ind.name}</span>
                          {ind.decision_context && (
                            <p className="text-xs text-muted-foreground truncate max-w-[400px]">{ind.decision_context}</p>
                          )}
                        </td>
                        <td className="py-2 px-2 hidden md:table-cell">
                          {ind.level && <Badge variant="outline" className="capitalize">{ind.level}</Badge>}
                        </td>
                        <td className="py-2 px-2 hidden lg:table-cell">{ind.unit ?? "—"}</td>
                        <td className="py-2 px-2 hidden lg:table-cell tabular-nums">{ind.target_value ?? "—"}</td>
                        <td className="py-2 px-2">
                          <Badge variant={ind.publish_status === "published" ? "default" : ind.publish_status === "retired" ? "secondary" : "outline"} className="capitalize">
                            {ind.publish_status ?? (ind.is_active ? "published" : "draft")}
                          </Badge>
                        </td>
                        <td className="py-2 px-2 hidden md:table-cell text-muted-foreground">v{ind.version ?? 1}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <NewIndicatorWizard open={wizardOpen} onOpenChange={setWizardOpen} />
      </div>
    </TooltipProvider>
  );
}
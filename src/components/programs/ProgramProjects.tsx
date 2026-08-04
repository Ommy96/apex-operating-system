import { logger } from "@/lib/logger";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { projectPath } from "@/lib/recordUrls";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, MoreHorizontal, Pencil, Trash2, FolderKanban, Calendar, MapPin, Banknote, Eye } from "lucide-react";
import { Archive, ArchiveRestore } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ProjectForm } from "./ProjectForm";
import { format } from "date-fns";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { useProjectBeneficiaryCounts } from "@/hooks/useProjectBeneficiaryCount";
import { Users } from "lucide-react";

interface Project {
  id: string;
  name: string;
  project_code: string | null;
  description: string | null;
  status: string | null;
  budget: number | null;
  location: string | null;
  start_date: string | null;
  end_date: string | null;
  expected_outputs: string | null;
  program_id: string | null;
  organization_id: string;
  slug: string;
  created_at: string;
  is_archived?: boolean | null;
}

interface ProgramProjectsProps {
  programId: string | undefined;
}

export function ProgramProjects({ programId }: ProgramProjectsProps) {
  const { currentOrganization } = useOrganization();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [archiveProject, setArchiveProject] = useState<Project | null>(null);
  const [deleteProject, setDeleteProject] = useState<Project | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [linkCounts, setLinkCounts] = useState<{ reports: number; enrollments: number; allocations: number; activities: number } | null>(null);
  const [countsLoadingFor, setCountsLoadingFor] = useState<string | null>(null);

  const { data: projects, isLoading } = useQuery({
    queryKey: ['program-projects', programId, showArchived],
    queryFn: async () => {
      if (!programId) return [];
      let q = supabase
        .from('projects')
        .select('*')
        .eq('program_id', programId)
        .order('created_at', { ascending: false });
      if (!showArchived) q = q.eq('is_archived', false);
      const { data, error } = await q;
      if (error) throw error;
      return data as Project[];
    },
    enabled: !!programId,
  });

  const projectIds = (projects || []).map((p) => p.id);
  const { data: beneficiaryCounts = {}, isLoading: countsLoading } =
    useProjectBeneficiaryCounts(projectIds);

  const getStatusBadge = (status: string | null) => {
    const styles: Record<string, string> = {
      planning: "bg-muted text-muted-foreground",
      active: "bg-success/10 text-success border-success/20",
      on_hold: "bg-warning/10 text-warning border-warning/20",
      completed: "bg-primary/10 text-primary border-primary/20",
      cancelled: "bg-destructive/10 text-destructive border-destructive/20",
    };
    return styles[status || "planning"] || styles.planning;
  };

  const formatCurrency = (amount: number | null) => {
    if (!amount) return "-";
    return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(amount);
  };

  const handleEdit = (project: Project) => {
    setSelectedProject(project);
    setShowForm(true);
  };

  const fetchLinkCounts = async (projectId: string) => {
    setCountsLoadingFor(projectId);
    setLinkCounts(null);
    try {
      const [reports, enrollments, allocations, activities] = await Promise.all([
        supabase.from('project_narrative_reports').select('id', { count: 'exact', head: true }).eq('project_id', projectId),
        supabase.from('beneficiary_services').select('id', { count: 'exact', head: true }).eq('project_id', projectId),
        supabase.from('allocations').select('id', { count: 'exact', head: true }).eq('project_id', projectId),
        supabase.from('activities').select('id', { count: 'exact', head: true }).eq('project_id', projectId),
      ]);
      setLinkCounts({
        reports: reports.count || 0,
        enrollments: enrollments.count || 0,
        allocations: allocations.count || 0,
        activities: activities.count || 0,
      });
    } finally {
      setCountsLoadingFor(null);
    }
  };

  const openArchive = async (project: Project) => {
    setArchiveProject(project);
    await fetchLinkCounts(project.id);
  };

  const openDelete = async (project: Project) => {
    setDeleteProject(project);
    await fetchLinkCounts(project.id);
  };

  const translateError = (error: any): string => {
    const msg = (error?.message || '').toString();
    if (msg.includes('foreign key') || error?.code === '23503') {
      return "This project has linked records (reports, enrollments, allocations, or activities) and can't be deleted directly — archive it instead.";
    }
    return msg || 'An unexpected error occurred';
  };

  const handleArchive = async () => {
    if (!archiveProject) return;
    try {
      const { data: userData } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('projects')
        .update({ is_archived: true, archived_at: new Date().toISOString(), archived_by: userData?.user?.id ?? null })
        .eq('id', archiveProject.id);
      if (error) throw error;
      const archivedId = archiveProject.id;
      const archivedName = archiveProject.name;
      toast.success(`Archived "${archivedName}"`, {
        action: {
          label: 'Undo',
          onClick: async () => {
            const { error: e } = await supabase
              .from('projects')
              .update({ is_archived: false, archived_at: null, archived_by: null })
              .eq('id', archivedId);
            if (e) { toast.error(translateError(e)); return; }
            toast.success('Project restored');
            queryClient.invalidateQueries({ queryKey: ['program-projects', programId] });
          },
        },
      });
      queryClient.invalidateQueries({ queryKey: ['program-projects', programId] });
    } catch (error: any) {
      logger.error('Error archiving project:', error);
      toast.error(translateError(error));
    } finally {
      setArchiveProject(null);
      setLinkCounts(null);
    }
  };

  const handleUnarchive = async (project: Project) => {
    const { error } = await supabase
      .from('projects')
      .update({ is_archived: false, archived_at: null, archived_by: null })
      .eq('id', project.id);
    if (error) { toast.error(translateError(error)); return; }
    toast.success(`Restored "${project.name}"`);
    queryClient.invalidateQueries({ queryKey: ['program-projects', programId] });
  };

  const handleHardDelete = async () => {
    if (!deleteProject) return;
    const total = linkCounts ? linkCounts.reports + linkCounts.enrollments + linkCounts.allocations + linkCounts.activities : null;
    if (total !== 0) {
      toast.error("This project has linked records and can't be permanently deleted. Archive it instead.");
      setDeleteProject(null);
      setLinkCounts(null);
      return;
    }
    try {
      const { error } = await supabase.from('projects').delete().eq('id', deleteProject.id);
      if (error) throw error;
      toast.success('Project permanently deleted');
      queryClient.invalidateQueries({ queryKey: ['program-projects', programId] });
    } catch (error: any) {
      logger.error('Error deleting project:', error);
      toast.error(translateError(error));
    } finally {
      setDeleteProject(null);
      setLinkCounts(null);
    }
  };

  const handleFormSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['program-projects', programId] });
    setSelectedProject(null);
  };

  const handleAddNew = () => {
    setSelectedProject(null);
    setShowForm(true);
  };

  if (!programId) {
    return <p className="text-muted-foreground">No program selected</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">Projects</h3>
          <p className="text-sm text-muted-foreground">
            Manage projects and initiatives under this program
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <Switch id="show-archived" checked={showArchived} onCheckedChange={setShowArchived} />
            <Label htmlFor="show-archived" className="text-xs text-muted-foreground cursor-pointer">Show archived</Label>
          </div>
          <Button onClick={handleAddNew} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Project
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : projects?.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FolderKanban className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-2">No Projects Yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              Create your first project to start organizing work under this program.
            </p>
            <Button onClick={handleAddNew} className="gap-2">
              <Plus className="h-4 w-4" />
              Add First Project
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
            <Table className="min-w-[600px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Project</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden sm:table-cell">Location</TableHead>
                  <TableHead className="hidden sm:table-cell">Budget</TableHead>
                  <TableHead className="hidden lg:table-cell">Beneficiaries</TableHead>
                  <TableHead className="hidden md:table-cell">Timeline</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projects?.map((project) => (
                  <TableRow key={project.id} className={`cursor-pointer hover:bg-muted/50 ${project.is_archived ? 'opacity-60' : ''}`} onClick={() => navigate(projectPath(project))}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-primary hover:underline">
                          {project.name}
                          {project.is_archived && <Badge variant="outline" className="ml-2 text-[10px]">Archived</Badge>}
                        </p>
                        {project.project_code && (
                          <p className="text-xs text-muted-foreground">{project.project_code}</p>
                        )}
                        {project.description && (
                          <p className="text-xs text-muted-foreground line-clamp-1 max-w-[300px]">
                            {project.description}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getStatusBadge(project.status)}>
                        {project.status?.replace('_', ' ') || 'Planning'}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {project.location ? (
                        <div className="flex items-center gap-1 text-sm">
                          <MapPin className="h-3 w-3 text-muted-foreground" />
                          {project.location}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {project.budget ? (
                        <div className="flex items-center gap-1 text-sm">
                          <Banknote className="h-3 w-3 text-muted-foreground" />
                          {formatCurrency(project.budget)}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {countsLoading ? (
                        <Skeleton className="h-4 w-10" />
                      ) : (
                        <div className="flex items-center gap-1 text-sm">
                          <Users className="h-3 w-3 text-muted-foreground" />
                          <span className="font-medium">
                            {beneficiaryCounts[project.id] ?? 0}
                          </span>
                          <span className="text-muted-foreground">enrolled</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {project.start_date || project.end_date ? (
                        <div className="flex items-center gap-1 text-sm">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          <span>
                            {project.start_date ? format(new Date(project.start_date), 'MMM yyyy') : '?'}
                            {' - '}
                            {project.end_date ? format(new Date(project.end_date), 'MMM yyyy') : 'Ongoing'}
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(projectPath(project)); }}>
                            <Eye className="h-4 w-4 mr-2" />
                            View Dashboard
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleEdit(project); }}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          {project.is_archived ? (
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleUnarchive(project); }}>
                              <ArchiveRestore className="h-4 w-4 mr-2" />
                              Unarchive
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openArchive(project); }}>
                              <Archive className="h-4 w-4 mr-2" />
                              Archive
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={(e) => { e.stopPropagation(); openDelete(project); }}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete permanently
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
          </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Project Form Dialog */}
      <ProjectForm
        open={showForm}
        onOpenChange={setShowForm}
        programId={programId}
        project={selectedProject}
        onSuccess={handleFormSuccess}
      />

      {/* Archive Confirmation Dialog */}
      <AlertDialog open={!!archiveProject} onOpenChange={(o) => { if (!o) { setArchiveProject(null); setLinkCounts(null); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive "{archiveProject?.name}"?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm">
                <p>It will be hidden from active lists but all linked data is preserved. You can restore it later.</p>
                {countsLoadingFor === archiveProject?.id || !linkCounts ? (
                  <p className="text-muted-foreground">Counting linked records…</p>
                ) : (
                  <ul className="list-disc pl-5 text-muted-foreground">
                    <li>{linkCounts.enrollments} enrolled beneficiaries</li>
                    <li>{linkCounts.reports} narrative reports</li>
                    <li>{linkCounts.allocations} funding allocations</li>
                    <li>{linkCounts.activities} activities</li>
                  </ul>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleArchive}>Archive project</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Hard Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteProject} onOpenChange={(o) => { if (!o) { setDeleteProject(null); setLinkCounts(null); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deleteProject?.name}" permanently?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm">
                {countsLoadingFor === deleteProject?.id || !linkCounts ? (
                  <p className="text-muted-foreground">Checking linked records…</p>
                ) : (linkCounts.reports + linkCounts.enrollments + linkCounts.allocations + linkCounts.activities) === 0 ? (
                  <p className="text-destructive font-medium">This project has no linked records. Permanent deletion cannot be undone.</p>
                ) : (
                  <div className="space-y-2">
                    <p className="text-destructive font-medium">This project has linked records and can't be permanently deleted.</p>
                    <ul className="list-disc pl-5 text-muted-foreground">
                      <li>{linkCounts.enrollments} enrolled beneficiaries</li>
                      <li>{linkCounts.reports} narrative reports</li>
                      <li>{linkCounts.allocations} funding allocations</li>
                      <li>{linkCounts.activities} activities</li>
                    </ul>
                    <p>Archive it instead to keep this history intact.</p>
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleHardDelete}
              disabled={!linkCounts || (linkCounts.reports + linkCounts.enrollments + linkCounts.allocations + linkCounts.activities) !== 0}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

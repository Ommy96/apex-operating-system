import { useState } from "react";
import { Plus, Edit, Trash2, FolderKanban, Calendar, MapPin, Settings2, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useProjects, Project, ProjectFormData } from "@/hooks/useProjects";
import { ProjectForm } from "@/components/ProjectForm";
import { format } from "date-fns";

interface ProgramProjectsProps {
  programId: string;
  programName: string;
  isAdmin: boolean;
}

const statusColors: Record<string, string> = {
  active: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  completed: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  on_hold: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  cancelled: "bg-red-500/10 text-red-600 border-red-500/20",
};

export const ProgramProjects = ({ programId, programName, isAdmin }: ProgramProjectsProps) => {
  const { projects, isLoading, createProject, updateProject, deleteProject, isCreating, isUpdating, isDeleting } = useProjects(programId);
  const [isOpen, setIsOpen] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  const handleCreate = (data: ProjectFormData) => {
    createProject(data, {
      onSuccess: () => setIsFormOpen(false),
    });
  };

  const handleUpdate = (data: ProjectFormData) => {
    if (!editingProject) return;
    updateProject({ id: editingProject.id, data }, {
      onSuccess: () => {
        setEditingProject(null);
        setIsFormOpen(false);
      },
    });
  };

  const handleEdit = (project: Project) => {
    setEditingProject(project);
    setIsFormOpen(true);
  };

  const resetForm = () => {
    setEditingProject(null);
    setIsFormOpen(false);
  };

  if (isLoading) {
    return (
      <div className="ml-4 border-l-2 border-primary/20 pl-4 py-2">
        <div className="animate-pulse flex items-center gap-2">
          <FolderKanban className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Loading projects...</span>
        </div>
      </div>
    );
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="ml-4 border-l-2 border-primary/20 pl-4">
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" className="gap-2 h-8 px-2 text-muted-foreground hover:text-foreground">
            {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            <FolderKanban className="h-4 w-4" />
            <span className="text-xs font-medium">Projects ({projects.length})</span>
          </Button>
        </CollapsibleTrigger>

        <CollapsibleContent className="space-y-2 pt-2">
          {isAdmin && (
            <Dialog open={isFormOpen} onOpenChange={(open) => { if (!open) resetForm(); setIsFormOpen(open); }}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1 w-full justify-start">
                  <Plus className="h-3 w-3" />
                  Add Project
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingProject ? 'Edit Project' : `Add Project to ${programName}`}
                  </DialogTitle>
                </DialogHeader>
                <ProjectForm
                  programId={programId}
                  initialData={editingProject ? {
                    program_id: editingProject.program_id,
                    project_code: editingProject.project_code || "",
                    name: editingProject.name,
                    description: editingProject.description || "",
                    status: editingProject.status,
                    start_date: editingProject.start_date || "",
                    end_date: editingProject.end_date || "",
                    budget: editingProject.budget,
                    location: editingProject.location || "",
                    custom_fields: editingProject.custom_fields,
                  } : undefined}
                  onSubmit={editingProject ? handleUpdate : handleCreate}
                  onCancel={resetForm}
                  isSubmitting={isCreating || isUpdating}
                  mode={editingProject ? 'edit' : 'create'}
                />
              </DialogContent>
            </Dialog>
          )}

          {projects.length === 0 ? (
            <p className="text-xs text-muted-foreground py-2 pl-2">No projects yet</p>
          ) : (
            <div className="space-y-2">
              {projects.map((project) => (
                <Card key={project.id} className="bg-muted/30 border-border/50">
                  <CardHeader className="py-2 px-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          {project.project_code && (
                            <Badge variant="outline" className="text-[10px] h-4">{project.project_code}</Badge>
                          )}
                          <Badge className={`text-[10px] h-4 ${statusColors[project.status]}`}>
                            {project.status.replace('_', ' ')}
                          </Badge>
                        </div>
                        <CardTitle className="text-sm leading-tight">{project.name}</CardTitle>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="py-1 px-3">
                    <div className="flex flex-wrap gap-2 text-[10px] text-muted-foreground">
                      {project.start_date && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(project.start_date), 'MMM dd, yyyy')}
                          {project.end_date && ` - ${format(new Date(project.end_date), 'MMM dd, yyyy')}`}
                        </span>
                      )}
                      {project.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {project.location}
                        </span>
                      )}
                      {project.custom_fields.length > 0 && (
                        <span className="flex items-center gap-1">
                          <Settings2 className="h-3 w-3" />
                          {project.custom_fields.length} fields
                        </span>
                      )}
                    </div>
                    {project.description && (
                      <p className="text-xs text-muted-foreground line-clamp-1 mt-1">{project.description}</p>
                    )}
                  </CardContent>
                  {isAdmin && (
                    <CardFooter className="py-1.5 px-3 border-t border-border/50 flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-[10px] px-2"
                        onClick={() => handleEdit(project)}
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 text-[10px] px-2 hover:bg-destructive/10 hover:text-destructive"
                          >
                            <Trash2 className="h-3 w-3 mr-1" />
                            Delete
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Project</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{project.name}"? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteProject(project.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </CardFooter>
                  )}
                </Card>
              ))}
            </div>
          )}
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
};

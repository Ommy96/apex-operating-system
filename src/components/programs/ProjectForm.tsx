import { logger } from "@/lib/logger";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useOrganization } from "@/hooks/useOrganization";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface ProjectFormData {
  name: string;
  project_code: string;
  description: string;
  status: string;
  budget: string;
  location: string;
  start_date: string;
  end_date: string;
  expected_outputs: string;
  estimated_cost: string;
  funding_cycle: string;
  funding_model: 'programme' | 'individual_sponsorship' | 'mixed';
  sponsorship_required: boolean;
}

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
}

interface ProjectFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  programId: string;
  project?: Project | null;
  onSuccess: () => void;
}

export function ProjectForm({ open, onOpenChange, programId, project, onSuccess }: ProjectFormProps) {
  const { currentOrganization } = useOrganization();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<ProjectFormData>({
    defaultValues: {
      name: "",
      project_code: "",
      description: "",
      status: "planning",
      budget: "",
      location: "",
      start_date: "",
      end_date: "",
      expected_outputs: "",
      estimated_cost: "",
      funding_cycle: "annually",
      funding_model: "programme",
      sponsorship_required: false,
    },
  });

  const status = watch("status");
  const fundingModel = watch("funding_model");
  const sponsorshipRequired = fundingModel === "individual_sponsorship" || fundingModel === "mixed";
  const fundingCycle = watch("funding_cycle");

  // Populate form when editing
  useEffect(() => {
    if (project) {
      reset({
        name: project.name || "",
        project_code: project.project_code || "",
        description: project.description || "",
        status: project.status || "planning",
        budget: project.budget?.toString() || "",
        location: project.location || "",
        start_date: project.start_date || "",
        end_date: project.end_date || "",
        expected_outputs: project.expected_outputs || "",
        estimated_cost: (project as any).estimated_cost?.toString() || "",
        funding_cycle: (project as any).funding_cycle || "annually",
        sponsorship_required: (project as any).sponsorship_required || false,
      });
    } else {
      reset({
        name: "",
        project_code: "",
        description: "",
        status: "planning",
        budget: "",
        location: "",
        start_date: "",
        end_date: "",
        expected_outputs: "",
        estimated_cost: "",
        funding_cycle: "annually",
        sponsorship_required: false,
      });
    }
  }, [project, reset]);

  const generateSlug = (name: string) => {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  };

  const onSubmit = async (data: ProjectFormData) => {
    if (!currentOrganization?.organization_id) {
      toast.error("No organization selected");
      return;
    }

    if (!data.name.trim()) {
      toast.error("Project name is required");
      return;
    }

    setIsSubmitting(true);

    try {
      const projectData: any = {
        name: data.name,
        project_code: data.project_code || null,
        description: data.description || null,
        status: data.status || "planning",
        budget: data.budget ? parseFloat(data.budget) : null,
        location: data.location || null,
        start_date: data.start_date || null,
        end_date: data.end_date || null,
        expected_outputs: data.expected_outputs || null,
        estimated_cost: data.estimated_cost ? parseFloat(data.estimated_cost) : 0,
        funding_cycle: data.funding_cycle || "annually",
        sponsorship_required: data.sponsorship_required || false,
        program_id: programId,
        organization_id: currentOrganization.organization_id,
        slug: generateSlug(data.name),
      };

      if (project) {
        // Update existing project
        const { error } = await supabase
          .from('projects')
          .update(projectData)
          .eq('id', project.id);

        if (error) throw error;
        toast.success("Project updated successfully");
      } else {
        // Create new project
        const { error } = await supabase
          .from('projects')
          .insert(projectData);

        if (error) throw error;
        toast.success("Project created successfully");
      }

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      logger.error('Error saving project:', error);
      toast.error(error.message || "Failed to save project");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{project ? "Edit Project" : "Add New Project"}</DialogTitle>
          <DialogDescription>
            {project ? "Update the project details below." : "Create a new project under this program."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Project Name *</Label>
              <Input
                id="name"
                placeholder="e.g., School Fees Support 2024"
                {...register("name", { required: "Project name is required" })}
              />
              {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="project_code">Project Code</Label>
              <Input
                id="project_code"
                placeholder="e.g., SFS-2024-001"
                {...register("project_code")}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Brief description of the project..."
              className="min-h-[80px]"
              {...register("description")}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={status} onValueChange={(value) => setValue("status", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="planning">Planning</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="on_hold">On Hold</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="budget">Budget (KES)</Label>
              <Input
                id="budget"
                type="number"
                placeholder="e.g., 500000"
                {...register("budget")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                placeholder="e.g., Nairobi County"
                {...register("location")}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_date">Start Date</Label>
              <Input
                id="start_date"
                type="date"
                {...register("start_date")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="end_date">End Date</Label>
              <Input
                id="end_date"
                type="date"
                {...register("end_date")}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="expected_outputs">Expected Outputs</Label>
            <Textarea
              id="expected_outputs"
              placeholder="List the expected deliverables and outcomes..."
              className="min-h-[80px]"
              {...register("expected_outputs")}
            />
          </div>

          {/* Sponsorship Settings */}
          <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
            <div className="flex items-center justify-between">
              <div>
                <Label>Sponsorship Need</Label>
                <p className="text-xs text-muted-foreground">Mark this project as a sponsorship need for beneficiaries</p>
              </div>
              <Switch
                checked={sponsorshipRequired}
                onCheckedChange={(checked) => setValue("sponsorship_required", checked)}
              />
            </div>

            {sponsorshipRequired && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="estimated_cost">Cost Per Beneficiary (KES) *</Label>
                  <Input
                    id="estimated_cost"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="e.g., 40000"
                    {...register("estimated_cost")}
                  />
                  <p className="text-xs text-muted-foreground">Expected sponsorship cost per beneficiary</p>
                </div>

                <div className="space-y-2">
                  <Label>Funding Cycle</Label>
                  <Select value={fundingCycle} onValueChange={(v) => setValue("funding_cycle", v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="annually">Annually</SelectItem>
                      <SelectItem value="termly">Termly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="one_time">One-Time</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {project ? "Update Project" : "Create Project"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

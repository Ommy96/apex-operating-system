import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings2, Calendar, DollarSign, MapPin } from "lucide-react";
import { ProgramFieldBuilder, FieldDefinition } from "@/components/ProgramFieldBuilder";
import { ProjectFormData } from "@/hooks/useProjects";

interface ProjectFormProps {
  initialData?: Partial<ProjectFormData>;
  programId: string;
  onSubmit: (data: ProjectFormData) => void;
  onCancel: () => void;
  isSubmitting: boolean;
  mode: 'create' | 'edit';
}

export const ProjectForm = ({
  initialData,
  programId,
  onSubmit,
  onCancel,
  isSubmitting,
  mode,
}: ProjectFormProps) => {
  const [formData, setFormData] = useState<ProjectFormData>({
    program_id: programId,
    project_code: "",
    name: "",
    description: "",
    status: "active",
    start_date: "",
    end_date: "",
    budget: null,
    location: "",
    custom_fields: [],
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        program_id: initialData.program_id || programId,
        project_code: initialData.project_code || "",
        name: initialData.name || "",
        description: initialData.description || "",
        status: initialData.status || "active",
        start_date: initialData.start_date || "",
        end_date: initialData.end_date || "",
        budget: initialData.budget ?? null,
        location: initialData.location || "",
        custom_fields: initialData.custom_fields || [],
      });
    }
  }, [initialData, programId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit}>
      <Tabs defaultValue="basic" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="basic">Basic Info</TabsTrigger>
          <TabsTrigger value="fields">
            <Settings2 className="h-4 w-4 mr-2" />
            Custom Fields
          </TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="project_code">Project Code</Label>
              <Input
                id="project_code"
                value={formData.project_code}
                onChange={(e) => setFormData({ ...formData, project_code: e.target.value })}
                placeholder="e.g., PRJ-001"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value: ProjectFormData['status']) => 
                  setFormData({ ...formData, status: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="on_hold">On Hold</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Project Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Enter project name"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Enter project description"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_date" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Start Date
              </Label>
              <Input
                id="start_date"
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_date" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                End Date
              </Label>
              <Input
                id="end_date"
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="budget" className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Budget
              </Label>
              <Input
                id="budget"
                type="number"
                value={formData.budget ?? ""}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  budget: e.target.value ? parseFloat(e.target.value) : null 
                })}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location" className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Location
              </Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="Project location"
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="fields" className="mt-4">
          <ProgramFieldBuilder
            fields={formData.custom_fields}
            onChange={(fields) => setFormData({ ...formData, custom_fields: fields })}
          />
        </TabsContent>
      </Tabs>

      <div className="flex justify-end gap-2 pt-4 mt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {mode === 'edit' ? 'Update' : 'Create'} Project
        </Button>
      </div>
    </form>
  );
};

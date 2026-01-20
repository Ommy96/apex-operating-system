import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { ProgramFieldBuilder, FieldDefinition } from "./ProgramFieldBuilder";
import { Json } from "@/integrations/supabase/types";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useOrganization } from "@/hooks/useOrganization";

interface ReportTemplateFormProps {
  isOpen: boolean;
  onClose: () => void;
  editingTemplate?: {
    id: string;
    name: string;
    description: string | null;
    category: string;
    fields: FieldDefinition[];
    header_config: Record<string, unknown>;
    is_active: boolean;
  } | null;
}

const REPORT_CATEGORIES = [
  { value: "general", label: "General Report" },
  { value: "visit", label: "Visit Report" },
  { value: "program", label: "Program Report" },
  { value: "activity", label: "Activity Report" },
  { value: "financial", label: "Financial Report" },
  { value: "assessment", label: "Assessment Report" },
];

export const ReportTemplateForm = ({ isOpen, onClose, editingTemplate }: ReportTemplateFormProps) => {
  const queryClient = useQueryClient();
  const { currentOrganization } = useOrganization();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "general",
    fields: [] as FieldDefinition[],
    header_config: {} as Record<string, unknown>,
    is_active: true,
  });

  useEffect(() => {
    if (editingTemplate) {
      setFormData({
        name: editingTemplate.name,
        description: editingTemplate.description || "",
        category: editingTemplate.category || "general",
        fields: editingTemplate.fields || [],
        header_config: editingTemplate.header_config || {},
        is_active: editingTemplate.is_active,
      });
    } else {
      setFormData({
        name: "",
        description: "",
        category: "general",
        fields: [],
        header_config: {},
        is_active: true,
      });
    }
  }, [editingTemplate, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error("Report template name is required");
      return;
    }

    if (!currentOrganization?.organization_id) {
      toast.error("No organization selected");
      return;
    }

    setIsSubmitting(true);
    try {
      const templateData = {
        name: formData.name,
        description: formData.description || null,
        category: formData.category,
        fields: formData.fields as unknown as Json,
        header_config: formData.header_config as unknown as Json,
        is_active: formData.is_active,
        organization_id: currentOrganization.organization_id,
      };

      if (editingTemplate) {
        const { error } = await supabase
          .from('report_templates')
          .update(templateData)
          .eq('id', editingTemplate.id);
        if (error) throw error;
        toast.success("Report template updated successfully");
      } else {
        const { error } = await supabase
          .from('report_templates')
          .insert([templateData]);
        if (error) throw error;
        toast.success("Report template created successfully");
      }

      queryClient.invalidateQueries({ queryKey: ['report-templates'] });
      onClose();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error";
      toast.error("Failed to save report template: " + message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingTemplate ? "Edit Report Template" : "Create Report Template"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="fields">Report Fields</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="name">Template Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Monthly Program Report"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {REPORT_CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe when this report should be used"
                  rows={3}
                />
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label htmlFor="is_active">Active</Label>
              </div>
            </TabsContent>

            <TabsContent value="fields" className="mt-4">
              <ProgramFieldBuilder
                fields={formData.fields}
                onChange={(fields) => setFormData({ ...formData, fields })}
              />
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-2 pt-4 mt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : editingTemplate ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

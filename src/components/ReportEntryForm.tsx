import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Json } from "@/integrations/supabase/types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { FieldDefinition } from "./ProgramFieldBuilder";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useOrganization } from "@/hooks/useOrganization";

interface ReportTemplate {
  id: string;
  name: string;
  fields: FieldDefinition[];
}

interface ReportEntryFormProps {
  isOpen: boolean;
  onClose: () => void;
  template: ReportTemplate;
  editingEntry?: {
    id: string;
    data: Record<string, unknown>;
    report_date: string;
    status: string;
  } | null;
}

export const ReportEntryForm = ({ isOpen, onClose, template, editingEntry }: ReportEntryFormProps) => {
  const queryClient = useQueryClient();
  const { currentOrganization } = useOrganization();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);
  const [formData, setFormData] = useState<Record<string, unknown>>({});

  useEffect(() => {
    if (editingEntry) {
      setFormData(editingEntry.data || {});
      setReportDate(editingEntry.report_date);
    } else {
      // Initialize form with default values
      const initialData: Record<string, unknown> = {};
      template.fields.forEach(field => {
        initialData[field.name] = field.type === 'checkbox' ? false : '';
      });
      setFormData(initialData);
      setReportDate(new Date().toISOString().split('T')[0]);
    }
  }, [editingEntry, template, isOpen]);

  const handleFieldChange = (fieldName: string, value: unknown) => {
    setFormData(prev => ({ ...prev, [fieldName]: value }));
  };

  const handleSubmit = async (e: React.FormEvent, status: string = 'draft') => {
    e.preventDefault();

    if (!currentOrganization?.organization_id) {
      toast.error("No organization selected");
      return;
    }

    // Validate required fields
    const missingRequired = template.fields
      .filter(f => f.required && !formData[f.name])
      .map(f => f.name);

    if (missingRequired.length > 0) {
      toast.error(`Please fill in required fields: ${missingRequired.join(', ')}`);
      return;
    }

    setIsSubmitting(true);
    try {
      const entryData = {
        template_id: template.id,
        organization_id: currentOrganization.organization_id,
        data: formData as Json,
        report_date: reportDate,
        status,
      };

      if (editingEntry) {
        const { error } = await supabase
          .from('report_entries')
          .update(entryData)
          .eq('id', editingEntry.id);
        if (error) throw error;
        toast.success("Report updated successfully");
      } else {
        const { error } = await supabase
          .from('report_entries')
          .insert([entryData]);
        if (error) throw error;
        toast.success(status === 'submitted' ? "Report submitted successfully" : "Report saved as draft");
      }

      queryClient.invalidateQueries({ queryKey: ['report-entries'] });
      onClose();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error";
      toast.error("Failed to save report: " + message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderField = (field: FieldDefinition) => {
    const value = formData[field.name];

    switch (field.type) {
      case 'textarea':
        return (
          <Textarea
            value={String(value || '')}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            placeholder={`Enter ${field.name.toLowerCase()}`}
            rows={4}
          />
        );

      case 'number':
        return (
          <Input
            type="number"
            value={String(value || '')}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            placeholder={`Enter ${field.name.toLowerCase()}`}
          />
        );

      case 'date':
        return (
          <Input
            type="date"
            value={String(value || '')}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
          />
        );

      case 'dropdown':
        return (
          <Select
            value={String(value || '')}
            onValueChange={(val) => handleFieldChange(field.name, val)}
          >
            <SelectTrigger>
              <SelectValue placeholder={`Select ${field.name.toLowerCase()}`} />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'checkbox':
        return (
          <div className="flex items-center gap-2">
            <Checkbox
              id={field.id}
              checked={Boolean(value)}
              onCheckedChange={(checked) => handleFieldChange(field.name, checked)}
            />
            <Label htmlFor={field.id} className="text-sm font-normal">
              {field.name}
            </Label>
          </div>
        );

      default:
        return (
          <Input
            type="text"
            value={String(value || '')}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            placeholder={`Enter ${field.name.toLowerCase()}`}
          />
        );
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingEntry ? `Edit ${template.name}` : `New ${template.name}`}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={(e) => handleSubmit(e, 'submitted')}>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="report_date">Report Date *</Label>
              <Input
                id="report_date"
                type="date"
                value={reportDate}
                onChange={(e) => setReportDate(e.target.value)}
                required
              />
            </div>

            {template.fields.map((field) => (
              <div key={field.id} className="space-y-2">
                {field.type !== 'checkbox' && (
                  <Label>
                    {field.name}
                    {field.required && <span className="text-destructive ml-1">*</span>}
                  </Label>
                )}
                {renderField(field)}
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-2 pt-4 mt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              type="button" 
              variant="secondary"
              disabled={isSubmitting}
              onClick={(e) => handleSubmit(e as unknown as React.FormEvent, 'draft')}
            >
              Save Draft
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Submitting..." : "Submit Report"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

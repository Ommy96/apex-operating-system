import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FieldDefinition } from "./ProgramFieldBuilder";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient, useQuery } from "@tanstack/react-query";

interface Child {
  id: string;
  first_name: string;
  last_name: string;
}

interface DynamicProgramFormProps {
  programId: string;
  programName: string;
  fields: FieldDefinition[];
  isOpen: boolean;
  onClose: () => void;
  editingEntry?: { id: string; data: Record<string, unknown>; child_id?: string | null } | null;
}

export const DynamicProgramForm = ({
  programId,
  programName,
  fields,
  isOpen,
  onClose,
  editingEntry,
}: DynamicProgramFormProps) => {
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<Record<string, unknown>>(
    editingEntry?.data || {}
  );
  const [selectedChildId, setSelectedChildId] = useState<string | null>(
    editingEntry?.child_id || null
  );

  // Fetch children for selection
  const { data: children } = useQuery({
    queryKey: ['children-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('children')
        .select('id, first_name, last_name')
        .eq('status', 'active')
        .order('first_name');
      if (error) throw error;
      return data as Child[];
    },
  });

  // Reset form when editingEntry changes
  useEffect(() => {
    setFormData(editingEntry?.data || {});
    setSelectedChildId(editingEntry?.child_id || null);
  }, [editingEntry]);

  const handleChange = (fieldName: string, value: unknown) => {
    setFormData({ ...formData, [fieldName]: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Validate required fields
      for (const field of fields) {
        if (field.required && !formData[field.name]) {
          toast.error(`${field.name} is required`);
          setIsSubmitting(false);
          return;
        }
      }

      const { data: userData } = await supabase.auth.getUser();

      if (editingEntry) {
        const { error } = await supabase
          .from('program_entries')
          .update({ 
            data: formData as unknown as Record<string, never>,
            child_id: selectedChildId,
          })
          .eq('id', editingEntry.id);
        if (error) throw error;
        toast.success('Entry updated successfully');
      } else {
        const { error } = await supabase
          .from('program_entries')
          .insert([{
            program_id: programId,
            data: formData as unknown as Record<string, never>,
            created_by: userData?.user?.id,
            child_id: selectedChildId,
          }]);
        if (error) throw error;
        toast.success('Entry created successfully');
      }

      queryClient.invalidateQueries({ queryKey: ['program-entries', programId] });
      onClose();
      setFormData({});
      setSelectedChildId(null);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'An error occurred';
      toast.error('Failed to save entry: ' + message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderField = (field: FieldDefinition) => {
    const value = formData[field.name];

    switch (field.type) {
      case 'text':
        return (
          <Input
            value={(value as string) || ''}
            onChange={(e) => handleChange(field.name, e.target.value)}
            placeholder={`Enter ${field.name.toLowerCase()}`}
          />
        );
      case 'number':
        return (
          <Input
            type="number"
            value={(value as number) ?? ''}
            onChange={(e) => handleChange(field.name, e.target.value ? Number(e.target.value) : '')}
            placeholder={`Enter ${field.name.toLowerCase()}`}
          />
        );
      case 'date':
        return (
          <Input
            type="date"
            value={(value as string) || ''}
            onChange={(e) => handleChange(field.name, e.target.value)}
          />
        );
      case 'textarea':
        return (
          <Textarea
            value={(value as string) || ''}
            onChange={(e) => handleChange(field.name, e.target.value)}
            placeholder={`Enter ${field.name.toLowerCase()}`}
            rows={3}
          />
        );
      case 'dropdown':
        return (
          <Select
            value={(value as string) || ''}
            onValueChange={(v) => handleChange(field.name, v)}
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
              checked={(value as boolean) || false}
              onCheckedChange={(checked) => handleChange(field.name, checked)}
            />
            <Label htmlFor={field.id} className="text-sm font-normal">
              {field.name}
            </Label>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingEntry ? 'Edit' : 'Add'} {programName} Entry
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Child Selection */}
          <div className="space-y-2">
            <Label>Link to Child</Label>
            <Select
              value={selectedChildId || "none"}
              onValueChange={(v) => setSelectedChildId(v === "none" ? null : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a child (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No child linked</SelectItem>
                {children?.map((child) => (
                  <SelectItem key={child.id} value={child.id}>
                    {child.first_name} {child.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {fields.map((field) => (
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
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : editingEntry ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

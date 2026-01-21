import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { Entity, EntityFormData } from "@/hooks/useEntities";
import { FieldDefinition } from "@/components/ProgramFieldBuilder";

interface EntityFormProps {
  entity?: Entity | null;
  fieldSchema: FieldDefinition[];
  entityTypeName: string;
  onSubmit: (data: EntityFormData) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}

export function EntityForm({ 
  entity, 
  fieldSchema, 
  entityTypeName,
  onSubmit, 
  onCancel, 
  isSubmitting 
}: EntityFormProps) {
  const [displayName, setDisplayName] = useState("");
  const [status, setStatus] = useState("active");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [fieldData, setFieldData] = useState<Record<string, unknown>>({});

  useEffect(() => {
    if (entity) {
      setDisplayName(entity.display_name);
      setStatus(entity.status);
      setTags(entity.tags || []);
      setFieldData(entity.data || {});
    } else {
      // Initialize with empty values for each field
      const initialData: Record<string, unknown> = {};
      fieldSchema.forEach(field => {
        if (field.type === 'checkbox') {
          initialData[field.name] = false;
        } else {
          initialData[field.name] = '';
        }
      });
      setFieldData(initialData);
    }
  }, [entity, fieldSchema]);

  const handleFieldChange = (fieldName: string, value: unknown) => {
    setFieldData(prev => ({ ...prev, [fieldName]: value }));
  };

  const handleAddTag = () => {
    const trimmed = tagInput.trim();
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
      setTagInput("");
    }
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) return;

    onSubmit({
      display_name: displayName,
      data: fieldData,
      status,
      tags,
    });
  };

  const renderField = (field: FieldDefinition) => {
    const value = fieldData[field.name];

    switch (field.type) {
      case 'text':
        return (
          <Input
            value={(value as string) || ''}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            placeholder={`Enter ${field.name.toLowerCase()}`}
          />
        );
      
      case 'number':
        return (
          <Input
            type="number"
            value={(value as number) || ''}
            onChange={(e) => handleFieldChange(field.name, e.target.value ? Number(e.target.value) : '')}
            placeholder={`Enter ${field.name.toLowerCase()}`}
          />
        );
      
      case 'date':
        return (
          <Input
            type="date"
            value={(value as string) || ''}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
          />
        );
      
      case 'textarea':
        return (
          <Textarea
            value={(value as string) || ''}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            placeholder={`Enter ${field.name.toLowerCase()}`}
            rows={3}
          />
        );
      
      case 'dropdown':
        return (
          <Select
            value={(value as string) || ''}
            onValueChange={(v) => handleFieldChange(field.name, v)}
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
              checked={!!value}
              onCheckedChange={(checked) => handleFieldChange(field.name, !!checked)}
            />
            <span className="text-sm text-muted-foreground">Yes</span>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Display Name - Always Required */}
      <div className="space-y-2">
        <Label htmlFor="display_name">Name / Title *</Label>
        <Input
          id="display_name"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder={`Enter ${entityTypeName.toLowerCase()} name`}
          required
        />
      </div>

      {/* Status */}
      <div className="space-y-2">
        <Label htmlFor="status">Status</Label>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Dynamic Fields */}
      {fieldSchema.length > 0 && (
        <div className="space-y-4 pt-4 border-t">
          <h4 className="font-medium text-sm text-muted-foreground">Additional Fields</h4>
          {fieldSchema.map((field) => (
            <div key={field.id} className="space-y-2">
              <Label>
                {field.name}
                {field.required && <span className="text-destructive ml-1">*</span>}
              </Label>
              {renderField(field)}
            </div>
          ))}
        </div>
      )}

      {/* Tags */}
      <div className="space-y-2 pt-4 border-t">
        <Label>Tags</Label>
        <div className="flex gap-2">
          <Input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddTag();
              }
            }}
            placeholder="Add tags..."
            className="flex-1"
          />
          <Button type="button" variant="outline" onClick={handleAddTag}>
            Add
          </Button>
        </div>
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="gap-1 pr-1">
                {tag}
                <button
                  type="button"
                  onClick={() => handleRemoveTag(tag)}
                  className="ml-1 rounded-full hover:bg-destructive/20 p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting || !displayName.trim()}>
          {entity ? 'Update' : 'Create'} {entityTypeName}
        </Button>
      </div>
    </form>
  );
}

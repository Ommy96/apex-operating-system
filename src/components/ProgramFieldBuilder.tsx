import { useState } from "react";
import { Plus, Trash2, GripVertical, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export interface FieldDefinition {
  id: string;
  name: string;
  type: 'text' | 'number' | 'date' | 'dropdown' | 'textarea' | 'checkbox';
  required: boolean;
  options?: string[]; // For dropdown type
}

interface ProgramFieldBuilderProps {
  fields: FieldDefinition[];
  onChange: (fields: FieldDefinition[]) => void;
}

const generateId = () => Math.random().toString(36).substring(2, 9);

export const ProgramFieldBuilder = ({ fields, onChange }: ProgramFieldBuilderProps) => {
  const [optionInput, setOptionInput] = useState<{ [key: string]: string }>({});

  const addField = () => {
    const newField: FieldDefinition = {
      id: generateId(),
      name: "",
      type: "text",
      required: false,
      options: [],
    };
    onChange([...fields, newField]);
  };

  const removeField = (id: string) => {
    onChange(fields.filter(f => f.id !== id));
  };

  const updateField = (id: string, updates: Partial<FieldDefinition>) => {
    onChange(fields.map(f => f.id === id ? { ...f, ...updates } : f));
  };

  const addOption = (fieldId: string) => {
    const optionValue = optionInput[fieldId]?.trim();
    if (!optionValue) return;
    
    const field = fields.find(f => f.id === fieldId);
    if (field && !field.options?.includes(optionValue)) {
      updateField(fieldId, { options: [...(field.options || []), optionValue] });
      setOptionInput({ ...optionInput, [fieldId]: "" });
    }
  };

  const removeOption = (fieldId: string, option: string) => {
    const field = fields.find(f => f.id === fieldId);
    if (field) {
      updateField(fieldId, { options: field.options?.filter(o => o !== option) });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Custom Fields</Label>
        <Button type="button" variant="outline" size="sm" onClick={addField}>
          <Plus className="h-4 w-4 mr-1" />
          Add Field
        </Button>
      </div>

      {fields.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          No custom fields defined. Add fields to collect data for this program.
        </p>
      ) : (
        <div className="space-y-3">
          {fields.map((field, index) => (
            <Card key={field.id} className="border border-border/50">
              <CardContent className="p-3 space-y-3">
                <div className="flex items-center gap-2">
                  <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                  <span className="text-xs text-muted-foreground">Field {index + 1}</span>
                  <div className="flex-1" />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10"
                    onClick={() => removeField(field.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Field Name</Label>
                    <Input
                      value={field.name}
                      onChange={(e) => updateField(field.id, { name: e.target.value })}
                      placeholder="e.g., Full Name"
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Field Type</Label>
                    <Select
                      value={field.type}
                      onValueChange={(value: FieldDefinition['type']) => updateField(field.id, { type: value })}
                    >
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="text">Text</SelectItem>
                        <SelectItem value="number">Number</SelectItem>
                        <SelectItem value="date">Date</SelectItem>
                        <SelectItem value="dropdown">Dropdown</SelectItem>
                        <SelectItem value="textarea">Text Area</SelectItem>
                        <SelectItem value="checkbox">Checkbox</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Switch
                    id={`required-${field.id}`}
                    checked={field.required}
                    onCheckedChange={(checked) => updateField(field.id, { required: checked })}
                  />
                  <Label htmlFor={`required-${field.id}`} className="text-xs">Required</Label>
                </div>

                {field.type === 'dropdown' && (
                  <div className="space-y-2">
                    <Label className="text-xs">Dropdown Options</Label>
                    <div className="flex gap-2">
                      <Input
                        value={optionInput[field.id] || ""}
                        onChange={(e) => setOptionInput({ ...optionInput, [field.id]: e.target.value })}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addOption(field.id);
                          }
                        }}
                        placeholder="Add option..."
                        className="h-8 text-sm"
                      />
                      <Button type="button" variant="outline" size="sm" onClick={() => addOption(field.id)}>
                        Add
                      </Button>
                    </div>
                    {field.options && field.options.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {field.options.map((option) => (
                          <Badge key={option} variant="secondary" className="gap-1 text-xs pr-1">
                            {option}
                            <button
                              type="button"
                              onClick={() => removeOption(field.id, option)}
                              className="ml-1 rounded-full hover:bg-destructive/20 p-0.5"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

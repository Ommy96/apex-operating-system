import { useState } from "react";
import { Plus, Trash2, GripVertical, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ProgramFieldBuilder, FieldDefinition } from "./ProgramFieldBuilder";

export interface ModuleDefinition {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  custom_fields: FieldDefinition[];
  is_active: boolean;
  sort_order: number;
}

interface ModuleBuilderProps {
  modules: ModuleDefinition[];
  onChange: (modules: ModuleDefinition[]) => void;
}

const ICON_OPTIONS = [
  { value: "FileText", label: "Document" },
  { value: "Users", label: "Users" },
  { value: "GraduationCap", label: "Education" },
  { value: "Heart", label: "Heart" },
  { value: "Home", label: "Home" },
  { value: "Trophy", label: "Trophy" },
  { value: "Star", label: "Star" },
  { value: "Calendar", label: "Calendar" },
  { value: "Briefcase", label: "Briefcase" },
  { value: "Activity", label: "Activity" },
];

const generateId = () => Math.random().toString(36).substr(2, 9);
const generateSlug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export const ModuleBuilder = ({ modules, onChange }: ModuleBuilderProps) => {
  const [expandedModule, setExpandedModule] = useState<string | null>(null);

  const addModule = () => {
    const newModule: ModuleDefinition = {
      id: generateId(),
      name: "",
      slug: "",
      description: "",
      icon: "FileText",
      custom_fields: [],
      is_active: true,
      sort_order: modules.length,
    };
    onChange([...modules, newModule]);
    setExpandedModule(newModule.id);
  };

  const removeModule = (id: string) => {
    onChange(modules.filter(m => m.id !== id));
    if (expandedModule === id) setExpandedModule(null);
  };

  const updateModule = (id: string, updates: Partial<ModuleDefinition>) => {
    onChange(modules.map(m => {
      if (m.id === id) {
        const updated = { ...m, ...updates };
        // Auto-generate slug from name if name changed and slug is empty or matches old auto-generated slug
        if (updates.name && (!m.slug || m.slug === generateSlug(m.name))) {
          updated.slug = generateSlug(updates.name);
        }
        return updated;
      }
      return m;
    }));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-sm font-medium">Program Modules</Label>
          <p className="text-xs text-muted-foreground mt-1">
            Create sub-pages for this program, each with its own data fields
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={addModule}>
          <Plus className="h-4 w-4 mr-1" />
          Add Module
        </Button>
      </div>

      {modules.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center text-muted-foreground">
            <Settings2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No modules defined yet.</p>
            <p className="text-xs mt-1">Add modules to create sub-pages for this program.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {modules.map((module, index) => (
            <Collapsible
              key={module.id}
              open={expandedModule === module.id}
              onOpenChange={(open) => setExpandedModule(open ? module.id : null)}
            >
              <Card className="border border-border/50">
                <CardContent className="p-3">
                  <CollapsibleTrigger asChild>
                    <div className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 rounded p-1 -m-1">
                      <GripVertical className="h-4 w-4 text-muted-foreground" />
                      <span className="text-xs bg-muted px-2 py-0.5 rounded">
                        {index + 1}
                      </span>
                      <span className="font-medium flex-1 truncate">
                        {module.name || "Unnamed Module"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {module.custom_fields.length} fields
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeModule(module.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CollapsibleTrigger>

                  <CollapsibleContent className="mt-4 space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Module Name *</Label>
                        <Input
                          value={module.name}
                          onChange={(e) => updateModule(module.id, { name: e.target.value })}
                          placeholder="e.g., Beneficiaries"
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">URL Slug</Label>
                        <Input
                          value={module.slug}
                          onChange={(e) => updateModule(module.id, { slug: e.target.value })}
                          placeholder="e.g., beneficiaries"
                          className="h-8 text-sm"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Icon</Label>
                        <Select
                          value={module.icon}
                          onValueChange={(value) => updateModule(module.id, { icon: value })}
                        >
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ICON_OPTIONS.map((icon) => (
                              <SelectItem key={icon.value} value={icon.value}>
                                {icon.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center gap-2 pt-5">
                        <Switch
                          id={`active-${module.id}`}
                          checked={module.is_active}
                          onCheckedChange={(checked) => updateModule(module.id, { is_active: checked })}
                        />
                        <Label htmlFor={`active-${module.id}`} className="text-xs">Active</Label>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">Description</Label>
                      <Textarea
                        value={module.description}
                        onChange={(e) => updateModule(module.id, { description: e.target.value })}
                        placeholder="Brief description of this module"
                        className="text-sm min-h-[60px]"
                      />
                    </div>

                    <div className="pt-2 border-t">
                      <ProgramFieldBuilder
                        fields={module.custom_fields}
                        onChange={(fields) => updateModule(module.id, { custom_fields: fields })}
                      />
                    </div>
                  </CollapsibleContent>
                </CardContent>
              </Card>
            </Collapsible>
          ))}
        </div>
      )}
    </div>
  );
};

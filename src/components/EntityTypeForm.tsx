import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProgramFieldBuilder, FieldDefinition } from "@/components/ProgramFieldBuilder";
import { Settings2 } from "lucide-react";
import { EntityType, EntityTypeFormData } from "@/hooks/useEntityTypes";
import { getIconByName, AVAILABLE_ICONS, COLOR_OPTIONS } from "@/lib/iconUtils";

interface EntityTypeFormProps {
  entityType?: EntityType | null;
  onSubmit: (data: EntityTypeFormData) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function EntityTypeForm({ entityType, onSubmit, onCancel, isSubmitting }: EntityTypeFormProps) {
  const [formData, setFormData] = useState<EntityTypeFormData>({
    name: "",
    slug: "",
    description: "",
    icon: "Users",
    color: "blue",
    field_schema: [],
    settings: {},
    is_active: true,
  });

  useEffect(() => {
    if (entityType) {
      setFormData({
        name: entityType.name,
        slug: entityType.slug,
        description: entityType.description || "",
        icon: entityType.icon,
        color: entityType.color,
        field_schema: entityType.field_schema || [],
        settings: entityType.settings || {},
        is_active: entityType.is_active,
      });
    }
  }, [entityType]);

  const handleNameChange = (name: string) => {
    setFormData(prev => ({
      ...prev,
      name,
      // Auto-generate slug if creating new or slug was auto-generated
      slug: !entityType ? generateSlug(name) : prev.slug,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    onSubmit(formData);
  };

  const IconComponent = getIconByName(formData.icon);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Tabs defaultValue="basic" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="basic">Basic Info</TabsTrigger>
          <TabsTrigger value="fields">
            <Settings2 className="h-4 w-4 mr-2" />
            Fields ({formData.field_schema.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="space-y-4 mt-4">
          {/* Name & Slug */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Entity Type Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g., Beneficiaries, Facilities, Farmers"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">URL Slug</Label>
              <Input
                id="slug"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: generateSlug(e.target.value) })}
                placeholder="auto-generated"
              />
            </div>
          </div>

          {/* Icon & Color */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="icon">Icon</Label>
              <Select
                value={formData.icon}
                onValueChange={(value) => setFormData({ ...formData, icon: value })}
              >
                <SelectTrigger>
                  <div className="flex items-center gap-2">
                    <IconComponent className="h-4 w-4" />
                    <SelectValue />
                  </div>
                </SelectTrigger>
                <SelectContent className="max-h-[200px]">
                  {AVAILABLE_ICONS.map((icon) => {
                    const Icon = getIconByName(icon);
                    return (
                      <SelectItem key={icon} value={icon}>
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4" />
                          {icon}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="color">Color Theme</Label>
              <Select
                value={formData.color}
                onValueChange={(value) => setFormData({ ...formData, color: value })}
              >
                <SelectTrigger>
                  <div className="flex items-center gap-2">
                    <div 
                      className="h-4 w-4 rounded-full" 
                      style={{ backgroundColor: `var(--color-${formData.color}, hsl(var(--primary)))` }}
                    />
                    <SelectValue />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {COLOR_OPTIONS.map((color) => (
                    <SelectItem key={color.value} value={color.value}>
                      <div className="flex items-center gap-2">
                        <div 
                          className={`h-4 w-4 rounded-full bg-${color.value}-500`}
                        />
                        {color.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe what this entity type represents..."
              rows={3}
            />
          </div>

          {/* Active Toggle */}
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
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Define the fields that will be collected for each {formData.name || 'entity'}. 
              The "Display Name" field is automatically included.
            </p>
            <ProgramFieldBuilder
              fields={formData.field_schema}
              onChange={(fields) => setFormData({ ...formData, field_schema: fields })}
            />
          </div>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting || !formData.name.trim()}>
          {entityType ? 'Update' : 'Create'} Entity Type
        </Button>
      </div>
    </form>
  );
}

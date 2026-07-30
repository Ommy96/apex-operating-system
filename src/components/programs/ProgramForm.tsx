import { useState } from "react";
import { 
  Plus, MapPin, X, Settings2, Calendar, Users, Target, 
  FileText, Globe, Sparkles, DollarSign 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ProgramFieldBuilder, FieldDefinition } from "@/components/ProgramFieldBuilder";
import { Separator } from "@/components/ui/separator";

export interface ProgramFormData {
  program_id: string;
  name: string;
  locations: string[];
  description: string;
  is_active: boolean;
  custom_fields: FieldDefinition[];
  show_in_navigation: boolean;
  category: string;
  start_date: string;
  end_date: string;
  status: string;
  target_population: string[];
  geographic_coverage: string;
  objectives: string;
  annual_funding_required: number;
}

interface ProgramFormProps {
  formData: ProgramFormData;
  onChange: (data: ProgramFormData) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  isEditing: boolean;
  isLoading: boolean;
}

const programCategories = [
  { value: "education", label: "Education" },
  { value: "health", label: "Health & Wellness" },
  { value: "nutrition", label: "Nutrition & Feeding" },
  { value: "economic", label: "Economic Empowerment" },
  { value: "social", label: "Social Support" },
  { value: "shelter", label: "Shelter & Housing" },
  { value: "protection", label: "Child Protection" },
  { value: "community", label: "Community Development" },
  { value: "other", label: "Other" },
];

const programStatuses = [
  { value: "planning", label: "Planning" },
  { value: "active", label: "Active" },
  { value: "on_hold", label: "On Hold" },
  { value: "completed", label: "Completed" },
  { value: "archived", label: "Archived" },
];

export const ProgramForm = ({
  formData,
  onChange,
  onSubmit,
  onCancel,
  isEditing,
  isLoading,
}: ProgramFormProps) => {
  const [locationInput, setLocationInput] = useState("");
  const [populationInput, setPopulationInput] = useState("");

  const handleAddLocation = () => {
    const trimmedLocation = locationInput.trim();
    if (trimmedLocation && !formData.locations.includes(trimmedLocation)) {
      onChange({ ...formData, locations: [...formData.locations, trimmedLocation] });
      setLocationInput("");
    }
  };

  const handleRemoveLocation = (locationToRemove: string) => {
    onChange({
      ...formData,
      locations: formData.locations.filter((loc) => loc !== locationToRemove),
    });
  };

  const handleLocationKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddLocation();
    }
  };

  const handleAddPopulation = () => {
    const trimmed = populationInput.trim();
    if (trimmed && !formData.target_population.includes(trimmed)) {
      onChange({ ...formData, target_population: [...formData.target_population, trimmed] });
      setPopulationInput("");
    }
  };

  const handleRemovePopulation = (item: string) => {
    onChange({
      ...formData,
      target_population: formData.target_population.filter((p) => p !== item),
    });
  };

  const handlePopulationKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddPopulation();
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <Tabs defaultValue="basic" className="w-full">
        <TabsList className="grid w-full grid-cols-3 h-11 p-1 bg-muted/50 rounded-xl">
          <TabsTrigger 
            value="basic" 
            className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm gap-2"
          >
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Basic Info</span>
          </TabsTrigger>
          <TabsTrigger 
            value="details" 
            className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm gap-2"
          >
            <Target className="h-4 w-4" />
            <span className="hidden sm:inline">Details</span>
          </TabsTrigger>
          <TabsTrigger 
            value="fields" 
            className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm gap-2"
          >
            <Settings2 className="h-4 w-4" />
            <span className="hidden sm:inline">Custom Fields</span>
          </TabsTrigger>
        </TabsList>

        {/* Basic Info Tab */}
        <TabsContent value="basic" className="space-y-6 mt-6">
          <Card className="border-0 shadow-none bg-gradient-to-br from-primary/5 to-transparent">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Program Identity
              </CardTitle>
              <CardDescription>Basic information about the program</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="program_id" className="text-sm font-medium">
                    Program Code
                  </Label>
                  <Input
                    id="program_id"
                    value={formData.program_id}
                    onChange={(e) => onChange({ ...formData, program_id: e.target.value })}
                    placeholder="e.g., PRG-001"
                    className="h-10"
                  />
                  <p className="text-xs text-muted-foreground">
                    Unique identifier for tracking
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category" className="text-sm font-medium">
                    Category
                  </Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => onChange({ ...formData, category: value })}
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {programCategories.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium">
                  Program Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => onChange({ ...formData, name: e.target.value })}
                  placeholder="Enter program name"
                  className="h-10"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-sm font-medium">
                  Description
                </Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => onChange({ ...formData, description: e.target.value })}
                  placeholder="Describe the program's purpose and scope..."
                  rows={3}
                  className="resize-none"
                />
              </div>

              <Separator />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="space-y-0.5">
                    <Label htmlFor="is_active" className="text-sm font-medium cursor-pointer">
                      Active Status
                    </Label>
                    <p className="text-xs text-muted-foreground">Enable to make program active</p>
                  </div>
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => onChange({ ...formData, is_active: checked })}
                  />
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="space-y-0.5">
                    <Label htmlFor="show_in_navigation" className="text-sm font-medium cursor-pointer">
                      Show in Navigation
                    </Label>
                    <p className="text-xs text-muted-foreground">Display in sidebar menu</p>
                  </div>
                  <Switch
                    id="show_in_navigation"
                    checked={formData.show_in_navigation}
                    onCheckedChange={(checked) => onChange({ ...formData, show_in_navigation: checked })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Details Tab */}
        <TabsContent value="details" className="space-y-6 mt-6">
          <Card className="border-0 shadow-none bg-gradient-to-br from-accent/5 to-transparent">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="h-5 w-5 text-accent" />
                Timeline & Status
              </CardTitle>
              <CardDescription>Program dates and current status</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="status" className="text-sm font-medium">
                    Status
                  </Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => onChange({ ...formData, status: value })}
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      {programStatuses.map((status) => (
                        <SelectItem key={status.value} value={status.value}>
                          {status.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="start_date" className="text-sm font-medium">
                    Start Date
                  </Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => onChange({ ...formData, start_date: e.target.value })}
                    className="h-10"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end_date" className="text-sm font-medium">
                    End Date
                  </Label>
                  <Input
                    id="end_date"
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => onChange({ ...formData, end_date: e.target.value })}
                    className="h-10"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-none bg-gradient-to-br from-success/5 to-transparent">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5 text-success" />
                Target & Coverage
              </CardTitle>
              <CardDescription>Define the program's reach</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  Target Populations
                </Label>
                <div className="flex gap-2">
                  <Input
                    value={populationInput}
                    onChange={(e) => setPopulationInput(e.target.value)}
                    onKeyDown={handlePopulationKeyDown}
                    placeholder="e.g., Orphaned children, Single mothers"
                    className="h-10"
                  />
                  <Button type="button" variant="outline" onClick={handleAddPopulation} className="h-10 px-4">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {formData.target_population.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3 p-3 rounded-lg bg-muted/30">
                    {formData.target_population.map((pop) => (
                      <Badge key={pop} variant="secondary" className="gap-1.5 pr-1.5 py-1">
                        <Users className="h-3 w-3" />
                        {pop}
                        <button
                          type="button"
                          onClick={() => handleRemovePopulation(pop)}
                          className="ml-1 rounded-full hover:bg-destructive/20 p-0.5 transition-colors"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="geographic_coverage" className="text-sm font-medium flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  Geographic Coverage
                </Label>
                <Input
                  id="geographic_coverage"
                  value={formData.geographic_coverage}
                  onChange={(e) => onChange({ ...formData, geographic_coverage: e.target.value })}
                  placeholder="e.g., Nairobi, Kiambu, Machakos counties"
                  className="h-10"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Program Locations
                </Label>
                <div className="flex gap-2">
                  <Input
                    value={locationInput}
                    onChange={(e) => setLocationInput(e.target.value)}
                    onKeyDown={handleLocationKeyDown}
                    placeholder="Type location and press Enter"
                    className="h-10"
                  />
                  <Button type="button" variant="outline" onClick={handleAddLocation} className="h-10 px-4">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {formData.locations.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3 p-3 rounded-lg bg-muted/30">
                    {formData.locations.map((loc) => (
                      <Badge key={loc} variant="secondary" className="gap-1.5 pr-1.5 py-1">
                        <MapPin className="h-3 w-3" />
                        {loc}
                        <button
                          type="button"
                          onClick={() => handleRemoveLocation(loc)}
                          className="ml-1 rounded-full hover:bg-destructive/20 p-0.5 transition-colors"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-none bg-gradient-to-br from-warning/5 to-transparent">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Target className="h-5 w-5 text-warning" />
                Objectives
              </CardTitle>
              <CardDescription>Program goals and expected outcomes</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                id="objectives"
                value={formData.objectives}
                onChange={(e) => onChange({ ...formData, objectives: e.target.value })}
                placeholder="List the main objectives of this program..."
                rows={4}
                className="resize-none"
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Custom Fields Tab */}
        <TabsContent value="fields" className="mt-6">
          <Card className="border-0 shadow-none bg-gradient-to-br from-info/5 to-transparent">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Settings2 className="h-5 w-5 text-primary" />
                Custom Data Fields
              </CardTitle>
              <CardDescription>
                Define custom fields to collect program-specific data from beneficiaries
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ProgramFieldBuilder
                fields={formData.custom_fields}
                onChange={(fields) => onChange({ ...formData, custom_fields: fields })}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Form Actions - sticky at bottom */}
      <div className="flex items-center justify-end gap-3 pt-4 pb-2 border-t bg-background sticky bottom-0">
        <Button type="button" variant="outline" onClick={onCancel} className="min-w-[100px]">
          Cancel
        </Button>
        <Button 
          type="submit" 
          disabled={isLoading} 
          className="min-w-[120px]"
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              Saving...
            </span>
          ) : isEditing ? (
            "Update Program"
          ) : (
            "Create Program"
          )}
        </Button>
      </div>
    </form>
  );
};

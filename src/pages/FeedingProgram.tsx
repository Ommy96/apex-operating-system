import { useState } from "react";
import { Plus, Search, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FeedingProgramForm } from "@/components/FeedingProgramForm";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export default function FeedingProgram() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [levelFilter, setLevelFilter] = useState("");

  const { data: feedingPrograms, refetch } = useQuery({
    queryKey: ['feeding-programs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('feeding_program')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const filteredPrograms = feedingPrograms?.filter(program => {
    const matchesSearch = program.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = !typeFilter || program.type === typeFilter;
    const matchesLevel = !levelFilter || program.academic_level === levelFilter;
    
    return matchesSearch && matchesType && matchesLevel;
  });

  const handleSuccess = () => {
    setIsDialogOpen(false);
    refetch();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Feeding Program</h1>
          <p className="text-muted-foreground">Manage feeding program beneficiaries</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Beneficiary
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add Feeding Program Beneficiary</DialogTitle>
            </DialogHeader>
            <FeedingProgramForm
              onSuccess={handleSuccess}
              onCancel={() => setIsDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Types</SelectItem>
            <SelectItem value="Kawangware Lunch Hour">Kawangware Lunch Hour</SelectItem>
            <SelectItem value="Kibera Early Dinner">Kibera Early Dinner</SelectItem>
          </SelectContent>
        </Select>

        <Select value={levelFilter} onValueChange={setLevelFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by level" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Levels</SelectItem>
            <SelectItem value="Pre Primary">Pre Primary</SelectItem>
            <SelectItem value="Lower Primary">Lower Primary</SelectItem>
            <SelectItem value="Upper Primary">Upper Primary</SelectItem>
            <SelectItem value="Junior Secondary">Junior Secondary</SelectItem>
            <SelectItem value="Secondary School">Secondary School</SelectItem>
            <SelectItem value="Tertiary">Tertiary</SelectItem>
            <SelectItem value="Special School">Special School</SelectItem>
            <SelectItem value="Junior School">Junior School</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPrograms?.map((program) => (
          <Card key={program.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex justify-between items-start">
                <span className="text-lg">{program.name}</span>
                <Badge variant={program.type === 'Kawangware Lunch Hour' ? 'default' : 'secondary'}>
                  {program.type}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-sm text-muted-foreground">
                <strong>Gender:</strong> {program.gender || 'Not specified'}
              </div>
              <div className="text-sm text-muted-foreground">
                <strong>Academic Level:</strong> {program.academic_level || 'Not specified'}
              </div>
              <div className="text-sm text-muted-foreground">
                <strong>Grade:</strong> {program.grade || 'Not specified'}
              </div>
              <div className="text-sm text-muted-foreground">
                <strong>Contact:</strong> {program.contact || 'Not provided'}
              </div>
              {program.education_sponsorship && (
                <Badge variant="outline" className="text-green-600 border-green-600">
                  Education Sponsorship
                </Badge>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredPrograms?.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No feeding program beneficiaries found.</p>
        </div>
      )}
    </div>
  );
}
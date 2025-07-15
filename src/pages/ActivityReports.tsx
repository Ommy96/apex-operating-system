import { useState } from "react";
import { Plus, Search, Calendar, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export default function ActivityReports() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [programFilter, setProgramFilter] = useState("");

  const { data: activityReports, refetch } = useQuery({
    queryKey: ['activity-reports'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activity_reports')
        .select('*')
        .order('reporting_date', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const filteredReports = activityReports?.filter(report => {
    const matchesSearch = report.staff.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         report.executive_summary.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesProgram = !programFilter || programFilter === 'all' || report.program === programFilter;
    
    return matchesSearch && matchesProgram;
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Activity Reports</h1>
          <p className="text-muted-foreground">Track and manage activity reports</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Report
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Add Activity Report</DialogTitle>
            </DialogHeader>
            {/* Form component would go here */}
            <div className="p-4 text-center text-muted-foreground">
              Activity Report Form - To be implemented
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by staff or summary..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={programFilter} onValueChange={setProgramFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by program" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Programs</SelectItem>
            <SelectItem value="Education">Education</SelectItem>
            <SelectItem value="Kibera Early Dinner">Kibera Early Dinner</SelectItem>
            <SelectItem value="Kawangware Lunch Hour">Kawangware Lunch Hour</SelectItem>
            <SelectItem value="Kipawa Sato">Kipawa Sato</SelectItem>
            <SelectItem value="Self-Empowerment">Self-Empowerment</SelectItem>
            <SelectItem value="Support Groups">Support Groups</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredReports?.map((report) => (
          <Card key={report.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex justify-between items-start">
                <span className="text-lg">{report.staff}</span>
                <Badge variant="secondary">
                  <Activity className="h-3 w-3 mr-1" />
                  {report.program}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center text-sm text-muted-foreground">
                <Calendar className="h-3 w-3 mr-1" />
                {new Date(report.reporting_date).toLocaleDateString()}
              </div>
              <div className="text-sm">
                <strong>Summary:</strong> {report.executive_summary.substring(0, 120)}...
              </div>
              <div className="text-sm">
                <strong>Impact:</strong> {report.beneficiary_impact.substring(0, 100)}...
              </div>
              <div className="text-sm">
                <strong>Challenges:</strong> {report.challenges.substring(0, 100)}...
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredReports?.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No activity reports found.</p>
        </div>
      )}
    </div>
  );
}
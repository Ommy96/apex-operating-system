import { useState } from "react";
import { Plus, Search, Users, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { SupportGroupForm } from "@/components/SupportGroupForm";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { downloadExcel, formatSupportGroupsData } from "@/lib/downloadUtils";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

export default function SupportGroups() {
  const { isAdmin } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const { data: supportGroups, refetch } = useQuery({
    queryKey: ['support-groups'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('support_groups')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const filteredGroups = supportGroups?.filter(group => {
    const matchesSearch = group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (group.facilitator && group.facilitator.toLowerCase().includes(searchTerm.toLowerCase())) ||
                         (group.team_leader_contact && group.team_leader_contact.toLowerCase().includes(searchTerm.toLowerCase()));
    
    return matchesSearch;
  });

  const handleSuccess = () => {
    setIsDialogOpen(false);
    refetch();
  };

  const handleDownload = () => {
    if (!supportGroups || supportGroups.length === 0) {
      toast({
        title: "No data to download",
        description: "There are no support groups to export.",
        variant: "destructive",
      });
      return;
    }

    const formattedData = formatSupportGroupsData(supportGroups);
    downloadExcel(formattedData, 'support_groups', 'Support Groups');
    
    toast({
      title: "Download started",
      description: "Your support groups are being downloaded.",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Support Groups</h1>
          <p className="text-muted-foreground">Community support and group activities</p>
        </div>
        
        {isAdmin && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Group
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add Support Group</DialogTitle>
            </DialogHeader>
            <SupportGroupForm
              onSuccess={handleSuccess}
              onCancel={() => setIsDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
        )}
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by group name or team leader..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Button onClick={handleDownload} variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Download Excel
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredGroups?.map((group) => (
          <Card key={group.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex justify-between items-start">
                <span className="text-lg">{group.name}</span>
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {group.member_count || 0}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {group.description && (
                <div className="text-sm text-muted-foreground">
                  <strong>Description:</strong> {group.description}
                </div>
              )}
              <div className="text-sm text-muted-foreground">
                <strong>Team Leader:</strong> {group.facilitator || 'Not assigned'}
              </div>
              {group.team_leader_contact && (
                <div className="text-sm text-muted-foreground">
                  <strong>Contact:</strong> {group.team_leader_contact}
                </div>
              )}
              <div className="text-sm text-muted-foreground">
                <strong>Location:</strong> {group.location || 'Not specified'}
              </div>
              {group.meeting_schedule && (
                <div className="text-sm text-muted-foreground">
                  <strong>Schedule:</strong> {group.meeting_schedule}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredGroups?.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No support groups found.</p>
        </div>
      )}
    </div>
  );
}
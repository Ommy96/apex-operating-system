import { useState } from "react";
import { Plus, Search, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SelfEmpowermentForm } from "@/components/SelfEmpowermentForm";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export default function SelfEmpowerment() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [residenceFilter, setResidenceFilter] = useState("");

  const { data: selfEmpowermentRecords, refetch } = useQuery({
    queryKey: ['self-empowerment'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('self_empowerment')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const filteredRecords = selfEmpowermentRecords?.filter(record => {
    const matchesSearch = record.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (record.business_name && record.business_name.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = !statusFilter || record.amount_status === statusFilter;
    const matchesResidence = !residenceFilter || record.residence === residenceFilter;
    
    return matchesSearch && matchesStatus && matchesResidence;
  });

  const handleSuccess = () => {
    setIsDialogOpen(false);
    refetch();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Self-Empowerment</h1>
          <p className="text-muted-foreground">Business support and empowerment program</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Application
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add Self-Empowerment Application</DialogTitle>
            </DialogHeader>
            <SelfEmpowermentForm
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
            placeholder="Search by name or business..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Statuses</SelectItem>
            <SelectItem value="Loan">Loan</SelectItem>
            <SelectItem value="Grant">Grant</SelectItem>
          </SelectContent>
        </Select>

        <Select value={residenceFilter} onValueChange={setResidenceFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by residence" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Residences</SelectItem>
            <SelectItem value="Kibera">Kibera</SelectItem>
            <SelectItem value="Kawangware">Kawangware</SelectItem>
            <SelectItem value="Diaspora">Diaspora</SelectItem>
            <SelectItem value="Outside Nairobi">Outside Nairobi</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredRecords?.map((record) => (
          <Card key={record.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex justify-between items-start">
                <span className="text-lg">{record.full_name}</span>
                <Badge variant={record.amount_status === 'Grant' ? 'default' : 'secondary'}>
                  {record.amount_status || 'Pending'}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-sm text-muted-foreground">
                <strong>Business:</strong> {record.business_name || 'Not specified'}
              </div>
              <div className="text-sm text-muted-foreground">
                <strong>Type:</strong> {record.type_of_business || 'Not specified'}
              </div>
              <div className="text-sm text-muted-foreground">
                <strong>Location:</strong> {record.business_location || 'Not specified'}
              </div>
              <div className="text-sm text-muted-foreground">
                <strong>Residence:</strong> {record.residence || 'Not specified'}
              </div>
              {record.amount_requested && (
                <div className="text-sm text-muted-foreground flex items-center gap-1">
                  <DollarSign className="h-3 w-3" />
                  <strong>Requested:</strong> {Number(record.amount_requested).toLocaleString()}
                </div>
              )}
              {record.amount_approved && (
                <div className="text-sm text-green-600 flex items-center gap-1">
                  <DollarSign className="h-3 w-3" />
                  <strong>Approved:</strong> {Number(record.amount_approved).toLocaleString()}
                </div>
              )}
              <div className="text-sm text-muted-foreground">
                <strong>Contact:</strong> {record.contact || 'Not provided'}
              </div>
              {record.current_status && (
                <div className="text-sm">
                  <strong>Status:</strong> {record.current_status}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredRecords?.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No self-empowerment applications found.</p>
        </div>
      )}
    </div>
  );
}
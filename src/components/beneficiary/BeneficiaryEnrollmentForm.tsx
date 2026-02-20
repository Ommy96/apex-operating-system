import { useState } from 'react';
import { Plus, FolderKanban, X, Check, Heart, DollarSign, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { format } from 'date-fns';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface EnrollmentFormData {
  program_id: string;
  project_id: string;
  enrolled_date: string;
  notes: string;
  // Donor fields (optional)
  donor_name: string;
  amount_received: string;
  donation_date: string;
  donor_notes: string;
}

interface BeneficiaryEnrollmentFormProps {
  beneficiaryId: string;
  showTitle?: boolean;
}

const emptyFormData: EnrollmentFormData = {
  program_id: '',
  project_id: '',
  enrolled_date: new Date().toISOString().split('T')[0],
  notes: '',
  donor_name: '',
  amount_received: '',
  donation_date: new Date().toISOString().split('T')[0],
  donor_notes: '',
};

export const BeneficiaryEnrollmentForm = ({ beneficiaryId, showTitle = true }: BeneficiaryEnrollmentFormProps) => {
  const { currentOrganization } = useOrganization();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formData, setFormData] = useState<EnrollmentFormData>(emptyFormData);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteDonorId, setDeleteDonorId] = useState<string | null>(null);

  // Fetch programs
  const { data: programs } = useQuery({
    queryKey: ['programs-dropdown', currentOrganization?.organization_id],
    queryFn: async () => {
      if (!currentOrganization?.organization_id) return [];
      const { data, error } = await supabase
        .from('programs')
        .select('id, name')
        .eq('organization_id', currentOrganization.organization_id)
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data;
    },
    enabled: !!currentOrganization?.organization_id,
  });

  // Fetch projects for selected program
  const { data: projects } = useQuery({
    queryKey: ['projects-dropdown', formData.program_id],
    queryFn: async () => {
      if (!formData.program_id) return [];
      const { data, error } = await supabase
        .from('projects')
        .select('id, name')
        .eq('program_id', formData.program_id)
        .order('name');
      if (error) throw error;
      return data;
    },
    enabled: !!formData.program_id,
  });

  // Fetch current enrollments
  const { data: enrollments, isLoading } = useQuery({
    queryKey: ['beneficiary-enrollments', beneficiaryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('beneficiary_services')
        .select(`
          id, enrolled_date, exit_date, status, notes,
          programs:program_id (id, name),
          projects:project_id (id, name)
        `)
        .eq('beneficiary_id', beneficiaryId)
        .order('enrolled_date', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!beneficiaryId,
  });

  // Fetch donors grouped by program
  const { data: donors } = useQuery({
    queryKey: ['beneficiary-donors', beneficiaryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('beneficiary_donors')
        .select('*, program:programs(id, name)')
        .eq('beneficiary_id', beneficiaryId)
        .order('donation_date', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!beneficiaryId,
  });

  const enrollMutation = useMutation({
    mutationFn: async (data: EnrollmentFormData) => {
      if (!currentOrganization?.organization_id) throw new Error('No organization');

      // Insert enrollment
      const { error: enrollError } = await supabase.from('beneficiary_services').insert([{
        organization_id: currentOrganization.organization_id,
        beneficiary_id: beneficiaryId,
        program_id: data.program_id || null,
        project_id: data.project_id || null,
        enrolled_date: data.enrolled_date,
        status: 'Active',
        notes: data.notes || null,
        created_by: user?.id,
      }]);
      if (enrollError) throw enrollError;

      // If donor name provided, also insert donor record linked to this program
      if (data.donor_name.trim()) {
        const { error: donorError } = await supabase.from('beneficiary_donors').insert([{
          organization_id: currentOrganization.organization_id,
          beneficiary_id: beneficiaryId,
          program_id: data.program_id || null,
          donor_name: data.donor_name.trim(),
          amount_received: data.amount_received ? parseFloat(data.amount_received) : null,
          donation_date: data.donation_date || null,
          notes: data.donor_notes || null,
          created_by: user?.id,
        }]);
        if (donorError) throw donorError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['beneficiary-enrollments'] });
      queryClient.invalidateQueries({ queryKey: ['beneficiary-donors'] });
      queryClient.invalidateQueries({ queryKey: ['program-stats'] });
      toast.success('Enrolled successfully');
      setFormData(emptyFormData);
      setIsFormOpen(false);
    },
    onError: (error) => toast.error('Failed to enroll: ' + error.message),
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, exitDate }: { id: string; status: string; exitDate?: string }) => {
      const updates: Record<string, any> = { status };
      if (exitDate) updates.exit_date = exitDate;
      if (status === 'Active') updates.exit_date = null;
      
      const { error } = await supabase
        .from('beneficiary_services')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['beneficiary-enrollments'] });
      queryClient.invalidateQueries({ queryKey: ['program-stats'] });
      toast.success('Status updated');
    },
    onError: (error) => toast.error('Failed to update: ' + error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('beneficiary_services')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['beneficiary-enrollments'] });
      queryClient.invalidateQueries({ queryKey: ['program-stats'] });
      toast.success('Enrollment removed');
      setDeleteId(null);
    },
    onError: (error) => toast.error('Failed to delete: ' + error.message),
  });

  const deleteDonorMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('beneficiary_donors')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['beneficiary-donors'] });
      toast.success('Donor removed');
      setDeleteDonorId(null);
    },
    onError: (error) => toast.error('Failed to delete donor: ' + error.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.program_id) {
      toast.error('Please select a program');
      return;
    }
    enrollMutation.mutate(formData);
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'Active': return <Badge className="bg-success/10 text-success">Active</Badge>;
      case 'Completed': return <Badge className="bg-primary/10 text-primary">Completed</Badge>;
      case 'Dropped': return <Badge className="bg-destructive/10 text-destructive">Dropped</Badge>;
      case 'Transferred': return <Badge className="bg-warning/10 text-warning">Transferred</Badge>;
      default: return <Badge variant="secondary">{status || 'Unknown'}</Badge>;
    }
  };

  // Get donors for a specific program enrollment
  const getDonorsForProgram = (programId: string | null | undefined) => {
    if (!programId || !donors) return [];
    return donors.filter((d: any) => d.program_id === programId);
  };

  return (
    <div className="space-y-4">
      {showTitle && (
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Program Enrollments</h3>
            <p className="text-sm text-muted-foreground">
              Manage program enrollments and associated sponsors
            </p>
          </div>
          <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                Enroll in Program
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Enroll in Program</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Program */}
                <div className="space-y-2">
                  <Label>Program *</Label>
                  <Select
                    value={formData.program_id}
                    onValueChange={(value) => setFormData({ ...formData, program_id: value, project_id: '' })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a program" />
                    </SelectTrigger>
                    <SelectContent>
                      {programs?.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Project */}
                <div className="space-y-2">
                  <Label>Project (Optional)</Label>
                  <Select
                    value={formData.project_id}
                    onValueChange={(value) => setFormData({ ...formData, project_id: value })}
                    disabled={!formData.program_id}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a project" />
                    </SelectTrigger>
                    <SelectContent>
                      {projects?.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Enrollment Date */}
                <div className="space-y-2">
                  <Label>Enrollment Date *</Label>
                  <Input
                    type="date"
                    value={formData.enrolled_date}
                    onChange={(e) => setFormData({ ...formData, enrolled_date: e.target.value })}
                    required
                  />
                </div>

                {/* Notes */}
                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Any additional notes about this enrollment..."
                    rows={2}
                  />
                </div>

                {/* Donor Section - shown when program is selected */}
                {formData.program_id && (
                  <>
                    <Separator />
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Heart className="h-4 w-4 text-success" />
                        <Label className="text-sm font-semibold">Sponsor / Donor (Optional)</Label>
                      </div>
                      <p className="text-xs text-muted-foreground -mt-1">
                        Add a donor sponsoring this beneficiary for this program
                      </p>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="col-span-2 space-y-1.5">
                          <Label className="text-xs">Donor Name</Label>
                          <Input
                            placeholder="Enter donor name"
                            value={formData.donor_name}
                            onChange={(e) => setFormData({ ...formData, donor_name: e.target.value })}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Amount (KSH)</Label>
                          <Input
                            type="number"
                            placeholder="0"
                            value={formData.amount_received}
                            onChange={(e) => setFormData({ ...formData, amount_received: e.target.value })}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Donation Date</Label>
                          <Input
                            type="date"
                            value={formData.donation_date}
                            onChange={(e) => setFormData({ ...formData, donation_date: e.target.value })}
                          />
                        </div>
                        <div className="col-span-2 space-y-1.5">
                          <Label className="text-xs">Notes</Label>
                          <Input
                            placeholder="Additional notes"
                            value={formData.donor_notes}
                            onChange={(e) => setFormData({ ...formData, donor_notes: e.target.value })}
                          />
                        </div>
                      </div>
                    </div>
                  </>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={enrollMutation.isPending}>
                    {enrollMutation.isPending ? 'Enrolling...' : 'Enroll'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : enrollments?.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center text-muted-foreground">
            <FolderKanban className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p>Not enrolled in any programs yet</p>
            <Button variant="link" onClick={() => setIsFormOpen(true)} className="mt-2">
              Enroll in a program
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {enrollments?.map((enrollment) => {
            const programId = (enrollment.programs as any)?.id;
            const programDonors = getDonorsForProgram(programId);

            return (
              <Card key={enrollment.id}>
                <CardContent className="p-4 space-y-3">
                  {/* Enrollment header */}
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {(enrollment.programs as { name: string })?.name || 'Unknown Program'}
                        </span>
                        {getStatusBadge(enrollment.status)}
                      </div>
                      {enrollment.projects && (
                        <p className="text-sm text-muted-foreground">
                          Project: {(enrollment.projects as { name: string })?.name}
                        </p>
                      )}
                      <div className="text-xs text-muted-foreground flex items-center gap-3">
                        <span>Enrolled: {format(new Date(enrollment.enrolled_date), 'MMM d, yyyy')}</span>
                        {enrollment.exit_date && (
                          <span>Exited: {format(new Date(enrollment.exit_date), 'MMM d, yyyy')}</span>
                        )}
                      </div>
                      {enrollment.notes && (
                        <p className="text-sm text-muted-foreground mt-1">{enrollment.notes}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {enrollment.status === 'Active' ? (
                        <Select
                          onValueChange={(status) => {
                            updateStatusMutation.mutate({
                              id: enrollment.id,
                              status,
                              exitDate: status !== 'Active' ? new Date().toISOString().split('T')[0] : undefined,
                            });
                          }}
                        >
                          <SelectTrigger className="w-[130px] h-8 text-xs">
                            <SelectValue placeholder="Change status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Completed">Mark Completed</SelectItem>
                            <SelectItem value="Dropped">Mark Dropped</SelectItem>
                            <SelectItem value="Transferred">Mark Transferred</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs"
                          onClick={() => updateStatusMutation.mutate({ id: enrollment.id, status: 'Active' })}
                        >
                          <Check className="h-3 w-3 mr-1" />
                          Reactivate
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => setDeleteId(enrollment.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Donors for this program */}
                  {programDonors.length > 0 && (
                    <>
                      <Separator />
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                          <Heart className="h-3 w-3 text-success" />
                          Sponsors
                        </p>
                        {programDonors.map((donor: any) => (
                          <div key={donor.id} className="flex items-center justify-between bg-success/5 border border-success/20 rounded-md px-3 py-2">
                            <div className="space-y-0.5">
                              <p className="text-sm font-medium text-foreground">{donor.donor_name}</p>
                              {donor.donation_date && (
                                <p className="text-xs text-muted-foreground">
                                  {format(new Date(donor.donation_date), 'MMM d, yyyy')}
                                </p>
                              )}
                              {donor.notes && (
                                <p className="text-xs text-muted-foreground">{donor.notes}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              {donor.amount_received && (
                                <Badge className="bg-success/20 text-success border-success/30 text-xs">
                                  KSH {donor.amount_received.toLocaleString()}
                                </Badge>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-destructive hover:text-destructive"
                                onClick={() => setDeleteDonorId(donor.id)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Enrollment delete dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Enrollment</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this enrollment record. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Donor delete dialog */}
      <AlertDialog open={!!deleteDonorId} onOpenChange={() => setDeleteDonorId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Sponsor</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this sponsor record. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteDonorId && deleteDonorMutation.mutate(deleteDonorId)}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

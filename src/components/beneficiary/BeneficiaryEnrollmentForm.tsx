import { useState, useEffect } from 'react';
import { Plus, FolderKanban, X, Check, Heart, DollarSign, Trash2, ChevronsUpDown, Pencil, ChevronDown, ChevronUp, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
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

interface BeneficiaryEnrollmentFormProps {
  beneficiaryId: string;
  showTitle?: boolean;
  /** Opens the "Enroll in Program" dialog automatically on mount. */
  autoOpenEnroll?: boolean;
  /** Opens the "Record Donation" dialog automatically on mount. */
  autoOpenDonor?: boolean;
  /** Pre-selects a programme inside the donation dialog. */
  prefilledDonorProgramId?: string | null;
  /** Pre-selects a project inside the donation dialog (reserved). */
  prefilledDonorProjectId?: string | null;
}

export const BeneficiaryEnrollmentForm = ({
  beneficiaryId,
  showTitle = true,
  autoOpenEnroll = false,
  autoOpenDonor = false,
  prefilledDonorProgramId = null,
  prefilledDonorProjectId = null,
}: BeneficiaryEnrollmentFormProps) => {
  const { currentOrganization } = useOrganization();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Enrollment form state
  const [isEnrollOpen, setIsEnrollOpen] = useState(false);
  const [enrollProgramId, setEnrollProgramId] = useState('');
  const [enrollProjectIds, setEnrollProjectIds] = useState<string[]>([]);
  const [enrollDate, setEnrollDate] = useState(new Date().toISOString().split('T')[0]);
  const [enrollNotes, setEnrollNotes] = useState('');

  // Donation form state
  const [isDonationOpen, setIsDonationOpen] = useState(false);
  const [donorName, setDonorName] = useState('');
  const [donationAmount, setDonationAmount] = useState('');
  const [donationDate, setDonationDate] = useState(new Date().toISOString().split('T')[0]);
  const [donationProgramId, setDonationProgramId] = useState('');
  const [donationNotes, setDonationNotes] = useState('');
  // Add donor for specific program (shortcut from enrollment card)
  const [addDonorForProgramId, setAddDonorForProgramId] = useState<string | null>(null);

  // Edit donor
  const [editDonorId, setEditDonorId] = useState<string | null>(null);
  const [editDonorName, setEditDonorName] = useState('');
  const [editDonorAmount, setEditDonorAmount] = useState('');
  const [editDonorDate, setEditDonorDate] = useState('');
  const [editDonorNotes, setEditDonorNotes] = useState('');
  // Delete confirmations
  const [deleteEnrollmentId, setDeleteEnrollmentId] = useState<string | null>(null);
  const [deleteDonorId, setDeleteDonorId] = useState<string | null>(null);

  // Expanded sections
  const [expandedDonors, setExpandedDonors] = useState(false);

  // Fetch existing donor names
  const { data: existingDonors = [] } = useQuery({
    queryKey: ['existing-donor-names', currentOrganization?.organization_id],
    queryFn: async () => {
      if (!currentOrganization?.organization_id) return [];

      const [beneficiaryDonorsResult, donorAccountsResult] = await Promise.all([
        supabase
          .from('beneficiary_donors')
          .select('donor_name')
          .eq('organization_id', currentOrganization.organization_id),
        supabase
          .from('donor_accounts')
          .select('donor_name')
          .eq('organization_id', currentOrganization.organization_id)
          .eq('is_active', true),
      ]);

      const donorNames = new Set<string>();

      beneficiaryDonorsResult.data?.forEach((donor) => {
        if (donor.donor_name) donorNames.add(donor.donor_name);
      });

      donorAccountsResult.data?.forEach((donor) => {
        if (donor.donor_name) donorNames.add(donor.donor_name);
      });

      return [...donorNames].sort((a, b) => a.localeCompare(b));
    },
    enabled: !!currentOrganization?.organization_id,
  });

  // Fetch programs
  const { data: programs = [] } = useQuery({
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
      return data || [];
    },
    enabled: !!currentOrganization?.organization_id,
  });

  // Fetch projects for enrollment form (includes funding_model)
  const { data: enrollProjects = [] } = useQuery({
    queryKey: ['projects-for-enroll', enrollProgramId],
    queryFn: async () => {
      if (!enrollProgramId) return [];
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, funding_model, sponsorship_required')
        .eq('program_id', enrollProgramId)
        .order('name');
      if (error) throw error;
      return data || [];
    },
    enabled: !!enrollProgramId,
  });

  // Fetch enrollments
  const { data: enrollments, isLoading } = useQuery({
    queryKey: ['beneficiary-enrollments', beneficiaryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('beneficiary_services')
        .select(`
          id, enrolled_date, exit_date, status, notes,
          programs:program_id (id, name),
          projects:project_id (id, name, funding_model, sponsorship_required)
        `)
        .eq('beneficiary_id', beneficiaryId)
        .order('enrolled_date', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!beneficiaryId,
  });

  // Fetch donors
  const { data: donors = [] } = useQuery({
    queryKey: ['beneficiary-donors', beneficiaryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('beneficiary_donors')
        .select('*, program:programs(id, name)')
        .eq('beneficiary_id', beneficiaryId)
        .order('donation_date', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!beneficiaryId,
  });

  // Group enrollments by program
  const enrollmentsByProgram = (enrollments || []).reduce((acc, e) => {
    const progId = (e.programs as any)?.id || 'none';
    if (!acc[progId]) acc[progId] = { program: e.programs, entries: [] };
    acc[progId].entries.push(e);
    return acc;
  }, {} as Record<string, { program: any; entries: typeof enrollments }>);

  // Enroll mutation - creates one row per project (or one row if no projects selected)
  const enrollMutation = useMutation({
    mutationFn: async () => {
      if (!currentOrganization?.organization_id || !enrollProgramId) throw new Error('Missing data');

      const rows = enrollProjectIds.length > 0
        ? enrollProjectIds.map(projectId => ({
            organization_id: currentOrganization.organization_id,
            beneficiary_id: beneficiaryId,
            program_id: enrollProgramId,
            project_id: projectId,
            enrolled_date: enrollDate,
            status: 'Active',
            notes: enrollNotes || null,
            created_by: user?.id,
          }))
        : [{
            organization_id: currentOrganization.organization_id,
            beneficiary_id: beneficiaryId,
            program_id: enrollProgramId,
            project_id: null,
            enrolled_date: enrollDate,
            status: 'Active',
            notes: enrollNotes || null,
            created_by: user?.id,
          }];

      const { error } = await supabase.from('beneficiary_services').insert(rows);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['beneficiary-enrollments'] });
      queryClient.invalidateQueries({ queryKey: ['program-stats'] });
      toast.success(`Enrolled in ${enrollProjectIds.length > 1 ? enrollProjectIds.length + ' projects' : 'program'} successfully`);
      resetEnrollForm();
    },
    onError: (error) => toast.error('Failed to enroll: ' + error.message),
  });

  // Add donation mutation
  const addDonationMutation = useMutation({
    mutationFn: async () => {
      if (!currentOrganization?.organization_id || !donorName.trim()) throw new Error('Donor name required');
      const { error } = await supabase.from('beneficiary_donors').insert([{
        organization_id: currentOrganization.organization_id,
        beneficiary_id: beneficiaryId,
        program_id: donationProgramId || null,
        donor_name: donorName.trim(),
        amount_received: donationAmount ? parseFloat(donationAmount) : null,
        donation_date: donationDate || null,
        notes: donationNotes || null,
        created_by: user?.id,
      }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['beneficiary-donors'] });
      queryClient.invalidateQueries({ queryKey: ['existing-donor-names'] });
      toast.success('Donation recorded');
      resetDonationForm();
    },
    onError: (error) => toast.error('Failed: ' + error.message),
  });

  // Update status
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, exitDate }: { id: string; status: string; exitDate?: string }) => {
      const updates: Record<string, any> = { status };
      if (exitDate) updates.exit_date = exitDate;
      if (status === 'Active') updates.exit_date = null;
      const { error } = await supabase.from('beneficiary_services').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['beneficiary-enrollments'] });
      toast.success('Status updated');
    },
    onError: (error) => toast.error('Failed: ' + error.message),
  });

  // Delete enrollment
  const deleteEnrollmentMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('beneficiary_services').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['beneficiary-enrollments'] });
      toast.success('Enrollment removed');
      setDeleteEnrollmentId(null);
    },
  });

  // Delete donor
  const deleteDonorMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('beneficiary_donors').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['beneficiary-donors'] });
      toast.success('Donation removed');
      setDeleteDonorId(null);
    },
  });

  // Update donor
  const updateDonorMutation = useMutation({
    mutationFn: async () => {
      if (!editDonorId || !editDonorName.trim()) throw new Error('Donor name required');
      const { error } = await supabase.from('beneficiary_donors').update({
        donor_name: editDonorName.trim(),
        amount_received: editDonorAmount ? parseFloat(editDonorAmount) : null,
        donation_date: editDonorDate || null,
        notes: editDonorNotes || null,
      }).eq('id', editDonorId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['beneficiary-donors'] });
      queryClient.invalidateQueries({ queryKey: ['existing-donor-names'] });
      toast.success('Donation updated');
      setEditDonorId(null);
    },
  });

  const resetEnrollForm = () => {
    setEnrollProgramId('');
    setEnrollProjectIds([]);
    setEnrollDate(new Date().toISOString().split('T')[0]);
    setEnrollNotes('');
    setIsEnrollOpen(false);
  };

  const resetDonationForm = () => {
    setDonorName('');
    setDonationAmount('');
    setDonationDate(new Date().toISOString().split('T')[0]);
    setDonationProgramId('');
    setDonationNotes('');
    setIsDonationOpen(false);
  };

  const toggleProject = (projectId: string) => {
    setEnrollProjectIds(prev =>
      prev.includes(projectId) ? prev.filter(id => id !== projectId) : [...prev, projectId]
    );
  };

  const openEditDonor = (donor: any) => {
    setEditDonorId(donor.id);
    setEditDonorName(donor.donor_name || '');
    setEditDonorAmount(donor.amount_received?.toString() || '');
    setEditDonorDate(donor.donation_date || '');
    setEditDonorNotes(donor.notes || '');
  };

  const openDonationDialog = (programId?: string) => {
    setDonorName('');
    setDonationAmount('');
    setDonationDate(new Date().toISOString().split('T')[0]);
    setDonationProgramId(programId || '');
    setDonationNotes('');
    setIsDonationOpen(true);
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'Active': return <Badge className="bg-success/10 text-success border-success/20">Active</Badge>;
      case 'Completed': return <Badge className="bg-primary/10 text-primary border-primary/20">Completed</Badge>;
      case 'Dropped': return <Badge className="bg-destructive/10 text-destructive border-destructive/20">Dropped</Badge>;
      case 'Transferred': return <Badge className="bg-warning/10 text-warning border-warning/20">Transferred</Badge>;
      default: return <Badge variant="secondary">{status || 'Unknown'}</Badge>;
    }
  };

  // Donor name combobox component
  const DonorNameField = ({
    value,
    onChange,
  }: {
    value: string;
    onChange: (v: string) => void;
  }) => {
    const normalizedValue = value.trim().toLowerCase();
    const filteredDonors = existingDonors
      .filter((name) => !value.trim() || name.toLowerCase().includes(normalizedValue))
      .slice(0, 8);
    const matchesExistingDonor = existingDonors.some(
      (name) => name.toLowerCase() === normalizedValue
    );

    return (
      <div className="space-y-3">
        <Input
          placeholder="Type a donor name or search existing donors"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />

        <p className="text-xs text-muted-foreground">
          Enter any new donor name directly, or tap an existing donor below.
        </p>

        {filteredDonors.length > 0 && (
          <div className="rounded-2xl border border-border/60 bg-muted/20 p-2">
            <p className="px-2 pb-2 text-xs text-muted-foreground">Existing donors</p>
            <div className="max-h-44 space-y-1 overflow-y-auto">
              {filteredDonors.map((name) => {
                const isSelected = normalizedValue === name.toLowerCase();

                return (
                  <button
                    key={name}
                    type="button"
                    className={cn(
                      'flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-sm transition-colors hover:bg-background',
                      isSelected && 'bg-background shadow-soft'
                    )}
                    onClick={() => onChange(name)}
                  >
                    <span className="truncate">{name}</span>
                    <Check className={cn('h-4 w-4 shrink-0', isSelected ? 'opacity-100' : 'opacity-0')} />
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {value.trim() && !matchesExistingDonor && (
          <p className="text-xs text-success">“{value.trim()}” will be saved as a new donor.</p>
        )}
      </div>
    );
  };

  // Aggregate donation totals
  const totalDonations = donors.reduce((sum, d) => sum + (d.amount_received || 0), 0);

  // Get donors for a specific program
  const getDonorsForProgram = (programId: string | null | undefined) => {
    if (!programId || !donors) return [];
    return donors.filter((d: any) => d.program_id === programId);
  };

  // Get unlinked donors (no program)
  const unlinkedDonors = donors.filter((d: any) => !d.program_id);

  // Track enrolled project IDs per program to prevent duplicate project enrollment
  const enrolledProjectsByProgram = (enrollments || []).reduce((acc, e: any) => {
    const progId = e.programs?.id;
    const projId = e.projects?.id;
    if (progId) {
      if (!acc[progId]) acc[progId] = new Set<string>();
      if (projId) acc[progId].add(projId);
    }
    return acc;
  }, {} as Record<string, Set<string>>);

  // A program is fully enrolled only if it has no projects available OR all projects are already enrolled
  const isProgramFullyEnrolled = (programId: string) => {
    const enrolledProjects = enrolledProjectsByProgram[programId];
    if (!enrolledProjects) return false;
    // Check if this program has projects at all - if enrollProjects is loaded for this program
    // We can't easily check here, so just allow re-enrollment
    return false;
  };

  // When opening donation dialog from a program card, pre-select the program
  const openDonationForProgram = (programId: string) => {
    openDonationDialog(programId);
  };

  return (
    <div className="space-y-6">
      {/* Header with actions */}
      {showTitle && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold">Programs & Donations</h3>
            <p className="text-sm text-muted-foreground">Manage enrollments and record donations</p>
          </div>
          <div className="flex items-center gap-2">
             <Button size="sm" variant="outline" className="gap-1.5" onClick={() => openDonationDialog()}>
              <DollarSign className="h-4 w-4" />
              Record Donation
            </Button>
            <Button size="sm" className="gap-1.5" onClick={() => setIsEnrollOpen(true)}>
              <Plus className="h-4 w-4" />
              Enroll in Program
            </Button>
          </div>
        </div>
      )}

      {/* ===== ENROLLMENTS SECTION ===== */}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : Object.keys(enrollmentsByProgram).length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center text-muted-foreground">
            <FolderKanban className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p>Not enrolled in any programs yet</p>
            <Button variant="link" onClick={() => setIsEnrollOpen(true)} className="mt-2">
              Enroll in a program
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {Object.entries(enrollmentsByProgram).map(([progId, group]) => (
            <Card key={progId} className="overflow-hidden">
              <CardContent className="p-0">
                {/* Program header */}
                <div className="bg-muted/30 px-4 py-3 border-b border-border/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FolderKanban className="h-4 w-4 text-primary" />
                      <span className="font-semibold text-sm">{group.program?.name || 'Unknown Program'}</span>
                      <Badge variant="secondary" className="text-xs">{group.entries.length} enrollment{group.entries.length !== 1 ? 's' : ''}</Badge>
                    </div>
                  </div>
                </div>

                {/* Enrollment rows */}
                <div className="divide-y divide-border/50">
                  {group.entries.map((enrollment) => (
                    <div key={enrollment.id} className="px-4 py-3 flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          {enrollment.projects ? (
                            <span className="text-sm flex items-center gap-1.5">
                              <Layers className="h-3.5 w-3.5 text-muted-foreground" />
                              {(enrollment.projects as any)?.name}
                              {(() => {
                                const fm = (enrollment.projects as any)?.funding_model;
                                if (fm === 'individual_sponsorship') return <Badge variant="outline" className="text-[10px] h-5 border-warning/40 text-warning">Sponsorship</Badge>;
                                if (fm === 'mixed') return <Badge variant="outline" className="text-[10px] h-5 border-primary/40 text-primary">Mixed</Badge>;
                                if (fm === 'programme') return <Badge variant="outline" className="text-[10px] h-5 border-success/40 text-success">Programme-funded</Badge>;
                                return null;
                              })()}
                            </span>
                          ) : (
                            <span className="text-sm text-muted-foreground italic">Program-level enrollment</span>
                          )}
                          {getStatusBadge(enrollment.status)}
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <span>Enrolled: {format(new Date(enrollment.enrolled_date), 'MMM d, yyyy')}</span>
                          {enrollment.exit_date && <span>Exited: {format(new Date(enrollment.exit_date), 'MMM d, yyyy')}</span>}
                        </div>
                        {enrollment.notes && <p className="text-xs text-muted-foreground mt-1">{enrollment.notes}</p>}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {enrollment.status === 'Active' ? (
                          <Select onValueChange={(status) => {
                            updateStatusMutation.mutate({
                              id: enrollment.id,
                              status,
                              exitDate: status !== 'Active' ? new Date().toISOString().split('T')[0] : undefined,
                            });
                          }}>
                            <SelectTrigger className="w-[120px] h-7 text-xs">
                              <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Completed">Completed</SelectItem>
                              <SelectItem value="Dropped">Dropped</SelectItem>
                              <SelectItem value="Transferred">Transferred</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <Button variant="outline" size="sm" className="h-7 text-xs"
                            onClick={() => updateStatusMutation.mutate({ id: enrollment.id, status: 'Active' })}>
                            Reactivate
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => setDeleteEnrollmentId(enrollment.id)}>
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Sponsors/Donors for this program — only if any enrolled project requires sponsorship */}
                {(() => {
                  const programDonors = getDonorsForProgram(progId);
                  const programDonorTotal = programDonors.reduce((sum: number, d: any) => sum + (d.amount_received || 0), 0);
                  const needsSponsorship = group.entries.some((e: any) => {
                    const fm = e.projects?.funding_model;
                    // Show sponsorship section for sponsorship/mixed projects, OR program-level enrollment (unknown), OR if donors already exist
                    return !e.projects || fm === 'individual_sponsorship' || fm === 'mixed';
                  }) || programDonors.length > 0;

                  if (!needsSponsorship) {
                    return (
                      <div className="border-t border-border/50 px-4 py-2 bg-muted/10">
                        <p className="text-xs text-muted-foreground italic flex items-center gap-1.5">
                          <Heart className="h-3 w-3" />
                          Programme-funded — no individual sponsorship required
                        </p>
                      </div>
                    );
                  }

                  return (
                    <div className="border-t border-border/50 px-4 py-3 bg-success/5">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Heart className="h-3.5 w-3.5 text-success" />
                          <span className="text-xs font-medium text-muted-foreground">
                            Sponsors ({programDonors.length})
                          </span>
                          {programDonorTotal > 0 && (
                            <Badge variant="secondary" className="text-xs font-mono">KES {programDonorTotal.toLocaleString()}</Badge>
                          )}
                        </div>
                        <Button type="button" variant="outline" size="sm" className="h-6 text-xs gap-1"
                          onClick={() => openDonationForProgram(progId)}>
                          <Plus className="h-3 w-3" />
                          Add Donor
                        </Button>
                      </div>
                      {programDonors.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic">No sponsors linked to this program yet</p>
                      ) : (
                        <div className="space-y-1.5">
                          {programDonors.map((donor: any) => (
                            <div key={donor.id} className="flex items-center justify-between bg-background/80 border border-border/50 rounded-md px-3 py-1.5">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium">{donor.donor_name}</span>
                                  {donor.donation_date && (
                                    <span className="text-xs text-muted-foreground">{format(new Date(donor.donation_date), 'MMM d, yyyy')}</span>
                                  )}
                                </div>
                                {donor.notes && <p className="text-xs text-muted-foreground truncate">{donor.notes}</p>}
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                {donor.amount_received != null && (
                                  <span className="text-xs font-mono font-semibold text-success">KES {donor.amount_received.toLocaleString()}</span>
                                )}
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEditDonor(donor)}>
                                  <Pencil className="h-3 w-3" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive" onClick={() => setDeleteDonorId(donor.id)}>
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ===== GENERAL DONATIONS (not linked to a program) ===== */}
      {unlinkedDonors.length > 0 && (
        <div className="space-y-3">
          <button
            onClick={() => setExpandedDonors(!expandedDonors)}
            className="flex items-center gap-2 w-full text-left group"
          >
            <DollarSign className="h-4 w-4 text-success" />
            <span className="font-semibold text-sm">General Donations ({unlinkedDonors.length})</span>
            <Badge variant="secondary" className="text-xs font-mono">
              KES {unlinkedDonors.reduce((sum, d) => sum + (d.amount_received || 0), 0).toLocaleString()}
            </Badge>
            {expandedDonors ? <ChevronUp className="h-4 w-4 ml-auto text-muted-foreground" /> : <ChevronDown className="h-4 w-4 ml-auto text-muted-foreground" />}
          </button>

          {expandedDonors && (
            <div className="space-y-2">
              {unlinkedDonors.map((donor: any) => (
                <div key={donor.id} className="flex items-center justify-between bg-muted/30 border border-border/50 rounded-lg px-3 py-2.5">
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium">{donor.donor_name}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      {donor.donation_date && <span>{format(new Date(donor.donation_date), 'MMM d, yyyy')}</span>}
                      {donor.notes && <span className="truncate max-w-[200px]">{donor.notes}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {donor.amount_received != null && (
                      <span className="text-sm font-mono font-semibold text-success">KES {donor.amount_received.toLocaleString()}</span>
                    )}
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditDonor(donor)}>
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteDonorId(donor.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ===== ENROLL DIALOG ===== */}
      <Dialog open={isEnrollOpen} onOpenChange={setIsEnrollOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderKanban className="h-5 w-5 text-primary" />
              Enroll in Program
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); enrollMutation.mutate(); }} className="space-y-4">
            {/* Program */}
            <div className="space-y-2">
              <Label>Program *</Label>
              <Select value={enrollProgramId} onValueChange={(v) => { setEnrollProgramId(v); setEnrollProjectIds([]); }}>
                <SelectTrigger><SelectValue placeholder="Select a program" /></SelectTrigger>
                <SelectContent>
                  {programs.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Projects - multi-select checkboxes */}
            {enrollProgramId && enrollProjects.length > 0 && (() => {
              const alreadyEnrolledProjectIds = enrolledProjectsByProgram[enrollProgramId] || new Set<string>();
              const availableProjects = enrollProjects.filter(p => !alreadyEnrolledProjectIds.has(p.id));
              const alreadyEnrolledProjects = enrollProjects.filter(p => alreadyEnrolledProjectIds.has(p.id));
              
              return (
                <div className="space-y-2">
                  <Label>Projects <span className="text-muted-foreground font-normal">(select one or more)</span></Label>
                  <div className="border rounded-lg divide-y max-h-[200px] overflow-y-auto">
                    {availableProjects.map((project: any) => {
                      const fm = project.funding_model;
                      const fmBadge = fm === 'individual_sponsorship'
                        ? <Badge variant="outline" className="text-[10px] h-5 ml-auto border-warning/40 text-warning">Sponsorship</Badge>
                        : fm === 'mixed'
                          ? <Badge variant="outline" className="text-[10px] h-5 ml-auto border-primary/40 text-primary">Mixed</Badge>
                          : <Badge variant="outline" className="text-[10px] h-5 ml-auto border-success/40 text-success">Programme</Badge>;
                      return (
                        <label key={project.id} className="flex items-center gap-3 px-3 py-2.5 hover:bg-muted/50 cursor-pointer transition-colors">
                          <Checkbox
                            checked={enrollProjectIds.includes(project.id)}
                            onCheckedChange={() => toggleProject(project.id)}
                          />
                          <span className="text-sm">{project.name}</span>
                          {fmBadge}
                        </label>
                      );
                    })}
                    {alreadyEnrolledProjects.map((project) => (
                      <label key={project.id} className="flex items-center gap-3 px-3 py-2.5 opacity-50 cursor-not-allowed">
                        <Checkbox checked disabled />
                        <span className="text-sm">{project.name}</span>
                        <Badge variant="secondary" className="text-xs ml-auto">Enrolled</Badge>
                      </label>
                    ))}
                  </div>
                  {availableProjects.length === 0 && (
                    <p className="text-xs text-warning">All projects under this program are already enrolled</p>
                  )}
                  {enrollProjectIds.length > 0 && (
                    <p className="text-xs text-muted-foreground">{enrollProjectIds.length} project{enrollProjectIds.length !== 1 ? 's' : ''} selected</p>
                  )}
                </div>
              );
            })()}

            {/* Date */}
            <div className="space-y-2">
              <Label>Enrollment Date</Label>
              <Input type="date" value={enrollDate} onChange={(e) => setEnrollDate(e.target.value)} />
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea value={enrollNotes} onChange={(e) => setEnrollNotes(e.target.value)} placeholder="Optional notes..." rows={2} />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={resetEnrollForm}>Cancel</Button>
              <Button type="submit" disabled={!enrollProgramId || enrollMutation.isPending}>
                {enrollMutation.isPending ? 'Enrolling...' : 'Enroll'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ===== RECORD DONATION DIALOG ===== */}
      <Dialog open={isDonationOpen} onOpenChange={setIsDonationOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-success" />
              Record Donation
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); addDonationMutation.mutate(); }} className="space-y-4">
            <div className="space-y-2">
              <Label>Donor Name *</Label>
              <DonorNameField
                value={donorName}
                onChange={setDonorName}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Amount (KES)</Label>
                <Input type="number" placeholder="0" value={donationAmount} onChange={(e) => setDonationAmount(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Date</Label>
                <Input type="date" value={donationDate} onChange={(e) => setDonationDate(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Program <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Select value={donationProgramId} onValueChange={setDonationProgramId}>
                <SelectTrigger><SelectValue placeholder="General donation" /></SelectTrigger>
                <SelectContent>
                  {programs.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Input placeholder="e.g. Term 1 payment, Monthly support..." value={donationNotes} onChange={(e) => setDonationNotes(e.target.value)} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={resetDonationForm}>Cancel</Button>
              <Button type="submit" disabled={!donorName.trim() || addDonationMutation.isPending}>
                {addDonationMutation.isPending ? 'Saving...' : 'Record Donation'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ===== EDIT DONATION DIALOG ===== */}
      <Dialog open={!!editDonorId} onOpenChange={(open) => {
        if (!open) {
          setEditDonorId(null);
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Donation</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); updateDonorMutation.mutate(); }} className="space-y-4">
            <div className="space-y-2">
              <Label>Donor Name *</Label>
              <DonorNameField
                value={editDonorName}
                onChange={setEditDonorName}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Amount (KES)</Label>
                <Input type="number" placeholder="0" value={editDonorAmount} onChange={(e) => setEditDonorAmount(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Date</Label>
                <Input type="date" value={editDonorDate} onChange={(e) => setEditDonorDate(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Input placeholder="Notes..." value={editDonorNotes} onChange={(e) => setEditDonorNotes(e.target.value)} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setEditDonorId(null)}>Cancel</Button>
              <Button type="submit" disabled={updateDonorMutation.isPending}>
                {updateDonorMutation.isPending ? 'Saving...' : 'Update'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete enrollment dialog */}
      <AlertDialog open={!!deleteEnrollmentId} onOpenChange={() => setDeleteEnrollmentId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Enrollment</AlertDialogTitle>
            <AlertDialogDescription>This will permanently remove this enrollment. This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteEnrollmentId && deleteEnrollmentMutation.mutate(deleteEnrollmentId)}>Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete donor dialog */}
      <AlertDialog open={!!deleteDonorId} onOpenChange={() => setDeleteDonorId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Donation</AlertDialogTitle>
            <AlertDialogDescription>This will permanently remove this donation record. This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteDonorId && deleteDonorMutation.mutate(deleteDonorId)}>Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

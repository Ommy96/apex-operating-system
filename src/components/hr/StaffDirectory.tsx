import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { usePermissions } from '@/hooks/usePermissions';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, UserPlus, RefreshCw, Mail, Loader2, Save } from 'lucide-react';
import { AddStaffMemberSheet } from './AddStaffMemberSheet';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface StaffMember {
  user_id: string;
  full_name: string;
  email: string;
  role: string;
  last_login_at: string | null;
  phone: string | null;
  job_title: string | null;
  department: string | null;
  employment_type: string | null;
  start_date: string | null;
  staff_id: string | null;
  gender: string | null;
  county: string | null;
  national_id: string | null;
  date_of_birth: string | null;
  notes: string | null;
  org_role: string;
  member_created_at: string;
}

const EMPLOYMENT_TYPE_LABELS: Record<string, string> = {
  full_time: 'Full-time',
  part_time: 'Part-time',
  contract: 'Contract',
  volunteer: 'Volunteer',
  intern: 'Intern',
};

const EMPLOYMENT_TYPE_COLORS: Record<string, string> = {
  full_time: 'bg-primary/10 text-primary',
  part_time: 'bg-info/10 text-info',
  contract: 'bg-warning/10 text-warning',
  volunteer: 'bg-info/10 text-info',
  intern: 'bg-info/10 text-info',
};

export function StaffDirectory() {
  const { currentOrganization } = useOrganization();
  const { can, isSuperAdmin } = usePermissions();
  const orgId = currentOrganization?.organization_id;
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [addSheetOpen, setAddSheetOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editValues, setEditValues] = useState<Partial<StaffMember>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [resendingFor, setResendingFor] = useState<string | null>(null);

  const canManageStaff = isSuperAdmin || can.manageStaff;

  // Fetch staff members by joining profiles + organization_members
  const { data: staffMembers, isLoading } = useQuery({
    queryKey: ['staff-members', orgId],
    queryFn: async () => {
      // Get org members
      const { data: members, error: membersErr } = await supabase
        .from('organization_members')
        .select('user_id, role, created_at')
        .eq('organization_id', orgId!);
      if (membersErr) throw membersErr;
      if (!members || members.length === 0) return [];

      const userIds = members.map(m => m.user_id);

      // Get profiles for these users
      const { data: profiles, error: profilesErr } = await supabase
        .from('profiles')
        .select('user_id, full_name, email, role, last_login_at, phone, job_title, department, employment_type, start_date, staff_id, gender, county, national_id, date_of_birth, notes')
        .in('user_id', userIds);
      if (profilesErr) throw profilesErr;

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      return members.map(m => {
        const p = profileMap.get(m.user_id);
        return {
          user_id: m.user_id,
          full_name: p?.full_name || 'Unknown',
          email: p?.email || '',
          role: p?.role || 'staff',
          last_login_at: p?.last_login_at || null,
          phone: p?.phone || null,
          job_title: p?.job_title || null,
          department: p?.department || null,
          employment_type: p?.employment_type || null,
          start_date: p?.start_date || null,
          staff_id: p?.staff_id || null,
          gender: p?.gender || null,
          county: p?.county || null,
          national_id: p?.national_id || null,
          date_of_birth: p?.date_of_birth || null,
          notes: p?.notes || null,
          org_role: m.role,
          member_created_at: m.created_at,
        } as StaffMember;
      });
    },
    enabled: !!orgId,
  });

  // Fetch RBAC role assignments for display
  const { data: rbacAssignments } = useQuery({
    queryKey: ['rbac-assignments-staff', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rbac_user_role_assignments')
        .select('user_id, rbac_roles(display_name, color)')
        .eq('organization_id', orgId!)
        .eq('is_active', true);
      if (error) throw error;
      return data || [];
    },
    enabled: !!orgId,
  });

  const rbacRoleMap = useMemo(() => {
    const map = new Map<string, { display_name: string; color: string }>();
    rbacAssignments?.forEach((a: any) => {
      if (a.rbac_roles) {
        map.set(a.user_id, { display_name: a.rbac_roles.display_name, color: a.rbac_roles.color });
      }
    });
    return map;
  }, [rbacAssignments]);

  const getStatus = (member: StaffMember): 'active' | 'pending' | 'inactive' => {
    if (!member.last_login_at) return 'pending';
    return 'active';
  };

  const filteredStaff = useMemo(() => {
    if (!staffMembers) return [];
    if (!search) return staffMembers;
    const term = search.toLowerCase();
    return staffMembers.filter(s =>
      s.full_name.toLowerCase().includes(term) ||
      s.email.toLowerCase().includes(term) ||
      (s.job_title?.toLowerCase().includes(term)) ||
      (s.department?.toLowerCase().includes(term))
    );
  }, [staffMembers, search]);

  const handleResendInvitation = async (member: StaffMember) => {
    setResendingFor(member.user_id);
    try {
      const { data, error } = await supabase.functions.invoke('send-invitation', {
        body: {
          email: member.email,
          role: member.org_role,
          organization_id: orgId,
          organization_name: currentOrganization?.organization_name || '',
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(`Invitation resent to ${member.email}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to resend invitation');
    } finally {
      setResendingFor(null);
    }
  };

  const handleEditSave = async () => {
    if (!selectedStaff) return;
    setIsSaving(true);
    try {
      const updates: Record<string, unknown> = {};
      if (editValues.full_name !== undefined) updates.full_name = editValues.full_name;
      if (editValues.phone !== undefined) updates.phone = editValues.phone || null;
      if (editValues.national_id !== undefined) updates.national_id = editValues.national_id || null;
      if (editValues.date_of_birth !== undefined) updates.date_of_birth = editValues.date_of_birth || null;
      if (editValues.gender !== undefined) updates.gender = editValues.gender || null;
      if (editValues.county !== undefined) updates.county = editValues.county || null;
      if (editValues.job_title !== undefined) updates.job_title = editValues.job_title || null;
      if (editValues.department !== undefined) updates.department = editValues.department || null;
      if (editValues.employment_type !== undefined) updates.employment_type = editValues.employment_type || null;
      if (editValues.start_date !== undefined) updates.start_date = editValues.start_date || null;
      if (editValues.staff_id !== undefined) updates.staff_id = editValues.staff_id || null;
      if (editValues.notes !== undefined) updates.notes = editValues.notes || null;

      if (Object.keys(updates).length > 0) {
        const { error } = await supabase.from('profiles').update(updates).eq('user_id', selectedStaff.user_id);
        if (error) throw error;
      }

      queryClient.invalidateQueries({ queryKey: ['staff-members'] });
      toast.success('Staff details updated');
      setIsEditing(false);
      setSelectedStaff(null);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update');
    } finally {
      setIsSaving(false);
    }
  };

  const openDetail = (s: StaffMember) => {
    setSelectedStaff(s);
    setEditValues({ ...s });
    setIsEditing(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search staff..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        {canManageStaff && (
          <Button onClick={() => setAddSheetOpen(true)} size="sm">
            <UserPlus className="h-4 w-4 mr-2" /> Add Staff Member
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex gap-3 items-center">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </div>
          ) : filteredStaff.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <p className="font-medium">No staff members found</p>
              <p className="text-xs mt-1">Add your first staff member using the button above</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead className="hidden md:table-cell">Job Title</TableHead>
                    <TableHead className="hidden lg:table-cell">Department</TableHead>
                    <TableHead className="hidden sm:table-cell">Type</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="hidden md:table-cell">Start Date</TableHead>
                    <TableHead>Status</TableHead>
                    {canManageStaff && <TableHead className="text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStaff.map(s => {
                    const status = getStatus(s);
                    const rbacRole = rbacRoleMap.get(s.user_id);
                    return (
                      <TableRow key={s.user_id} className="cursor-pointer hover:bg-muted/50" onClick={() => openDetail(s)}>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">{s.full_name}</p>
                            <p className="text-xs text-muted-foreground">{s.email}</p>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm">{s.job_title || '—'}</TableCell>
                        <TableCell className="hidden lg:table-cell text-sm">{s.department || '—'}</TableCell>
                        <TableCell className="hidden sm:table-cell">
                          {s.employment_type ? (
                            <Badge variant="secondary" className={`text-xs ${EMPLOYMENT_TYPE_COLORS[s.employment_type] || ''}`}>
                              {EMPLOYMENT_TYPE_LABELS[s.employment_type] || s.employment_type}
                            </Badge>
                          ) : '—'}
                        </TableCell>
                        <TableCell>
                          {rbacRole ? (
                            <Badge variant="outline" className="text-xs" style={{ borderColor: rbacRole.color, color: rbacRole.color }}>
                              {rbacRole.display_name}
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs capitalize">{s.org_role}</Badge>
                          )}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                          {s.start_date ? format(new Date(s.start_date), 'MMM yyyy') : '—'}
                        </TableCell>
                        <TableCell>
                          {status === 'active' && <Badge className="bg-primary/10 text-primary text-xs">Active</Badge>}
                          {status === 'pending' && <Badge className="bg-warning/10 text-warning text-xs">Pending</Badge>}
                          {status === 'inactive' && <Badge variant="secondary" className="text-xs">Inactive</Badge>}
                        </TableCell>
                        {canManageStaff && (
                          <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                            {status === 'pending' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleResendInvitation(s)}
                                disabled={resendingFor === s.user_id}
                              >
                                {resendingFor === s.user_id ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <><RefreshCw className="h-3.5 w-3.5 mr-1" /> Resend</>
                                )}
                              </Button>
                            )}
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Staff Detail/Edit Sheet */}
      <Sheet open={!!selectedStaff} onOpenChange={open => { if (!open) { setSelectedStaff(null); setIsEditing(false); } }}>
        <SheetContent className="w-full sm:max-w-lg overflow-hidden flex flex-col">
          <SheetHeader className="flex flex-row items-center justify-between">
            <SheetTitle>{selectedStaff?.full_name}</SheetTitle>
            {canManageStaff && !isEditing && (
              <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>Edit</Button>
            )}
          </SheetHeader>

          <ScrollArea className="flex-1 -mx-6 px-6">
            {selectedStaff && (
              <div className="space-y-5 pb-6">
                {/* Status badge */}
                <div className="flex gap-2">
                  {getStatus(selectedStaff) === 'pending' && (
                    <Badge className="bg-warning/10 text-warning">Pending — never logged in</Badge>
                  )}
                  {getStatus(selectedStaff) === 'active' && (
                    <Badge className="bg-primary/10 text-primary">Active</Badge>
                  )}
                </div>

                {/* Personal Details */}
                <div>
                  <h4 className="text-xs font-semibold uppercase text-muted-foreground tracking-wide mb-2">Personal Details</h4>
                  <div className="space-y-2">
                    <DetailRow label="Full name" value={isEditing ? <Input value={editValues.full_name || ''} onChange={e => setEditValues(v => ({ ...v, full_name: e.target.value }))} /> : selectedStaff.full_name} />
                    <DetailRow label="Email" value={
                      <span className="text-sm text-muted-foreground">{selectedStaff.email} <span className="text-xs">(cannot be changed)</span></span>
                    } />
                    <DetailRow label="Phone" value={isEditing ? <Input value={editValues.phone || ''} onChange={e => setEditValues(v => ({ ...v, phone: e.target.value }))} /> : selectedStaff.phone || '—'} />
                    <DetailRow label="National ID" value={isEditing ? <Input value={editValues.national_id || ''} onChange={e => setEditValues(v => ({ ...v, national_id: e.target.value }))} /> : selectedStaff.national_id || '—'} />
                    <DetailRow label="Date of birth" value={isEditing ? <Input type="date" value={editValues.date_of_birth || ''} onChange={e => setEditValues(v => ({ ...v, date_of_birth: e.target.value }))} /> : (selectedStaff.date_of_birth ? format(new Date(selectedStaff.date_of_birth), 'dd MMM yyyy') : '—')} />
                    <DetailRow label="Gender" value={isEditing ? (
                      <Select value={editValues.gender || ''} onValueChange={v => setEditValues(ev => ({ ...ev, gender: v }))}>
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="male">Male</SelectItem>
                          <SelectItem value="female">Female</SelectItem>
                          <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (selectedStaff.gender ? selectedStaff.gender.charAt(0).toUpperCase() + selectedStaff.gender.slice(1).replace(/_/g, ' ') : '—')} />
                    <DetailRow label="County" value={isEditing ? <Input value={editValues.county || ''} onChange={e => setEditValues(v => ({ ...v, county: e.target.value }))} /> : selectedStaff.county || '—'} />
                  </div>
                </div>

                <Separator />

                {/* Employment Details */}
                <div>
                  <h4 className="text-xs font-semibold uppercase text-muted-foreground tracking-wide mb-2">Employment Details</h4>
                  <div className="space-y-2">
                    <DetailRow label="Job title" value={isEditing ? <Input value={editValues.job_title || ''} onChange={e => setEditValues(v => ({ ...v, job_title: e.target.value }))} /> : selectedStaff.job_title || '—'} />
                    <DetailRow label="Department" value={isEditing ? <Input value={editValues.department || ''} onChange={e => setEditValues(v => ({ ...v, department: e.target.value }))} /> : selectedStaff.department || '—'} />
                    <DetailRow label="Employment type" value={isEditing ? (
                      <Select value={editValues.employment_type || ''} onValueChange={v => setEditValues(ev => ({ ...ev, employment_type: v }))}>
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="full_time">Full-time</SelectItem>
                          <SelectItem value="part_time">Part-time</SelectItem>
                          <SelectItem value="contract">Contract</SelectItem>
                          <SelectItem value="volunteer">Volunteer</SelectItem>
                          <SelectItem value="intern">Intern</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (selectedStaff.employment_type ? EMPLOYMENT_TYPE_LABELS[selectedStaff.employment_type] || selectedStaff.employment_type : '—')} />
                    <DetailRow label="Start date" value={isEditing ? <Input type="date" value={editValues.start_date || ''} onChange={e => setEditValues(v => ({ ...v, start_date: e.target.value }))} /> : (selectedStaff.start_date ? format(new Date(selectedStaff.start_date), 'dd MMM yyyy') : '—')} />
                    <DetailRow label="Staff ID" value={isEditing ? <Input value={editValues.staff_id || ''} onChange={e => setEditValues(v => ({ ...v, staff_id: e.target.value }))} /> : selectedStaff.staff_id || '—'} />
                  </div>
                </div>

                <Separator />

                {/* Notes */}
                <div>
                  <h4 className="text-xs font-semibold uppercase text-muted-foreground tracking-wide mb-2">Notes</h4>
                  {isEditing ? (
                    <textarea className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" rows={3}
                      value={editValues.notes || ''} onChange={e => setEditValues(v => ({ ...v, notes: e.target.value }))} />
                  ) : (
                    <p className="text-sm text-foreground">{selectedStaff.notes || 'No notes'}</p>
                  )}
                </div>
              </div>
            )}
          </ScrollArea>

          {isEditing && (
            <div className="pt-4 border-t flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setIsEditing(false)} disabled={isSaving}>Cancel</Button>
              <Button className="flex-1" onClick={handleEditSave} disabled={isSaving}>
                {isSaving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</> : <><Save className="h-4 w-4 mr-2" /> Save Changes</>}
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <AddStaffMemberSheet open={addSheetOpen} onOpenChange={setAddSheetOpen} />
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between items-baseline gap-3 py-1.5">
      <span className="text-xs text-muted-foreground flex-shrink-0">{label}</span>
      <div className="text-sm font-medium text-foreground text-right flex-1 min-w-0">
        {typeof value === 'string' ? <span>{value}</span> : value}
      </div>
    </div>
  );
}

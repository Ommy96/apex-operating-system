import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Loader2, Copy, AlertCircle, UserPlus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface AddStaffMemberSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddStaffMemberSheet({ open, onOpenChange }: AddStaffMemberSheetProps) {
  const { currentOrganization, isLoading: isOrganizationLoading } = useOrganization();
  const orgId = currentOrganization?.organization_id;
  const orgName = currentOrganization?.organization_name || '';
  const queryClient = useQueryClient();

  // Form state
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState('');
  const [county, setCounty] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [department, setDepartment] = useState('');
  const [employmentType, setEmploymentType] = useState('');
  const [startDate, setStartDate] = useState('');
  const [staffId, setStaffId] = useState('');
  const [rbacRoleId, setRbacRoleId] = useState('');
  const [sendInvite, setSendInvite] = useState(true);
  const [notes, setNotes] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Temp password modal
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [tempPasswordName, setTempPasswordName] = useState('');

  // Fetch RBAC roles for dropdown
  const {
    data: rbacRoles = [],
    isLoading: isRolesLoading,
    error: rolesError,
  } = useQuery({
    queryKey: ['rbac-roles-list', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rbac_roles')
        .select('id, name, display_name, color, is_system_role, organization_id')
        .eq('is_active', true)
        .neq('name', 'super_admin')
        .order('is_system_role', { ascending: false })
        .order('display_name');
      if (error) throw error;
      return (data || []).filter(role => role.is_system_role || role.organization_id === orgId);
    },
    enabled: !!orgId && !isOrganizationLoading,
  });

  const roleHelperText = isOrganizationLoading || isRolesLoading
    ? 'Loading roles...'
    : rolesError
      ? 'Could not load roles. Please try again.'
      : rbacRoles.length === 0
        ? 'No active roles available for this organization.'
        : null;

  const generateTempPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
    let pwd = '';
    for (let i = 0; i < 12; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pwd;
  };

  const resetForm = () => {
    setFullName(''); setEmail(''); setPhone(''); setNationalId('');
    setDateOfBirth(''); setGender(''); setCounty(''); setJobTitle('');
    setDepartment(''); setEmploymentType(''); setStartDate('');
    setStaffId(''); setRbacRoleId(''); setSendInvite(true);
    setNotes(''); setError(null);
  };

  const handleSubmit = async () => {
    // Validate
    if (!fullName.trim()) { setError('Full name is required'); return; }
    if (!email.trim()) { setError('Email address is required'); return; }
    if (!rbacRoleId) { setError('Please select a role'); return; }
    setError(null);
    setIsSubmitting(true);

    try {
      if (sendInvite) {
        // Path A: Send invitation email
        const { data, error: fnError } = await supabase.functions.invoke('send-invitation', {
          body: {
            email: email.trim(),
            role: 'member',
            organization_id: orgId,
            organization_name: orgName,
          },
        });
        if (fnError) throw fnError;
        if (data?.error) throw new Error(data.error);

        // Now save extra profile details by looking up if user was created
        // The invitation flow creates the user on acceptance, so we save details later
        // For now, toast success
        toast.success(`Invitation sent to ${email}. They will receive an email to set their password.`);
      } else {
        // Path B: Create account with temp password
        const password = generateTempPassword();
        const { data, error: fnError } = await supabase.functions.invoke('create-org-member', {
          body: {
            email: email.trim(),
            password,
            full_name: fullName.trim(),
            role: 'member',
            organization_id: orgId,
            phone: phone || undefined,
            national_id: nationalId || undefined,
            date_of_birth: dateOfBirth || undefined,
            gender: gender || undefined,
            county: county || undefined,
            job_title: jobTitle || undefined,
            department: department || undefined,
            employment_type: employmentType || undefined,
            start_date: startDate || undefined,
            staff_id: staffId || undefined,
            notes: notes || undefined,
            rbac_role_id: rbacRoleId || undefined,
          },
        });
        if (fnError) throw fnError;
        if (data?.error) throw new Error(data.error);

        // Show temp password modal
        setTempPasswordName(fullName.trim());
        setTempPassword(password);
      }

      const selectedRole = rbacRoles.find(r => r.id === rbacRoleId);
      const roleName = selectedRole?.display_name || 'Member';

      queryClient.invalidateQueries({ queryKey: ['staff-members'] });
      queryClient.invalidateQueries({ queryKey: ['org-members-hr'] });

      if (sendInvite) {
        toast.success(`${fullName.trim()} has been invited as ${roleName}`);
        resetForm();
        onOpenChange(false);
      }
    } catch (err: any) {
      const msg = err?.message || 'Failed to create staff member';
      if (msg.toLowerCase().includes('already') || msg.toLowerCase().includes('duplicate')) {
        setError('This email is already registered. If this person belongs to another organisation, contact support.');
      } else {
        setError(msg);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyPassword = () => {
    if (tempPassword) {
      navigator.clipboard.writeText(tempPassword);
      toast.success('Password copied to clipboard');
    }
  };

  const handleCloseTempPasswordModal = () => {
    setTempPassword(null);
    setTempPasswordName('');
    resetForm();
    onOpenChange(false);
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-lg overflow-hidden flex flex-col">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" />
              Add Staff Member
            </SheetTitle>
          </SheetHeader>

          <ScrollArea className="flex-1 -mx-6 px-6">
            <div className="space-y-6 pb-6">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Personal Details */}
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-3">Personal Details</h3>
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="fullName">Full name *</Label>
                    <Input id="fullName" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="e.g. Jane Wambui Kimani" />
                  </div>
                  <div>
                    <Label htmlFor="email">Email address *</Label>
                    <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="jane@example.org" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="phone">Phone number</Label>
                      <Input id="phone" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+254 7XX XXX XXX" />
                    </div>
                    <div>
                      <Label htmlFor="nationalId">National ID / Passport</Label>
                      <Input id="nationalId" value={nationalId} onChange={e => setNationalId(e.target.value)} placeholder="e.g. 12345678" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="dob">Date of birth</Label>
                      <Input id="dob" type="date" value={dateOfBirth} onChange={e => setDateOfBirth(e.target.value)} />
                    </div>
                    <div>
                      <Label htmlFor="gender">Gender</Label>
                      <Select value={gender} onValueChange={setGender}>
                        <SelectTrigger id="gender"><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="male">Male</SelectItem>
                          <SelectItem value="female">Female</SelectItem>
                          <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="county">County</Label>
                    <Input id="county" value={county} onChange={e => setCounty(e.target.value)} placeholder="e.g. Nairobi" />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Employment Details */}
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-3">Employment Details</h3>
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="jobTitle">Job title *</Label>
                    <Input id="jobTitle" value={jobTitle} onChange={e => setJobTitle(e.target.value)} placeholder="e.g. Programme Officer" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="department">Department</Label>
                      <Input id="department" value={department} onChange={e => setDepartment(e.target.value)} placeholder="e.g. Programs" />
                    </div>
                    <div>
                      <Label htmlFor="empType">Employment type</Label>
                      <Select value={employmentType} onValueChange={setEmploymentType}>
                        <SelectTrigger id="empType"><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="full_time">Full-time</SelectItem>
                          <SelectItem value="part_time">Part-time</SelectItem>
                          <SelectItem value="contract">Contract</SelectItem>
                          <SelectItem value="volunteer">Volunteer</SelectItem>
                          <SelectItem value="intern">Intern</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="startDate">Start date</Label>
                      <Input id="startDate" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                    </div>
                    <div>
                      <Label htmlFor="staffId">Staff ID</Label>
                      <Input id="staffId" value={staffId} onChange={e => setStaffId(e.target.value)} placeholder="e.g. STAFF-001" />
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              {/* System Access */}
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-3">System Access</h3>
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="role">Role *</Label>
                    <Select value={rbacRoleId} onValueChange={setRbacRoleId}>
                      <SelectTrigger id="role" disabled={isOrganizationLoading || isRolesLoading || rbacRoles.length === 0}>
                        <SelectValue placeholder={isOrganizationLoading || isRolesLoading ? 'Loading roles...' : 'Select a role'} />
                      </SelectTrigger>
                      <SelectContent position="popper" className="z-[100]">
                        {rbacRoles.map(r => (
                          <SelectItem key={r.id} value={r.id}>
                            {r.display_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {roleHelperText && (
                      <p className="mt-2 text-xs text-muted-foreground">{roleHelperText}</p>
                    )}
                  </div>
                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <p className="text-sm font-medium">Send invitation email</p>
                      <p className="text-xs text-muted-foreground">Staff member will set their own password via email link</p>
                    </div>
                    <Switch checked={sendInvite} onCheckedChange={setSendInvite} />
                  </div>
                  {!sendInvite && (
                    <p className="text-xs text-warning bg-warning/10 rounded-md p-2">
                      A temporary password will be generated. You'll need to share it with the staff member securely.
                    </p>
                  )}
                </div>
              </div>

              <Separator />

              {/* Notes */}
              <div>
                <Label htmlFor="notes">Notes (optional)</Label>
                <Textarea id="notes" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any additional notes about this staff member..." rows={3} />
              </div>
            </div>
          </ScrollArea>

          <div className="pt-4 border-t flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button className="flex-1" onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Creating...</>
              ) : (
                <><UserPlus className="h-4 w-4 mr-2" /> Add Staff Member</>
              )}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Temp Password Modal */}
      <Dialog open={!!tempPassword} onOpenChange={(open) => { if (!open) handleCloseTempPasswordModal(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Account Created Successfully</DialogTitle>
            <DialogDescription>
              Share this temporary password with <strong>{tempPasswordName}</strong> securely. They should change it on first login.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Input value={tempPassword || ''} readOnly className="font-mono text-lg tracking-wider" />
              <Button variant="outline" size="icon" onClick={handleCopyPassword}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <Alert variant="destructive" className="bg-warning/10 border-warning/30">
              <AlertCircle className="h-4 w-4 text-warning" />
              <AlertDescription className="text-warning">
                This password will not be shown again. Make sure to copy it now.
              </AlertDescription>
            </Alert>
            <Button className="w-full" onClick={handleCloseTempPasswordModal}>Done</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

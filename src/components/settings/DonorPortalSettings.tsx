import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { humanizeDbError } from '@/lib/dbErrors';
import { useOrganization } from '@/hooks/useOrganization';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Heart, Plus, Trash2, Copy, ExternalLink, UserPlus, Mail, RefreshCw, Eye, EyeOff,
} from 'lucide-react';
import { format } from 'date-fns';

interface DonorAccount {
  id: string;
  user_id: string;
  donor_name: string;
  email: string;
  phone: string | null;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
}

export function DonorPortalSettings() {
  const { currentOrganization } = useOrganization();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const orgId = currentOrganization?.organization_id;

  const [showCreate, setShowCreate] = useState(false);
  const [showDelete, setShowDelete] = useState<string | null>(null);
  const [newDonorName, setNewDonorName] = useState('');
  const [newDonorEmail, setNewDonorEmail] = useState('');
  const [newDonorPhone, setNewDonorPhone] = useState('');
  const [newDonorPassword, setNewDonorPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [creating, setCreating] = useState(false);

  const { data: donorAccounts = [], isLoading } = useQuery({
    queryKey: ['donor-accounts', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from('donor_accounts')
        .select('*')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as DonorAccount[];
    },
    enabled: !!orgId,
  });

  const { data: donorVisibleDocs = [] } = useQuery({
    queryKey: ['donor-visible-docs-count', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from('managed_documents')
        .select('id')
        .eq('organization_id', orgId)
        .eq('donor_visible', true);
      if (error) throw error;
      return data || [];
    },
    enabled: !!orgId,
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('donor_accounts')
        .update({ is_active })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['donor-accounts'] });
      toast.success('Donor account updated');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteDonor = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('donor_accounts')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['donor-accounts'] });
      toast.success('Donor account removed');
      setShowDelete(null);
    },
    onError: (e: any) =>
      toast.error(
        humanizeDbError(e, { entity: 'donor account', action: 'remove' }) +
          ' Deactivate the account instead to keep the giving history intact.',
      ),
  });

  const handleCreate = async () => {
    if (!orgId || !newDonorName.trim() || !newDonorEmail.trim() || !newDonorPassword.trim()) return;
    setCreating(true);
    try {
      // Create donor via edge function (uses admin API, doesn't affect current session)
      const { data, error } = await supabase.functions.invoke('create-donor-account', {
        body: {
          email: newDonorEmail.trim(),
          password: newDonorPassword.trim(),
          donor_name: newDonorName.trim(),
          phone: newDonorPhone.trim() || null,
          organization_id: orgId,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      queryClient.invalidateQueries({ queryKey: ['donor-accounts'] });
      toast.success('Donor account created successfully');
      setShowCreate(false);
      setNewDonorName('');
      setNewDonorEmail('');
      setNewDonorPhone('');
      setNewDonorPassword('');
    } catch (err: any) {
      toast.error(err.message || 'Failed to create donor account');
    } finally {
      setCreating(false);
    }
  };

  const portalUrl = `${window.location.origin}/donor/login`;

  const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
    let pw = '';
    for (let i = 0; i < 12; i++) pw += chars[Math.floor(Math.random() * chars.length)];
    setNewDonorPassword(pw);
    setShowPassword(true);
  };

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Heart className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{donorAccounts.length}</p>
              <p className="text-xs text-muted-foreground">Donor Accounts</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center">
              <UserPlus className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {donorAccounts.filter(d => d.is_active).length}
              </p>
              <p className="text-xs text-muted-foreground">Active Accounts</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center">
              <Eye className="h-5 w-5 text-accent" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{donorVisibleDocs.length}</p>
              <p className="text-xs text-muted-foreground">Donor-Visible Docs</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Portal URL */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Donor Portal URL</CardTitle>
          <CardDescription>Share this link with your donors to access their portal</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Input value={portalUrl} readOnly className="font-mono text-sm" />
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                navigator.clipboard.writeText(portalUrl);
                toast.success('Portal URL copied to clipboard');
              }}
            >
              <Copy className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => window.open(portalUrl, '_blank')}
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Donor Accounts Management */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Donor Accounts</CardTitle>
              <CardDescription>Manage donor login credentials and access</CardDescription>
            </div>
            <Button size="sm" onClick={() => setShowCreate(true)}>
              <Plus className="h-4 w-4 mr-1" /> Add Donor
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Donor Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="hidden sm:table-cell">Created</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[80px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : donorAccounts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No donor accounts created yet
                  </TableCell>
                </TableRow>
              ) : (
                donorAccounts.map((donor) => (
                  <TableRow key={donor.id}>
                    <TableCell className="font-medium">{donor.donor_name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{donor.email}</TableCell>
                    <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                      {format(new Date(donor.created_at), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={donor.is_active}
                        onCheckedChange={(checked) =>
                          toggleActive.mutate({ id: donor.id, is_active: checked })
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => setShowDelete(donor.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-4">
          <h4 className="font-semibold text-sm text-foreground mb-2">How the Donor Portal Works</h4>
          <ul className="text-sm text-muted-foreground space-y-1.5">
            <li>• Donors log in at the portal URL above with their email and password</li>
            <li>• They see beneficiaries linked to their donor name via <strong>beneficiary_donors</strong></li>
            <li>• The donor name in the account must match the donor name in beneficiary sponsorships</li>
            <li>• Documents marked as "Donor Visible" in Document Management appear in their portal</li>
            <li>• Use document types (Progress Report, Thank You Letter, Audit Report, Program Report) for organization</li>
          </ul>
        </CardContent>
      </Card>

      {/* Create Donor Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Donor Account</DialogTitle>
            <DialogDescription>
              Create login credentials for a donor. The donor name must match existing sponsorship records.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Donor Name *</Label>
              <Input
                placeholder="e.g. John Doe Foundation"
                value={newDonorName}
                onChange={(e) => setNewDonorName(e.target.value)}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Must match the donor name used in beneficiary sponsorships
              </p>
            </div>
            <div>
              <Label>Email *</Label>
              <Input
                type="email"
                placeholder="donor@example.com"
                value={newDonorEmail}
                onChange={(e) => setNewDonorEmail(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Phone (optional)</Label>
              <Input
                placeholder="+254..."
                value={newDonorPhone}
                onChange={(e) => setNewDonorPhone(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <Label>Password *</Label>
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={generatePassword}>
                  <RefreshCw className="h-3 w-3 mr-1" /> Generate
                </Button>
              </div>
              <div className="relative mt-1">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Min 6 characters"
                  value={newDonorPassword}
                  onChange={(e) => setNewDonorPassword(e.target.value)}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button
              onClick={handleCreate}
              disabled={!newDonorName.trim() || !newDonorEmail.trim() || !newDonorPassword.trim() || creating}
            >
              {creating ? 'Creating...' : 'Create Account'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!showDelete} onOpenChange={() => setShowDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Donor Account</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the donor's portal access. The auth account will remain but they won't be able to access the donor portal. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => showDelete && deleteDonor.mutate(showDelete)}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

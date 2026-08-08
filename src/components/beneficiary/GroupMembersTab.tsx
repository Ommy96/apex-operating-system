import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Pencil, Trash2, Users, Phone, Mail, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useGroupMembers, useSaveGroupMember, useRemoveGroupMember, GROUP_ROLES, type GroupMember } from '@/hooks/useGroupMembers';

const roleTone: Record<string, string> = {
  chairperson: 'bg-primary/10 text-primary border-primary/20',
  secretary: 'bg-accent/10 text-accent-foreground border-accent/20',
  treasurer: 'bg-muted text-foreground border-border',
};

const initials = (name: string) =>
  name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('') || '?';

export function GroupMembersTab({ groupBeneficiaryId, canEdit = true }: { groupBeneficiaryId: string; canEdit?: boolean }) {
  const { data: members = [], isLoading } = useGroupMembers(groupBeneficiaryId);
  const save = useSaveGroupMember();
  const remove = useRemoveGroupMember();
  const [editing, setEditing] = useState<Partial<GroupMember> | null>(null);

  const onSave = async () => {
    if (!editing?.full_name?.trim()) return toast.error("The member's name is required");
    try {
      await save.mutateAsync({ ...editing, group_beneficiary_id: groupBeneficiaryId } as any);
      toast.success(editing.id ? 'Member updated' : 'Member added');
      setEditing(null);
    } catch (e: any) {
      toast.error(e?.message || 'Could not save the member');
    }
  };

  const onRemove = async (m: GroupMember) => {
    if (!confirm(`Remove ${m.full_name} from this group?`)) return;
    try {
      await remove.mutateAsync({ id: m.id, group_beneficiary_id: groupBeneficiaryId });
      toast.success('Member removed');
    } catch (e: any) {
      toast.error(e?.message || 'Could not remove the member');
    }
  };

  const officials = members.filter((m) => m.role_in_group && m.role_in_group !== 'member').length;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold">Members</h3>
          <p className="text-sm text-muted-foreground">
            {members.length} {members.length === 1 ? 'member' : 'members'}
            {officials > 0 && ` · ${officials} office bearer${officials === 1 ? '' : 's'}`}
          </p>
        </div>
        {canEdit && (
          <Button size="sm" onClick={() => setEditing({ role_in_group: 'member', joined_date: new Date().toISOString().slice(0, 10) })}>
            <Plus className="h-4 w-4 mr-1" /> Add member
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-28 w-full rounded-xl" />)}
        </div>
      ) : members.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <Users className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm font-medium">No members recorded yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Add the people who make up this group, with their contacts and role.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {members.map((m) => (
            <Card key={m.id} className="overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex items-start gap-3">
                  <Avatar className="h-10 w-10 shrink-0">
                    <AvatarFallback className="text-xs font-semibold">{initials(m.full_name)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-sm truncate">{m.full_name}</CardTitle>
                    <div className="flex flex-wrap items-center gap-1.5 mt-1">
                      {m.role_in_group && (
                        <Badge variant="outline" className={`text-[10px] capitalize ${roleTone[m.role_in_group] || ''}`}>
                          {m.role_in_group}
                        </Badge>
                      )}
                      {m.gender && <span className="text-[10px] text-muted-foreground capitalize">{m.gender}</span>}
                    </div>
                  </div>
                  {canEdit && (
                    <div className="flex shrink-0">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditing(m)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onRemove(m)}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-0 space-y-1.5">
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  {m.phone && <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" />{m.phone}</span>}
                  {m.email && <span className="inline-flex items-center gap-1 truncate"><Mail className="h-3 w-3" />{m.email}</span>}
                </div>
                {m.bio && <p className="text-xs text-muted-foreground line-clamp-3">{m.bio}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing?.id ? 'Edit member' : 'Add member'}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div>
                <Label>Full name *</Label>
                <Input value={editing.full_name || ''} onChange={(e) => setEditing({ ...editing, full_name: e.target.value })} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label>Role in group</Label>
                  <Select value={editing.role_in_group || 'member'} onValueChange={(v) => setEditing({ ...editing, role_in_group: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {GROUP_ROLES.map((r) => (
                        <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Gender</Label>
                  <Select value={editing.gender || ''} onValueChange={(v) => setEditing({ ...editing, gender: v })}>
                    <SelectTrigger><SelectValue placeholder="Not specified" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label>Phone</Label>
                  <Input value={editing.phone || ''} onChange={(e) => setEditing({ ...editing, phone: e.target.value })} placeholder="07…" />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input type="email" value={editing.email || ''} onChange={(e) => setEditing({ ...editing, email: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <Label>Date of birth</Label>
                  <Input type="date" value={editing.date_of_birth || ''} onChange={(e) => setEditing({ ...editing, date_of_birth: e.target.value })} />
                </div>
                <div>
                  <Label>National ID</Label>
                  <Input value={editing.national_id || ''} onChange={(e) => setEditing({ ...editing, national_id: e.target.value })} />
                </div>
                <div>
                  <Label>Joined</Label>
                  <Input type="date" value={editing.joined_date || ''} onChange={(e) => setEditing({ ...editing, joined_date: e.target.value })} />
                </div>
              </div>
              <div>
                <Label>Bio / notes</Label>
                <Textarea
                  rows={3}
                  value={editing.bio || ''}
                  onChange={(e) => setEditing({ ...editing, bio: e.target.value })}
                  placeholder="Livelihood, skills, responsibilities within the group…"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={onSave} disabled={save.isPending}>
              {save.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

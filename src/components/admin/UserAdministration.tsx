import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAllUsers, UserWithDetails } from '@/hooks/useSystemAdmin';
import { Users, Search, MoreHorizontal, Shield, Mail, Building2, Loader2, UserCog, KeyRound } from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-destructive/50 text-destructive border-destructive/30',
  management: 'bg-info/50 text-info border-info/30',
  staff: 'bg-info/50 text-info border-info/30',
};

export function UserAdministration() {
  const { data: users, isLoading } = useAllUsers();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');

  const filteredUsers = users?.filter((user) => {
    const matchesSearch = 
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesRole = filterRole === 'all' || user.role === filterRole;
    return matchesSearch && matchesRole;
  });

  const getInitials = (name: string | null, email: string) => {
    if (name) return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    return email.slice(0, 2).toUpperCase();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-warning" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 p-3 rounded-lg bg-muted-foreground/50 border border-border/50">
        <Users className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs text-muted-foreground font-medium">USER ADMINISTRATION</span>
        <div className="flex items-center gap-3 ml-auto">
          <span className="flex items-center gap-1 text-xs">
            <div className="h-2 w-2 rounded-full bg-destructive" />
            <span className="text-destructive">{users?.filter(u => u.role === 'admin').length || 0}</span>
          </span>
          <span className="flex items-center gap-1 text-xs">
            <div className="h-2 w-2 rounded-full bg-info" />
            <span className="text-info">{users?.filter(u => u.role === 'management').length || 0}</span>
          </span>
          <span className="flex items-center gap-1 text-xs">
            <div className="h-2 w-2 rounded-full bg-info" />
            <span className="text-info">{users?.filter(u => u.role === 'staff').length || 0}</span>
          </span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search users by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-muted-foreground/50 border-border text-muted-foreground placeholder:text-muted-foreground"
          />
        </div>
        <Select value={filterRole} onValueChange={setFilterRole}>
          <SelectTrigger className="w-full sm:w-[140px] bg-muted-foreground/50 border-border text-muted-foreground">
            <SelectValue placeholder="Role" />
          </SelectTrigger>
          <SelectContent className="bg-muted-foreground border-border">
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="management">Management</SelectItem>
            <SelectItem value="staff">Staff</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Users Table */}
      <div className="rounded-lg border border-border/50 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted-foreground/80 border-border hover:bg-muted-foreground/80">
              <TableHead className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">User</TableHead>
              <TableHead className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">Role</TableHead>
              <TableHead className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">Organizations</TableHead>
              <TableHead className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">Joined</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers?.map((user) => (
              <TableRow key={user.id} className="group border-border/50 hover:bg-muted-foreground/30">
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-muted-foreground text-muted-foreground text-xs">
                        {getInitials(user.full_name, user.email)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="text-sm font-medium text-muted-foreground">{user.full_name || 'No name'}</div>
                      <div className="text-xs text-muted-foreground">{user.email}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={`text-xs ${ROLE_COLORS[user.role] || 'border-border text-muted-foreground'}`}>
                    {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {user.organizations.length > 0 ? (
                      user.organizations.slice(0, 2).map((org, idx) => (
                        <Badge key={idx} variant="outline" className="text-[10px] border-border text-muted-foreground">
                          {org.name}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-xs text-muted-foreground">No org</span>
                    )}
                    {user.organizations.length > 2 && (
                      <Badge variant="outline" className="text-[10px] border-border text-muted-foreground">
                        +{user.organizations.length - 2}
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground font-mono">
                  {format(new Date(user.created_at), 'MMM d, yyyy')}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 text-muted-foreground">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-muted-foreground border-border">
                      <DropdownMenuLabel className="text-muted-foreground">Actions</DropdownMenuLabel>
                      <DropdownMenuSeparator className="bg-muted-foreground" />
                      <DropdownMenuItem className="text-muted-foreground focus:bg-muted-foreground">
                        <UserCog className="h-4 w-4 mr-2" />View Profile
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-muted-foreground focus:bg-muted-foreground">
                        <KeyRound className="h-4 w-4 mr-2" />Reset Password
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
            {(!filteredUsers || filteredUsers.length === 0) && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                  No users found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="text-xs text-muted-foreground">
        Showing {filteredUsers?.length || 0} of {users?.length || 0} users
      </div>
    </div>
  );
}

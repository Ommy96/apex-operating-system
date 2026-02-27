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
  admin: 'bg-red-900/50 text-red-300 border-red-700',
  management: 'bg-purple-900/50 text-purple-300 border-purple-700',
  staff: 'bg-blue-900/50 text-blue-300 border-blue-700',
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
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-800/50 border border-slate-700/50">
        <Users className="h-4 w-4 text-slate-400" />
        <span className="text-xs text-slate-400 font-medium">USER ADMINISTRATION</span>
        <div className="flex items-center gap-3 ml-auto">
          <span className="flex items-center gap-1 text-xs">
            <div className="h-2 w-2 rounded-full bg-red-500" />
            <span className="text-red-400">{users?.filter(u => u.role === 'admin').length || 0}</span>
          </span>
          <span className="flex items-center gap-1 text-xs">
            <div className="h-2 w-2 rounded-full bg-purple-500" />
            <span className="text-purple-400">{users?.filter(u => u.role === 'management').length || 0}</span>
          </span>
          <span className="flex items-center gap-1 text-xs">
            <div className="h-2 w-2 rounded-full bg-blue-500" />
            <span className="text-blue-400">{users?.filter(u => u.role === 'staff').length || 0}</span>
          </span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <Input
            placeholder="Search users by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-slate-800/50 border-slate-700 text-slate-200 placeholder:text-slate-500"
          />
        </div>
        <Select value={filterRole} onValueChange={setFilterRole}>
          <SelectTrigger className="w-[140px] bg-slate-800/50 border-slate-700 text-slate-300">
            <SelectValue placeholder="Role" />
          </SelectTrigger>
          <SelectContent className="bg-slate-800 border-slate-700">
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="management">Management</SelectItem>
            <SelectItem value="staff">Staff</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Users Table */}
      <div className="rounded-lg border border-slate-700/50 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-800/80 border-slate-700 hover:bg-slate-800/80">
              <TableHead className="text-slate-400 text-xs font-semibold uppercase tracking-wider">User</TableHead>
              <TableHead className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Role</TableHead>
              <TableHead className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Organizations</TableHead>
              <TableHead className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Joined</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers?.map((user) => (
              <TableRow key={user.id} className="group border-slate-700/50 hover:bg-slate-800/30">
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-slate-700 text-slate-300 text-xs">
                        {getInitials(user.full_name, user.email)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="text-sm font-medium text-slate-200">{user.full_name || 'No name'}</div>
                      <div className="text-xs text-slate-500">{user.email}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={`text-xs ${ROLE_COLORS[user.role] || 'border-slate-600 text-slate-400'}`}>
                    {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {user.organizations.length > 0 ? (
                      user.organizations.slice(0, 2).map((org, idx) => (
                        <Badge key={idx} variant="outline" className="text-[10px] border-slate-600 text-slate-400">
                          {org.name}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-xs text-slate-500">No org</span>
                    )}
                    {user.organizations.length > 2 && (
                      <Badge variant="outline" className="text-[10px] border-slate-600 text-slate-400">
                        +{user.organizations.length - 2}
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-xs text-slate-400 font-mono">
                  {format(new Date(user.created_at), 'MMM d, yyyy')}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 text-slate-400">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-slate-800 border-slate-700">
                      <DropdownMenuLabel className="text-slate-400">Actions</DropdownMenuLabel>
                      <DropdownMenuSeparator className="bg-slate-700" />
                      <DropdownMenuItem className="text-slate-300 focus:bg-slate-700">
                        <UserCog className="h-4 w-4 mr-2" />View Profile
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-slate-300 focus:bg-slate-700">
                        <KeyRound className="h-4 w-4 mr-2" />Reset Password
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
            {(!filteredUsers || filteredUsers.length === 0) && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12 text-slate-500">
                  No users found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="text-xs text-slate-500">
        Showing {filteredUsers?.length || 0} of {users?.length || 0} users
      </div>
    </div>
  );
}

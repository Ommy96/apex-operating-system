import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Plus, Search, Eye, Edit2, Trash2, GraduationCap, UserCheck, UsersRound, X, Loader2, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { useOrganization } from '@/hooks/useOrganization';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { PageHeroHeader } from '@/components/PageHeroHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StudentBeneficiaryForm, AdultBeneficiaryForm, GroupBeneficiaryForm } from '@/components/beneficiary';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface Beneficiary {
  id: string;
  beneficiary_type: 'student' | 'adult' | 'group';
  display_name: string;
  first_name: string | null;
  last_name: string | null;
  group_name: string | null;
  date_of_birth: string | null;
  gender: string | null;
  photo_url: string | null;
  status: string;
  location: string | null;
  county: string | null;
  academic_level: string | null;
  institution_name: string | null;
  member_count: number | null;
  created_at: string;
}

interface BeneficiaryStats {
  total: number;
  students: number;
  adults: number;
  groups: number;
}

type BeneficiaryTypeFilter = 'all' | 'student' | 'adult' | 'group';

export default function Beneficiaries() {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const { currentOrganization } = useOrganization();
  const organizationId = currentOrganization?.organization_id;
  
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<BeneficiaryTypeFilter>('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<'student' | 'adult' | 'group'>('student');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [stats, setStats] = useState<BeneficiaryStats>({
    total: 0,
    students: 0,
    adults: 0,
    groups: 0
  });

  useEffect(() => {
    if (organizationId) {
      fetchBeneficiaries();
    }
  }, [organizationId]);

  const fetchBeneficiaries = async () => {
    if (!organizationId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('beneficiaries')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const beneficiaryData = (data || []) as Beneficiary[];
      setBeneficiaries(beneficiaryData);
      
      setStats({
        total: beneficiaryData.length,
        students: beneficiaryData.filter(b => b.beneficiary_type === 'student').length,
        adults: beneficiaryData.filter(b => b.beneficiary_type === 'adult').length,
        groups: beneficiaryData.filter(b => b.beneficiary_type === 'group').length
      });
    } catch (error) {
      console.error('Error fetching beneficiaries:', error);
      toast({
        title: "Error",
        description: "Failed to load beneficiaries",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const { error } = await supabase
        .from('beneficiaries')
        .delete()
        .eq('id', deleteId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Beneficiary deleted successfully",
      });
      
      setDeleteId(null);
      fetchBeneficiaries();
    } catch (error) {
      console.error('Error deleting beneficiary:', error);
      toast({
        title: "Error",
        description: "Failed to delete beneficiary",
        variant: "destructive",
      });
    }
  };

  const getFilteredBeneficiaries = () => {
    return beneficiaries.filter(b => {
      const matchesSearch = b.display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.institution_name?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesType = typeFilter === 'all' || b.beneficiary_type === typeFilter;
      const matchesStatus = statusFilter === 'all' || b.status === statusFilter;
      
      return matchesSearch && matchesType && matchesStatus;
    });
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'student': return GraduationCap;
      case 'adult': return UserCheck;
      case 'group': return UsersRound;
      default: return Users;
    }
  };

  const getTypeBadgeClass = (type: string) => {
    switch (type) {
      case 'student': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'adult': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
      case 'group': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'active': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
      case 'inactive': return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400';
      case 'graduated': return 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n.charAt(0)).join('').toUpperCase().slice(0, 2);
  };

  const getPastelColor = (id: string) => {
    const pastelColors = [
      'hsl(210, 100%, 92%)',
      'hsl(150, 80%, 90%)',
      'hsl(45, 100%, 90%)',
      'hsl(300, 85%, 92%)',
      'hsl(15, 100%, 90%)',
      'hsl(180, 85%, 90%)',
      'hsl(330, 100%, 92%)',
      'hsl(270, 80%, 92%)',
    ];
    const hash = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return pastelColors[hash % pastelColors.length];
  };

  const calculateAge = (birthDate: string | null) => {
    if (!birthDate) return null;
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const filteredBeneficiaries = getFilteredBeneficiaries();
  const hasActiveFilters = typeFilter !== 'all' || statusFilter !== 'all';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeroHeader
        title="Beneficiaries"
        description="Manage all beneficiary types - students, adults, and groups"
        icon={Users}
        iconColorClass="text-primary-foreground"
        actions={
          isAdmin && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-accent hover:bg-accent-dark text-accent-foreground shadow-lg">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Beneficiary
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Add New Beneficiary</DialogTitle>
                </DialogHeader>
                <Tabs value={selectedType} onValueChange={(v) => setSelectedType(v as any)} className="w-full">
                  <TabsList className="grid w-full grid-cols-3 mb-4">
                    <TabsTrigger value="student" className="flex items-center gap-2">
                      <GraduationCap className="h-4 w-4" />
                      Student
                    </TabsTrigger>
                    <TabsTrigger value="adult" className="flex items-center gap-2">
                      <UserCheck className="h-4 w-4" />
                      Adult
                    </TabsTrigger>
                    <TabsTrigger value="group" className="flex items-center gap-2">
                      <UsersRound className="h-4 w-4" />
                      Group
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="student">
                    <StudentBeneficiaryForm
                      onSuccess={() => {
                        setIsDialogOpen(false);
                        fetchBeneficiaries();
                      }}
                      onCancel={() => setIsDialogOpen(false)}
                    />
                  </TabsContent>
                  <TabsContent value="adult">
                    <AdultBeneficiaryForm
                      onSuccess={() => {
                        setIsDialogOpen(false);
                        fetchBeneficiaries();
                      }}
                      onCancel={() => setIsDialogOpen(false)}
                    />
                  </TabsContent>
                  <TabsContent value="group">
                    <GroupBeneficiaryForm
                      onSuccess={() => {
                        setIsDialogOpen(false);
                        fetchBeneficiaries();
                      }}
                      onCancel={() => setIsDialogOpen(false)}
                    />
                  </TabsContent>
                </Tabs>
              </DialogContent>
            </Dialog>
          )
        }
        stats={[
          { label: 'Total Beneficiaries', value: stats.total, icon: Users },
          { label: 'Students', value: stats.students, icon: GraduationCap },
          { label: 'Adults', value: stats.adults, icon: UserCheck },
          { label: 'Groups', value: stats.groups, icon: UsersRound },
        ]}
      />

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search by name, location, or institution..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <div className="flex gap-2">
          <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as BeneficiaryTypeFilter)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="student">Students</SelectItem>
              <SelectItem value="adult">Adults</SelectItem>
              <SelectItem value="group">Groups</SelectItem>
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="graduated">Graduated</SelectItem>
            </SelectContent>
          </Select>

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setTypeFilter('all');
                setStatusFilter('all');
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Results count */}
      <div className="text-sm text-muted-foreground">
        Showing {filteredBeneficiaries.length} of {beneficiaries.length} beneficiaries
      </div>

      {/* Modern Table View */}
      <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="w-[300px]">Beneficiary</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden md:table-cell">Details</TableHead>
              <TableHead className="hidden lg:table-cell">Location</TableHead>
              <TableHead className="hidden xl:table-cell">Created</TableHead>
              <TableHead className="text-right w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredBeneficiaries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center">
                  <div className="flex flex-col items-center justify-center text-muted-foreground">
                    <Users className="h-10 w-10 mb-2 opacity-40" />
                    <p className="font-medium">No beneficiaries found</p>
                    <p className="text-sm">Try adjusting your search or filters</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredBeneficiaries.map((beneficiary) => {
                const TypeIcon = getTypeIcon(beneficiary.beneficiary_type);
                const age = calculateAge(beneficiary.date_of_birth);
                
                return (
                  <TableRow 
                    key={beneficiary.id} 
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => navigate(`/beneficiaries/${beneficiary.id}`)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10 border-2 border-background shadow-sm">
                          {beneficiary.photo_url ? (
                            <AvatarImage src={beneficiary.photo_url} alt={beneficiary.display_name} />
                          ) : null}
                          <AvatarFallback style={{ backgroundColor: getPastelColor(beneficiary.id) }}>
                            {getInitials(beneficiary.display_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-foreground">{beneficiary.display_name}</p>
                          {beneficiary.gender && (
                            <p className="text-xs text-muted-foreground capitalize">{beneficiary.gender}</p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={`${getTypeBadgeClass(beneficiary.beneficiary_type)} border-0 font-medium`}>
                        <TypeIcon className="h-3 w-3 mr-1" />
                        <span className="capitalize">{beneficiary.beneficiary_type}</span>
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={`${getStatusBadgeClass(beneficiary.status)} border-0 font-medium capitalize`}>
                        {beneficiary.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div className="text-sm text-muted-foreground">
                        {beneficiary.beneficiary_type === 'student' && (
                          <>
                            {age && <span>{age} yrs</span>}
                            {age && beneficiary.academic_level && <span> • </span>}
                            {beneficiary.academic_level && <span>{beneficiary.academic_level}</span>}
                          </>
                        )}
                        {beneficiary.beneficiary_type === 'adult' && (
                          <span>{beneficiary.county || '—'}</span>
                        )}
                        {beneficiary.beneficiary_type === 'group' && (
                          <span>{beneficiary.member_count ? `${beneficiary.member_count} members` : '—'}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <span className="text-sm text-muted-foreground">
                        {beneficiary.location || beneficiary.institution_name || '—'}
                      </span>
                    </TableCell>
                    <TableCell className="hidden xl:table-cell">
                      <span className="text-sm text-muted-foreground">
                        {formatDate(beneficiary.created_at)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/beneficiaries/${beneficiary.id}`);
                          }}>
                            <Eye className="h-4 w-4 mr-2" />
                            View Profile
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/beneficiaries/${beneficiary.id}?edit=true`);
                          }}>
                            <Edit2 className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          {isAdmin && (
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteId(beneficiary.id);
                              }}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Beneficiary</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this beneficiary? This action cannot be undone and will remove all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

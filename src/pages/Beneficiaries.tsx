import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Users, Plus, Search, Eye, Edit2, Trash2, GraduationCap, 
  UserCheck, UsersRound, X, Loader2, MoreHorizontal,
  List, LayoutGrid, Filter, Download, ChevronDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { useOrganization } from '@/hooks/useOrganization';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
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
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  PageHeader,
  StatCard,
  StatusBadge,
  getStatusVariant,
  ViewSwitcher,
  FilterChip,
  FilterBar,
  WorkspacePanel,
  DetailPanel,
} from '@/components/workspace';

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
  active: number;
}

type BeneficiaryTypeFilter = 'all' | 'student' | 'adult' | 'group';
type ViewMode = 'table' | 'grid';

const viewOptions = [
  { id: 'table', label: 'Table', icon: List },
  { id: 'grid', label: 'Grid', icon: LayoutGrid },
];

export default function Beneficiaries() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
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
  const [editingBeneficiary, setEditingBeneficiary] = useState<Beneficiary | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [selectedBeneficiary, setSelectedBeneficiary] = useState<Beneficiary | null>(null);
  const [stats, setStats] = useState<BeneficiaryStats>({
    total: 0,
    students: 0,
    adults: 0,
    groups: 0,
    active: 0,
  });

  useEffect(() => {
    if (organizationId) {
      fetchBeneficiaries();
    }
  }, [organizationId]);

  // Handle edit query params
  useEffect(() => {
    const editId = searchParams.get('edit');
    const editType = searchParams.get('type') as 'student' | 'adult' | 'group' | null;
    if (editId && editType && beneficiaries.length > 0) {
      const found = beneficiaries.find(b => b.id === editId);
      if (found) {
        setEditingBeneficiary(found);
        setSelectedType(editType);
        setIsDialogOpen(true);
        // Clear the query params
        setSearchParams({}, { replace: true });
      }
    }
  }, [searchParams, beneficiaries]);

  const fetchBeneficiaries = async () => {
    if (!organizationId) return;
    setLoading(true);
    try {
      // Fetch all rows in batches to avoid Supabase 1000-row default limit
      const batchSize = 1000;
      let allData: Beneficiary[] = [];
      let offset = 0;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from('beneficiaries')
          .select('*')
          .eq('organization_id', organizationId)
          .order('created_at', { ascending: false })
          .range(offset, offset + batchSize - 1);

        if (error) throw error;

        if (data && data.length > 0) {
          allData = [...allData, ...(data as Beneficiary[])];
          offset += batchSize;
          hasMore = data.length === batchSize;
        } else {
          hasMore = false;
        }
      }

      setBeneficiaries(allData);
      
      setStats({
        total: allData.length,
        students: allData.filter(b => b.beneficiary_type === 'student').length,
        adults: allData.filter(b => b.beneficiary_type === 'adult').length,
        groups: allData.filter(b => b.beneficiary_type === 'group').length,
        active: allData.filter(b => b.status === 'active').length,
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

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n.charAt(0)).join('').toUpperCase().slice(0, 2);
  };

  const getPastelColor = (id: string) => {
    const colors = [
      'hsl(160, 60%, 90%)',
      'hsl(173, 60%, 90%)',
      'hsl(210, 60%, 90%)',
      'hsl(270, 60%, 90%)',
      'hsl(38, 60%, 90%)',
      'hsl(350, 60%, 90%)',
    ];
    const hash = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
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
      {/* Page Header */}
      <PageHeader
        title="Beneficiaries"
        description="Manage all beneficiary types - students, adults, and groups"
        icon={Users}
        actions={
          isAdmin && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="h-9 gap-1.5">
                  <Plus className="h-4 w-4" />
                  Add Beneficiary
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingBeneficiary ? 'Edit Beneficiary' : 'Add New Beneficiary'}</DialogTitle>
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
                      beneficiary={editingBeneficiary?.beneficiary_type === 'student' ? editingBeneficiary : undefined}
                      onSuccess={() => {
                        setIsDialogOpen(false);
                        setEditingBeneficiary(null);
                        fetchBeneficiaries();
                      }}
                      onCancel={() => { setIsDialogOpen(false); setEditingBeneficiary(null); }}
                    />
                  </TabsContent>
                  <TabsContent value="adult">
                    <AdultBeneficiaryForm
                      beneficiary={editingBeneficiary?.beneficiary_type === 'adult' ? editingBeneficiary : undefined}
                      onSuccess={() => {
                        setIsDialogOpen(false);
                        setEditingBeneficiary(null);
                        fetchBeneficiaries();
                      }}
                      onCancel={() => { setIsDialogOpen(false); setEditingBeneficiary(null); }}
                    />
                  </TabsContent>
                  <TabsContent value="group">
                    <GroupBeneficiaryForm
                      onSuccess={() => {
                        setIsDialogOpen(false);
                        setEditingBeneficiary(null);
                        fetchBeneficiaries();
                      }}
                      onCancel={() => { setIsDialogOpen(false); setEditingBeneficiary(null); }}
                    />
                  </TabsContent>
                </Tabs>
              </DialogContent>
            </Dialog>
          )
        }
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
        <StatCard
          title="Total"
          value={stats.total}
          icon={Users}
          variant="primary"
        />
        <StatCard
          title="Students"
          value={stats.students}
          icon={GraduationCap}
          variant="info"
        />
        <StatCard
          title="Adults"
          value={stats.adults}
          icon={UserCheck}
          variant="success"
        />
        <StatCard
          title="Groups"
          value={stats.groups}
          icon={UsersRound}
          variant="warning"
        />
        <StatCard
          title="Active"
          value={stats.active}
          description={`${stats.total > 0 ? Math.round((stats.active / stats.total) * 100) : 0}% of total`}
          variant="default"
          className="hidden lg:block"
        />
      </div>

      {/* Filters & View Toggle */}
      <WorkspacePanel padding="sm" className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full sm:w-auto">
          {/* Search */}
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search beneficiaries..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-9 bg-muted/30 border-transparent focus:border-border"
            />
          </div>
          
          {/* Filter Chips */}
          <FilterBar className="hidden md:flex">
            <FilterChip
              label="All Types"
              active={typeFilter === 'all'}
              onToggle={() => setTypeFilter('all')}
            />
            <FilterChip
              label="Students"
              active={typeFilter === 'student'}
              onToggle={() => setTypeFilter('student')}
              count={stats.students}
            />
            <FilterChip
              label="Adults"
              active={typeFilter === 'adult'}
              onToggle={() => setTypeFilter('adult')}
              count={stats.adults}
            />
            <FilterChip
              label="Groups"
              active={typeFilter === 'group'}
              onToggle={() => setTypeFilter('group')}
              count={stats.groups}
            />
          </FilterBar>
          
          {/* Mobile Filters */}
          <div className="flex gap-2 md:hidden w-full">
            <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as BeneficiaryTypeFilter)}>
              <SelectTrigger className="h-9 flex-1">
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
              <SelectTrigger className="h-9 flex-1">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="graduated">Graduated</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Status Filter (Desktop) */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-9 w-32 hidden md:flex">
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
              size="sm"
              onClick={() => {
                setTypeFilter('all');
                setStatusFilter('all');
              }}
              className="h-9 px-2 text-muted-foreground"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
          
          {/* View Switcher */}
          <ViewSwitcher
            views={viewOptions}
            activeView={viewMode}
            onViewChange={(v) => setViewMode(v as ViewMode)}
          />
        </div>
      </WorkspacePanel>

      {/* Results Count */}
      <div className="text-sm text-muted-foreground">
        Showing {filteredBeneficiaries.length} of {beneficiaries.length} beneficiaries
      </div>

      {/* Table View */}
      {viewMode === 'table' && (
        <WorkspacePanel padding="none" className="overflow-hidden">
          <div className="overflow-x-auto">
          <Table className="min-w-[700px]">
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead className="min-w-[200px]">Beneficiary</TableHead>
                <TableHead className="min-w-[90px]">Type</TableHead>
                <TableHead className="min-w-[90px]">Status</TableHead>
                <TableHead className="min-w-[140px] hidden md:table-cell">Details</TableHead>
                <TableHead className="min-w-[120px] hidden lg:table-cell">Location</TableHead>
                <TableHead className="min-w-[100px] hidden xl:table-cell">Created</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBeneficiaries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center">
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                      <Users className="h-10 w-10 mb-2 opacity-40" />
                      <p className="font-medium">No beneficiaries found</p>
                      <p className="text-sm">Try adjusting your filters</p>
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
                      className="cursor-pointer group"
                      onClick={() => setSelectedBeneficiary(beneficiary)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9 border border-border/50">
                            {beneficiary.photo_url ? (
                              <AvatarImage src={beneficiary.photo_url} alt={beneficiary.display_name} />
                            ) : null}
                            <AvatarFallback style={{ backgroundColor: getPastelColor(beneficiary.id) }} className="text-xs font-medium">
                              {getInitials(beneficiary.display_name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="font-medium text-foreground truncate group-hover:text-primary transition-colors">
                              {beneficiary.display_name}
                            </p>
                            {beneficiary.gender && (
                              <p className="text-xs text-muted-foreground capitalize">{beneficiary.gender}</p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <TypeIcon className="h-3.5 w-3.5" />
                          <span className="capitalize">{beneficiary.beneficiary_type}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <StatusBadge variant={getStatusVariant(beneficiary.status)} dot>
                          {beneficiary.status}
                        </StatusBadge>
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
                        <span className="text-sm text-muted-foreground truncate">
                          {beneficiary.location || beneficiary.institution_name || '—'}
                        </span>
                      </TableCell>
                      <TableCell className="hidden xl:table-cell">
                        <span className="text-sm text-muted-foreground">
                          {formatDate(beneficiary.created_at)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
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
                              <>
                                <DropdownMenuSeparator />
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
                              </>
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
        </WorkspacePanel>
      )}

      {/* Grid View */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredBeneficiaries.length === 0 ? (
            <div className="col-span-full">
              <WorkspacePanel className="h-32 flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <Users className="h-10 w-10 mb-2 mx-auto opacity-40" />
                  <p className="font-medium">No beneficiaries found</p>
                  <p className="text-sm">Try adjusting your filters</p>
                </div>
              </WorkspacePanel>
            </div>
          ) : (
            filteredBeneficiaries.map((beneficiary) => {
              const TypeIcon = getTypeIcon(beneficiary.beneficiary_type);
              const age = calculateAge(beneficiary.date_of_birth);
              
              return (
                <WorkspacePanel
                  key={beneficiary.id}
                  padding="md"
                  className="cursor-pointer hover:shadow-md transition-shadow group"
                  onClick={() => setSelectedBeneficiary(beneficiary)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <Avatar className="h-12 w-12 border border-border/50">
                      {beneficiary.photo_url ? (
                        <AvatarImage src={beneficiary.photo_url} alt={beneficiary.display_name} />
                      ) : null}
                      <AvatarFallback style={{ backgroundColor: getPastelColor(beneficiary.id) }} className="text-sm font-medium">
                        {getInitials(beneficiary.display_name)}
                      </AvatarFallback>
                    </Avatar>
                    <StatusBadge variant={getStatusVariant(beneficiary.status)} dot>
                      {beneficiary.status}
                    </StatusBadge>
                  </div>
                  
                  <h3 className="font-medium text-foreground mb-1 truncate group-hover:text-primary transition-colors">
                    {beneficiary.display_name}
                  </h3>
                  
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                    <TypeIcon className="h-3.5 w-3.5" />
                    <span className="capitalize">{beneficiary.beneficiary_type}</span>
                    {age && <span>• {age} yrs</span>}
                  </div>
                  
                  <div className="text-xs text-muted-foreground truncate">
                    {beneficiary.location || beneficiary.institution_name || 'No location'}
                  </div>
                </WorkspacePanel>
              );
            })
          )}
        </div>
      )}

      {/* Detail Side Panel */}
      <DetailPanel
        open={!!selectedBeneficiary}
        onClose={() => setSelectedBeneficiary(null)}
        width="lg"
        footer={
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                if (selectedBeneficiary) {
                  navigate(`/beneficiaries/${selectedBeneficiary.id}?edit=true`);
                }
              }}
            >
              <Edit2 className="h-4 w-4 mr-2" />
              Edit
            </Button>
            <Button
              className="flex-1"
              onClick={() => {
                if (selectedBeneficiary) {
                  navigate(`/beneficiaries/${selectedBeneficiary.id}`);
                }
              }}
            >
              <Eye className="h-4 w-4 mr-2" />
              View Full Profile
            </Button>
          </div>
        }
      >
        {selectedBeneficiary && (() => {
          const TypeIcon = getTypeIcon(selectedBeneficiary.beneficiary_type);
          const age = calculateAge(selectedBeneficiary.date_of_birth);
          const typeColors: Record<string, string> = {
            student: 'from-blue-600/90 to-indigo-700/90',
            adult: 'from-emerald-600/90 to-teal-700/90',
            group: 'from-amber-600/90 to-orange-700/90',
          };
          const gradientClass = typeColors[selectedBeneficiary.beneficiary_type] || typeColors.student;

          return (
            <div className="space-y-5 -mt-6 -mx-6">
              {/* Hero Header */}
              <div className={`bg-gradient-to-br ${gradientClass} px-6 py-6`}>
                <div className="flex items-center gap-4">
                  <Avatar className="h-18 w-18 border-[3px] border-white/30 shadow-lg" style={{ height: '4.5rem', width: '4.5rem' }}>
                    {selectedBeneficiary.photo_url ? (
                      <AvatarImage src={selectedBeneficiary.photo_url} alt={selectedBeneficiary.display_name} />
                    ) : null}
                    <AvatarFallback
                      style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
                      className="text-lg font-bold text-white"
                    >
                      {getInitials(selectedBeneficiary.display_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-lg font-bold text-white truncate">
                      {selectedBeneficiary.display_name}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-white/80 bg-white/15 rounded-full px-2.5 py-0.5">
                        <TypeIcon className="h-3 w-3" />
                        <span className="capitalize">{selectedBeneficiary.beneficiary_type}</span>
                      </span>
                      <span className={`inline-flex items-center gap-1 text-xs font-medium rounded-full px-2.5 py-0.5 ${
                        selectedBeneficiary.status === 'active'
                          ? 'bg-green-400/20 text-green-100'
                          : 'bg-white/15 text-white/70'
                      }`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${
                          selectedBeneficiary.status === 'active' ? 'bg-green-300' : 'bg-white/50'
                        }`} />
                        <span className="capitalize">{selectedBeneficiary.status}</span>
                      </span>
                    </div>
                    <p className="text-xs text-white/60 mt-1.5">
                      Registered {formatDate(selectedBeneficiary.created_at)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="px-6 space-y-5">
                {/* Quick Stats Row */}
                <div className="grid grid-cols-3 gap-3">
                  {age !== null && (
                    <div className="bg-muted/40 rounded-xl p-3 text-center">
                      <p className="text-lg font-bold text-foreground">{age}</p>
                      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Years Old</p>
                    </div>
                  )}
                  {selectedBeneficiary.gender && (
                    <div className="bg-muted/40 rounded-xl p-3 text-center">
                      <p className="text-lg font-bold text-foreground capitalize">{selectedBeneficiary.gender.charAt(0)}</p>
                      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Gender</p>
                    </div>
                  )}
                  {selectedBeneficiary.member_count && (
                    <div className="bg-muted/40 rounded-xl p-3 text-center">
                      <p className="text-lg font-bold text-foreground">{selectedBeneficiary.member_count}</p>
                      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Members</p>
                    </div>
                  )}
                  {selectedBeneficiary.academic_level && (
                    <div className="bg-muted/40 rounded-xl p-3 text-center">
                      <p className="text-sm font-bold text-foreground">{selectedBeneficiary.academic_level}</p>
                      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Level</p>
                    </div>
                  )}
                </div>

                {/* Details Section */}
                <div className="space-y-1">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Details</h4>
                  <div className="divide-y divide-border/50">
                    {selectedBeneficiary.gender && (
                      <div className="flex justify-between items-center py-2.5">
                        <span className="text-sm text-muted-foreground">Gender</span>
                        <span className="text-sm font-medium text-foreground capitalize">{selectedBeneficiary.gender}</span>
                      </div>
                    )}
                    {selectedBeneficiary.date_of_birth && (
                      <div className="flex justify-between items-center py-2.5">
                        <span className="text-sm text-muted-foreground">Date of Birth</span>
                        <span className="text-sm font-medium text-foreground">{formatDate(selectedBeneficiary.date_of_birth)}</span>
                      </div>
                    )}
                    {selectedBeneficiary.location && (
                      <div className="flex justify-between items-center py-2.5">
                        <span className="text-sm text-muted-foreground">Location</span>
                        <span className="text-sm font-medium text-foreground">{selectedBeneficiary.location}</span>
                      </div>
                    )}
                    {selectedBeneficiary.county && (
                      <div className="flex justify-between items-center py-2.5">
                        <span className="text-sm text-muted-foreground">County</span>
                        <span className="text-sm font-medium text-foreground">{selectedBeneficiary.county}</span>
                      </div>
                    )}
                    {selectedBeneficiary.institution_name && (
                      <div className="flex justify-between items-center py-2.5">
                        <span className="text-sm text-muted-foreground">Institution</span>
                        <span className="text-sm font-medium text-foreground">{selectedBeneficiary.institution_name}</span>
                      </div>
                    )}
                    {selectedBeneficiary.academic_level && (
                      <div className="flex justify-between items-center py-2.5">
                        <span className="text-sm text-muted-foreground">Academic Level</span>
                        <span className="text-sm font-medium text-foreground">{selectedBeneficiary.academic_level}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
      </DetailPanel>

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

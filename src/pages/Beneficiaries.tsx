import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Plus, Search, Filter, Eye, Edit2, Trash2, Download, GraduationCap, UserCheck, UsersRound, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
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
  const [statusFilter, setStatusFilter] = useState('');
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
      
      // Calculate stats
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
      const matchesStatus = !statusFilter || b.status === statusFilter;
      
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

  const getTypeBadgeVariant = (type: string) => {
    switch (type) {
      case 'student': return 'default';
      case 'adult': return 'secondary';
      case 'group': return 'outline';
      default: return 'default';
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'active': return 'default';
      case 'inactive': return 'secondary';
      case 'graduated': return 'outline';
      default: return 'default';
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

  const filteredBeneficiaries = getFilteredBeneficiaries();
  const hasActiveFilters = typeFilter !== 'all' || !!statusFilter;

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
              <SelectItem value="">All Status</SelectItem>
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
                setStatusFilter('');
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

      {/* Beneficiaries Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredBeneficiaries.map((beneficiary) => {
          const TypeIcon = getTypeIcon(beneficiary.beneficiary_type);
          const age = calculateAge(beneficiary.date_of_birth);
          
          return (
            <Card 
              key={beneficiary.id} 
              className="hover:shadow-lg transition-all duration-300 cursor-pointer group"
              onClick={() => navigate(`/beneficiaries/${beneficiary.id}`)}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Avatar className="h-12 w-12 border-2 border-background shadow-sm">
                    {beneficiary.photo_url ? (
                      <AvatarImage src={beneficiary.photo_url} alt={beneficiary.display_name} />
                    ) : null}
                    <AvatarFallback style={{ backgroundColor: getPastelColor(beneficiary.id) }}>
                      {getInitials(beneficiary.display_name)}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-semibold text-sm truncate group-hover:text-primary transition-colors">
                        {beneficiary.display_name}
                      </h3>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Edit2 className="h-4 w-4" />
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
                          {isAdmin && (
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteId(beneficiary.id);
                              }}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant={getTypeBadgeVariant(beneficiary.beneficiary_type) as any} className="text-xs">
                        <TypeIcon className="h-3 w-3 mr-1" />
                        {beneficiary.beneficiary_type}
                      </Badge>
                      <Badge variant={getStatusBadgeVariant(beneficiary.status) as any} className="text-xs">
                        {beneficiary.status}
                      </Badge>
                    </div>
                    
                    <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                      {beneficiary.beneficiary_type === 'student' && (
                        <>
                          {age && <p>Age: {age} years</p>}
                          {beneficiary.academic_level && <p>{beneficiary.academic_level}</p>}
                          {beneficiary.institution_name && <p className="truncate">{beneficiary.institution_name}</p>}
                        </>
                      )}
                      {beneficiary.beneficiary_type === 'adult' && (
                        <>
                          {beneficiary.location && <p>{beneficiary.location}</p>}
                          {beneficiary.county && <p>{beneficiary.county}</p>}
                        </>
                      )}
                      {beneficiary.beneficiary_type === 'group' && (
                        <>
                          {beneficiary.member_count && <p>{beneficiary.member_count} members</p>}
                          {beneficiary.location && <p>{beneficiary.location}</p>}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredBeneficiaries.length === 0 && (
        <div className="text-center py-12">
          <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">No beneficiaries found</h3>
          <p className="text-muted-foreground">
            {searchTerm || hasActiveFilters
              ? "Try adjusting your search or filters"
              : "Add your first beneficiary to get started"}
          </p>
        </div>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Beneficiary</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this beneficiary? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

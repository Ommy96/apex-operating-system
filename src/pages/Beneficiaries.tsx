import { logger } from "@/lib/logger";
import { useState, useEffect, useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { beneficiaryPath } from "@/lib/recordUrls";
import { 
  Users, Plus, Search, Eye, Edit2, Archive, ArchiveRestore, GraduationCap, 
  UserCheck, UsersRound, X, Loader2,
  List, LayoutGrid, Download, Home
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { useOrganization } from '@/hooks/useOrganization';
import { supabase } from '@/integrations/supabase/client';
import { useRealtimeTable } from '@/hooks/useRealtimeSubscription';
import { toast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BeneficiaryForm } from '@/components/beneficiary/BeneficiaryForm';
import { BulkBeneficiaryUpload } from '@/components/beneficiary/BulkBeneficiaryUpload';
import { RegisterFamilySheet } from '@/components/beneficiary/RegisterFamilySheet';
import { exportBeneficiariesToExcel } from '@/lib/beneficiaryExport';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useHouseholds } from '@/hooks/useBeneficiaryRelationships';
import { useBeneficiaryTerminology } from '@/hooks/useBeneficiaryTerminology';
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
  PaginationControls,
} from '@/components/workspace';
import { usePagination } from '@/hooks/usePagination';
import { isActiveStatus } from '@/lib/statusHelpers';
import { LIFECYCLE_LABELS, normaliseStage, type LifecycleStage } from '@/lib/lifecycle';

/** Lifecycle is authoritative; legacy `status` only backfills older rows. */
const stageOf = (b: any): LifecycleStage =>
  normaliseStage(b?.lifecycle_stage ?? (isActiveStatus(b?.status) ? 'active' : 'exited'));

import { ArchiveBeneficiaryDialog } from '@/components/beneficiary/ArchiveBeneficiaryDialog';
import { humanizeDbError } from '@/lib/dbErrors';
import { SignedAvatarImage } from '@/components/beneficiary/SignedAvatarImage';

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
  sub_county: string | null;
  estate_village: string | null;
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

interface Program {
  id: string;
  name: string;
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
  const { term, termPlural } = useBeneficiaryTerminology();
  const organizationId = currentOrganization?.organization_id;
  
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<BeneficiaryTypeFilter>('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<'student' | 'adult' | 'group'>('student');
  const [editingBeneficiary, setEditingBeneficiary] = useState<Beneficiary | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<Beneficiary | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [registerFamilyOpen, setRegisterFamilyOpen] = useState(false);
  const [householdsOpen, setHouseholdsOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const { data: households = [] } = useHouseholds();
  const [selectedBeneficiary, setSelectedBeneficiary] = useState<Beneficiary | null>(null);
  const [programFilter, setProgramFilter] = useState('all');
  const [programs, setPrograms] = useState<Program[]>([]);
  const [enrollmentMap, setEnrollmentMap] = useState<Record<string, Set<string>>>({});
  // Org-configured beneficiary types (from the setup wizard). Used to relabel
  // the three fixed enum buckets (student / adult / group) so that e.g. an
  // agriculture org sees "Farmer households" instead of "Students".
  const [typeLabels, setTypeLabels] = useState<{ student: string; adult: string; group: string }>({
    student: 'Students',
    adult: 'Adults',
    group: 'Groups',
  });
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
      fetchPrograms();
      fetchTypeLabels();
    }
  }, [organizationId, showArchived]);

  // Real-time: auto-refresh when beneficiaries or enrollments change
  useEffect(() => {
    if (!organizationId) return;
    const channel = supabase
      .channel('beneficiaries_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'beneficiaries', filter: `organization_id=eq.${organizationId}` }, () => {
        fetchBeneficiaries();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'beneficiary_services', filter: `organization_id=eq.${organizationId}` }, () => {
        fetchPrograms();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
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

  // Legacy deep-link: /beneficiaries?view=households now redirects to the
  // standalone /households page. Preserves old bookmarks.
  useEffect(() => {
    if (searchParams.get('view') === 'households') {
      navigate('/households', { replace: true });
    }
  }, [searchParams, navigate]);

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
        let q = supabase
          .from('beneficiaries')
          .select('*')
          .eq('organization_id', organizationId);
        // Archived records (deleted_at set) are hidden unless explicitly requested.
        if (!showArchived) q = q.is('deleted_at', null);
        const { data, error } = await q
          .order('display_name', { ascending: true })
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

      // Headline stats always describe the ACTIVE (non-archived) population so
      // they keep agreeing with the Dashboard and Analytics counts.
      const activeOnly = allData.filter((b: any) => !b.deleted_at);
      setStats({
        total: activeOnly.length,
        students: activeOnly.filter(b => (b.beneficiary_type || '').toLowerCase() === 'student').length,
        adults: activeOnly.filter(b => (b.beneficiary_type || '').toLowerCase() === 'adult').length,
        groups: activeOnly.filter(b => (b.beneficiary_type || '').toLowerCase() === 'group').length,
        active: activeOnly.filter(b => stageOf(b) === 'active').length,
      });
    } catch (error) {
      logger.error('Error fetching beneficiaries:', error);
      toast({
        title: "Error",
        description: "Failed to load beneficiaries",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchPrograms = async () => {
    if (!organizationId) return;
    try {
      const [programsRes, enrollmentsRes] = await Promise.all([
        supabase.from('programs').select('id, name').eq('organization_id', organizationId).eq('is_active', true),
        supabase.from('beneficiary_services').select('beneficiary_id, program_id').eq('organization_id', organizationId),
      ]);
      setPrograms(programsRes.data || []);
      
      // Build map: program_id -> Set<beneficiary_id>
      const map: Record<string, Set<string>> = {};
      (enrollmentsRes.data || []).forEach((e: any) => {
        if (e.program_id) {
          if (!map[e.program_id]) map[e.program_id] = new Set();
          map[e.program_id].add(e.beneficiary_id);
        }
      });
      setEnrollmentMap(map);
    } catch (error) {
      logger.error('Error fetching programs:', error);
    }
  };

  const fetchTypeLabels = async () => {
    if (!organizationId) return;
    try {
      const { data } = await supabase
        .from('organizations')
        .select('setup_config')
        .eq('id', organizationId)
        .maybeSingle();
      const types: Array<{ key?: string; label?: string } | string> =
        (data as any)?.setup_config?.beneficiary_types || [];
      if (!Array.isArray(types) || types.length === 0) return;
      const norm = types.map((t) =>
        typeof t === 'string' ? { key: t, label: t } : { key: t.key || '', label: t.label || t.key || '' },
      );
      // Map the org's configured types onto the three enum buckets we actually
      // count (beneficiary_type = student | adult | group).
      //
      // "household" is deliberately NOT treated as a group label: households
      // are a separate record type with their own page, so labelling the
      // group bucket "Households" made the dropdown lie about what it counts.
      const groupKeys = ['farmer_group', 'community_group', 'cooperative', 'school', 'group', 'self_help_group'];
      const studentKeys = ['child', 'youth', 'student', 'learner', 'pupil'];
      const excludedKeys = ['household', 'households'];
      const groupType = norm.find((t) => groupKeys.includes(t.key));
      const studentType = norm.find((t) => studentKeys.includes(t.key));
      const adultType =
        norm.find(
          (t) =>
            !groupKeys.includes(t.key) &&
            !studentKeys.includes(t.key) &&
            !excludedKeys.includes(t.key),
        ) || null;
      const plural = (s: string) => (!s ? s : /s$/i.test(s) ? s : `${s}s`);
      setTypeLabels({
        student: plural(studentType?.label || 'Students'),
        adult: plural(adultType?.label || 'Adults'),
        group: plural(groupType?.label || 'Groups'),
      });
    } catch (error) {
      logger.warn('Failed to load configured beneficiary types', error);
    }
  };

  const handleUnarchive = async (b: Beneficiary) => {
    const { error } = await supabase.rpc('unarchive_beneficiary', { _beneficiary_id: b.id });
    if (error) {
      toast({
        title: 'Could not restore',
        description: humanizeDbError(error, { entity: term.toLowerCase(), action: 'restore' }),
        variant: 'destructive',
      });
      return;
    }
    toast({ title: 'Restored', description: `${b.display_name} is back in the active list.` });
    fetchBeneficiaries();
  };

  const getFilteredBeneficiaries = () => {
    return beneficiaries.filter(b => {
      const matchesSearch = b.display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.institution_name?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesType = typeFilter === 'all' || b.beneficiary_type === typeFilter;
      const matchesStatus = statusFilter === 'all' || stageOf(b) === statusFilter;
      const matchesProgram = programFilter === 'all' || (enrollmentMap[programFilter]?.has(b.id) ?? false);
      
      return matchesSearch && matchesType && matchesStatus && matchesProgram;
    });
  };

  const handleExport = () => {
    const data = getFilteredBeneficiaries();
    if (data.length === 0) {
      toast({ title: "No data", description: "No beneficiaries to export", variant: "destructive" });
      return;
    }
    const headers = ['Name', 'Type', 'Status', 'Gender', 'Date of Birth', 'Location', 'County', 'Academic Level', 'Institution', 'Members'];
    const rows = data.map(b => [
      b.display_name,
      b.beneficiary_type,
      b.status,
      b.gender || '',
      b.date_of_birth || '',
      b.location || '',
      b.county || '',
      b.academic_level || '',
      b.institution_name || '',
      b.member_count?.toString() || '',
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${v.replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `beneficiaries-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Exported", description: `${data.length} beneficiaries exported to CSV` });
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

  const filteredBeneficiaries = useMemo(() => getFilteredBeneficiaries(), [beneficiaries, searchTerm, typeFilter, statusFilter, programFilter, enrollmentMap]);
  const hasActiveFilters = typeFilter !== 'all' || statusFilter !== 'all' || programFilter !== 'all';

  const pagination = usePagination(filteredBeneficiaries, { initialPageSize: 25 });

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
        title={termPlural}
        description={`Manage all ${termPlural.toLowerCase()} — individuals, households, groups and organisations`}
        icon={Users}
        actions={
          isAdmin && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-9 gap-1.5"
                onClick={() => setHouseholdsOpen(true)}
              >
                <Home className="h-4 w-4" />
                <span className="hidden sm:inline">Households ({households.length})</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-9 gap-1.5"
                onClick={() => setRegisterFamilyOpen(true)}
              >
                <UsersRound className="h-4 w-4" />
                <span className="hidden sm:inline">Register family</span>
              </Button>
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) setEditingBeneficiary(null);
            }}>
              <DialogTrigger asChild>
                <Button className="h-9 gap-1.5">
                  <Plus className="h-4 w-4" />
                  Add {term}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingBeneficiary ? `Edit ${term}` : `Register new ${term.toLowerCase()}`}</DialogTitle>
                </DialogHeader>
                <BeneficiaryForm
                  beneficiary={editingBeneficiary || undefined}
                  defaultCategory={
                    editingBeneficiary?.beneficiary_type === 'group' ? 'group' : 'individual'
                  }
                  onSuccess={() => {
                    setIsDialogOpen(false);
                    setEditingBeneficiary(null);
                    fetchBeneficiaries();
                  }}
                  onCancel={() => { setIsDialogOpen(false); setEditingBeneficiary(null); }}
                />
              </DialogContent>
            </Dialog>
            </div>
          )
        }
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
        <StatCard
          title="Total"
          value={stats.total}
          icon={Users}
          variant="primary"
        />
        <StatCard
          title={typeLabels.student}
          value={stats.students}
          icon={GraduationCap}
          variant="info"
        />
        <StatCard
          title={typeLabels.adult}
          value={stats.adults}
          icon={UserCheck}
          variant="success"
        />
        <StatCard
          title={typeLabels.group}
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
      <WorkspacePanel padding="sm" className="flex flex-col gap-3">
        {/* Row 1: Search + Actions */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
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

          <div className="flex items-center gap-2 ml-auto">
            {/* Bulk Upload */}
            {isAdmin && <BulkBeneficiaryUpload onSuccess={fetchBeneficiaries} />}

            {/* Export Button */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 gap-1.5">
                  <Download className="h-4 w-4" />
                  <span className="hidden sm:inline">Export</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleExport}>CSV (current view)</DropdownMenuItem>
                <DropdownMenuItem onClick={async () => {
                  if (!currentOrganization?.organization_id) return;
                  try {
                    const ids = getFilteredBeneficiaries().map((b: any) => b.id);
                    const count = await exportBeneficiariesToExcel({ organizationId: currentOrganization.organization_id, beneficiaryIds: ids });
                    toast({ title: 'Exported', description: `${count} beneficiaries exported to Excel (4 sheets)` });
                  } catch (e: any) {
                    toast({ title: 'Export failed', description: e.message, variant: 'destructive' });
                  }
                }}>Excel workbook (4 sheets)</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* View Switcher */}
            <ViewSwitcher
              views={viewOptions}
              activeView={viewMode}
              onViewChange={(v) => setViewMode(v as ViewMode)}
            />
          </div>
        </div>

        {/* Row 2: Filters — visible on all breakpoints */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Type Filter */}
          <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as BeneficiaryTypeFilter)}>
            <SelectTrigger className="h-9 w-[calc(33%-0.35rem)] sm:w-36">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types ({stats.total})</SelectItem>
              <SelectItem value="student">{typeLabels.student} ({stats.students})</SelectItem>
              <SelectItem value="adult">{typeLabels.adult} ({stats.adults})</SelectItem>
              <SelectItem value="group">{typeLabels.group} ({stats.groups})</SelectItem>
            </SelectContent>
          </Select>

          {/* Lifecycle stage filter — alumni and exited are never folded into active */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-9 w-[calc(33%-0.35rem)] sm:w-36">
              <SelectValue placeholder="Stage" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All stages ({beneficiaries.length})</SelectItem>
              {(['active', 'waiting_list', 'paused', 'alumni', 'exited', 'applicant'] as LifecycleStage[]).map(s => (
                <SelectItem key={s} value={s}>
                  {LIFECYCLE_LABELS[s]} ({beneficiaries.filter(b => stageOf(b) === s).length})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>


          {/* Program Filter */}
          <Select value={programFilter} onValueChange={setProgramFilter}>
            <SelectTrigger className="h-9 w-[calc(34%-0.35rem)] sm:w-40">
              <SelectValue placeholder="Program" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Programs ({beneficiaries.length})</SelectItem>
              {programs.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.name} ({enrollmentMap[p.id]?.size || 0})</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setTypeFilter('all');
                setStatusFilter('all');
                setProgramFilter('all');
              }}
              className="h-9 px-2 text-muted-foreground"
            >
              <X className="h-4 w-4" />
            </Button>
          )}

          {/* Archived visibility */}
          <Button
            variant={showArchived ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setShowArchived(v => !v)}
            className="h-9 px-2.5 gap-1.5"
            title="Archived records are hidden from active lists, counts and analytics"
          >
            <Archive className="h-4 w-4" />
            {showArchived ? 'Hide archived' : 'Show archived'}
          </Button>
        </div>
      </WorkspacePanel>

      {/* Results Count is shown in pagination controls */}

      {/* Table View */}
      {viewMode === 'table' && loading && (
        <WorkspacePanel padding="none" className="overflow-hidden">
          <div className="p-4 space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 py-2 border-b">
                <Skeleton className="h-8 w-8 rounded-full" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
        </WorkspacePanel>
      )}
      {viewMode === 'table' && !loading && (
        <WorkspacePanel padding="none" className="overflow-hidden">
          <div className="overflow-x-auto">
          <Table className="min-w-[700px]">
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead className="min-w-[200px]">Beneficiary</TableHead>
                <TableHead className="min-w-[90px] hidden md:table-cell">Type</TableHead>
                <TableHead className="min-w-[90px] hidden md:table-cell">Status</TableHead>
                <TableHead className="min-w-[140px] hidden md:table-cell">Details</TableHead>
                <TableHead className="min-w-[160px] hidden lg:table-cell">Village / Sub-County</TableHead>
                <TableHead className="w-[120px] text-right sticky right-0 bg-muted/30 z-10">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBeneficiaries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center">
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                      <Users className="h-10 w-10 mb-2 opacity-40" />
                      <p className="font-medium">No beneficiaries found</p>
                      <p className="text-sm">Try adjusting your filters</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                pagination.paginatedItems.map((beneficiary) => {
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
                            <SignedAvatarImage photoUrl={beneficiary.photo_url} alt={beneficiary.display_name} />
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
                      <TableCell className="hidden md:table-cell">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <TypeIcon className="h-3.5 w-3.5" />
                          <span className="capitalize">{beneficiary.beneficiary_type}</span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
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
                        <div className="text-sm text-muted-foreground">
                          {beneficiary.estate_village && (
                            <p className="truncate">{beneficiary.estate_village}</p>
                          )}
                          {beneficiary.sub_county && (
                            <p className="text-xs truncate">{beneficiary.sub_county}</p>
                          )}
                          {!beneficiary.estate_village && !beneficiary.sub_county && '—'}
                        </div>
                      </TableCell>
                      <TableCell className="text-right sticky right-0 bg-card z-10">
                        <div className="flex items-center justify-end gap-0.5">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-foreground/70 hover:text-primary hover:bg-primary/10"
                            title="View profile"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(beneficiaryPath(beneficiary));
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-foreground/70 hover:text-primary hover:bg-primary/10"
                            title="Edit"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingBeneficiary(beneficiary);
                              setSelectedType(beneficiary.beneficiary_type);
                              setIsDialogOpen(true);
                            }}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          {isAdmin && ((beneficiary as any).deleted_at ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-foreground/70 hover:text-primary hover:bg-primary/10"
                              title="Unarchive"
                              onClick={(e) => { e.stopPropagation(); handleUnarchive(beneficiary); }}
                            >
                              <ArchiveRestore className="h-4 w-4" />
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-foreground/70 hover:text-destructive hover:bg-destructive/10"
                              title="Archive"
                              onClick={(e) => { e.stopPropagation(); setArchiveTarget(beneficiary); }}
                            >
                              <Archive className="h-4 w-4" />
                            </Button>
                          ))}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
           </div>
          <PaginationControls
            currentPage={pagination.currentPage}
            totalPages={pagination.totalPages}
            totalItems={pagination.totalItems}
            startIndex={pagination.startIndex}
            endIndex={pagination.endIndex}
            pageSize={pagination.pageSize}
            pageSizeOptions={pagination.pageSizeOptions}
            canGoNext={pagination.canGoNext}
            canGoPrevious={pagination.canGoPrevious}
            onPageChange={pagination.setCurrentPage}
            onPageSizeChange={pagination.setPageSize}
            onFirst={pagination.goToFirstPage}
            onLast={pagination.goToLastPage}
            onNext={pagination.goToNextPage}
            onPrevious={pagination.goToPreviousPage}
          />
        </WorkspacePanel>
      )}

      {/* Grid View */}
      {viewMode === 'grid' && (
        <>
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
              pagination.paginatedItems.map((beneficiary) => {
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
                        <SignedAvatarImage photoUrl={beneficiary.photo_url} alt={beneficiary.display_name} />
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
          <PaginationControls
            currentPage={pagination.currentPage}
            totalPages={pagination.totalPages}
            totalItems={pagination.totalItems}
            startIndex={pagination.startIndex}
            endIndex={pagination.endIndex}
            pageSize={pagination.pageSize}
            pageSizeOptions={pagination.pageSizeOptions}
            canGoNext={pagination.canGoNext}
            canGoPrevious={pagination.canGoPrevious}
            onPageChange={pagination.setCurrentPage}
            onPageSizeChange={pagination.setPageSize}
            onFirst={pagination.goToFirstPage}
            onLast={pagination.goToLastPage}
            onNext={pagination.goToNextPage}
            onPrevious={pagination.goToPreviousPage}
          />
        </>
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
                  setEditingBeneficiary(selectedBeneficiary);
                  setSelectedType(selectedBeneficiary.beneficiary_type);
                  setIsDialogOpen(true);
                  setSelectedBeneficiary(null);
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
                  navigate(beneficiaryPath(selectedBeneficiary));
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
            student: 'from-primary/90 to-primary/70',
            adult: 'from-accent/90 to-primary/70',
            group: 'from-primary/80 to-accent/80',
          };
          const gradientClass = typeColors[selectedBeneficiary.beneficiary_type] || typeColors.student;

          return (
            <div className="space-y-5 -mt-6 -mx-6">
              {/* Hero Header */}
              <div className={`bg-gradient-to-br ${gradientClass} px-6 py-6`}>
                <div className="flex items-center gap-4">
                  <Avatar className="h-18 w-18 border-[3px] border-white/30 shadow-lg" style={{ height: '4.5rem', width: '4.5rem' }}>
                    <SignedAvatarImage photoUrl={selectedBeneficiary.photo_url} alt={selectedBeneficiary.display_name} />
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
                          ? 'bg-white/25 text-white'
                          : 'bg-white/15 text-white/70'
                      }`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${
                          selectedBeneficiary.status === 'active' ? 'bg-white' : 'bg-white/50'
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
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
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

      {/* Archive / delete flow */}
      <ArchiveBeneficiaryDialog
        target={archiveTarget as any}
        onOpenChange={(open) => !open && setArchiveTarget(null)}
        onDone={() => { setArchiveTarget(null); fetchBeneficiaries(); }}
        isAdmin={isAdmin}
        termSingular={term.toLowerCase()}
      />

      <RegisterFamilySheet
        open={registerFamilyOpen}
        onOpenChange={setRegisterFamilyOpen}
      />

      <Dialog open={householdsOpen} onOpenChange={setHouseholdsOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Households ({households.length})</DialogTitle>
          </DialogHeader>
          {households.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              No households yet. Use "Register family" to create one.
            </p>
          ) : (
            <div className="space-y-2 mt-2">
              {households.map((h) => (
                <button
                  key={h.id}
                  type="button"
                  onClick={() => {
                    setHouseholdsOpen(false);
                    navigate(`/households/${h.id}`);
                  }}
                  className="w-full text-left p-3 rounded-lg border hover:border-primary/40 hover:bg-secondary/30 flex items-center gap-3 transition-colors"
                >
                  <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Home className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{h.household_name || 'Household'}</div>
                    <div className="text-xs text-muted-foreground">
                      {h.member_count ?? 0} members{h.county ? ` · ${h.county}` : ''}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

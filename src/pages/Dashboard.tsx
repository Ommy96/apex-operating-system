import { useNavigate } from "react-router-dom";
import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import { useToast } from "@/hooks/use-toast";
import { useProgramEnrollmentStats } from "@/hooks/useProgramEnrollmentStats";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Plus, FileText, Search } from "lucide-react";
import { ComplianceAlertBanner } from "@/components/ComplianceAlertBanner";
import { usePermissions } from "@/hooks/usePermissions";
import { Skeleton } from "@/components/ui/skeleton";
import { GlobalSearchBar } from "@/components/dashboard/GlobalSearchBar";
import { FloatingCreateButton } from "@/components/dashboard/FloatingCreateButton";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { useBeneficiaryTerminology } from "@/hooks/useBeneficiaryTerminology";
import { formatDistanceToNow } from "date-fns";
import { SponsorshipMetrics } from "@/components/financial/SponsorshipMetrics";

const Dashboard = () => {
  const navigate = useNavigate();
  const { isAdmin, user } = useAuth();
  const { currentOrganization } = useOrganization();
  const { toast } = useToast();
  const { can } = usePermissions();
  const { term, termPlural } = useBeneficiaryTerminology();
  const orgId = currentOrganization?.organization_id;

  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';
  const firstName = userName.split(' ')[0];

  const {
    programStats,
    totalBeneficiaries,
    trendData,
    statsLoading,
    trendsLoading,
    refetch,
  } = useProgramEnrollmentStats();

  // Greeting based on time of day
  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const formattedDate = new Date().toLocaleDateString('en-KE', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  // Real-time subscriptions
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('dashboard_beneficiaries_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'beneficiaries' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          toast({ title: `New ${term} Added`, description: `A new ${term.toLowerCase()} record has been created`, duration: 3000 });
        }
        refetch();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'beneficiary_services' }, () => { refetch(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, refetch, toast]);

  // === ADDITIONAL DATA QUERIES ===

  // Active grants count + total portfolio
  const { data: grantData, isLoading: grantsLoading } = useQuery({
    queryKey: ['dashboard-grants', orgId],
    queryFn: async () => {
      if (!orgId) return { count: 0, totalAmount: 0 };
      const { data } = await supabase
        .from('grants')
        .select('id, grant_amount')
        .eq('organization_id', orgId)
        .eq('status', 'active');
      const grants = data || [];
      return {
        count: grants.length,
        totalAmount: grants.reduce((s, g) => s + (g.grant_amount || 0), 0),
      };
    },
    enabled: !!orgId,
    staleTime: 30000,
  });

  // Activities: completed vs planned
  const { data: activityData, isLoading: activitiesLoading } = useQuery({
    queryKey: ['dashboard-activities', orgId],
    queryFn: async () => {
      if (!orgId) return { completed: 0, total: 0 };
      const [completed, total] = await Promise.all([
        supabase.from('activities').select('id', { count: 'exact', head: true }).eq('organization_id', orgId).eq('status', 'completed'),
        supabase.from('activities').select('id', { count: 'exact', head: true }).eq('organization_id', orgId),
      ]);
      return { completed: completed.count || 0, total: total.count || 0 };
    },
    enabled: !!orgId,
    staleTime: 30000,
  });

  // Reports due (grant_reports not submitted, due within 30 days)
  const { data: reportsDue = 0, isLoading: reportsLoading } = useQuery({
    queryKey: ['dashboard-reports-due', orgId],
    queryFn: async () => {
      if (!orgId) return 0;
      const thirtyDaysFromNow = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];
      const { count } = await supabase
        .from('grant_reports')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', orgId)
        .not('status', 'in', '("submitted","approved")')
        .lte('due_date', thirtyDaysFromNow);
      return count || 0;
    },
    enabled: !!orgId,
    staleTime: 60000,
  });

  // New beneficiaries this month
  const { data: newThisMonth = 0 } = useQuery({
    queryKey: ['dashboard-new-beneficiaries-month', orgId],
    queryFn: async () => {
      if (!orgId) return 0;
      const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
      const { count } = await supabase
        .from('beneficiaries')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', orgId)
        .is('deleted_at', null)
        .gte('created_at', startOfMonth);
      return count || 0;
    },
    enabled: !!orgId,
  });

  // Programme reach data (top 5 programmes with enrollment counts vs targets)
  const programmeReach = useMemo(() => {
    return programStats.slice(0, 5).map(ps => ({
      name: ps.programName.length > 12 ? ps.programName.slice(0, 12) + '…' : ps.programName,
      fullName: ps.programName,
      count: ps.count,
      color: ps.color || '#1D9E8A',
    }));
  }, [programStats]);

  const maxReach = useMemo(() => Math.max(...programmeReach.map(p => p.count), 1), [programmeReach]);

  // Indicator status data
  const { data: indicatorStatus, isLoading: indicatorsLoading } = useQuery({
    queryKey: ['dashboard-indicator-status', orgId],
    queryFn: async () => {
      if (!orgId) return { onTrack: 0, atRisk: 0, offTrack: 0, indicators: [] as any[] };
      const { data } = await supabase
        .from('indicators')
        .select('id, name, updated_at')
        .eq('organization_id', orgId)
        .eq('is_active', true)
        .order('updated_at', { ascending: false })
        .limit(10);

      const indicators = data || [];
      const withValues = await Promise.all(indicators.map(async (ind) => {
        const [valRes, targetRes] = await Promise.all([
          supabase.from('indicator_values').select('actual_value').eq('indicator_id', ind.id).order('period_end', { ascending: false }).limit(1),
          supabase.from('indicator_targets').select('target_value').eq('indicator_id', ind.id).order('period_year', { ascending: false }).limit(1),
        ]);
        const actual = valRes.data?.[0]?.actual_value || 0;
        const target = targetRes.data?.[0]?.target_value || 1;
        const pct = Math.round((actual / target) * 100);
        const status = pct >= 80 ? 'on_track' : pct >= 50 ? 'at_risk' : 'off_track';
        return { id: ind.id, name: ind.name, actual, pct: Math.min(pct, 100), status };
      }));

      return {
        onTrack: withValues.filter(i => i.status === 'on_track').length,
        atRisk: withValues.filter(i => i.status === 'at_risk').length,
        offTrack: withValues.filter(i => i.status === 'off_track').length,
        indicators: withValues.slice(0, 4),
      };
    },
    enabled: !!orgId,
    staleTime: 60000,
  });

  // Grant burn rates
  const { data: burnRates = [], isLoading: burnLoading } = useQuery({
    queryKey: ['dashboard-burn-rates', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data } = await supabase
        .from('grants')
        .select('id, grant_name, grant_amount, amount_received, start_date, end_date')
        .eq('organization_id', orgId)
        .eq('status', 'active')
        .limit(3);
      return (data || []).map(g => {
        const spent = g.amount_received || 0;
        const total = g.grant_amount || 1;
        const pct = Math.round((spent / total) * 100);
        const now = Date.now();
        const start = new Date(g.start_date || now).getTime();
        const end = new Date(g.end_date || now).getTime();
        const timePct = end > start ? Math.round(((now - start) / (end - start)) * 100) : 50;
        let status: 'on_track' | 'at_risk' | 'overspending' | 'underspending' = 'on_track';
        if (pct > timePct + 15) status = 'overspending';
        else if (pct < timePct - 25) status = 'underspending';
        else if (Math.abs(pct - timePct) > 10) status = 'at_risk';
        return { name: g.grant_name, pct: Math.min(pct, 100), status };
      });
    },
    enabled: !!orgId,
    staleTime: 60000,
  });

  // Upcoming deadlines
  const { data: deadlines = [], isLoading: deadlinesLoading } = useQuery({
    queryKey: ['dashboard-deadlines', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data } = await supabase
        .from('grant_reports')
        .select('id, report_title, due_date, grants(grant_name)')
        .eq('organization_id', orgId)
        .not('status', 'in', '("submitted","approved")')
        .not('due_date', 'is', null)
        .order('due_date', { ascending: true })
        .limit(3);
      return (data || []).map((r: any) => {
        const days = Math.ceil((new Date(r.due_date).getTime() - Date.now()) / 86400000);
        return { id: r.id, title: r.report_title, grantName: r.grants?.grant_name, dueDate: r.due_date, daysLeft: days };
      });
    },
    enabled: !!orgId,
    staleTime: 60000,
  });

  // Org snapshot: counts
  const { data: snapshot, isLoading: snapshotLoading } = useQuery({
    queryKey: ['dashboard-org-snapshot', orgId],
    queryFn: async () => {
      if (!orgId) return { beneficiaries: 0, programmes: 0, projects: 0, grantPortfolio: 0, staff: 0, complaints: 0 };
      const [ben, prog, proj, grants, staff, complaints] = await Promise.all([
        supabase.from('beneficiaries').select('id', { count: 'exact', head: true }).eq('organization_id', orgId).eq('status', 'active').is('deleted_at', null),
        supabase.from('programs').select('id', { count: 'exact', head: true }).eq('organization_id', orgId).eq('is_active', true),
        supabase.from('projects').select('id', { count: 'exact', head: true }).eq('organization_id', orgId),
        supabase.from('grants').select('grant_amount').eq('organization_id', orgId).eq('status', 'active'),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('organization_id', orgId),
        supabase.from('complaints').select('id', { count: 'exact', head: true }).eq('organization_id', orgId).eq('status', 'open'),
      ]);
      return {
        beneficiaries: ben.count || 0,
        programmes: prog.count || 0,
        projects: proj.count || 0,
        grantPortfolio: (grants.data || []).reduce((s, g) => s + (g.grant_amount || 0), 0),
        staff: staff.count || 0,
        complaints: complaints.count || 0,
      };
    },
    enabled: !!orgId,
    staleTime: 30000,
  });

  // Beneficiaries by county
  const { data: countyData = [] } = useQuery({
    queryKey: ['dashboard-county-distribution', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data } = await supabase
        .from('beneficiaries')
        .select('county')
        .eq('organization_id', orgId)
        .eq('status', 'active')
        .is('deleted_at', null)
        .not('county', 'is', null);
      const counts: Record<string, number> = {};
      (data || []).forEach(b => { if (b.county) counts[b.county] = (counts[b.county] || 0) + 1; });
      return Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4)
        .map(([county, count]) => ({ county, count }));
    },
    enabled: !!orgId,
  });

  const maxCounty = useMemo(() => Math.max(...countyData.map(c => c.count), 1), [countyData]);

  const burnStatusColor = (status: string) => {
    switch (status) {
      case 'on_track': return '#1D9E8A';
      case 'at_risk': return '#C97B1A';
      case 'overspending': return '#C53B6C';
      case 'underspending': return '#1B5FBB';
      default: return '#8891A8';
    }
  };

  const deadlineBadge = (days: number) => {
    if (days < 0) return { bg: '#FDE8F0', color: '#C53B6C', label: 'Overdue' };
    if (days <= 7) return { bg: '#FDE8F0', color: '#C53B6C', label: `${days}d` };
    if (days <= 14) return { bg: '#FEF3E2', color: '#C97B1A', label: `${days}d` };
    return { bg: '#E0F4F1', color: '#0F7B6C', label: `${days}d` };
  };

  const statusDotColor = (status: string) => {
    if (status === 'on_track') return '#1D9E8A';
    if (status === 'at_risk') return '#C97B1A';
    return '#C53B6C';
  };

  const formatKES = (n: number) => {
    if (n >= 1_000_000) return `KES ${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `KES ${(n / 1_000).toFixed(0)}K`;
    return `KES ${n.toLocaleString()}`;
  };

  return (
    <div style={{ background: '#F4F5F8', minHeight: '100vh' }} className="p-5 md:p-6">
      {/* SECTION 1: GREETING ROW */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h1 style={{ fontSize: 19, fontWeight: 600, color: '#0A0F1E', letterSpacing: '-0.3px' }}>
            {greeting}, {firstName}
          </h1>
          <p style={{ fontSize: 12, color: '#8891A8', marginTop: 3 }}>
            {formattedDate}{currentOrganization?.organization_id ? ` · ${currentOrganization?.organization_id && (currentOrganization as any)?.organizations?.name ? (currentOrganization as any).organizations.name : ''}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-[7px]">
          <button
            onClick={() => navigate('/reports-analytics')}
            style={{ background: '#fff', border: '1px solid #CDD2DF', color: '#3D4558', borderRadius: 8, padding: '7px 13px', fontSize: 12, cursor: 'pointer' }}
            className="hover:bg-gray-50 transition-colors"
          >
            Export report
          </button>
          <button
            onClick={() => navigate('/programs-management')}
            style={{ background: '#1D9E8A', color: '#fff', borderRadius: 8, padding: '7px 15px', fontSize: 12, fontWeight: 500, border: 'none', cursor: 'pointer' }}
            className="hover:opacity-90 transition-opacity flex items-center gap-[5px]"
          >
            <Plus size={12} />
            New activity
          </button>
        </div>
      </div>

      {/* Compliance Alerts */}
      {can.manageSettings && <div className="mb-4"><ComplianceAlertBanner /></div>}

      {/* Global Search */}
      <div className="mb-5">
        <GlobalSearchBar />
      </div>

      {/* SECTION 2: METRIC CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-[10px] mb-4">
        {/* Card 1: Beneficiaries */}
        <MetricCard
          label={termPlural.toUpperCase()}
          accentColor="#1D9E8A"
          isLoading={statsLoading}
          value={totalBeneficiaries}
          pill={{ bg: '#E0F4F1', color: '#0F7B6C', text: `+${newThisMonth} this month` }}
        />
        {/* Card 2: Active Grants */}
        <MetricCard
          label="ACTIVE GRANTS"
          accentColor="#1B5FBB"
          isLoading={grantsLoading}
          value={grantData?.count || 0}
          pill={{ bg: '#E8EFFC', color: '#1B5FBB', text: formatKES(grantData?.totalAmount || 0) }}
        />
        {/* Card 3: Activities */}
        <div
          className="relative overflow-hidden"
          style={{ background: '#fff', borderRadius: 12, border: '1px solid #E2E5EF', padding: '14px 16px' }}
        >
          <div style={{ position: 'absolute', left: 0, top: 0, width: 3, height: '100%', background: '#1D9E8A' }} />
          <div style={{ paddingLeft: 6 }}>
            <p style={{ fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: 0.5, color: '#8891A8', marginBottom: 8 }}>ACTIVITIES</p>
            {activitiesLoading ? (
              <><Skeleton className="h-[22px] w-16 mb-[6px]" /><Skeleton className="h-[14px] w-24" /></>
            ) : (
              <>
                <p style={{ fontSize: 22, fontWeight: 600, color: '#0A0F1E', letterSpacing: '-0.3px', marginBottom: 6 }} className="tabular-nums">
                  {activityData?.completed || 0}
                  <span style={{ fontSize: 13, fontWeight: 400, color: '#8891A8' }}> / {activityData?.total || 0}</span>
                </p>
                <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 8px', borderRadius: 999, fontSize: 10, fontWeight: 500, background: '#E0F4F1', color: '#0F7B6C' }}>
                  {activityData?.total ? Math.round(((activityData?.completed || 0) / activityData.total) * 100) : 0}% completed
                </span>
              </>
            )}
          </div>
        </div>
        {/* Card 4: Reports Due */}
        <MetricCard
          label="REPORTS DUE"
          accentColor="#C97B1A"
          isLoading={reportsLoading}
          value={reportsDue}
          valueColor={reportsDue > 0 ? '#C97B1A' : undefined}
          pill={reportsDue > 0
            ? { bg: '#FEF3E2', color: '#C97B1A', text: 'Action needed' }
            : { bg: '#E0F4F1', color: '#0F7B6C', text: 'All clear' }
          }
        />
      </div>

      {/* SPONSORSHIP COVERAGE SNAPSHOT */}
      <div className="mb-4">
        <SponsorshipMetrics />
      </div>

      {/* SECTION 3: THREE-COLUMN GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr_280px] gap-3 mb-3">
        {/* CARD A: Programme Reach */}
        <DashCard title="Programme reach" subtitle={`${programStats.length} active`}>
          {statsLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-[9px] mb-2">
                <Skeleton className="h-3 w-[72px]" />
                <Skeleton className="h-[7px] flex-1 rounded-full" />
                <Skeleton className="h-3 w-8" />
              </div>
            ))
          ) : programmeReach.length === 0 ? (
            <EmptyState text="No programmes yet" />
          ) : (
            programmeReach.map(p => (
              <div key={p.fullName} className="flex items-center gap-[9px] mb-[8px] last:mb-0">
                <span style={{ fontSize: 11, color: '#3D4558', width: 72, flexShrink: 0 }} className="truncate" title={p.fullName}>{p.name}</span>
                <div style={{ flex: 1, height: 7, background: '#F4F5F8', borderRadius: 999, overflow: 'hidden' }}>
                  <div style={{ height: '100%', borderRadius: 999, width: `${Math.max((p.count / maxReach) * 100, 4)}%`, background: p.color, transition: 'width 0.6s ease' }} />
                </div>
                <span style={{ fontSize: 11, fontWeight: 500, color: '#0A0F1E', width: 32, textAlign: 'right' }} className="tabular-nums">{p.count}</span>
              </div>
            ))
          )}
        </DashCard>

        {/* CARD B: Indicator Status */}
        <DashCard title="Indicator status" subtitle="M&E performance">
          {indicatorsLoading ? (
            <>
              <div className="flex gap-4 mb-3 pb-[10px]" style={{ borderBottom: '1px solid #E2E5EF' }}>
                {[1,2,3].map(i => <Skeleton key={i} className="h-8 flex-1" />)}
              </div>
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[14px] w-full mb-2" />)}
            </>
          ) : !indicatorStatus || (indicatorStatus.onTrack === 0 && indicatorStatus.atRisk === 0 && indicatorStatus.offTrack === 0) ? (
            <EmptyState text="No indicator data yet" />
          ) : (
            <>
              <div className="flex gap-4 mb-3 pb-[10px]" style={{ borderBottom: '1px solid #E2E5EF' }}>
                <MiniStat value={indicatorStatus.onTrack} label="ON TRACK" color="#1D9E8A" />
                <MiniStat value={indicatorStatus.atRisk} label="AT RISK" color="#C97B1A" />
                <MiniStat value={indicatorStatus.offTrack} label="OFF TRACK" color="#C53B6C" />
              </div>
              {indicatorStatus.indicators.map((ind: any) => (
                <div key={ind.id} className="flex items-center gap-[9px] py-[7px]" style={{ borderBottom: '1px solid #E2E5EF' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: statusDotColor(ind.status), flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: 11, color: '#3D4558' }} className="truncate">{ind.name}</span>
                  <div style={{ width: 52, height: 4, background: '#F4F5F8', borderRadius: 999, overflow: 'hidden' }}>
                    <div style={{ height: '100%', borderRadius: 999, width: `${ind.pct}%`, background: statusDotColor(ind.status) }} />
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 500, color: '#0A0F1E', width: 30, textAlign: 'right' }} className="tabular-nums">{ind.pct}%</span>
                </div>
              ))}
            </>
          )}
        </DashCard>

        {/* COLUMN 3: Burn Rates + Deadlines */}
        <div className="flex flex-col gap-[10px]">
          {/* CARD C: Grant Burn Rates */}
          <DashCard title="Grant burn rates" subtitle="Spend tracking">
            {burnLoading ? (
              Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-[14px] w-full mb-3" />)
            ) : burnRates.length === 0 ? (
              <EmptyState text="No active grants" />
            ) : (
              burnRates.map((g, i) => (
                <div key={i} className="mb-[10px] last:mb-0">
                  <div className="flex justify-between mb-[3px]">
                    <span style={{ fontSize: 11, color: '#3D4558' }} className="truncate">{g.name}</span>
                    <span style={{ fontSize: 11, fontWeight: 500, color: burnStatusColor(g.status) }} className="tabular-nums">{g.pct}%</span>
                  </div>
                  <div style={{ height: 5, background: '#F4F5F8', borderRadius: 999, overflow: 'hidden' }}>
                    <div style={{ height: '100%', borderRadius: 999, width: `${g.pct}%`, background: burnStatusColor(g.status), transition: 'width 0.6s ease' }} />
                  </div>
                </div>
              ))
            )}
          </DashCard>

          {/* CARD D: Upcoming Deadlines */}
          <DashCard title="Upcoming deadlines" subtitle="Reports & submissions">
            {deadlinesLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex gap-[10px] py-[8px]">
                  <Skeleton className="h-[14px] flex-1" />
                  <Skeleton className="h-[18px] w-14 rounded-full" />
                </div>
              ))
            ) : deadlines.length === 0 ? (
              <EmptyState text="No upcoming deadlines" />
            ) : (
              deadlines.map((d: any) => {
                const badge = deadlineBadge(d.daysLeft);
                return (
                  <div key={d.id} className="flex items-center gap-[10px] py-[8px]" style={{ borderBottom: '1px solid #E2E5EF' }}>
                    <div className="flex-1 min-w-0">
                      <p style={{ fontSize: 12, fontWeight: 500, color: '#0A0F1E' }} className="truncate">{d.title}</p>
                      <p style={{ fontSize: 10, color: '#8891A8' }} className="truncate">{d.grantName || 'Grant report'}</p>
                    </div>
                    <span style={{ padding: '2px 8px', borderRadius: 999, fontSize: 10, fontWeight: 500, background: badge.bg, color: badge.color, whiteSpace: 'nowrap' }}>
                      {badge.label}
                    </span>
                  </div>
                );
              })
            )}
          </DashCard>
        </div>
      </div>

      {/* SECTION 4: BOTTOM TWO-COLUMN GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* CARD E: Recent Activity */}
        <DashCard title="Recent activity" subtitle="Latest events">
          <ActivityFeed />
        </DashCard>

        {/* CARD F: Organisation Snapshot */}
        <DashCard title="Organisation snapshot" subtitle="Key metrics at a glance">
          {snapshotLoading ? (
            <div className="grid grid-cols-3 gap-2">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-[60px] rounded-[10px]" />)}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-2">
                <SnapshotTile value={snapshot?.beneficiaries || 0} label={termPlural} />
                <SnapshotTile value={snapshot?.programmes || 0} label="Programmes" />
                <SnapshotTile value={snapshot?.projects || 0} label="Projects" />
                <SnapshotTile value={formatKES(snapshot?.grantPortfolio || 0)} label="Grant portfolio" />
                <SnapshotTile value={snapshot?.staff || 0} label="Staff" />
                <SnapshotTile value={snapshot?.complaints || 0} label="Open complaints" isAlert={(snapshot?.complaints || 0) > 0} />
              </div>

              {countyData.length > 0 && (
                <div style={{ borderTop: '1px solid #E2E5EF', marginTop: 12, paddingTop: 10 }}>
                  <p style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5, color: '#8891A8', fontWeight: 500, marginBottom: 7 }}>
                    {termPlural} by county
                  </p>
                  {countyData.map(c => (
                    <div key={c.county} className="flex items-center gap-[9px] mb-[8px] last:mb-0">
                      <span style={{ fontSize: 11, color: '#3D4558', width: 72, flexShrink: 0 }} className="truncate">{c.county}</span>
                      <div style={{ flex: 1, height: 7, background: '#F4F5F8', borderRadius: 999, overflow: 'hidden' }}>
                        <div style={{ height: '100%', borderRadius: 999, width: `${(c.count / maxCounty) * 100}%`, background: '#1D9E8A', transition: 'width 0.6s ease' }} />
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 500, color: '#0A0F1E', width: 32, textAlign: 'right' }} className="tabular-nums">{c.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </DashCard>
      </div>

      <FloatingCreateButton />
    </div>
  );
};

// === SUB-COMPONENTS ===

function MetricCard({ label, accentColor, isLoading, value, valueColor, pill }: {
  label: string; accentColor: string; isLoading: boolean; value: number;
  valueColor?: string; pill: { bg: string; color: string; text: string };
}) {
  return (
    <div className="relative overflow-hidden" style={{ background: '#fff', borderRadius: 12, border: '1px solid #E2E5EF', padding: '14px 16px' }}>
      <div style={{ position: 'absolute', left: 0, top: 0, width: 3, height: '100%', background: accentColor }} />
      <div style={{ paddingLeft: 6 }}>
        <p style={{ fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: 0.5, color: '#8891A8', marginBottom: 8 }}>{label}</p>
        {isLoading ? (
          <><Skeleton className="h-[22px] w-16 mb-[6px]" /><Skeleton className="h-[14px] w-24" /></>
        ) : (
          <>
            <p style={{ fontSize: 22, fontWeight: 600, color: valueColor || '#0A0F1E', letterSpacing: '-0.3px', marginBottom: 6 }} className="tabular-nums">{value.toLocaleString()}</p>
            <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 8px', borderRadius: 999, fontSize: 10, fontWeight: 500, background: pill.bg, color: pill.color }}>
              {pill.text}
            </span>
          </>
        )}
      </div>
    </div>
  );
}

function DashCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #E2E5EF', overflow: 'hidden' }}>
      <div className="flex items-center justify-between" style={{ padding: '13px 16px 10px', borderBottom: '1px solid #E2E5EF' }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: '#0A0F1E' }}>{title}</span>
        {subtitle && <span style={{ fontSize: 10, color: '#8891A8' }}>{subtitle}</span>}
      </div>
      <div style={{ padding: '13px 16px' }}>{children}</div>
    </div>
  );
}

function MiniStat({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div className="flex-1 text-center">
      <p style={{ fontSize: 16, fontWeight: 600, color }} className="tabular-nums">{value}</p>
      <p style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: 0.4, color: '#8891A8' }}>{label}</p>
    </div>
  );
}

function SnapshotTile({ value, label, isAlert }: { value: string | number; label: string; isAlert?: boolean }) {
  return (
    <div style={{ background: '#F4F5F8', borderRadius: 10, padding: '11px 14px', textAlign: 'center' }}>
      <p style={{ fontSize: 18, fontWeight: 600, color: isAlert ? '#C53B6C' : '#0A0F1E', letterSpacing: '-0.3px' }} className="tabular-nums">{typeof value === 'number' ? value.toLocaleString() : value}</p>
      <p style={{ fontSize: 10, color: '#8891A8', marginTop: 2 }}>{label}</p>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-6">
      <div style={{ width: 24, height: 24, borderRadius: 6, background: '#8891A8', opacity: 0.15, marginBottom: 8 }} />
      <p style={{ fontSize: 12, color: '#8891A8' }}>{text}</p>
    </div>
  );
}

export default Dashboard;

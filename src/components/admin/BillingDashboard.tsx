import { Badge } from '@/components/ui/badge';
import { useAllOrganizations } from '@/hooks/useSystemAdmin';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  CreditCard, TrendingUp, DollarSign, AlertCircle, Clock, Loader2,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  LineChart, Line,
} from 'recharts';
import { format, subMonths } from 'date-fns';

const PLAN_PRICES_KES: Record<string, number> = {
  starter: 5000,
  professional: 15000,
  enterprise: 45000,
};

const TIER_BAR_COLORS: Record<string, string> = {
  Starter: '#14b8a6',
  Professional: '#3b82f6',
  Enterprise: '#a855f7',
};

export function BillingDashboard() {
  const { data: organizations, isLoading } = useAllOrganizations();

  // Org growth trend (last 12 months)
  const { data: growthData = [] } = useQuery({
    queryKey: ['admin-org-growth-trend'],
    queryFn: async () => {
      const { data } = await supabase
        .from('organizations')
        .select('created_at')
        .order('created_at', { ascending: true });
      if (!data) return [];
      const buckets: Record<string, number> = {};
      for (let i = 11; i >= 0; i--) {
        const d = subMonths(new Date(), i);
        buckets[format(d, 'MMM yyyy')] = 0;
      }
      data.forEach(o => {
        const key = format(new Date(o.created_at), 'MMM yyyy');
        if (key in buckets) buckets[key]++;
      });
      return Object.entries(buckets).map(([month, count]) => ({ month, count }));
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-warning" />
      </div>
    );
  }

  const tierCounts: Record<string, number> = {};
  organizations?.forEach(org => {
    const tier = org.subscription_tier || 'free';
    tierCounts[tier] = (tierCounts[tier] || 0) + 1;
  });

  const starterCount = tierCounts['starter'] || 0;
  const proCount = tierCounts['professional'] || 0;
  const entCount = tierCounts['enterprise'] || 0;
  const mrr = starterCount * 5000 + proCount * 15000 + entCount * 45000;
  const arr = mrr * 12;
  const payingOrgs = starterCount + proCount + entCount;
  const trialOrgs = (tierCounts['free'] || 0) + (tierCounts['trial'] || 0);

  const fmtKES = (v: number) => new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v);

  const barData = [
    { name: 'Starter', count: starterCount },
    { name: 'Professional', count: proCount },
    { name: 'Enterprise', count: entCount },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 p-3 rounded-lg bg-muted-foreground/50 border border-border/50">
        <CreditCard className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs text-muted-foreground font-medium">REVENUE & BILLING CENTER</span>
      </div>

      {/* Revenue Cards */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <div className="p-4 rounded-lg bg-gradient-to-br from-success/10 to-success/5 border border-success/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground">MRR</span>
            <DollarSign className="h-4 w-4 text-success" />
          </div>
          <div className="text-2xl font-bold text-success font-mono">{fmtKES(mrr)}</div>
          <p className="text-xs text-muted-foreground mt-1">{payingOrgs} paying orgs</p>
        </div>

        <div className="p-4 rounded-lg bg-gradient-to-br from-info/10 to-info/5 border border-info/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground">ARR</span>
            <TrendingUp className="h-4 w-4 text-info" />
          </div>
          <div className="text-2xl font-bold text-info font-mono">{fmtKES(arr)}</div>
          <p className="text-xs text-muted-foreground mt-1">Annual run rate</p>
        </div>

        <div className="p-4 rounded-lg bg-gradient-to-br from-info/10 to-info/5 border border-info/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground">Trial / Free</span>
            <Clock className="h-4 w-4 text-info" />
          </div>
          <div className="text-2xl font-bold text-info font-mono">{trialOrgs}</div>
          <p className="text-xs text-muted-foreground mt-1">Conversion targets</p>
        </div>

        <div className="p-4 rounded-lg bg-gradient-to-br from-warning/10 to-warning/5 border border-warning/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground">Paying Orgs</span>
            <CreditCard className="h-4 w-4 text-warning" />
          </div>
          <div className="text-2xl font-bold text-warning font-mono">{payingOrgs}</div>
          <p className="text-xs text-muted-foreground mt-1">Active subscriptions</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Orgs by Plan - Bar Chart */}
        <div className="p-4 rounded-lg bg-muted-foreground/50 border border-border/50">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">Organizations by Plan</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} allowDecimals={false} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#e2e8f0' }}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]} label={{ position: 'top', fill: '#94a3b8', fontSize: 12 }}>
                {barData.map(entry => (
                  <Cell key={entry.name} fill={TIER_BAR_COLORS[entry.name] || '#64748b'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Growth Trend - Line Chart */}
        <div className="p-4 rounded-lg bg-muted-foreground/50 border border-border/50">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">New Organizations (Last 12 Months)</h3>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={growthData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 10 }} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} allowDecimals={false} />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#e2e8f0' }} />
              <Line type="monotone" dataKey="count" stroke="#14b8a6" strokeWidth={2} dot={{ fill: '#14b8a6', r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Plan Breakdown */}
      <div className="p-4 rounded-lg bg-muted-foreground/50 border border-border/50">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">Plan Breakdown</h3>
        <div className="space-y-3">
          {[
            { tier: 'Free', price: 0, orgs: tierCounts['free'] || 0 },
            { tier: 'Starter', price: 5000, orgs: starterCount },
            { tier: 'Professional', price: 15000, orgs: proCount },
            { tier: 'Enterprise', price: 45000, orgs: entCount },
          ].map((plan) => (
            <div key={plan.tier} className="flex items-center gap-3 p-3 rounded-lg bg-muted-foreground/30 border border-border/30">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-muted-foreground">{plan.tier}</span>
                  <span className="text-sm font-bold text-warning font-mono">
                    {plan.price === 0 ? 'Free' : `${fmtKES(plan.price)}/mo`}
                  </span>
                </div>
              </div>
              <Badge variant="outline" className="border-border text-muted-foreground font-mono text-sm px-3">
                {plan.orgs}
              </Badge>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

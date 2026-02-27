import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useAllOrganizations } from '@/hooks/useSystemAdmin';
import { 
  CreditCard, TrendingUp, DollarSign, AlertCircle, CheckCircle2, Clock, Loader2,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

const TIER_PRICING: Record<string, number> = {
  free: 0,
  starter: 29,
  professional: 99,
  enterprise: 299,
};

export function BillingDashboard() {
  const { data: organizations, isLoading } = useAllOrganizations();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    );
  }

  const tierCounts = organizations?.reduce((acc, org) => {
    const tier = org.subscription_tier || 'free';
    acc[tier] = (acc[tier] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  const monthlyRevenue = Object.entries(tierCounts).reduce((sum, [tier, count]) => {
    return sum + (TIER_PRICING[tier] || 0) * count;
  }, 0);

  const paidOrgs = organizations?.filter(o => o.subscription_tier && o.subscription_tier !== 'free').length || 0;
  const conversionRate = organizations?.length ? (paidOrgs / organizations.length) * 100 : 0;
  const pastDueOrgs = organizations?.filter(o => o.subscription_status === 'past_due').length || 0;
  const trialOrgs = organizations?.filter(o => o.subscription_status === 'trial').length || 0;

  const chartData = [
    { name: 'Free', count: tierCounts['free'] || 0, revenue: 0 },
    { name: 'Starter', count: tierCounts['starter'] || 0, revenue: (tierCounts['starter'] || 0) * TIER_PRICING.starter },
    { name: 'Professional', count: tierCounts['professional'] || 0, revenue: (tierCounts['professional'] || 0) * TIER_PRICING.professional },
    { name: 'Enterprise', count: tierCounts['enterprise'] || 0, revenue: (tierCounts['enterprise'] || 0) * TIER_PRICING.enterprise },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-800/50 border border-slate-700/50">
        <CreditCard className="h-4 w-4 text-slate-400" />
        <span className="text-xs text-slate-400 font-medium">REVENUE & BILLING CENTER</span>
      </div>

      {/* Revenue Cards */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <div className="p-4 rounded-lg bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border border-emerald-500/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400">MRR</span>
            <DollarSign className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400 font-mono">${monthlyRevenue.toLocaleString()}</div>
          <p className="text-xs text-slate-500 mt-1">{paidOrgs} paid orgs</p>
        </div>

        <div className="p-4 rounded-lg bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400">Conversion</span>
            <TrendingUp className="h-4 w-4 text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-blue-400 font-mono">{conversionRate.toFixed(1)}%</div>
          <div className="mt-2 h-1.5 rounded-full bg-slate-700 overflow-hidden">
            <div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: `${conversionRate}%` }} />
          </div>
        </div>

        <div className="p-4 rounded-lg bg-gradient-to-br from-cyan-500/10 to-cyan-600/5 border border-cyan-500/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400">Trial</span>
            <Clock className="h-4 w-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold text-cyan-400 font-mono">{trialOrgs}</div>
          <p className="text-xs text-slate-500 mt-1">Active trials</p>
        </div>

        <div className="p-4 rounded-lg bg-gradient-to-br from-red-500/10 to-red-600/5 border border-red-500/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400">Past Due</span>
            <AlertCircle className="h-4 w-4 text-red-400" />
          </div>
          <div className="text-2xl font-bold text-red-400 font-mono">{pastDueOrgs}</div>
          <p className="text-xs text-slate-500 mt-1">Need attention</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Revenue Chart */}
        <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700/50">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-4">Revenue by Plan</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#e2e8f0' }}
                formatter={(value: number, name: string) => [name === 'revenue' ? `$${value}` : value, name === 'revenue' ? 'Revenue' : 'Organizations']}
              />
              <Bar dataKey="revenue" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Plan Breakdown */}
        <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700/50">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-4">Plan Breakdown</h3>
          <div className="space-y-3">
            {[
              { tier: 'Free', price: 0, features: ['5 users', '100 beneficiaries', 'Basic reports'], orgs: tierCounts['free'] || 0 },
              { tier: 'Starter', price: 29, features: ['25 users', '500 beneficiaries', 'Bulk import'], orgs: tierCounts['starter'] || 0 },
              { tier: 'Professional', price: 99, features: ['100 users', '2,500 beneficiaries', 'Analytics'], orgs: tierCounts['professional'] || 0 },
              { tier: 'Enterprise', price: 299, features: ['Unlimited', 'Custom entities', 'API access'], orgs: tierCounts['enterprise'] || 0 },
            ].map((plan) => (
              <div key={plan.tier} className="flex items-center gap-3 p-3 rounded-lg bg-slate-800/30 border border-slate-700/30">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-slate-200">{plan.tier}</span>
                    <span className="text-sm font-bold text-amber-400 font-mono">
                      {plan.price === 0 ? 'Free' : `$${plan.price}/mo`}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {plan.features.map((f, i) => (
                      <span key={i} className="text-[10px] text-slate-500">{f}{i < plan.features.length - 1 ? ' · ' : ''}</span>
                    ))}
                  </div>
                </div>
                <Badge variant="outline" className="border-slate-600 text-slate-300 font-mono text-sm px-3">
                  {plan.orgs}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

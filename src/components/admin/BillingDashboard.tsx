import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useAllOrganizations } from '@/hooks/useSystemAdmin';
import { 
  CreditCard, 
  TrendingUp,
  DollarSign,
  AlertCircle,
  CheckCircle2,
  Clock,
  Loader2,
  Sparkles,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

// Subscription tier pricing (example)
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
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Calculate billing metrics
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
    <div className="space-y-6">
      {/* Revenue Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-0 shadow-lg bg-gradient-to-br from-emerald-500/10 to-emerald-600/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Monthly Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold">${monthlyRevenue.toLocaleString()}</div>
              <div className="p-3 rounded-xl bg-emerald-500/10">
                <DollarSign className="h-6 w-6 text-emerald-500" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              From {paidOrgs} paid organizations
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-500/10 to-blue-600/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Conversion Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold">{conversionRate.toFixed(1)}%</div>
              <div className="p-3 rounded-xl bg-blue-500/10">
                <TrendingUp className="h-6 w-6 text-blue-500" />
              </div>
            </div>
            <Progress value={conversionRate} className="mt-3 h-2" />
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-amber-500/10 to-amber-600/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Trial Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold">{trialOrgs}</div>
              <div className="p-3 rounded-xl bg-amber-500/10">
                <Clock className="h-6 w-6 text-amber-500" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Active trial organizations
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-red-500/10 to-red-600/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Past Due</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold">{pastDueOrgs}</div>
              <div className="p-3 rounded-xl bg-red-500/10">
                <AlertCircle className="h-6 w-6 text-red-500" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Require payment attention
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Revenue by Tier Chart */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              Revenue by Tier
            </CardTitle>
            <CardDescription>Monthly revenue breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="name" className="text-xs fill-muted-foreground" />
                <YAxis className="text-xs fill-muted-foreground" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                  formatter={(value: number, name: string) => [
                    name === 'revenue' ? `$${value}` : value,
                    name === 'revenue' ? 'Revenue' : 'Organizations'
                  ]}
                />
                <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Subscription Tiers */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Subscription Tiers
            </CardTitle>
            <CardDescription>Pricing and feature breakdown</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { tier: 'Free', price: 0, features: ['5 users', '100 beneficiaries', 'Basic reports'], orgs: tierCounts['free'] || 0 },
              { tier: 'Starter', price: 29, features: ['25 users', '500 beneficiaries', 'All reports', 'Bulk import'], orgs: tierCounts['starter'] || 0 },
              { tier: 'Professional', price: 99, features: ['100 users', '2,500 beneficiaries', 'Indicators', 'Analytics'], orgs: tierCounts['professional'] || 0 },
              { tier: 'Enterprise', price: 299, features: ['Unlimited', 'Custom entities', 'API access', 'White label'], orgs: tierCounts['enterprise'] || 0 },
            ].map((plan) => (
              <div key={plan.tier} className="flex items-center gap-4 p-4 rounded-xl bg-muted/30">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold">{plan.tier}</h4>
                    <span className="text-lg font-bold">
                      {plan.price === 0 ? 'Free' : `$${plan.price}/mo`}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {plan.features.map((feature, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        <CheckCircle2 className="h-3 w-3 mr-1 text-green-500" />
                        {feature}
                      </Badge>
                    ))}
                  </div>
                </div>
                <Badge variant="secondary" className="text-lg px-3 py-1">
                  {plan.orgs}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Stripe Integration Notice */}
      <Card className="border-0 shadow-lg border-l-4 border-l-amber-500">
        <CardContent className="py-4">
          <div className="flex items-start gap-4">
            <div className="p-2 rounded-lg bg-amber-500/10">
              <CreditCard className="h-5 w-5 text-amber-500" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold">Stripe Integration</h4>
              <p className="text-sm text-muted-foreground mt-1">
                Connect your Stripe account to enable automated billing, subscription management, and payment processing.
              </p>
            </div>
            <Button variant="outline">
              Connect Stripe
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

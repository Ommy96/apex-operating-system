import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { CreditCard, Users, HardDrive, Package, ArrowUpRight } from 'lucide-react';
import { useOrganization } from '@/hooks/useOrganization';
import { usePermissions } from '@/hooks/usePermissions';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  section: 'sub-plan' | 'sub-billing';
}

export function SubscriptionSettings({ section }: Props) {
  const { currentOrganization } = useOrganization();
  const { can, isSuperAdmin } = usePermissions();
  const isAdmin = can.manageSettings || isSuperAdmin;

  const { data: org } = useQuery({
    queryKey: ['org-subscription', currentOrganization?.organization_id],
    queryFn: async () => {
      if (!currentOrganization?.organization_id) return null;
      const { data, error } = await supabase.from('organizations').select('subscription_tier, subscription_status, features_enabled, trial_ends_at').eq('id', currentOrganization.organization_id).single();
      if (error) throw error;
      return data;
    },
    enabled: !!currentOrganization?.organization_id,
  });

  const tier = org?.subscription_tier || 'free';
  const status = org?.subscription_status || 'active';
  const features = (org?.features_enabled as any) || {};

  if (section === 'sub-plan') {
    return (
      <div className="space-y-6">
        <Card className="border shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Current Plan</CardTitle>
                <CardDescription>Your subscription details and usage limits</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Badge className="capitalize">{tier}</Badge>
                <Badge variant={status === 'active' ? 'default' : 'destructive'}>{status}</Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="p-4 rounded-xl border bg-muted/20">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <Label className="text-sm font-medium">Users</Label>
                </div>
                <p className="text-2xl font-bold">{features.max_users || '∞'}</p>
                <p className="text-xs text-muted-foreground">Maximum allowed users</p>
              </div>
              <div className="p-4 rounded-xl border bg-muted/20">
                <div className="flex items-center gap-2 mb-2">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  <Label className="text-sm font-medium">Beneficiaries</Label>
                </div>
                <p className="text-2xl font-bold">{features.max_beneficiaries || '∞'}</p>
                <p className="text-xs text-muted-foreground">Maximum beneficiaries</p>
              </div>
              <div className="p-4 rounded-xl border bg-muted/20">
                <div className="flex items-center gap-2 mb-2">
                  <HardDrive className="h-4 w-4 text-muted-foreground" />
                  <Label className="text-sm font-medium">Storage</Label>
                </div>
                <p className="text-2xl font-bold">{features.max_storage_gb || 1} GB</p>
                <Progress value={35} className="mt-2" />
              </div>
            </div>
            {isAdmin && (
              <Button variant="outline" className="gap-2">
                <ArrowUpRight className="h-4 w-4" /> Upgrade Plan
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // sub-billing
  return (
    <div className="space-y-6">
      <Card className="border shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Billing Settings</CardTitle>
          <CardDescription>Manage payment methods, invoices, and renewal preferences</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 rounded-xl border bg-muted/20">
            <div className="flex items-center gap-3">
              <CreditCard className="h-5 w-5 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-sm font-medium">Payment Method</p>
                <p className="text-xs text-muted-foreground">No payment method configured</p>
              </div>
              {isAdmin && <Button variant="outline" size="sm">Add Payment Method</Button>}
            </div>
          </div>
          <div className="p-4 rounded-xl border bg-muted/20">
            <p className="text-sm font-medium mb-2">Invoice History</p>
            <p className="text-xs text-muted-foreground">No invoices yet</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

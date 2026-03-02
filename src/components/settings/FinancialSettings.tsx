import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { usePermissions } from '@/hooks/usePermissions';

interface Props {
  section: 'fin-currency' | 'fin-budget' | 'fin-categories';
}

export function FinancialSettings({ section }: Props) {
  const { can, isSuperAdmin } = usePermissions();
  const isAdmin = can.manageSettings || isSuperAdmin;

  if (section === 'fin-currency') {
    return (
      <div className="space-y-6">
        <Card className="border shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Currency & Localization</CardTitle>
            <CardDescription>Configure base currency and multi-currency support</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Base Currency</Label>
              <Select defaultValue="KES" disabled={!isAdmin}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="KES">KES - Kenyan Shilling</SelectItem>
                  <SelectItem value="USD">USD - US Dollar</SelectItem>
                  <SelectItem value="EUR">EUR - Euro</SelectItem>
                  <SelectItem value="GBP">GBP - British Pound</SelectItem>
                  <SelectItem value="UGX">UGX - Ugandan Shilling</SelectItem>
                  <SelectItem value="TZS">TZS - Tanzanian Shilling</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {[
              { key: 'multiCurrency', label: 'Multi-Currency Support', desc: 'Accept and track donations in multiple currencies' },
              { key: 'autoExchange', label: 'Automatic Exchange Rates', desc: 'Auto-fetch exchange rates from external sources' },
            ].map(item => (
              <div key={item.key} className="flex items-center justify-between p-4 rounded-xl border bg-muted/20">
                <div>
                  <Label className="text-sm font-medium">{item.label}</Label>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
                <Switch disabled={!isAdmin} />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (section === 'fin-budget') {
    return (
      <div className="space-y-6">
        <Card className="border shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Budget Controls</CardTitle>
            <CardDescription>Configure approval workflows and spending thresholds</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { key: 'budgetApproval', label: 'Budget Approval Workflow', desc: 'Require admin approval for new budgets' },
              { key: 'expenseApproval', label: 'Expense Approval Hierarchy', desc: 'Route expenses through hierarchical approval' },
              { key: 'spendingAlerts', label: 'Spending Threshold Alerts', desc: 'Alert when spending exceeds 80% of budget' },
            ].map(item => (
              <div key={item.key} className="flex items-center justify-between p-4 rounded-xl border bg-muted/20">
                <div>
                  <Label className="text-sm font-medium">{item.label}</Label>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
                <Switch disabled={!isAdmin} defaultChecked />
              </div>
            ))}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Auto-Approval Threshold (KES)</Label>
              <Input type="number" defaultValue="5000" placeholder="Amount below which expenses auto-approve" disabled={!isAdmin} />
              <p className="text-xs text-muted-foreground">Expenses below this amount will be auto-approved</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // fin-categories
  return (
    <div className="space-y-6">
      <Card className="border shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Financial Categories</CardTitle>
              <CardDescription>Manage expense, funding, and grant type categories</CardDescription>
            </div>
            {isAdmin && <Button variant="outline" size="sm" className="gap-2"><Plus className="h-4 w-4" /> Add Category</Button>}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              { label: 'Expense Categories', items: ['Operations', 'Staff', 'Travel', 'Equipment', 'Training'] },
              { label: 'Funding Categories', items: ['Grant', 'Donation', 'Sponsorship', 'Government', 'Corporate'] },
              { label: 'Grant Types', items: ['Restricted', 'Unrestricted', 'Project-Specific', 'Capacity Building'] },
            ].map(group => (
              <div key={group.label} className="p-4 rounded-xl border bg-muted/20">
                <p className="text-sm font-medium mb-3">{group.label}</p>
                <div className="flex flex-wrap gap-1.5">
                  {group.items.map(item => (
                    <Badge key={item} variant="secondary" className="text-xs">{item}</Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { usePermissions } from '@/hooks/usePermissions';
import { useOrgSettings } from '@/hooks/useOrgSettings';
import { UnsavedBar } from '@/components/settings/UnsavedBar';

interface Props {
  section: 'fin-currency' | 'fin-budget' | 'fin-categories';
}

const CURRENCY_DEFAULTS = {
  base_currency: 'KES',
  multiCurrency: false,
  autoExchange: false,
};

const BUDGET_DEFAULTS = {
  budgetApproval: true,
  expenseApproval: true,
  spendingAlerts: true,
  autoApprovalThreshold: 5000,
};

function SectionSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-20 w-full" />
    </div>
  );
}

export function FinancialSettings({ section }: Props) {
  const { can, isSuperAdmin } = usePermissions();
  const isAdmin = can.manageSettings || isSuperAdmin;

  const currency = useOrgSettings('financial_currency', CURRENCY_DEFAULTS, {
    successMessage: 'Currency settings saved',
    orgFields: ['base_currency'],
  });
  const budget = useOrgSettings('financial_budget', BUDGET_DEFAULTS, {
    successMessage: 'Budget controls saved',
  });

  if (section === 'fin-currency') {
    return (
      <div className="space-y-6">
        <Card className="border shadow-sm">
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle className="text-lg">Currency & Localization</CardTitle>
                <CardDescription>Configure base currency and multi-currency support</CardDescription>
              </div>
              {isAdmin && (
                <UnsavedBar
                  isDirty={currency.isDirty}
                  isSaving={currency.isSaving}
                  onSave={currency.save}
                  onReset={currency.reset}
                />
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {currency.isLoading ? (
              <SectionSkeleton />
            ) : (
              <>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Base Currency</Label>
                  <Select
                    value={currency.values.base_currency}
                    onValueChange={(v) => currency.setField('base_currency', v)}
                    disabled={!isAdmin}
                  >
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
                {([
                  { key: 'multiCurrency', label: 'Multi-Currency Support', desc: 'Accept and track donations in multiple currencies' },
                  { key: 'autoExchange', label: 'Automatic Exchange Rates', desc: 'Auto-fetch exchange rates from external sources' },
                ] as const).map(item => (
                  <div key={item.key} className="flex items-center justify-between gap-4 p-4 rounded-xl border bg-muted/20">
                    <div>
                      <Label className="text-sm font-medium">{item.label}</Label>
                      <p className="text-xs text-muted-foreground">{item.desc}</p>
                    </div>
                    <Switch
                      disabled={!isAdmin}
                      checked={!!currency.values[item.key]}
                      onCheckedChange={(v) => currency.setField(item.key, v as any)}
                    />
                  </div>
                ))}
              </>
            )}
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
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle className="text-lg">Budget Controls</CardTitle>
                <CardDescription>Configure approval workflows and spending thresholds</CardDescription>
              </div>
              {isAdmin && (
                <UnsavedBar
                  isDirty={budget.isDirty}
                  isSaving={budget.isSaving}
                  onSave={budget.save}
                  onReset={budget.reset}
                />
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {budget.isLoading ? (
              <SectionSkeleton />
            ) : (
              <>
                {([
                  { key: 'budgetApproval', label: 'Budget Approval Workflow', desc: 'Require admin approval for new budgets' },
                  { key: 'expenseApproval', label: 'Expense Approval Hierarchy', desc: 'Route expenses through hierarchical approval' },
                  { key: 'spendingAlerts', label: 'Spending Threshold Alerts', desc: 'Alert when spending exceeds 80% of budget' },
                ] as const).map(item => (
                  <div key={item.key} className="flex items-center justify-between gap-4 p-4 rounded-xl border bg-muted/20">
                    <div>
                      <Label className="text-sm font-medium">{item.label}</Label>
                      <p className="text-xs text-muted-foreground">{item.desc}</p>
                    </div>
                    <Switch
                      disabled={!isAdmin}
                      checked={!!budget.values[item.key]}
                      onCheckedChange={(v) => budget.setField(item.key, v as any)}
                    />
                  </div>
                ))}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Auto-Approval Threshold</Label>
                  <Input
                    type="number"
                    min={0}
                    value={budget.values.autoApprovalThreshold ?? 0}
                    onChange={(e) => budget.setField('autoApprovalThreshold', Number(e.target.value))}
                    disabled={!isAdmin}
                  />
                  <p className="text-xs text-muted-foreground">Expenses below this amount will be auto-approved</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // fin-categories — reference lists used across the finance modules
  return (
    <div className="space-y-6">
      <Card className="border shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Financial Categories</CardTitle>
          <CardDescription>Expense, funding, and grant type categories used across the finance modules</CardDescription>
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

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ExternalLink, GitBranch } from 'lucide-react';
import { usePermissions } from '@/hooks/usePermissions';
import { useNavigate } from 'react-router-dom';
import { useOrgSettings } from '@/hooks/useOrgSettings';
import { UnsavedBar } from '@/components/settings/UnsavedBar';

const DEFAULTS = {
  enableBranches: true,
  branchPermissions: false,
  branchReporting: false,
  crossBranchVisibility: false,
};

const ITEMS = [
  { key: 'enableBranches' as const, label: 'Enable Multi-Branch Structure', desc: 'Allow creating and managing branches and regions' },
  { key: 'branchPermissions' as const, label: 'Branch-Level Permissions', desc: 'Restrict user access to assigned branches only' },
  { key: 'branchReporting' as const, label: 'Branch-Level Reporting', desc: 'Generate reports at the branch level' },
  { key: 'crossBranchVisibility' as const, label: 'Cross-Branch Data Visibility', desc: 'Allow managers to view data across branches' },
];

export function BranchSettings() {
  const { can, isSuperAdmin } = usePermissions();
  const navigate = useNavigate();
  const isAdmin = can.manageSettings || isSuperAdmin;

  const form = useOrgSettings('branches', DEFAULTS, { successMessage: 'Branch settings saved' });

  return (
    <div className="space-y-6">
      <Card className="border shadow-sm">
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="text-lg">Branches & Regions</CardTitle>
              <CardDescription>Configure multi-branch organizational structure</CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {isAdmin && (
                <UnsavedBar
                  isDirty={form.isDirty}
                  isSaving={form.isSaving}
                  onSave={form.save}
                  onReset={form.reset}
                />
              )}
              <Button onClick={() => navigate('/branches')} variant="outline" className="gap-2">
                <GitBranch className="h-4 w-4" /> Manage Branches
                <ExternalLink className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {form.isLoading ? (
            <Skeleton className="h-56 w-full" />
          ) : (
            ITEMS.map(item => (
              <div key={item.key} className="flex items-center justify-between gap-4 p-4 rounded-xl border bg-muted/20">
                <div>
                  <Label className="text-sm font-medium">{item.label}</Label>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
                <Switch
                  disabled={!isAdmin}
                  checked={!!form.values[item.key]}
                  onCheckedChange={(v) => form.setField(item.key, v as any)}
                />
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

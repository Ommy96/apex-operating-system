import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, GitBranch } from 'lucide-react';
import { usePermissions } from '@/hooks/usePermissions';
import { useNavigate } from 'react-router-dom';

export function BranchSettings() {
  const { can, isSuperAdmin } = usePermissions();
  const navigate = useNavigate();
  const isAdmin = can.manageSettings || isSuperAdmin;

  return (
    <div className="space-y-6">
      <Card className="border shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Branches & Regions</CardTitle>
              <CardDescription>Configure multi-branch organizational structure</CardDescription>
            </div>
            <Button onClick={() => navigate('/branches')} className="gap-2">
              <GitBranch className="h-4 w-4" /> Manage Branches
              <ExternalLink className="h-3 w-3" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { key: 'enableBranches', label: 'Enable Multi-Branch Structure', desc: 'Allow creating and managing branches and regions' },
            { key: 'branchPermissions', label: 'Branch-Level Permissions', desc: 'Restrict user access to assigned branches only' },
            { key: 'branchReporting', label: 'Branch-Level Reporting', desc: 'Generate reports at the branch level' },
            { key: 'crossBranchVisibility', label: 'Cross-Branch Data Visibility', desc: 'Allow managers to view data across branches' },
          ].map(item => (
            <div key={item.key} className="flex items-center justify-between p-4 rounded-xl border bg-muted/20">
              <div>
                <Label className="text-sm font-medium">{item.label}</Label>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
              <Switch disabled={!isAdmin} defaultChecked={item.key === 'enableBranches'} />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

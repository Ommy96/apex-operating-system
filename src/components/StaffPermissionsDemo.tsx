import { Shield, Users, Settings, TrendingUp, FileText, Eye, Edit, Trash2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';

export function StaffPermissionsDemo() {
  const { userRole, isAdmin, isManagement, isStaff } = useAuth();

  const permissions = [
    {
      section: 'Navigation',
      items: [
        { name: 'Dashboard', icon: TrendingUp, allowed: true, description: 'Full access' },
        { name: 'Children', icon: Users, allowed: true, description: 'View all children' },
        { name: 'Programs', icon: FileText, allowed: true, description: 'View programs' },
        { name: 'Reports & Analytics', icon: TrendingUp, allowed: !isStaff, description: isStaff ? 'Hidden from staff' : 'Full access' },
        { name: 'Settings', icon: Settings, allowed: !isStaff, description: isStaff ? 'Hidden from staff' : 'Management/Admin only' },
      ]
    },
    {
      section: 'Report Actions',
      items: [
        { name: 'Submit Reports', icon: FileText, allowed: true, description: 'Can create new reports' },
        { name: 'View Own Reports', icon: Eye, allowed: true, description: 'Can view own submissions' },
        { name: 'View All Reports', icon: Eye, allowed: !isStaff, description: isStaff ? 'Only own reports' : 'All reports' },
        { name: 'Edit Own Reports', icon: Edit, allowed: true, description: 'Can edit own reports' },
        { name: 'Edit All Reports', icon: Edit, allowed: !isStaff, description: isStaff ? 'Only own reports' : 'All reports' },
        { name: 'Delete Own Reports', icon: Trash2, allowed: true, description: 'Can delete own reports' },
        { name: 'Delete All Reports', icon: Trash2, allowed: !isStaff, description: isStaff ? 'Only own reports' : 'All reports' },
        { name: 'Download Reports', icon: TrendingUp, allowed: !isStaff, description: isStaff ? 'Not allowed' : 'Excel/PDF export' },
      ]
    }
  ];

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'destructive';
      case 'management': return 'default';
      case 'staff': return 'secondary';
      default: return 'outline';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Role-Based Permissions</h2>
          <p className="text-muted-foreground">Current user permissions overview</p>
        </div>
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          <Badge variant={getRoleColor(userRole || '') as any} className="capitalize">
            {userRole} User
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {permissions.map((section) => (
          <Card key={section.section}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                {section.section}
              </CardTitle>
              <CardDescription>
                {section.section === 'Navigation' 
                  ? 'Pages and sections accessible to your role' 
                  : 'Actions you can perform on reports'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {section.items.map((item) => (
                  <div key={item.name} className="flex items-center justify-between p-2 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <item.icon className={`h-4 w-4 ${item.allowed ? 'text-green-600' : 'text-red-500'}`} />
                      <span className="font-medium">{item.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={item.allowed ? 'default' : 'destructive'} className="text-xs">
                        {item.allowed ? 'Allowed' : 'Denied'}
                      </Badge>
                      <span className="text-xs text-muted-foreground max-w-[120px] truncate">
                        {item.description}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950">
        <CardHeader>
          <CardTitle className="text-blue-700 dark:text-blue-300">Role Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            {isStaff && (
              <div className="space-y-1">
                <p className="font-medium text-blue-700 dark:text-blue-300">Staff Permissions:</p>
                <ul className="list-disc list-inside space-y-1 text-blue-600 dark:text-blue-400">
                  <li>Can submit and manage own reports only</li>
                  <li>Cannot access Reports & Analytics page</li>
                  <li>Cannot access Settings page</li>
                  <li>Cannot download reports or view others' reports</li>
                  <li>Full access to children and program data</li>
                </ul>
              </div>
            )}
            {isManagement && (
              <div className="space-y-1">
                <p className="font-medium text-blue-700 dark:text-blue-300">Management Permissions:</p>
                <ul className="list-disc list-inside space-y-1 text-blue-600 dark:text-blue-400">
                  <li>Can view and manage all reports</li>
                  <li>Full access to Reports & Analytics</li>
                  <li>Can access Settings (limited)</li>
                  <li>Can download reports and export data</li>
                  <li>Can manage all program data</li>
                </ul>
              </div>
            )}
            {isAdmin && (
              <div className="space-y-1">
                <p className="font-medium text-blue-700 dark:text-blue-300">Admin Permissions:</p>
                <ul className="list-disc list-inside space-y-1 text-blue-600 dark:text-blue-400">
                  <li>Full system access and control</li>
                  <li>Can manage user roles and permissions</li>
                  <li>Complete access to all reports and analytics</li>
                  <li>Full Settings and system configuration access</li>
                  <li>Can manage all data and users</li>
                </ul>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
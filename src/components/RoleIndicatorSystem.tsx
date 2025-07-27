import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Shield, Crown, User, Key, Users, Database, Eye, Settings, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface RoleIndicatorProps {
  role: 'admin' | 'management' | 'staff';
  size?: 'sm' | 'md' | 'lg';
  variant?: 'badge' | 'icon' | 'avatar' | 'full' | 'minimal';
  showPermissions?: boolean;
  userName?: string;
  className?: string;
}

export function RoleIndicator({ 
  role, 
  size = 'md', 
  variant = 'badge',
  showPermissions = false,
  userName,
  className 
}: RoleIndicatorProps) {
  const getRoleConfig = (role: string) => {
    switch (role) {
      case 'admin':
        return {
          label: 'Administrator',
          icon: Crown,
          color: 'from-red-500 to-red-600',
          bgColor: 'bg-red-500',
          textColor: 'text-red-600',
          badgeVariant: 'destructive' as const,
          permissions: ['Full System Access', 'User Management', 'Role Assignment', 'Data Export'],
          description: 'Complete system control and user management'
        };
      case 'management':
        return {
          label: 'Management',
          icon: Shield,
          color: 'from-blue-500 to-blue-600',
          bgColor: 'bg-blue-500',
          textColor: 'text-blue-600',
          badgeVariant: 'default' as const,
          permissions: ['Report Access', 'Program Management', 'Data Viewing', 'Limited User Access'],
          description: 'Operational oversight and reporting'
        };
      case 'staff':
        return {
          label: 'Staff',
          icon: User,
          color: 'from-green-500 to-green-600',
          bgColor: 'bg-green-500',
          textColor: 'text-green-600',
          badgeVariant: 'secondary' as const,
          permissions: ['Data Entry', 'Report Creation', 'Child Management', 'Activity Logging'],
          description: 'Day-to-day operations and data management'
        };
      default:
        return {
          label: 'Unknown',
          icon: User,
          color: 'from-gray-500 to-gray-600',
          bgColor: 'bg-gray-500',
          textColor: 'text-gray-600',
          badgeVariant: 'outline' as const,
          permissions: [],
          description: 'No defined permissions'
        };
    }
  };

  const config = getRoleConfig(role);
  const Icon = config.icon;

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return {
          icon: 'h-3 w-3',
          text: 'text-xs',
          avatar: 'h-6 w-6',
          badge: 'text-xs px-1.5 py-0.5'
        };
      case 'lg':
        return {
          icon: 'h-5 w-5',
          text: 'text-base',
          avatar: 'h-10 w-10',
          badge: 'text-sm px-3 py-1'
        };
      default:
        return {
          icon: 'h-4 w-4',
          text: 'text-sm',
          avatar: 'h-8 w-8',
          badge: 'text-sm px-2 py-1'
        };
    }
  };

  const sizeClasses = getSizeClasses();

  if (variant === 'badge') {
    return (
      <Badge variant={config.badgeVariant} className={cn(sizeClasses.badge, className)}>
        <Icon className={cn(sizeClasses.icon, 'mr-1')} />
        {config.label}
      </Badge>
    );
  }

  if (variant === 'icon') {
    return (
      <div className={cn('flex items-center gap-1', className)}>
        <div className={cn(
          'rounded-full p-1',
          config.bgColor
        )}>
          <Icon className={cn(sizeClasses.icon, 'text-white')} />
        </div>
      </div>
    );
  }

  if (variant === 'avatar') {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <Avatar className={sizeClasses.avatar}>
          <AvatarFallback className={cn('bg-gradient-to-br', config.color, 'text-white')}>
            <Icon className={sizeClasses.icon} />
          </AvatarFallback>
        </Avatar>
        {userName && (
          <div className="flex flex-col">
            <span className={cn('font-medium', sizeClasses.text)}>{userName}</span>
            <span className={cn('text-xs', config.textColor)}>{config.label}</span>
          </div>
        )}
      </div>
    );
  }

  if (variant === 'minimal') {
    return (
      <div className={cn('flex items-center gap-1', className)}>
        <Icon className={cn(sizeClasses.icon, config.textColor)} />
        <span className={cn(sizeClasses.text, config.textColor)}>{config.label}</span>
      </div>
    );
  }

  if (variant === 'full') {
    return (
      <div className={cn('space-y-3', className)}>
        <div className="flex items-center gap-3">
          <div className={cn(
            'rounded-full p-2',
            'bg-gradient-to-br',
            config.color
          )}>
            <Icon className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold">{config.label}</h3>
            <p className="text-sm text-muted-foreground">{config.description}</p>
          </div>
        </div>
        
        {showPermissions && config.permissions.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center gap-1">
              <Key className="h-3 w-3" />
              Permissions
            </h4>
            <div className="grid grid-cols-2 gap-1">
              {config.permissions.map((permission, index) => (
                <div key={index} className="flex items-center gap-1 text-xs text-muted-foreground">
                  <div className={cn('w-1 h-1 rounded-full', config.bgColor)} />
                  {permission}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return null;
}

// Quick access role indicators for common use cases
export function AdminIndicator(props: Omit<RoleIndicatorProps, 'role'>) {
  return <RoleIndicator {...props} role="admin" />;
}

export function ManagementIndicator(props: Omit<RoleIndicatorProps, 'role'>) {
  return <RoleIndicator {...props} role="management" />;
}

export function StaffIndicator(props: Omit<RoleIndicatorProps, 'role'>) {
  return <RoleIndicator {...props} role="staff" />;
}

// Role-based access indicator
export function AccessLevelIndicator({ 
  userRole, 
  requiredRole, 
  className 
}: { 
  userRole: string; 
  requiredRole: string;
  className?: string;
}) {
  const roleHierarchy = { staff: 1, management: 2, admin: 3 };
  const userLevel = roleHierarchy[userRole as keyof typeof roleHierarchy] || 0;
  const requiredLevel = roleHierarchy[requiredRole as keyof typeof roleHierarchy] || 0;
  const hasAccess = userLevel >= requiredLevel;

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {hasAccess ? (
        <>
          <Eye className="h-4 w-4 text-green-500" />
          <span className="text-sm text-green-600">Access Granted</span>
        </>
      ) : (
        <>
          <Lock className="h-4 w-4 text-red-500" />
          <span className="text-sm text-red-600">Access Denied</span>
        </>
      )}
    </div>
  );
}

// Permission matrix component
export function PermissionMatrix({ userRole }: { userRole: string }) {
  const permissions = [
    { name: 'View Children', admin: true, management: true, staff: true },
    { name: 'Edit Children', admin: true, management: false, staff: true },
    { name: 'Delete Children', admin: true, management: false, staff: false },
    { name: 'Manage Users', admin: true, management: false, staff: false },
    { name: 'Assign Roles', admin: true, management: false, staff: false },
    { name: 'View Reports', admin: true, management: true, staff: true },
    { name: 'Export Data', admin: true, management: true, staff: false },
    { name: 'System Settings', admin: true, management: false, staff: false },
  ];

  return (
    <div className="space-y-3">
      <h4 className="font-medium flex items-center gap-2">
        <Settings className="h-4 w-4" />
        Permission Matrix
      </h4>
      <div className="grid gap-2">
        {permissions.map((permission, index) => {
          const hasPermission = permission[userRole as keyof typeof permission] as boolean;
          return (
            <div key={index} className="flex items-center justify-between p-2 rounded bg-muted/30">
              <span className="text-sm">{permission.name}</span>
              {hasPermission ? (
                <Badge variant="default" className="text-xs">
                  Allowed
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-xs">
                  Denied
                </Badge>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Role comparison component
export function RoleComparison({ 
  currentRole, 
  newRole 
}: { 
  currentRole: string; 
  newRole: string;
}) {
  const roleHierarchy = { staff: 1, management: 2, admin: 3 };
  const currentLevel = roleHierarchy[currentRole as keyof typeof roleHierarchy] || 0;
  const newLevel = roleHierarchy[newRole as keyof typeof roleHierarchy] || 0;
  
  const isEscalation = newLevel > currentLevel;
  const isReduction = newLevel < currentLevel;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Current:</span>
          <RoleIndicator role={currentRole as any} variant="badge" size="sm" />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">New:</span>
          <RoleIndicator role={newRole as any} variant="badge" size="sm" />
        </div>
      </div>
      
      {isEscalation && (
        <div className="flex items-center gap-2 p-2 bg-yellow-50 rounded border border-yellow-200">
          <Users className="h-4 w-4 text-yellow-600" />
          <span className="text-sm text-yellow-700">
            This is a privilege escalation - user will gain additional permissions
          </span>
        </div>
      )}
      
      {isReduction && (
        <div className="flex items-center gap-2 p-2 bg-red-50 rounded border border-red-200">
          <Database className="h-4 w-4 text-red-600" />
          <span className="text-sm text-red-700">
            This is a privilege reduction - user will lose some permissions
          </span>
        </div>
      )}
    </div>
  );
}
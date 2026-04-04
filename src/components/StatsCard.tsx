import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  colorVariant?: 'blue' | 'emerald' | 'purple' | 'orange' | 'rose' | 'cyan';
  children?: React.ReactNode;
}

const colorVariants = {
  blue: { bg: 'var(--status-info-bg)', border: 'var(--status-info)', iconBg: 'var(--status-info-bg)', iconColor: 'var(--status-info)' },
  emerald: { bg: 'var(--status-success-bg)', border: 'var(--status-success)', iconBg: 'var(--status-success-bg)', iconColor: 'var(--status-success)' },
  purple: { bg: 'var(--status-info-bg)', border: 'var(--status-info)', iconBg: 'var(--status-info-bg)', iconColor: 'var(--status-info)' },
  orange: { bg: 'var(--status-warning-bg)', border: 'var(--status-warning)', iconBg: 'var(--status-warning-bg)', iconColor: 'var(--status-warning)' },
  rose: { bg: 'var(--status-danger-bg)', border: 'var(--status-danger)', iconBg: 'var(--status-danger-bg)', iconColor: 'var(--status-danger)' },
  cyan: { bg: 'var(--accent-lt)', border: 'var(--accent-brand)', iconBg: 'var(--accent-lt)', iconColor: 'var(--accent-brand)' },
};

export function StatsCard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  colorVariant = 'blue',
  children 
}: StatsCardProps) {
  const colors = colorVariants[colorVariant];
  
  return (
    <div
      className="rounded-[14px] p-4 transition-shadow duration-150 hover:shadow-elevation-2"
      style={{
        background: 'var(--brand-surface)',
        border: '1px solid var(--brand-border)',
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] font-medium uppercase tracking-[0.5px]" style={{ color: 'var(--brand-ink-3)' }}>{title}</span>
        <div
          className="p-2 rounded-lg"
          style={{ background: colors.iconBg }}
        >
          <Icon className="h-4 w-4" style={{ color: colors.iconColor }} />
        </div>
      </div>
      {children ? (
        children
      ) : (
        <>
          <div className="text-[24px] font-semibold truncate tabular-nums" style={{ color: 'var(--brand-ink)', letterSpacing: '-0.8px' }}>{value}</div>
          {subtitle && (
            <p className="text-[11px] mt-1" style={{ color: 'var(--brand-ink-3)' }}>{subtitle}</p>
          )}
        </>
      )}
    </div>
  );
}
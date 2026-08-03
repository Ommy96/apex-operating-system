import { Progress } from '@/components/ui/progress';
import { DollarSign } from 'lucide-react';

interface FundingCoverageBarProps {
  totalReceived: number;
  totalRequired?: number;
  className?: string;
  compact?: boolean;
}

export function FundingCoverageBar({ totalReceived, totalRequired, className = '', compact = false }: FundingCoverageBarProps) {
  const required = totalRequired || totalReceived || 1;
  const coverage = Math.min(Math.round((totalReceived / required) * 100), 100);
  const gap = Math.max(required - totalReceived, 0);

  const getStatusColor = () => {
    if (coverage >= 80) return 'text-success';
    if (coverage >= 40) return 'text-warning';
    return 'text-destructive';
  };

  const getStatusLabel = () => {
    if (coverage >= 80) return '🟢 Fully Funded';
    if (coverage >= 40) return '🟡 Partially Funded';
    return '🔴 Unfunded';
  };

  if (compact) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <span className="text-xs font-medium">{getStatusLabel()}</span>
        <Progress value={coverage} className="h-2 w-20" />
        <span className={`text-xs font-bold ${getStatusColor()}`}>{coverage}%</span>
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-primary" />
          Funding Coverage
        </h4>
        <span className="text-sm font-medium">{getStatusLabel()}</span>
      </div>
      <Progress value={coverage} className="h-3" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-center">
        <div>
          <p className="text-xs text-muted-foreground">Total Required</p>
          <p className="text-sm font-bold text-foreground">KES {required.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Received</p>
          <p className="text-sm font-bold text-success">KES {totalReceived.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Gap</p>
          <p className="text-sm font-bold text-destructive">KES {gap.toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
}

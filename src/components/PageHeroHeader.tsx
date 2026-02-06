import { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PageHeroHeaderProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  iconColorClass?: string;
  actions?: ReactNode;
  stats?: {
    label: string;
    value: string | number;
    icon?: LucideIcon;
  }[];
  variant?: 'default' | 'gradient';
}

export function PageHeroHeader({
  title,
  description,
  icon: Icon,
  iconColorClass = "text-primary",
  actions,
  stats,
  variant = 'default',
}: PageHeroHeaderProps) {
  // Gradient variant (legacy support)
  if (variant === 'gradient') {
    return (
      <div className="relative overflow-hidden rounded-xl bg-gradient-hero p-6 animate-fade-in">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] bg-[size:20px_20px]"></div>
        
        <div className="relative z-10">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              {Icon && (
                <div className="p-3 rounded-xl bg-white/10 backdrop-blur-sm shadow-lg shrink-0">
                  <Icon className="h-6 w-6 text-white" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <h1 className="text-xl sm:text-2xl font-bold text-white mb-0.5 truncate">
                  {title}
                </h1>
                {description && (
                  <p className="text-white/80 text-sm truncate">{description}</p>
                )}
              </div>
            </div>
            
            {actions && (
              <div className="flex gap-2 shrink-0">{actions}</div>
            )}
          </div>
          
          {stats && stats.length > 0 && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-5">
              {stats.map((stat, index) => (
                <div 
                  key={index} 
                  className="bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/10"
                >
                  <div className="flex items-center gap-1.5 text-white/70 text-xs mb-0.5">
                    {stat.icon && <stat.icon className="h-3.5 w-3.5 shrink-0" />}
                    <span className="truncate">{stat.label}</span>
                  </div>
                  <div className="text-xl font-bold text-white">
                    {stat.value}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Default minimal variant (ClickUp-style)
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
      <div className="flex items-center gap-3 min-w-0">
        {Icon && (
          <div className={cn(
            "h-10 w-10 rounded-xl flex items-center justify-center shrink-0",
            "bg-primary/10"
          )}>
            <Icon className={cn("h-5 w-5", iconColorClass)} />
          </div>
        )}
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-foreground truncate">
            {title}
          </h1>
          {description && (
            <p className="text-sm text-muted-foreground truncate">{description}</p>
          )}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}

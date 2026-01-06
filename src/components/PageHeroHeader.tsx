import { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';

interface PageHeroHeaderProps {
  title: string;
  description: string;
  icon: LucideIcon;
  iconColorClass?: string;
  actions?: ReactNode;
  stats?: {
    label: string;
    value: string | number;
    icon?: LucideIcon;
  }[];
}

export function PageHeroHeader({
  title,
  description,
  icon: Icon,
  iconColorClass = "text-accent",
  actions,
  stats
}: PageHeroHeaderProps) {
  return (
    <div className="relative overflow-hidden rounded-xl md:rounded-2xl bg-gradient-to-br from-primary via-primary-light to-accent p-4 md:p-8 animate-fade-in">
      <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] bg-[size:20px_20px]"></div>
      
      <div className="relative z-10">
        <div className="flex flex-col gap-4 md:gap-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3 md:gap-4 min-w-0 flex-1">
              <div className="p-2.5 md:p-4 rounded-xl md:rounded-2xl bg-primary-foreground/10 backdrop-blur-sm shadow-lg flex-shrink-0">
                <Icon className={`h-6 w-6 md:h-10 md:w-10 ${iconColorClass}`} />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-xl sm:text-2xl md:text-4xl font-bold text-primary-foreground mb-0.5 md:mb-1 truncate">
                  {title}
                </h1>
                <p className="text-primary-foreground/80 text-sm md:text-lg truncate">
                  {description}
                </p>
              </div>
            </div>
            
            {actions && (
              <div className="flex gap-2 md:gap-3 w-full sm:w-auto flex-shrink-0">
                {actions}
              </div>
            )}
          </div>
        </div>
        
        {stats && stats.length > 0 && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-4 mt-4 md:mt-6">
            {stats.map((stat, index) => (
              <div 
                key={index} 
                className="bg-primary-foreground/10 backdrop-blur-sm rounded-lg md:rounded-xl p-2.5 md:p-4 border border-primary-foreground/10"
              >
                <div className="flex items-center gap-1.5 md:gap-2 text-primary-foreground/70 text-xs md:text-sm mb-0.5 md:mb-1">
                  {stat.icon && <stat.icon className="h-3 w-3 md:h-4 md:w-4 flex-shrink-0" />}
                  <span className="truncate">{stat.label}</span>
                </div>
                <div className="text-lg md:text-2xl font-bold text-primary-foreground">
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

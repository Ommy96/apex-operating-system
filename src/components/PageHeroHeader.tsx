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
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary-light to-accent p-6 md:p-8 animate-fade-in">
      <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] bg-[size:20px_20px]"></div>
      
      <div className="relative z-10">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="p-4 rounded-2xl bg-primary-foreground/10 backdrop-blur-sm shadow-lg">
              <Icon className={`h-10 w-10 ${iconColorClass}`} />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-primary-foreground mb-1">
                {title}
              </h1>
              <p className="text-primary-foreground/80 text-lg">
                {description}
              </p>
            </div>
          </div>
          
          {actions && (
            <div className="flex gap-3 w-full md:w-auto">
              {actions}
            </div>
          )}
        </div>
        
        {stats && stats.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            {stats.map((stat, index) => (
              <div 
                key={index} 
                className="bg-primary-foreground/10 backdrop-blur-sm rounded-xl p-4 border border-primary-foreground/10"
              >
                <div className="flex items-center gap-2 text-primary-foreground/70 text-sm mb-1">
                  {stat.icon && <stat.icon className="h-4 w-4" />}
                  <span>{stat.label}</span>
                </div>
                <div className="text-2xl font-bold text-primary-foreground">
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

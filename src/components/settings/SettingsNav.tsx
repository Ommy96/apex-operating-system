import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Search, AlertTriangle } from 'lucide-react';
import { SETTINGS_SECTIONS, SECTION_GROUPS, SettingsSectionDef } from './registry';

interface Props {
  active: string;
  onChange: (id: string) => void;
  badges?: Record<string, { kind: 'amber' | 'rose' | 'count' | 'tier'; value?: string | number }>;
  planLabel?: string | null;
}

export function SettingsNav({ active, onChange, badges = {}, planLabel }: Props) {
  const [q, setQ] = useState('');
  const term = q.trim().toLowerCase();

  const matches = (s: SettingsSectionDef) =>
    !term ||
    s.label.toLowerCase().includes(term) ||
    s.description.toLowerCase().includes(term) ||
    s.group.toLowerCase().includes(term);

  return (
    <nav className="w-[220px] shrink-0 bg-[#0A0F1E] text-white/85 flex flex-col h-full">
      <div className="p-3 border-b border-white/5">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/40" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search settings"
            className="h-8 pl-8 text-xs bg-white/5 border-white/10 text-white placeholder:text-white/40 focus-visible:ring-white/20 focus-visible:border-white/30"
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
        {SECTION_GROUPS.map((group) => {
          const items = SETTINGS_SECTIONS.filter((s) => s.group === group && matches(s));
          if (!items.length) return null;
          return (
            <div key={group}>
              <div className="px-2 mb-1 text-[10px] uppercase tracking-[0.12em] text-white/40 font-semibold">
                {group}
              </div>
              <div className="space-y-0.5">
                {items.map((item) => {
                  const isActive = active === item.id;
                  const badge = badges[item.id];
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => onChange(item.id)}
                      className={cn(
                        'group w-full flex items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-[13px] transition-colors',
                        isActive
                          ? 'bg-white/10 text-white'
                          : 'text-white/70 hover:bg-white/5 hover:text-white'
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="flex-1 truncate">{item.label}</span>
                      {item.id === 'subscription' && planLabel && (
                        <span className="text-[9px] font-semibold uppercase rounded-full bg-white/10 px-1.5 py-0.5 tracking-wider">
                          {planLabel}
                        </span>
                      )}
                      {badge?.kind === 'amber' && (
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                      )}
                      {badge?.kind === 'rose' && (
                        <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
                      )}
                      {badge?.kind === 'count' && badge.value !== undefined && (
                        <span className="text-[10px] rounded-full bg-white/10 px-1.5 py-0.5">
                          {badge.value}
                        </span>
                      )}
                      {item.id === 'danger' && (
                        <AlertTriangle className="h-3 w-3 text-rose-400" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </nav>
  );
}
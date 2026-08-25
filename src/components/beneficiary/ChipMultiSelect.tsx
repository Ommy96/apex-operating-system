import { useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { X, Plus } from 'lucide-react';

interface Props {
  value: string[];
  options: string[];
  placeholder?: string;
  disabled?: boolean;
  onChange: (next: string[]) => void;
}

/** Catalogue-backed chips with free entry always allowed. */
export function ChipMultiSelect({ value, options, placeholder = 'Add…', disabled, onChange }: Props) {
  const [draft, setDraft] = useState('');
  const selected = value || [];

  const suggestions = useMemo(() => {
    const q = draft.trim().toLowerCase();
    return options
      .filter((o) => !selected.some((s) => s.toLowerCase() === o.toLowerCase()))
      .filter((o) => (q ? o.toLowerCase().includes(q) : true))
      .slice(0, q ? 8 : 12);
  }, [options, selected, draft]);

  const add = (v: string) => {
    const t = v.trim();
    if (!t) return;
    if (selected.some((s) => s.toLowerCase() === t.toLowerCase())) return;
    onChange([...selected, t]);
    setDraft('');
  };

  return (
    <div className="space-y-2">
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((s) => (
            <span key={s} className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary text-xs px-2.5 py-1 max-w-full">
              <span className="truncate">{s}</span>
              {!disabled && (
                <button type="button" onClick={() => onChange(selected.filter((x) => x !== s))} aria-label={`Remove ${s}`}>
                  <X className="h-3 w-3" />
                </button>
              )}
            </span>
          ))}
        </div>
      )}
      {!disabled && (
        <>
          <Input
            value={draft}
            placeholder={placeholder}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); add(draft); }
            }}
          />
          {(suggestions.length > 0 || draft.trim()) && (
            <div className="flex flex-wrap gap-1.5">
              {draft.trim() && !options.some((o) => o.toLowerCase() === draft.trim().toLowerCase()) && (
                <button type="button" onClick={() => add(draft)} className="inline-flex items-center gap-1 rounded-full border border-dashed text-xs px-2.5 py-1 hover:bg-muted">
                  <Plus className="h-3 w-3" /> Add “{draft.trim()}”
                </button>
              )}
              {suggestions.map((o) => (
                <button key={o} type="button" onClick={() => add(o)} className="rounded-full border text-xs px-2.5 py-1 text-muted-foreground hover:bg-muted hover:text-foreground">
                  {o}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

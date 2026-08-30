import { cn } from '@/lib/utils';
import { AlertTriangle, GraduationCap, User, Users, Home, Building2 } from 'lucide-react';
import {
  CATEGORY_DEFINITIONS,
  categoryAgeMismatch,
  type PersonCategory,
} from '@/lib/beneficiaryCategories';

const ICONS: Record<PersonCategory, React.ComponentType<{ className?: string }>> = {
  minor_student: GraduationCap,
  adult_student: GraduationCap,
  adult: User,
  group: Users,
  household: Home,
  organisation: Building2,
};

interface Props {
  value: PersonCategory;
  onChange: (value: PersonCategory) => void;
  /** Current age derived from DOB, used to warn about a mismatched choice. */
  age: number | null;
  term: string;
}

export function CategoryStep({ value, onChange, age, term }: Props) {
  const mismatch = categoryAgeMismatch(value, age);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold">Who are you registering?</h3>
        <p className="text-xs text-muted-foreground">
          The category decides which sections this {term.toLowerCase()} form asks for.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {CATEGORY_DEFINITIONS.map((def) => {
          const Icon = ICONS[def.value];
          const selected = value === def.value;
          return (
            <button
              key={def.value}
              type="button"
              onClick={() => onChange(def.value)}
              className={cn(
                'text-left p-3 rounded-md border-2 transition-colors flex gap-3',
                selected ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40',
              )}
            >
              <span
                className={cn(
                  'mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md',
                  selected ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground',
                )}
              >
                <Icon className="h-4 w-4" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-medium">{def.label}</span>
                <span className="block text-[11px] text-muted-foreground mt-0.5">
                  {def.description}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {mismatch && (
        <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-xs text-destructive">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{mismatch}</span>
        </div>
      )}
    </div>
  );
}

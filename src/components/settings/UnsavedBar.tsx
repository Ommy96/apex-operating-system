import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

interface Props {
  isDirty: boolean;
  isSaving: boolean;
  onSave: () => void;
  onReset: () => void;
  disabled?: boolean;
}

/**
 * Sticky topbar control for a settings section showing unsaved-changes
 * indicator + Save / Discard buttons.
 */
export function UnsavedBar({ isDirty, isSaving, onSave, onReset, disabled }: Props) {
  return (
    <div className="flex items-center justify-end gap-3">
      {isDirty && (
        <span className="flex items-center gap-2 text-xs text-warning">
          <span className="h-2 w-2 rounded-full bg-warning animate-pulse" />
          Unsaved changes
        </span>
      )}
      {isDirty && (
        <Button variant="outline" size="sm" onClick={onReset} disabled={isSaving}>
          Discard
        </Button>
      )}
      <Button
        size="sm"
        onClick={onSave}
        disabled={!isDirty || isSaving || disabled}
        className="gap-2"
      >
        {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
        Save changes
      </Button>
    </div>
  );
}
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';

/**
 * Generic helper for a settings section: tracks dirty state, exposes save() and reset().
 *
 * IMPORTANT: `initial` is compared by VALUE, not by reference. Callers routinely build
 * `initial` as a fresh object literal on every render; keying the sync effect on the
 * object identity would clobber in-progress edits on every keystroke (this was the
 * root cause of "settings save then revert").
 */
export function useSettingsForm<T extends Record<string, any>>(opts: {
  initial: T | null | undefined;
  save: (values: T) => Promise<void>;
  onSaved?: (values: T) => void;
  invalidateKeys?: (string | (string | undefined)[])[];
  successMessage?: string;
}) {
  const { initial, save, onSaved, invalidateKeys = [], successMessage = 'Saved' } = opts;
  const queryClient = useQueryClient();

  const initialKey = initial ? JSON.stringify(initial) : null;

  const [values, setValues] = useState<T>((initial ?? {}) as T);
  const [savedSnapshot, setSavedSnapshot] = useState<T>((initial ?? {}) as T);
  const hydrated = useRef(false);

  // Only re-hydrate from the server when the *content* of `initial` changes AND the
  // user has no unsaved edits in flight.
  useEffect(() => {
    if (!initialKey || !initial) return;
    const dirty = JSON.stringify(values) !== JSON.stringify(savedSnapshot);
    if (hydrated.current && dirty) return;
    hydrated.current = true;
    setValues(initial);
    setSavedSnapshot(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialKey]);

  const isDirty = useMemo(
    () => JSON.stringify(values) !== JSON.stringify(savedSnapshot),
    [values, savedSnapshot]
  );

  const setField = useCallback(<K extends keyof T>(key: K, value: T[K]) => {
    setValues((v) => ({ ...v, [key]: value }));
  }, []);

  const reset = useCallback(() => {
    setValues(savedSnapshot);
  }, [savedSnapshot]);

  const mutation = useMutation({
    mutationFn: async () => {
      await save(values);
    },
    onSuccess: () => {
      setSavedSnapshot(values);
      toast({ title: successMessage });
      invalidateKeys.forEach((k) => {
        queryClient.invalidateQueries({ queryKey: Array.isArray(k) ? (k as any) : [k] });
      });
      onSaved?.(values);
    },
    onError: (err: any) => {
      // Roll back to the last known-persisted state so a failed save visibly reverts
      // instead of appearing to have worked.
      setValues(savedSnapshot);
      toast({
        title: 'Save failed — changes reverted',
        description: err?.message ?? 'Please try again',
        variant: 'destructive',
      });
    },
  });

  return {
    values,
    setValues,
    setField,
    isDirty,
    isSaving: mutation.isPending,
    save: () => mutation.mutate(),
    reset,
  };
}

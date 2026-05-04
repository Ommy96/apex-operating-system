import { useState, useEffect, useMemo, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';

/**
 * Generic helper for a settings section: tracks dirty state, exposes save() and reset().
 * Each section defines:
 *   - initial data (loaded from server)
 *   - a save fn that persists to Supabase
 *   - optional invalidation keys
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

  const [values, setValues] = useState<T>((initial ?? {}) as T);
  const [savedSnapshot, setSavedSnapshot] = useState<T>((initial ?? {}) as T);

  useEffect(() => {
    if (initial) {
      setValues(initial);
      setSavedSnapshot(initial);
    }
  }, [initial]);

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
      toast({ title: 'Save failed', description: err?.message ?? 'Please try again', variant: 'destructive' });
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
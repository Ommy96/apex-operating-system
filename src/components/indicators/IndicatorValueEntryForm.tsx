import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Info, Save, X } from 'lucide-react';
import { toast } from 'sonner';

interface IndicatorValueEntryFormProps {
  indicatorId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

interface DisaggregationCategory {
  id: string;
  name: string;
  values: string[];
}

interface ValidationRule {
  id: string;
  rule_type: string;
  rule_value: number;
}

export function IndicatorValueEntryForm({ indicatorId, onSuccess, onCancel }: IndicatorValueEntryFormProps) {
  const { currentOrganization } = useOrganization();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const orgId = currentOrganization?.organization_id;

  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [singleValue, setSingleValue] = useState('');
  const [disaggValues, setDisaggValues] = useState<Record<string, Record<string, string>>>({});
  const [justification, setJustification] = useState('');
  const [warnings, setWarnings] = useState<string[]>([]);

  // Fetch validation rules
  const { data: rules = [] } = useQuery({
    queryKey: ['indicator-validation-rules', indicatorId],
    queryFn: async () => {
      const { data } = await supabase
        .from('indicator_validation_rules')
        .select('*')
        .eq('indicator_id', indicatorId);
      return (data || []) as ValidationRule[];
    },
  });

  // Fetch previous value
  const { data: previousValue } = useQuery({
    queryKey: ['indicator-prev-value', indicatorId],
    queryFn: async () => {
      const { data } = await supabase
        .from('indicator_values')
        .select('actual_value')
        .eq('indicator_id', indicatorId)
        .is('disaggregation_category_id', null)
        .order('created_at', { ascending: false })
        .limit(1);
      return data?.[0]?.actual_value ?? null;
    },
  });

  // Fetch linked disaggregation categories
  const { data: categories = [] } = useQuery({
    queryKey: ['indicator-disagg-categories', indicatorId],
    queryFn: async () => {
      const { data } = await supabase
        .from('indicator_disaggregations')
        .select('disaggregation_category_id, disaggregation_categories(id, name, values)')
        .eq('indicator_id', indicatorId);
      if (!data) return [];
      return data
        .map((d: any) => d.disaggregation_categories)
        .filter(Boolean)
        .map((c: any) => ({
          id: c.id,
          name: c.name,
          values: Array.isArray(c.values) ? c.values : [],
        })) as DisaggregationCategory[];
    },
  });

  const hasDisaggregations = categories.length > 0;

  // Calculate total from disaggregated values
  const total = useMemo(() => {
    if (!hasDisaggregations) return Number(singleValue) || 0;
    let sum = 0;
    Object.values(disaggValues).forEach(catVals => {
      Object.values(catVals).forEach(v => { sum += Number(v) || 0; });
    });
    return sum;
  }, [hasDisaggregations, singleValue, disaggValues]);

  // Validate on blur
  const validate = (value: number) => {
    const newWarnings: string[] = [];
    rules.forEach(rule => {
      if (rule.rule_type === 'min_value' && value < rule.rule_value) {
        newWarnings.push(`Value is below minimum expected (${rule.rule_value})`);
      }
      if (rule.rule_type === 'max_value' && value > rule.rule_value) {
        newWarnings.push(`Value exceeds maximum expected (${rule.rule_value})`);
      }
      if (rule.rule_type === 'max_change_pct' && previousValue !== null && previousValue !== 0) {
        const pctChange = Math.abs((value - previousValue) / previousValue * 100);
        if (pctChange > rule.rule_value) {
          newWarnings.push(`This represents a ${pctChange.toFixed(1)}% change from the previous value. Please add a justification.`);
        }
      }
      if (rule.rule_type === 'require_comment_if_zero' && value === 0) {
        newWarnings.push('A comment is required when reporting zero.');
      }
    });
    setWarnings(newWarnings);
  };

  const requiresJustification = warnings.length > 0;
  const canSave = periodStart && periodEnd && (!requiresJustification || justification.trim().length > 0);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!orgId || !user) throw new Error('Missing context');
      const notes = justification.trim() || null;

      if (hasDisaggregations) {
        const rows: any[] = [];
        // Individual disaggregated rows
        categories.forEach(cat => {
          (cat.values || []).forEach(val => {
            const cellValue = Number(disaggValues[cat.id]?.[val] || 0);
            rows.push({
              indicator_id: indicatorId,
              organization_id: orgId,
              period_start: periodStart,
              period_end: periodEnd,
              actual_value: cellValue,
              disaggregation_category_id: cat.id,
              disaggregation_value: val,
              notes: null,
              created_by: user.id,
            });
          });
        });
        // Total row
        rows.push({
          indicator_id: indicatorId,
          organization_id: orgId,
          period_start: periodStart,
          period_end: periodEnd,
          actual_value: total,
          disaggregation_category_id: null,
          disaggregation_value: null,
          notes,
          created_by: user.id,
        });
        const { error } = await supabase.from('indicator_values').insert(rows);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('indicator_values').insert({
          indicator_id: indicatorId,
          organization_id: orgId,
          period_start: periodStart,
          period_end: periodEnd,
          actual_value: Number(singleValue) || 0,
          disaggregation_category_id: null,
          disaggregation_value: null,
          notes,
          created_by: user.id,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success('Value recorded');
      queryClient.invalidateQueries({ queryKey: ['indicator-values'] });
      queryClient.invalidateQueries({ queryKey: ['indicator-prev-value'] });
      onSuccess();
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      {/* Period Selector */}
      <div className="flex gap-3">
        <div className="flex-1">
          <Label>Period Start</Label>
          <Input type="date" value={periodStart} onChange={e => setPeriodStart(e.target.value)} />
        </div>
        <div className="flex-1">
          <Label>Period End</Label>
          <Input type="date" value={periodEnd} onChange={e => setPeriodEnd(e.target.value)} />
        </div>
      </div>

      {/* Value Entry */}
      {!hasDisaggregations ? (
        <div>
          <Label>Value</Label>
          <Input
            type="number"
            value={singleValue}
            onChange={e => setSingleValue(e.target.value)}
            onBlur={() => validate(Number(singleValue) || 0)}
            placeholder="Enter value"
          />
        </div>
      ) : (
        <div className="space-y-4">
          {categories.map(cat => (
            <div key={cat.id} className="space-y-2">
              <h4 className="font-medium text-sm text-foreground">{cat.name}</h4>
              <div className="grid grid-cols-2 gap-2">
                {(cat.values || []).map(val => (
                  <div key={val} className="flex items-center gap-2">
                    <Label className="w-24 text-xs text-muted-foreground shrink-0">{val}</Label>
                    <Input
                      type="number"
                      className="h-8"
                      value={disaggValues[cat.id]?.[val] || ''}
                      onChange={e => {
                        setDisaggValues(prev => ({
                          ...prev,
                          [cat.id]: { ...prev[cat.id], [val]: e.target.value },
                        }));
                      }}
                      onBlur={() => {
                        let sum = 0;
                        Object.values(disaggValues).forEach(cv => Object.values(cv).forEach(v => { sum += Number(v) || 0; }));
                        validate(sum);
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
          <div className="text-sm font-medium bg-muted/50 rounded-lg px-3 py-2">
            Total: <span className="font-bold">{total}</span>
          </div>
        </div>
      )}

      {/* Warnings */}
      {warnings.map((w, i) => (
        <Alert key={i} className="border-warning/50 bg-warning/10">
          {w.includes('zero') ? <Info className="h-4 w-4 text-info" /> : <AlertTriangle className="h-4 w-4 text-warning" />}
          <AlertDescription className="text-sm">{w}</AlertDescription>
        </Alert>
      ))}

      {/* Justification */}
      {requiresJustification && (
        <div>
          <Label>Justification / Comment *</Label>
          <Textarea
            value={justification}
            onChange={e => setJustification(e.target.value)}
            placeholder="Explain why this value is outside expected parameters"
            rows={3}
          />
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={onCancel} size="sm"><X className="h-4 w-4 mr-1" /> Cancel</Button>
        <Button onClick={() => saveMutation.mutate()} disabled={!canSave || saveMutation.isPending} size="sm">
          <Save className="h-4 w-4 mr-1" /> Save Value
        </Button>
      </div>
    </div>
  );
}

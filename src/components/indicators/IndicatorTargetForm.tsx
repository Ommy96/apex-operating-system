import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { useCreateIndicatorTarget, Indicator, IndicatorTarget } from '@/hooks/useIndicators';

const targetSchema = z.object({
  period_type: z.enum(['monthly', 'quarterly', 'yearly']),
  period_year: z.number().min(2020).max(2100),
  period_value: z.number().min(1).max(12),
  target_value: z.number().min(0),
  minimum_value: z.number().min(0).optional().nullable(),
  stretch_value: z.number().min(0).optional().nullable(),
  notes: z.string().optional(),
});

type TargetFormValues = z.infer<typeof targetSchema>;

interface IndicatorTargetFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  indicator: Indicator;
  existingTarget?: IndicatorTarget;
}

const months = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const quarters = ['Q1 (Jan-Mar)', 'Q2 (Apr-Jun)', 'Q3 (Jul-Sep)', 'Q4 (Oct-Dec)'];

export function IndicatorTargetForm({ 
  open, 
  onOpenChange, 
  indicator,
  existingTarget 
}: IndicatorTargetFormProps) {
  const createTarget = useCreateIndicatorTarget();
  const currentYear = new Date().getFullYear();
  
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TargetFormValues>({
    resolver: zodResolver(targetSchema),
    defaultValues: existingTarget ? {
      period_type: existingTarget.period_type,
      period_year: existingTarget.period_year,
      period_value: existingTarget.period_value,
      target_value: existingTarget.target_value,
      minimum_value: existingTarget.minimum_value,
      stretch_value: existingTarget.stretch_value,
      notes: existingTarget.notes || '',
    } : {
      period_type: indicator.aggregation_period === 'yearly' ? 'yearly' : 
                   indicator.aggregation_period === 'quarterly' ? 'quarterly' : 'monthly',
      period_year: currentYear,
      period_value: 1,
      target_value: 0,
    },
  });

  const periodType = watch('period_type');

  const onSubmit = async (data: TargetFormValues) => {
    try {
      await createTarget.mutateAsync({
        indicator_id: indicator.id,
        ...data,
      });
      reset();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving target:', error);
    }
  };

  const getPeriodOptions = () => {
    switch (periodType) {
      case 'monthly':
        return months.map((month, i) => ({ value: i + 1, label: month }));
      case 'quarterly':
        return quarters.map((q, i) => ({ value: i + 1, label: q }));
      case 'yearly':
        return [{ value: 1, label: 'Full Year' }];
      default:
        return [];
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Set Target for {indicator.name}</DialogTitle>
          <DialogDescription>
            Define target values for a specific period. Set minimum and stretch goals for comprehensive tracking.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Period Selection */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label>Period Type</Label>
              <Select
                value={periodType}
                onValueChange={(value: any) => {
                  setValue('period_type', value);
                  setValue('period_value', 1);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Year</Label>
              <Select
                value={String(watch('period_year'))}
                onValueChange={(value) => setValue('period_year', parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[currentYear - 1, currentYear, currentYear + 1, currentYear + 2].map((year) => (
                    <SelectItem key={year} value={String(year)}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Period</Label>
              <Select
                value={String(watch('period_value'))}
                onValueChange={(value) => setValue('period_value', parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {getPeriodOptions().map((option) => (
                    <SelectItem key={option.value} value={String(option.value)}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Target Values */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label htmlFor="minimum_value">
                Minimum
                <span className="text-xs text-muted-foreground ml-1">(Red)</span>
              </Label>
              <Input
                id="minimum_value"
                type="number"
                step="any"
                {...register('minimum_value', { valueAsNumber: true })}
                placeholder="0"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="target_value">
                Target *
                <span className="text-xs text-muted-foreground ml-1">(Goal)</span>
              </Label>
              <Input
                id="target_value"
                type="number"
                step="any"
                {...register('target_value', { valueAsNumber: true })}
                placeholder="100"
              />
              {errors.target_value && (
                <p className="text-xs text-destructive">{errors.target_value.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="stretch_value">
                Stretch
                <span className="text-xs text-muted-foreground ml-1">(Exceed)</span>
              </Label>
              <Input
                id="stretch_value"
                type="number"
                step="any"
                {...register('stretch_value', { valueAsNumber: true })}
                placeholder="120"
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              {...register('notes')}
              placeholder="Additional context or reasoning for this target..."
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Set Target'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

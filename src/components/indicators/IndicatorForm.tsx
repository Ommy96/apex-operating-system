import { useState } from 'react';
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
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useCreateIndicator, useUpdateIndicator, Indicator, IndicatorCategory } from '@/hooks/useIndicators';
import { FormulaBuilder } from './FormulaBuilder';

const indicatorSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  code: z.string().min(1, 'Code is required').max(20, 'Code must be 20 characters or less'),
  description: z.string().optional(),
  unit: z.string(),
  formula_type: z.enum(['count', 'sum', 'average', 'ratio', 'percentage', 'custom']),
  aggregation_period: z.enum(['daily', 'weekly', 'monthly', 'quarterly', 'yearly']),
  decimal_places: z.number().min(0).max(4),
  show_trend: z.boolean(),
  trend_direction: z.enum(['up_is_good', 'down_is_good', 'neutral']),
  category_id: z.string().optional().nullable(),
});

type IndicatorFormValues = z.infer<typeof indicatorSchema>;

interface IndicatorFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  indicator?: Indicator;
  categories: IndicatorCategory[];
}

export function IndicatorForm({ open, onOpenChange, indicator, categories }: IndicatorFormProps) {
  const createIndicator = useCreateIndicator();
  const updateIndicator = useUpdateIndicator();
  const [formulaConfig, setFormulaConfig] = useState<Record<string, any>>(indicator?.formula_config || {});
  
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<IndicatorFormValues>({
    resolver: zodResolver(indicatorSchema),
    defaultValues: indicator ? {
      name: indicator.name,
      code: indicator.code,
      description: indicator.description || '',
      unit: indicator.unit,
      formula_type: indicator.formula_type,
      aggregation_period: indicator.aggregation_period,
      decimal_places: indicator.decimal_places,
      show_trend: indicator.show_trend,
      trend_direction: indicator.trend_direction,
      category_id: indicator.category_id,
    } : {
      unit: 'count',
      formula_type: 'count',
      aggregation_period: 'monthly',
      decimal_places: 0,
      show_trend: true,
      trend_direction: 'up_is_good',
    },
  });

  const formulaType = watch('formula_type');

  const onSubmit = async (data: IndicatorFormValues) => {
    try {
      const payload = {
        ...data,
        formula_config: formulaConfig,
      };

      if (indicator) {
        await updateIndicator.mutateAsync({ id: indicator.id, ...payload });
      } else {
        await createIndicator.mutateAsync(payload);
      }
      
      reset();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving indicator:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{indicator ? 'Edit Indicator' : 'Create Indicator'}</DialogTitle>
          <DialogDescription>
            Define an indicator to track key metrics for your organization.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="formula">Formula</TabsTrigger>
              <TabsTrigger value="display">Display</TabsTrigger>
            </TabsList>

            {/* Basic Info Tab */}
            <TabsContent value="basic" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    {...register('name')}
                    placeholder="e.g., Total Active Beneficiaries"
                  />
                  {errors.name && (
                    <p className="text-xs text-destructive">{errors.name.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="code">Code *</Label>
                  <Input
                    id="code"
                    {...register('code')}
                    placeholder="e.g., BEN-001"
                    className="uppercase"
                  />
                  {errors.code && (
                    <p className="text-xs text-destructive">{errors.code.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  {...register('description')}
                  placeholder="What does this indicator measure?"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category_id">Category</Label>
                <Select
                  value={watch('category_id') || ''}
                  onValueChange={(value) => setValue('category_id', value || null)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No Category</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="unit">Unit</Label>
                  <Select
                    value={watch('unit')}
                    onValueChange={(value) => setValue('unit', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="count">Count</SelectItem>
                      <SelectItem value="percentage">Percentage</SelectItem>
                      <SelectItem value="currency">Currency (KES)</SelectItem>
                      <SelectItem value="ratio">Ratio</SelectItem>
                      <SelectItem value="days">Days</SelectItem>
                      <SelectItem value="hours">Hours</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="aggregation_period">Aggregation Period</Label>
                  <Select
                    value={watch('aggregation_period')}
                    onValueChange={(value: any) => setValue('aggregation_period', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                      <SelectItem value="yearly">Yearly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>

            {/* Formula Tab */}
            <TabsContent value="formula" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="formula_type">Formula Type *</Label>
                <Select
                  value={watch('formula_type')}
                  onValueChange={(value: any) => {
                    setValue('formula_type', value);
                    setFormulaConfig({});
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="count">Count - Count matching records</SelectItem>
                    <SelectItem value="sum">Sum - Sum a numeric field</SelectItem>
                    <SelectItem value="average">Average - Average of a numeric field</SelectItem>
                    <SelectItem value="ratio">Ratio - Divide two counts</SelectItem>
                    <SelectItem value="percentage">Percentage - Ratio × 100</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Formula Configuration</CardTitle>
                  <CardDescription className="text-xs">
                    Configure the data source and filters for this indicator
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <FormulaBuilder
                    formulaType={formulaType}
                    config={formulaConfig}
                    onChange={setFormulaConfig}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            {/* Display Tab */}
            <TabsContent value="display" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="decimal_places">Decimal Places</Label>
                <Input
                  id="decimal_places"
                  type="number"
                  min={0}
                  max={4}
                  {...register('decimal_places', { valueAsNumber: true })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Show Trend</Label>
                  <p className="text-xs text-muted-foreground">
                    Display comparison with previous period
                  </p>
                </div>
                <Switch
                  checked={watch('show_trend')}
                  onCheckedChange={(checked) => setValue('show_trend', checked)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="trend_direction">Trend Interpretation</Label>
                <Select
                  value={watch('trend_direction')}
                  onValueChange={(value: any) => setValue('trend_direction', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="up_is_good">↑ Increase is good</SelectItem>
                    <SelectItem value="down_is_good">↓ Decrease is good</SelectItem>
                    <SelectItem value="neutral">— Neutral (no judgment)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Determines how the trend is displayed (green vs red)
                </p>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : indicator ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

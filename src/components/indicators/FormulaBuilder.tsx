import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';

// Available tables and their fields
const DATA_SOURCES = {
  children: {
    label: 'Children (Beneficiaries)',
    fields: ['id', 'status', 'gender', 'academic_level', 'residence', 'parental_status', 'grade'],
    dateFields: ['enrollment_date', 'date_of_birth', 'created_at'],
    filterFields: [
      { key: 'status', label: 'Status', options: ['active', 'inactive', 'graduated', 'transferred'] },
      { key: 'gender', label: 'Gender', options: ['male', 'female', 'other'] },
      { key: 'academic_level', label: 'Academic Level', options: ['ecde', 'primary', 'secondary', 'tertiary'] },
      { key: 'residence', label: 'Residence', options: ['boarding', 'day'] },
    ],
  },
  alumni: {
    label: 'Alumni',
    fields: ['id', 'gender', 'current_status', 'graduation_year', 'exit_year'],
    dateFields: ['created_at'],
    filterFields: [
      { key: 'current_status', label: 'Current Status', options: ['employed', 'self_employed', 'studying', 'unemployed'] },
      { key: 'gender', label: 'Gender', options: ['male', 'female', 'other'] },
    ],
  },
  feeding_program: {
    label: 'Feeding Program',
    fields: ['id', 'gender', 'type', 'academic_level', 'education_sponsorship'],
    dateFields: ['created_at'],
    filterFields: [
      { key: 'gender', label: 'Gender', options: ['male', 'female', 'other'] },
      { key: 'education_sponsorship', label: 'Has Sponsorship', options: ['true', 'false'] },
    ],
  },
  self_empowerment: {
    label: 'Self-Empowerment Loans',
    fields: ['id', 'gender', 'amount_requested', 'amount_approved', 'amount_status', 'is_active'],
    dateFields: ['start_date', 'created_at'],
    numericFields: ['amount_requested', 'amount_approved'],
    filterFields: [
      { key: 'is_active', label: 'Active', options: ['true', 'false'] },
      { key: 'amount_status', label: 'Status', options: ['pending', 'approved', 'disbursed', 'rejected'] },
      { key: 'gender', label: 'Gender', options: ['male', 'female', 'other'] },
    ],
  },
  home_visit_reports: {
    label: 'Home Visit Reports',
    fields: ['id', 'location', 'staff'],
    dateFields: ['visit_date', 'created_at'],
    filterFields: [
      { key: 'location', label: 'Location', options: ['coastal', 'nairobi'] },
    ],
  },
  school_visit_reports: {
    label: 'School Visit Reports',
    fields: ['id', 'location', 'staff', 'school'],
    dateFields: ['visit_date', 'created_at'],
    filterFields: [
      { key: 'location', label: 'Location', options: ['coastal', 'nairobi'] },
    ],
  },
};

interface FormulaBuilderProps {
  formulaType: 'count' | 'sum' | 'average' | 'ratio' | 'percentage' | 'custom';
  config: Record<string, any>;
  onChange: (config: Record<string, any>) => void;
}

export function FormulaBuilder({ formulaType, config, onChange }: FormulaBuilderProps) {
  const updateConfig = (key: string, value: any) => {
    onChange({ ...config, [key]: value });
  };

  const updateFilter = (filterKey: string, value: string) => {
    const filters = { ...(config.filters || {}), [filterKey]: value };
    if (!value) delete filters[filterKey];
    onChange({ ...config, filters });
  };

  const updateNumerator = (key: string, value: any) => {
    onChange({
      ...config,
      numerator: { ...(config.numerator || {}), [key]: value },
    });
  };

  const updateDenominator = (key: string, value: any) => {
    onChange({
      ...config,
      denominator: { ...(config.denominator || {}), [key]: value },
    });
  };

  const selectedTable = config.table as keyof typeof DATA_SOURCES;
  const tableConfig = selectedTable ? DATA_SOURCES[selectedTable] : null;

  if (formulaType === 'ratio' || formulaType === 'percentage') {
    return (
      <div className="space-y-6">
        <p className="text-sm text-muted-foreground">
          {formulaType === 'percentage' 
            ? 'Calculate a percentage by dividing numerator by denominator × 100'
            : 'Calculate a ratio by dividing numerator by denominator'
          }
        </p>
        
        {/* Numerator */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Badge variant="outline">Numerator</Badge>
              Top value
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <DataSourceSelector
              value={config.numerator?.table}
              onChange={(value) => updateNumerator('table', value)}
              filters={config.numerator?.filters || {}}
              onFilterChange={(key, value) => {
                const filters = { ...(config.numerator?.filters || {}), [key]: value };
                if (!value) delete filters[key];
                updateNumerator('filters', filters);
              }}
            />
          </CardContent>
        </Card>

        <div className="flex items-center justify-center">
          <Separator className="flex-1" />
          <span className="px-4 text-lg font-bold text-muted-foreground">÷</span>
          <Separator className="flex-1" />
        </div>

        {/* Denominator */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Badge variant="outline">Denominator</Badge>
              Bottom value
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <DataSourceSelector
              value={config.denominator?.table}
              onChange={(value) => updateDenominator('table', value)}
              filters={config.denominator?.filters || {}}
              onFilterChange={(key, value) => {
                const filters = { ...(config.denominator?.filters || {}), [key]: value };
                if (!value) delete filters[key];
                updateDenominator('filters', filters);
              }}
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Data Source */}
      <div className="space-y-2">
        <Label>Data Source</Label>
        <Select value={config.table || ''} onValueChange={(value) => updateConfig('table', value)}>
          <SelectTrigger>
            <SelectValue placeholder="Select a data table" />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(DATA_SOURCES).map(([key, source]) => (
              <SelectItem key={key} value={key}>
                {source.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Field for Sum/Average */}
      {(formulaType === 'sum' || formulaType === 'average') && tableConfig && (
        <div className="space-y-2">
          <Label>Numeric Field</Label>
          <Select value={config.field || ''} onValueChange={(value) => updateConfig('field', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select field to aggregate" />
            </SelectTrigger>
            <SelectContent>
              {((tableConfig as any).numericFields || []).map((field: string) => (
                <SelectItem key={field} value={field}>
                  {field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Date Field */}
      {tableConfig && tableConfig.dateFields.length > 0 && (
        <div className="space-y-2">
          <Label>Date Field (for period filtering)</Label>
          <Select value={config.date_field || ''} onValueChange={(value) => updateConfig('date_field', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select date field (optional)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">No date filter</SelectItem>
              {tableConfig.dateFields.map((field) => (
                <SelectItem key={field} value={field}>
                  {field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Date Range Option */}
      {config.date_field && (
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Filter by Current Period</Label>
            <p className="text-xs text-muted-foreground">
              Only count records within the aggregation period
            </p>
          </div>
          <Switch
            checked={config.date_range === 'current_period'}
            onCheckedChange={(checked) => updateConfig('date_range', checked ? 'current_period' : undefined)}
          />
        </div>
      )}

      {/* Filters */}
      {tableConfig && tableConfig.filterFields.length > 0 && (
        <div className="space-y-3">
          <Label>Filters</Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {tableConfig.filterFields.map((filter) => (
              <div key={filter.key} className="space-y-1">
                <Label className="text-xs">{filter.label}</Label>
                <Select
                  value={config.filters?.[filter.key] || ''}
                  onValueChange={(value) => updateFilter(filter.key, value)}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder={`Any ${filter.label.toLowerCase()}`} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Any</SelectItem>
                    {filter.options.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Helper component for ratio/percentage numerator/denominator
function DataSourceSelector({
  value,
  onChange,
  filters,
  onFilterChange,
}: {
  value?: string;
  onChange: (value: string) => void;
  filters: Record<string, any>;
  onFilterChange: (key: string, value: string) => void;
}) {
  const selectedTable = value as keyof typeof DATA_SOURCES;
  const tableConfig = selectedTable ? DATA_SOURCES[selectedTable] : null;

  return (
    <div className="space-y-3">
      <Select value={value || ''} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder="Select a data table" />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(DATA_SOURCES).map(([key, source]) => (
            <SelectItem key={key} value={key}>
              {source.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {tableConfig && tableConfig.filterFields.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {tableConfig.filterFields.map((filter) => (
            <Select
              key={filter.key}
              value={filters[filter.key] || ''}
              onValueChange={(val) => onFilterChange(filter.key, val)}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder={filter.label} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Any</SelectItem>
                {filter.options.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ))}
        </div>
      )}
    </div>
  );
}

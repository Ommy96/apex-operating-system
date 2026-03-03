import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ACADEMIC_LEVEL_GRADE_MAP, GRADE_PROGRESSION_MAP } from '@/lib/academicGradeMapping';
import { GraduationCap, ArrowRight } from 'lucide-react';

export function AcademicSettings() {
  return (
    <div className="space-y-6">
      {/* Auto Progression Toggle */}
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-primary" />
            Automatic Grade Progression
          </CardTitle>
          <CardDescription>
            Configure how students are automatically advanced to the next grade each academic year
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label>Enable Auto-Progression</Label>
              <p className="text-sm text-muted-foreground">Students automatically move to the next grade on January 1st</p>
            </div>
            <Switch defaultChecked />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Skip Inactive Students</Label>
              <p className="text-sm text-muted-foreground">Don't progress students with Inactive or Dropped status</p>
            </div>
            <Switch defaultChecked />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Auto-Graduate After Tertiary</Label>
              <p className="text-sm text-muted-foreground">Automatically set status to "Graduated" after completing final year</p>
            </div>
            <Switch defaultChecked />
          </div>

          <div className="space-y-2">
            <Label>Tertiary Duration</Label>
            <Select defaultValue="4">
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3">3 Years</SelectItem>
                <SelectItem value="4">4 Years</SelectItem>
                <SelectItem value="5">5 Years</SelectItem>
                <SelectItem value="6">6 Years</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Number of years for tertiary education before graduation</p>
          </div>
        </CardContent>
      </Card>

      {/* Grade Mapping Reference */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Education Level → Grade Mapping</CardTitle>
          <CardDescription>Current academic structure used for cascading dropdowns and progression</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Object.entries(ACADEMIC_LEVEL_GRADE_MAP).map(([level, config]) => (
              <div key={level} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                <Badge variant="outline" className="mt-0.5 whitespace-nowrap font-medium">{level}</Badge>
                <div className="flex flex-wrap gap-1">
                  {config.isFreeText ? (
                    <span className="text-sm text-muted-foreground italic">Free-text input</span>
                  ) : (
                    config.grades.map((grade, i) => (
                      <div key={grade} className="flex items-center gap-1">
                        {i > 0 && <ArrowRight className="h-3 w-3 text-muted-foreground/40" />}
                        <Badge variant="secondary" className="text-xs">{grade}</Badge>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

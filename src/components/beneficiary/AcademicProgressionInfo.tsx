import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, GraduationCap, TrendingUp, Clock, CheckCircle2 } from 'lucide-react';
import { getNextGradeInfo, getYearsToGraduation, getAllGradesInOrder, getLevelForGrade } from '@/lib/academicGradeMapping';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface AcademicProgressionInfoProps {
  beneficiaryId: string;
  currentGrade: string | null;
  currentLevel: string | null;
  status: string;
}

export function AcademicProgressionInfo({ beneficiaryId, currentGrade, currentLevel, status }: AcademicProgressionInfoProps) {
  const nextInfo = getNextGradeInfo(currentGrade);
  const yearsToGrad = getYearsToGraduation(currentGrade);
  const isGraduated = status === 'graduated' || nextInfo === 'graduated';
  const allGrades = getAllGradesInOrder();
  const currentIndex = currentGrade ? allGrades.indexOf(currentGrade) : -1;

  const { data: history = [] } = useQuery({
    queryKey: ['progression-history', beneficiaryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('beneficiary_progression_history')
        .select('*')
        .eq('beneficiary_id', beneficiaryId)
        .order('academic_year', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!beneficiaryId,
  });

  return (
    <div className="space-y-4">
      {/* Progression Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Current Grade */}
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-primary/20">
                <GraduationCap className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Current Grade</p>
                <p className="text-lg font-bold text-primary">{currentGrade || 'N/A'}</p>
                {currentLevel && <p className="text-xs text-muted-foreground">{currentLevel}</p>}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Next Grade Preview */}
        <Card className="border-info/20 bg-gradient-to-br from-info/5 to-transparent">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-info/20">
                <TrendingUp className="h-5 w-5 text-info" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Next Grade</p>
                {isGraduated ? (
                  <p className="text-lg font-bold text-success">Graduated</p>
                ) : nextInfo && typeof nextInfo !== 'string' ? (
                  <>
                    <p className="text-lg font-bold text-info">{nextInfo.nextGrade}</p>
                    <p className="text-xs text-muted-foreground">{nextInfo.nextLevel}</p>
                  </>
                ) : (
                  <p className="text-lg font-bold text-muted-foreground">N/A</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Graduation Countdown */}
        <Card className="border-success/20 bg-gradient-to-br from-success/5 to-transparent">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-success/20">
                {isGraduated ? (
                  <CheckCircle2 className="h-5 w-5 text-success" />
                ) : (
                  <Clock className="h-5 w-5 text-success" />
                )}
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  {isGraduated ? 'Status' : 'Years to Graduation'}
                </p>
                <p className="text-lg font-bold text-success">
                  {isGraduated ? 'Completed' : yearsToGrad !== null ? `${yearsToGrad} year${yearsToGrad !== 1 ? 's' : ''}` : 'N/A'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Progression Timeline */}
      {currentIndex >= 0 && (
        <Card className="border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-primary">
              <TrendingUp className="h-4 w-4" />
              Academic Progression Timeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-1">
              {allGrades.slice(Math.max(0, currentIndex - 2), currentIndex + 5).map((grade, i) => {
                const gradeIndex = allGrades.indexOf(grade);
                const isPast = gradeIndex < currentIndex;
                const isCurrent = gradeIndex === currentIndex;
                const isFuture = gradeIndex > currentIndex;

                return (
                  <div key={grade} className="flex items-center gap-1">
                    {i > 0 && <ArrowRight className="h-3 w-3 text-muted-foreground/50 flex-shrink-0" />}
                    <Badge
                      variant={isCurrent ? 'default' : 'outline'}
                      className={`text-xs whitespace-nowrap ${
                        isCurrent ? 'bg-primary text-primary-foreground' :
                        isPast ? 'bg-success/10 text-success border-success/30' :
                        'text-muted-foreground border-border'
                      }`}
                    >
                      {grade}
                    </Badge>
                  </div>
                );
              })}
              {currentIndex + 5 < allGrades.length && (
                <span className="text-xs text-muted-foreground">... → Graduated</span>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Progression History */}
      {history.length > 0 && (
        <Card className="border-muted">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Progression History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {history.map((entry: any) => (
                <div key={entry.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/30 text-sm">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">{entry.academic_year}</Badge>
                    <span className="text-muted-foreground">{entry.previous_grade || '—'}</span>
                    <ArrowRight className="h-3 w-3 text-muted-foreground" />
                    <span className="font-medium">{entry.new_grade}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {entry.is_repeating && <Badge variant="outline" className="text-xs text-warning border-warning/30">Repeating</Badge>}
                    <Badge variant="outline" className="text-xs capitalize">{entry.progression_type}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

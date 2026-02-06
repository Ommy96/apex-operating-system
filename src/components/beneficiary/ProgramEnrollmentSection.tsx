import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Trash2, FolderKanban, ChevronRight, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';

interface ProgramEnrollment {
  id?: string;
  program_id: string;
  program_name?: string;
  project_id?: string;
  project_name?: string;
  activity_id?: string;
  activity_name?: string;
  enrolled_date: string;
  exit_date?: string;
  status: string;
  notes?: string;
}

interface ProgramEnrollmentSectionProps {
  enrollments: ProgramEnrollment[];
  onChange: (enrollments: ProgramEnrollment[]) => void;
  beneficiaryType?: 'student' | 'adult' | 'group';
}

export function ProgramEnrollmentSection({ 
  enrollments, 
  onChange,
  beneficiaryType = 'student'
}: ProgramEnrollmentSectionProps) {
  const { currentOrganization } = useOrganization();

  // Fetch programs
  const { data: programs = [] } = useQuery({
    queryKey: ['programs-for-enrollment', currentOrganization?.organization_id],
    queryFn: async () => {
      if (!currentOrganization?.organization_id) return [];
      const { data, error } = await supabase
        .from('programs')
        .select('id, name, target_population')
        .eq('organization_id', currentOrganization.organization_id)
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentOrganization?.organization_id,
  });

  // Fetch projects for all selected programs
  const programIds = enrollments.map(e => e.program_id).filter(Boolean);
  const { data: allProjects = [] } = useQuery({
    queryKey: ['projects-for-enrollment', currentOrganization?.organization_id, programIds],
    queryFn: async () => {
      if (!currentOrganization?.organization_id || programIds.length === 0) return [];
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, program_id')
        .eq('organization_id', currentOrganization.organization_id)
        .eq('status', 'active')
        .order('name');
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentOrganization?.organization_id && programIds.length > 0,
  });

  // Filter programs based on beneficiary type
  const filteredPrograms = programs.filter(p => {
    const targetPop = p.target_population as string[] | null;
    if (!targetPop || targetPop.length === 0) return true; // No filter = all types
    return targetPop.includes(beneficiaryType) || targetPop.includes('all');
  });

  const addEnrollment = () => {
    onChange([
      ...enrollments,
      {
        program_id: '',
        enrolled_date: new Date().toISOString().split('T')[0],
        status: 'active',
        notes: '',
      },
    ]);
  };

  const removeEnrollment = (index: number) => {
    const updated = enrollments.filter((_, i) => i !== index);
    onChange(updated);
  };

  const updateEnrollment = (index: number, field: keyof ProgramEnrollment, value: string) => {
    const updated = [...enrollments];
    updated[index] = { ...updated[index], [field]: value };

    // When program changes, clear project and activity
    if (field === 'program_id') {
      updated[index].project_id = undefined;
      updated[index].activity_id = undefined;
      const program = programs.find(p => p.id === value);
      updated[index].program_name = program?.name || '';
    }

    // When project changes, clear activity
    if (field === 'project_id') {
      updated[index].activity_id = undefined;
      const project = allProjects.find(p => p.id === value);
      updated[index].project_name = project?.name || '';
    }

    onChange(updated);
  };

  const getProjectsForProgram = (programId: string) => {
    return allProjects.filter(p => p.program_id === programId);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FolderKanban className="h-5 w-5" />
              Program Enrollment
            </CardTitle>
            <CardDescription>
              Link this beneficiary to programs and projects
            </CardDescription>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={addEnrollment}>
            <Plus className="h-4 w-4 mr-2" />
            Add Program
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {enrollments.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FolderKanban className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No program enrollments yet</p>
            <p className="text-sm">Click "Add Program" to enroll this beneficiary</p>
          </div>
        ) : (
          enrollments.map((enrollment, index) => {
            const programProjects = getProjectsForProgram(enrollment.program_id);
            
            return (
              <div key={index} className="border rounded-lg p-4 space-y-4 relative">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => removeEnrollment(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Program Selection */}
                  <div className="space-y-2">
                    <Label>Program *</Label>
                    <Select
                      value={enrollment.program_id}
                      onValueChange={(value) => updateEnrollment(index, 'program_id', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select program" />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredPrograms.map((program) => (
                          <SelectItem key={program.id} value={program.id}>
                            {program.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Project Selection (filtered by program) */}
                  <div className="space-y-2">
                    <Label>Project</Label>
                    <Select
                      value={enrollment.project_id || ''}
                      onValueChange={(value) => updateEnrollment(index, 'project_id', value)}
                      disabled={!enrollment.program_id || programProjects.length === 0}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={
                          !enrollment.program_id 
                            ? "Select program first" 
                            : programProjects.length === 0 
                              ? "No projects available"
                              : "Select project"
                        } />
                      </SelectTrigger>
                      <SelectContent>
                        {programProjects.map((project) => (
                          <SelectItem key={project.id} value={project.id}>
                            {project.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Status */}
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select
                      value={enrollment.status}
                      onValueChange={(value) => updateEnrollment(index, 'status', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="dropped">Dropped</SelectItem>
                        <SelectItem value="transferred">Transferred</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Enrollment Date */}
                  <div className="space-y-2">
                    <Label>Enrollment Date</Label>
                    <Input
                      type="date"
                      value={enrollment.enrolled_date}
                      onChange={(e) => updateEnrollment(index, 'enrolled_date', e.target.value)}
                    />
                  </div>

                  {/* Exit Date (optional) */}
                  <div className="space-y-2">
                    <Label>Exit Date</Label>
                    <Input
                      type="date"
                      value={enrollment.exit_date || ''}
                      onChange={(e) => updateEnrollment(index, 'exit_date', e.target.value)}
                    />
                  </div>
                </div>

                {/* Notes */}
                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea
                    placeholder="Optional notes about this enrollment..."
                    value={enrollment.notes || ''}
                    onChange={(e) => updateEnrollment(index, 'notes', e.target.value)}
                    rows={2}
                  />
                </div>

                {/* Visual indicator of selection path */}
                {(enrollment.program_name || enrollment.project_name) && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground pt-2 border-t">
                    <Badge variant="outline">{enrollment.status}</Badge>
                    <span className="flex items-center gap-1">
                      <span>{enrollment.program_name || programs.find(p => p.id === enrollment.program_id)?.name}</span>
                      {enrollment.project_id && (
                        <>
                          <ChevronRight className="h-4 w-4" />
                          <span>{enrollment.project_name || allProjects.find(p => p.id === enrollment.project_id)?.name}</span>
                        </>
                      )}
                    </span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}

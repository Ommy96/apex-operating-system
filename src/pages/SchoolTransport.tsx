import { useState, useEffect } from 'react';
import { Bus, Plus, Search, Download, X, Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { downloadExcel } from '@/lib/downloadUtils';

interface Child {
  id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  gender: string;
  photo_url: string;
  institution_name: string;
  academic_level: string;
  grade: string;
  residence: string;
}

interface SelectedStudent extends Child {
  receives_transport: boolean;
  receives_shopping: boolean;
}

export default function SchoolTransport() {
  const { isAdmin, isManagement } = useAuth();
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<SelectedStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetchChildren();
    fetchTransportRecords();
  }, []);

  const fetchChildren = async () => {
    try {
      const { data, error } = await supabase
        .from('children')
        .select('*')
        .not('academic_level', 'is', null)
        .order('first_name');

      if (error) throw error;
      setChildren(data || []);
    } catch (error) {
      console.error('Error fetching children:', error);
      toast({
        title: "Error",
        description: "Failed to load children",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchTransportRecords = async () => {
    try {
      const { data, error } = await supabase
        .from('transport_records')
        .select('*, children(*)');

      if (error) throw error;

      // Map records to selected students with child data, filtering out any with missing children
      const students: SelectedStudent[] = (data || [])
        .filter(record => record.children) // Filter out records where child was deleted
        .map(record => ({
          id: record.children.id,
          first_name: record.children.first_name,
          last_name: record.children.last_name,
          date_of_birth: record.children.date_of_birth,
          gender: record.children.gender,
          photo_url: record.children.photo_url,
          institution_name: record.children.institution_name,
          academic_level: record.children.academic_level,
          grade: record.children.grade,
          residence: record.children.residence,
          receives_transport: record.receives_transport,
          receives_shopping: record.receives_shopping,
        }));
      
      setSelectedStudents(students);
    } catch (error) {
      console.error('Error fetching transport records:', error);
    }
  };

  const addStudent = (child: Child) => {
    // Check if student already added
    if (selectedStudents.some(s => s.id === child.id)) {
      toast({
        title: "Already added",
        description: "This student is already in the list",
        variant: "destructive",
      });
      return;
    }

    const newStudent: SelectedStudent = {
      ...child,
      receives_transport: true,
      receives_shopping: true,
    };
    
    setSelectedStudents([...selectedStudents, newStudent]);
    setOpen(false);
    setSearchTerm('');
  };

  const removeStudent = (studentId: string) => {
    setSelectedStudents(selectedStudents.filter(s => s.id !== studentId));
  };

  const updateStudent = (studentId: string, field: 'receives_transport' | 'receives_shopping', value: boolean) => {
    setSelectedStudents(selectedStudents.map(s => 
      s.id === studentId ? { ...s, [field]: value } : s
    ));
  };

  const handleSaveRecords = async () => {
    setSaving(true);
    try {
      // Delete all existing records
      await supabase
        .from('transport_records')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

      // Insert new records
      const records = selectedStudents.map(student => ({
        child_id: student.id,
        term: 'Term 1',
        year: new Date().getFullYear(),
        receives_transport: student.receives_transport,
        receives_shopping: student.receives_shopping,
      }));

      if (records.length > 0) {
        const { error } = await supabase
          .from('transport_records')
          .insert(records);

        if (error) throw error;
      }

      toast({
        title: "Success",
        description: "Transport records saved successfully",
      });
      
      setShowSaveDialog(false);
      fetchTransportRecords();
    } catch (error) {
      console.error('Error saving transport records:', error);
      toast({
        title: "Error",
        description: "Failed to save transport records",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDownload = () => {
    const formattedData = selectedStudents.map(student => ({
      'First Name': student.first_name,
      'Last Name': student.last_name,
      'Gender': student.gender,
      'Institution': student.institution_name,
      'Academic Level': student.academic_level,
      'Grade': student.grade,
      'Residence': student.residence,
      'Receives Transport': student.receives_transport ? 'Yes' : 'No',
      'Receives Shopping': student.receives_shopping ? 'Yes' : 'No',
    }));

    downloadExcel(formattedData, `school_transport_${new Date().toISOString().split('T')[0]}`, 'School Transport');
    
    toast({
      title: "Download started",
      description: "Your transport records are being downloaded.",
    });
  };

  const getAvailableChildren = () => {
    // Filter out children already in the selected list
    const selectedIds = new Set(selectedStudents.map(s => s.id));
    return children.filter(child => !selectedIds.has(child.id));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Bus className="h-8 w-8" />
            School Transport
          </h1>
          <p className="text-muted-foreground">
            Manage students who receive school transport and shopping support
          </p>
        </div>
      {(isAdmin || isManagement) && (
          <div className="flex gap-2">
            <Button onClick={handleDownload} variant="outline" disabled={selectedStudents.length === 0}>
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
            <Button onClick={() => setShowSaveDialog(true)} className="bg-gradient-accent hover:bg-gradient-accent/90" disabled={selectedStudents.length === 0}>
              Save Records
            </Button>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Students Receiving Support</CardTitle>
            <Bus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{selectedStudents.length}</div>
            <p className="text-xs text-muted-foreground">
              Currently receiving support
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available Students</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{children.length}</div>
            <p className="text-xs text-muted-foreground">
              Total in database
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Add Student Dropdown */}
      {(isAdmin || isManagement) && (
        <Card>
          <CardHeader>
            <CardTitle>Add Students to Transport List</CardTitle>
            <CardDescription>Select students who will receive school transport and shopping support</CardDescription>
          </CardHeader>
          <CardContent>
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start">
                  <Plus className="h-4 w-4 mr-2" />
                  Select a student to add...
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0 bg-background border z-50" align="start">
                <Command>
                  <CommandInput placeholder="Search students..." value={searchTerm} onValueChange={setSearchTerm} />
                  <CommandList>
                    <CommandEmpty>No students found.</CommandEmpty>
                    <CommandGroup className="max-h-64 overflow-auto">
                      {getAvailableChildren()
                        .filter(child =>
                          searchTerm === '' ||
                          `${child.first_name} ${child.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          child.institution_name?.toLowerCase().includes(searchTerm.toLowerCase())
                        )
                        .map((child) => (
                          <CommandItem
                            key={child.id}
                            value={`${child.first_name} ${child.last_name}`}
                            onSelect={() => addStudent(child)}
                          >
                            <div className="flex flex-col">
                              <span className="font-medium">{child.first_name} {child.last_name}</span>
                              <span className="text-sm text-muted-foreground">
                                {child.institution_name} - {child.grade}
                              </span>
                            </div>
                          </CommandItem>
                        ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </CardContent>
        </Card>
      )}

      {/* Students List */}
      <Card>
        <CardHeader>
          <CardTitle>Transport Recipients List</CardTitle>
          <CardDescription>
            {selectedStudents.length === 0 
              ? 'No students added yet. Use the dropdown above to add students.'
              : `${selectedStudents.length} student${selectedStudents.length > 1 ? 's' : ''} receiving support`
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {selectedStudents.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student Name</TableHead>
                    <TableHead>School</TableHead>
                    <TableHead>Grade</TableHead>
                    <TableHead>Residence</TableHead>
                    <TableHead className="text-center">Transport</TableHead>
                    <TableHead className="text-center">Shopping</TableHead>
                    {(isAdmin || isManagement) && <TableHead className="text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedStudents.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell className="font-medium">
                        {student.first_name} {student.last_name}
                      </TableCell>
                      <TableCell>{student.institution_name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{student.grade}</Badge>
                      </TableCell>
                      <TableCell>{student.residence}</TableCell>
                      <TableCell className="text-center">
                        {(isAdmin || isManagement) ? (
                          <input
                            type="checkbox"
                            checked={student.receives_transport}
                            onChange={(e) => updateStudent(student.id, 'receives_transport', e.target.checked)}
                            className="h-4 w-4 cursor-pointer"
                          />
                        ) : (
                          <Badge variant={student.receives_transport ? "default" : "secondary"}>
                            {student.receives_transport ? 'Yes' : 'No'}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {(isAdmin || isManagement) ? (
                          <input
                            type="checkbox"
                            checked={student.receives_shopping}
                            onChange={(e) => updateStudent(student.id, 'receives_shopping', e.target.checked)}
                            className="h-4 w-4 cursor-pointer"
                          />
                        ) : (
                          <Badge variant={student.receives_shopping ? "default" : "secondary"}>
                            {student.receives_shopping ? 'Yes' : 'No'}
                          </Badge>
                        )}
                      </TableCell>
                      {(isAdmin || isManagement) && (
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeStudent(student.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No students in the transport list yet.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Save Confirmation Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Transport Records</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>Are you sure you want to save transport records for:</p>
            <ul className="mt-2 space-y-1">
              <li className="font-semibold">• {selectedStudents.length} students</li>
            </ul>
            <p className="mt-4 text-sm text-muted-foreground">
              This will replace any existing records.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveRecords} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Records
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

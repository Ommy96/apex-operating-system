import { useState, useEffect } from 'react';
import { Search, Filter, Download, Eye, GraduationCap, BookOpen, TrendingUp, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import * as XLSX from 'xlsx';
import { useAuth } from '@/hooks/useAuth';

interface AcademicRecord {
  id: string;
  title: string;
  description: string;
  outcome: string;
  activity_date: string;
  child_id: string;
  children: {
    first_name: string;
    last_name: string;
    grade: string | null;
    institution_name: string | null;
  };
}

export default function AcademicPerformanceReports() {
  const { isManagement } = useAuth();
  const [records, setRecords] = useState<AcademicRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<AcademicRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [gradeFilter, setGradeFilter] = useState('');
  const [schoolFilter, setSchoolFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    fetchAcademicRecords();
  }, []);

  useEffect(() => {
    filterRecords();
  }, [records, searchTerm, gradeFilter, schoolFilter, dateFilter]);

  const fetchAcademicRecords = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('activities')
        .select(`
          id,
          title,
          description,
          outcome,
          activity_date,
          child_id,
          children (
            first_name,
            last_name,
            grade,
            institution_name
          )
        `)
        .ilike('title', '%Academic Performance%')
        .order('activity_date', { ascending: false });

      if (error) throw error;
      setRecords(data || []);
    } catch (error) {
      console.error('Error fetching academic records:', error);
      toast({
        title: "Error",
        description: "Failed to fetch academic records",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filterRecords = () => {
    let filtered = records;

    if (searchTerm) {
      filtered = filtered.filter(record =>
        record.children.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.children.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.outcome.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (gradeFilter && gradeFilter !== 'all') {
      filtered = filtered.filter(record => record.children.grade === gradeFilter);
    }

    if (schoolFilter && schoolFilter !== 'all') {
      filtered = filtered.filter(record => record.children.institution_name === schoolFilter);
    }

    if (dateFilter) {
      const filterDate = new Date(dateFilter);
      filtered = filtered.filter(record => {
        const recordDate = new Date(record.activity_date);
        return recordDate >= filterDate;
      });
    }

    setFilteredRecords(filtered);
  };

  const downloadExcel = () => {
    const exportData = filteredRecords.map(record => ({
      'Student Name': `${record.children.first_name} ${record.children.last_name}`,
      'School': record.children.institution_name || 'Not specified',
      'Grade/Class': record.children.grade || 'Not specified',
      'Subject': record.title.replace('Academic Performance - ', ''),
      'Score/Grade': record.outcome,
      'Assessment Date': new Date(record.activity_date).toLocaleDateString(),
      'Notes': record.description?.replace(`Grade/Mark: ${record.outcome}`, '').replace('Notes: ', '').trim() || '',
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Academic Performance');

    // Auto-width columns
    const colWidths = [
      { wch: 20 }, // Student Name
      { wch: 25 }, // School
      { wch: 12 }, // Grade/Class
      { wch: 15 }, // Subject
      { wch: 12 }, // Score/Grade
      { wch: 15 }, // Assessment Date
      { wch: 30 }, // Notes
    ];
    worksheet['!cols'] = colWidths;

    XLSX.writeFile(workbook, `Academic_Performance_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
    
    toast({
      title: "Success",
      description: "Academic performance report downloaded successfully",
    });
  };

  const getUniqueGrades = () => {
    const grades = records.map(record => record.children.grade).filter(Boolean);
    return [...new Set(grades)];
  };

  const getUniqueSchools = () => {
    const schools = records.map(record => record.children.institution_name).filter(Boolean);
    return [...new Set(schools)];
  };

  const getGradeColor = (grade: string) => {
    const gradeUpper = grade.toUpperCase();
    if (gradeUpper.includes('A') || gradeUpper.includes('EXCELLENT')) return 'bg-green-100 text-green-800';
    if (gradeUpper.includes('B') || gradeUpper.includes('GOOD')) return 'bg-blue-100 text-blue-800';
    if (gradeUpper.includes('C') || gradeUpper.includes('AVERAGE')) return 'bg-yellow-100 text-yellow-800';
    if (gradeUpper.includes('D') || gradeUpper.includes('BELOW')) return 'bg-orange-100 text-orange-800';
    if (gradeUpper.includes('F') || gradeUpper.includes('FAIL')) return 'bg-red-100 text-red-800';
    return 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-gradient-secondary rounded-lg">
          <TrendingUp className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">Academic Performance Reports</h1>
          <p className="text-muted-foreground">View and analyze academic performance data</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Records</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{filteredRecords.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Students</CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {new Set(filteredRecords.map(r => r.child_id)).size}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Schools</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {new Set(filteredRecords.map(r => r.children.institution_name).filter(Boolean)).size}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Latest Assessment</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-bold text-primary">
              {filteredRecords.length > 0 
                ? new Date(filteredRecords[0].activity_date).toLocaleDateString()
                : 'No data'
              }
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Actions */}
      <Card>
        <CardHeader>
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters & Search
            </CardTitle>
          {isManagement && (
            <Button onClick={downloadExcel} className="gap-2">
              <Download className="h-4 w-4" />
              Download Excel
            </Button>
          )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search students, subjects, grades..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Grade/Class</label>
              <Select value={gradeFilter} onValueChange={setGradeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All grades" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Grades</SelectItem>
                  {getUniqueGrades().map(grade => (
                    <SelectItem key={grade} value={grade}>{grade}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">School</label>
              <Select value={schoolFilter} onValueChange={setSchoolFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All schools" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Schools</SelectItem>
                  {getUniqueSchools().map(school => (
                    <SelectItem key={school} value={school}>{school}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">From Date</label>
              <Input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Table */}
      <Card>
        <CardHeader>
          <CardTitle>Academic Performance Records</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading academic records...</div>
          ) : filteredRecords.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No academic performance records found matching your criteria.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>School</TableHead>
                    <TableHead>Grade/Class</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Score/Grade</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRecords.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="font-medium">
                        {record.children.first_name} {record.children.last_name}
                      </TableCell>
                      <TableCell>{record.children.institution_name || 'Not specified'}</TableCell>
                      <TableCell>{record.children.grade || 'Not specified'}</TableCell>
                      <TableCell>{record.title.replace('Academic Performance - ', '')}</TableCell>
                      <TableCell>
                        <Badge className={getGradeColor(record.outcome)}>
                          {record.outcome}
                        </Badge>
                      </TableCell>
                      <TableCell>{new Date(record.activity_date).toLocaleDateString()}</TableCell>
                      <TableCell className="max-w-xs truncate">
                        {record.description?.replace(`Grade/Mark: ${record.outcome}`, '').replace('Notes: ', '').trim() || '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
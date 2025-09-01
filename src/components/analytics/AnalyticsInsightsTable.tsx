import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  BarChart3, 
  Download, 
  Search, 
  Filter,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  FileText,
  Users
} from 'lucide-react';
import { getCardStyles } from '@/lib/cardStyles';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

interface ProgramInsight {
  id: string;
  programName: string;
  totalBeneficiaries: number;
  maleCount: number;
  femaleCount: number;
  otherCount: number;
  topLocations: string[];
  averageAge?: number;
  status: 'active' | 'inactive';
}

interface AnalyticsInsightsTableProps {
  data: ProgramInsight[];
  isLoading?: boolean;
}

type SortField = 'programName' | 'totalBeneficiaries' | 'maleCount' | 'femaleCount';
type SortDirection = 'asc' | 'desc';

export function AnalyticsInsightsTable({ data, isLoading }: AnalyticsInsightsTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLocation, setFilterLocation] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('totalBeneficiaries');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Get unique locations for filter
  const uniqueLocations = useMemo(() => {
    const locations = new Set<string>();
    data.forEach(program => {
      program.topLocations.forEach(location => locations.add(location));
    });
    return Array.from(locations).sort();
  }, [data]);

  // Filtered and sorted data
  const processedData = useMemo(() => {
    let filtered = data.filter(program => {
      const matchesSearch = program.programName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesLocation = filterLocation === 'all' || program.topLocations.includes(filterLocation);
      const matchesStatus = filterStatus === 'all' || program.status === filterStatus;
      
      return matchesSearch && matchesLocation && matchesStatus;
    });

    // Sort data
    filtered.sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];
      
      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
      }
      if (typeof bValue === 'string') {
        bValue = bValue.toLowerCase();
      }
      
      if (sortDirection === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    return filtered;
  }, [data, searchTerm, filterLocation, filterStatus, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="h-4 w-4" />;
    return sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />;
  };

  const exportToCSV = () => {
    const exportData = processedData.map(program => ({
      'Program Name': program.programName,
      'Total Beneficiaries': program.totalBeneficiaries,
      'Male': program.maleCount,
      'Female': program.femaleCount,
      'Other': program.otherCount,
      'Top Locations': program.topLocations.join(', '),
      'Status': program.status,
      'Average Age': program.averageAge || 'N/A'
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Program Analytics');
    XLSX.writeFile(wb, `program-analytics-${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(16);
    doc.text('Program Analytics Report', 14, 22);
    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);

    const tableData = processedData.map(program => [
      program.programName,
      program.totalBeneficiaries.toString(),
      `M:${program.maleCount} F:${program.femaleCount} O:${program.otherCount}`,
      program.topLocations.slice(0, 2).join(', '),
      program.status
    ]);

    (doc as any).autoTable({
      head: [['Program', 'Total', 'Gender (M/F/O)', 'Locations', 'Status']],
      body: tableData,
      startY: 35,
      theme: 'striped',
      headStyles: { fillColor: [59, 130, 246] },
      styles: { fontSize: 8 }
    });

    doc.save(`program-analytics-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  if (isLoading) {
    return (
      <Card className={getCardStyles(2)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Program Analytics
            <Badge variant="secondary">Loading...</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center justify-between p-4 rounded-lg bg-muted/30 animate-pulse">
                <div className="space-y-2">
                  <div className="h-4 w-32 bg-muted rounded" />
                  <div className="h-3 w-24 bg-muted rounded" />
                </div>
                <div className="h-8 w-16 bg-muted rounded" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={getCardStyles(2)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Program Analytics
            <Badge variant="secondary">{processedData.length} Programs</Badge>
          </CardTitle>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={exportToCSV}
              className="flex items-center gap-2"
            >
              <FileText className="h-4 w-4" />
              CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={exportToPDF}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              PDF
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search programs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          
          <Select value={filterLocation} onValueChange={setFilterLocation}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by location" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Locations</SelectItem>
              {uniqueLocations.map((location) => (
                <SelectItem key={location} value={location}>{location}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
          
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {processedData.length} results
            </span>
          </div>
        </div>

        {/* Table */}
        <div className="rounded-xl border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead>
                  <Button 
                    variant="ghost" 
                    onClick={() => handleSort('programName')}
                    className="flex items-center gap-2 font-semibold p-0 h-auto"
                  >
                    Program Name
                    {getSortIcon('programName')}
                  </Button>
                </TableHead>
                <TableHead className="text-center">
                  <Button 
                    variant="ghost" 
                    onClick={() => handleSort('totalBeneficiaries')}
                    className="flex items-center gap-2 font-semibold p-0 h-auto mx-auto"
                  >
                    Total
                    {getSortIcon('totalBeneficiaries')}
                  </Button>
                </TableHead>
                <TableHead className="text-center">Gender Distribution</TableHead>
                <TableHead>Top Locations</TableHead>
                <TableHead className="text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {processedData.map((program) => (
                <TableRow key={program.id} className="hover:bg-muted/20 transition-colors">
                  <TableCell>
                    <div>
                      <p className="font-semibold text-foreground">{program.programName}</p>
                      {program.averageAge && (
                        <p className="text-xs text-muted-foreground">Avg. Age: {program.averageAge}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Users className="h-4 w-4 text-primary" />
                      <span className="font-bold text-lg">{program.totalBeneficiaries}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-blue-50 text-blue-700">
                          M: {program.maleCount}
                        </Badge>
                        <Badge variant="outline" className="bg-pink-50 text-pink-700">
                          F: {program.femaleCount}
                        </Badge>
                        {program.otherCount > 0 && (
                          <Badge variant="outline" className="bg-gray-50 text-gray-700">
                            O: {program.otherCount}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      {program.topLocations.slice(0, 3).map((location, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {location}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge 
                      variant={program.status === 'active' ? 'default' : 'secondary'}
                      className={program.status === 'active' ? 'bg-green-100 text-green-700' : ''}
                    >
                      {program.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          {processedData.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No programs found matching your criteria.</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
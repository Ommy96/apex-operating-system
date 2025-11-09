import { useState, useEffect } from 'react';
import { Bus, Plus, Search, Download, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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

interface TransportRecord {
  id: string;
  child_id: string;
  term: string;
  year: number;
  receives_transport: boolean;
  receives_shopping: boolean;
  created_at: string;
}

const TERMS = ['Term 1', 'Term 2', 'Term 3'];
const CURRENT_YEAR = new Date().getFullYear();

export default function SchoolTransport() {
  const { isAdmin, isManagement } = useAuth();
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChildren, setSelectedChildren] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTerm, setSelectedTerm] = useState(TERMS[0]);
  const [selectedYear, setSelectedYear] = useState(CURRENT_YEAR);
  const [transportRecords, setTransportRecords] = useState<Map<string, TransportRecord>>(new Map());
  const [showSaveDialog, setShowSaveDialog] = useState(false);

  useEffect(() => {
    fetchChildren();
  }, []);

  useEffect(() => {
    if (children.length > 0) {
      fetchTransportRecords();
    }
  }, [selectedTerm, selectedYear, children]);

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
        .select('*')
        .eq('term', selectedTerm)
        .eq('year', selectedYear);

      if (error) throw error;

      const recordsMap = new Map<string, TransportRecord>();
      data?.forEach(record => {
        recordsMap.set(record.child_id, record);
      });
      setTransportRecords(recordsMap);

      // Set selected children based on existing records
      const selected = new Set<string>();
      data?.forEach(record => {
        if (record.receives_transport || record.receives_shopping) {
          selected.add(record.child_id);
        }
      });
      setSelectedChildren(selected);
    } catch (error) {
      console.error('Error fetching transport records:', error);
    }
  };

  const toggleChildSelection = (childId: string) => {
    const newSelected = new Set(selectedChildren);
    if (newSelected.has(childId)) {
      newSelected.delete(childId);
    } else {
      newSelected.add(childId);
    }
    setSelectedChildren(newSelected);
  };

  const handleSaveRecords = async () => {
    setSaving(true);
    try {
      // Delete existing records for this term/year
      await supabase
        .from('transport_records')
        .delete()
        .eq('term', selectedTerm)
        .eq('year', selectedYear);

      // Insert new records
      const records = Array.from(selectedChildren).map(childId => ({
        child_id: childId,
        term: selectedTerm,
        year: selectedYear,
        receives_transport: true,
        receives_shopping: true,
      }));

      if (records.length > 0) {
        const { error } = await supabase
          .from('transport_records')
          .insert(records);

        if (error) throw error;
      }

      toast({
        title: "Success",
        description: `Transport records saved for ${selectedTerm} ${selectedYear}`,
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
    const selectedChildrenData = children.filter(child => selectedChildren.has(child.id));
    
    const formattedData = selectedChildrenData.map(child => ({
      'First Name': child.first_name,
      'Last Name': child.last_name,
      'Gender': child.gender,
      'Institution': child.institution_name,
      'Academic Level': child.academic_level,
      'Grade': child.grade,
      'Residence': child.residence,
      'Term': selectedTerm,
      'Year': selectedYear,
    }));

    downloadExcel(formattedData, `school_transport_${selectedTerm}_${selectedYear}`, 'School Transport');
    
    toast({
      title: "Download started",
      description: "Your transport records are being downloaded.",
    });
  };

  const getFilteredChildren = () => {
    return children.filter(child =>
      `${child.first_name} ${child.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      child.institution_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const convertGoogleDriveUrl = (url: string) => {
    if (!url) return url;
    const trimmed = url.trim();
    const fileMatch = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (fileMatch) return `https://drive.google.com/uc?export=view&id=${fileMatch[1]}`;
    return trimmed;
  };

  const filteredChildren = getFilteredChildren();

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
            Select students who receive school transport and shopping per term
          </p>
        </div>
        {(isAdmin || isManagement) && (
          <div className="flex gap-2">
            <Button onClick={handleDownload} variant="outline" disabled={selectedChildren.size === 0}>
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
            <Button onClick={() => setShowSaveDialog(true)} className="bg-gradient-accent hover:bg-gradient-accent/90">
              Save Selection
            </Button>
          </div>
        )}
      </div>

      {/* Term and Year Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select Term & Year</CardTitle>
          <CardDescription>Choose the term and year for transport allocation</CardDescription>
        </CardHeader>
        <CardContent className="flex gap-4">
          <div className="flex-1">
            <label className="text-sm font-medium">Term</label>
            <Select value={selectedTerm} onValueChange={setSelectedTerm}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TERMS.map(term => (
                  <SelectItem key={term} value={term}>{term}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1">
            <label className="text-sm font-medium">Year</label>
            <Select value={selectedYear.toString()} onValueChange={(val) => setSelectedYear(parseInt(val))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1].map(year => (
                  <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Bus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{children.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Selected</CardTitle>
            <Checkbox checked={selectedChildren.size > 0} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{selectedChildren.size}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Term/Year</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{selectedTerm} {selectedYear}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          placeholder="Search by name or school..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Children Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredChildren.map((child) => (
          <Card 
            key={child.id} 
            className={`cursor-pointer transition-all hover:shadow-lg ${
              selectedChildren.has(child.id) ? 'ring-2 ring-primary' : ''
            }`}
            onClick={() => (isAdmin || isManagement) && toggleChildSelection(child.id)}
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Checkbox
                  checked={selectedChildren.has(child.id)}
                  onCheckedChange={() => (isAdmin || isManagement) && toggleChildSelection(child.id)}
                  disabled={!isAdmin && !isManagement}
                  className="mt-1"
                />
                <Avatar className="h-12 w-12">
                  <AvatarImage src={convertGoogleDriveUrl(child.photo_url)} alt={`${child.first_name} ${child.last_name}`} />
                  <AvatarFallback>{getInitials(child.first_name, child.last_name)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold truncate">
                    {child.first_name} {child.last_name}
                  </h3>
                  <p className="text-sm text-muted-foreground truncate">
                    {child.institution_name}
                  </p>
                  <div className="flex gap-2 mt-2">
                    <Badge variant="outline">{child.academic_level}</Badge>
                    <Badge variant="secondary">{child.grade}</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Save Confirmation Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Transport Records</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>Are you sure you want to save transport records for:</p>
            <ul className="mt-2 space-y-1">
              <li className="font-semibold">• {selectedChildren.size} students</li>
              <li className="font-semibold">• {selectedTerm} {selectedYear}</li>
            </ul>
            <p className="mt-4 text-sm text-muted-foreground">
              This will replace any existing records for this term and year.
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

import { useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import { Plus, Search, Edit, Trash2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { DynamicProgramForm } from "@/components/DynamicProgramForm";
import { FieldDefinition } from "@/components/ProgramFieldBuilder";
import { getCardStyles, CardVariant } from "@/lib/cardStyles";
import * as XLSX from "xlsx";

interface ProgramEntry {
  id: string;
  program_id: string;
  data: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

const DynamicProgramPage = () => {
  const { programId } = useParams<{ programId: string }>();
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<ProgramEntry | null>(null);

  // Fetch program details
  const { data: program, isLoading: programLoading } = useQuery({
    queryKey: ['program', programId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('programs')
        .select('*')
        .eq('id', programId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!programId,
  });

  // Fetch program entries
  const { data: entries, isLoading: entriesLoading } = useQuery({
    queryKey: ['program-entries', programId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('program_entries')
        .select('*')
        .eq('program_id', programId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as ProgramEntry[];
    },
    enabled: !!programId,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('program_entries').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['program-entries', programId] });
      toast.success('Entry deleted successfully');
    },
    onError: (error) => {
      toast.error('Failed to delete entry: ' + error.message);
    },
  });

  const customFields = useMemo(() => {
    if (!program?.custom_fields) return [];
    return (program.custom_fields as unknown as FieldDefinition[]) || [];
  }, [program?.custom_fields]);

  const filteredEntries = useMemo(() => {
    if (!entries) return [];
    if (!searchTerm) return entries;
    
    return entries.filter(entry => {
      const searchLower = searchTerm.toLowerCase();
      return Object.values(entry.data).some(value => 
        String(value).toLowerCase().includes(searchLower)
      );
    });
  }, [entries, searchTerm]);

  const handleEdit = (entry: ProgramEntry) => {
    setEditingEntry(entry);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingEntry(null);
  };

  const handleExport = () => {
    if (!filteredEntries.length) {
      toast.error('No data to export');
      return;
    }

    const exportData = filteredEntries.map(entry => {
      const row: Record<string, unknown> = {};
      customFields.forEach(field => {
        row[field.name] = entry.data[field.name] ?? '';
      });
      row['Created At'] = new Date(entry.created_at).toLocaleDateString();
      return row;
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, program?.name || 'Program Data');
    XLSX.writeFile(wb, `${program?.name || 'program'}_data.xlsx`);
    toast.success('Data exported successfully');
  };

  if (programLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!program) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-foreground">Program not found</h2>
        <p className="text-muted-foreground mt-2">The requested program could not be found.</p>
      </div>
    );
  }

  if (customFields.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{program.name}</h1>
          <p className="text-muted-foreground mt-1">{program.description || 'No description'}</p>
        </div>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              No custom fields have been defined for this program yet.
              {isAdmin && " Go to Programs Management to configure fields."}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{program.name}</h1>
          <p className="text-muted-foreground mt-1">{program.description || 'Manage program entries'}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport} disabled={!filteredEntries.length}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          {isAdmin && (
            <Button onClick={() => setIsFormOpen(true)} className="gap-2 bg-gradient-accent">
              <Plus className="h-4 w-4" />
              Add Entry
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className={`${getCardStyles(0 as CardVariant)} hover-scale`}>
          <CardHeader className="py-3 px-4">
            <CardDescription className="text-muted-foreground text-xs">Total Entries</CardDescription>
            <CardTitle className="text-2xl text-foreground">{entries?.length || 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card className={`${getCardStyles(1 as CardVariant)} hover-scale`}>
          <CardHeader className="py-3 px-4">
            <CardDescription className="text-muted-foreground text-xs">This Month</CardDescription>
            <CardTitle className="text-2xl text-foreground">
              {entries?.filter(e => {
                const date = new Date(e.created_at);
                const now = new Date();
                return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
              }).length || 0}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className={`${getCardStyles(2 as CardVariant)} hover-scale`}>
          <CardHeader className="py-3 px-4">
            <CardDescription className="text-muted-foreground text-xs">Fields</CardDescription>
            <CardTitle className="text-2xl text-foreground">{customFields.length}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          placeholder="Search entries..."
          className="pl-10"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Entries Table */}
      {entriesLoading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : filteredEntries.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No entries found
          </CardContent>
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {customFields.slice(0, 5).map((field) => (
                    <TableHead key={field.id}>{field.name}</TableHead>
                  ))}
                  <TableHead>Created</TableHead>
                  {isAdmin && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEntries.map((entry) => (
                  <TableRow key={entry.id}>
                    {customFields.slice(0, 5).map((field) => (
                      <TableCell key={field.id}>
                        {field.type === 'checkbox' ? (
                          <Badge variant={entry.data[field.name] ? 'default' : 'secondary'}>
                            {entry.data[field.name] ? 'Yes' : 'No'}
                          </Badge>
                        ) : (
                          String(entry.data[field.name] ?? '-')
                        )}
                      </TableCell>
                    ))}
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(entry.created_at).toLocaleDateString()}
                    </TableCell>
                    {isAdmin && (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(entry)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:bg-destructive/10"
                            onClick={() => {
                              if (confirm('Are you sure you want to delete this entry?')) {
                                deleteMutation.mutate(entry.id);
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {/* Form Dialog */}
      <DynamicProgramForm
        programId={programId!}
        programName={program.name}
        fields={customFields}
        isOpen={isFormOpen}
        onClose={handleCloseForm}
        editingEntry={editingEntry ? { id: editingEntry.id, data: editingEntry.data } : null}
      />
    </div>
  );
};

export default DynamicProgramPage;

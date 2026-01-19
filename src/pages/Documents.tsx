import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Download, Search, Filter, AlertTriangle, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import { downloadExcel, formatDocumentsData } from "@/lib/downloadUtils";
import { toast } from "sonner";
import { PageHeroHeader } from "@/components/PageHeroHeader";

interface Document {
  id: string;
  title: string;
  description: string | null;
  file_name: string;
  file_url: string;
  file_type: string | null;
  category: string | null;
  created_at: string;
  child_id: string | null;
  children: {
    id: string;
    first_name: string;
    last_name: string;
  } | null;
}

interface Child {
  id: string;
  first_name: string;
  last_name: string;
  academic_level: string | null;
  institution_name: string | null;
}

const REQUIRED_CATEGORIES = ["profile", "consent_form", "follow_up", "intake_form"];

// Display names for categories
const CATEGORY_DISPLAY_NAMES: Record<string, string> = {
  profile: "Profile",
  consent_form: "Consent Form",
  follow_up: "Follow-Up Form",
  intake_form: "Intake Form",
};

export default function Documents() {
  const { currentOrganization } = useOrganization();
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [missingSearchQuery, setMissingSearchQuery] = useState("");

  const { data: documents, isLoading } = useQuery({
    queryKey: ["all-documents", currentOrganization?.organization_id],
    queryFn: async () => {
      if (!currentOrganization?.organization_id) return [];
      const { data, error } = await supabase
        .from("documents")
        .select(`
          *,
          children (
            id,
            first_name,
            last_name
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      // Filter by children belonging to the organization
      return (data as Document[]).filter(doc => 
        !doc.child_id || doc.children !== null
      );
    },
    enabled: !!currentOrganization?.organization_id,
  });

  const { data: children, isLoading: isLoadingChildren } = useQuery({
    queryKey: ["all-children-for-documents", currentOrganization?.organization_id],
    queryFn: async () => {
      if (!currentOrganization?.organization_id) return [];
      const { data, error } = await supabase
        .from("children")
        .select("id, first_name, last_name, academic_level, institution_name")
        .eq("organization_id", currentOrganization.organization_id)
        .eq("status", "active")
        .order("first_name");

      if (error) throw error;
      return data as Child[];
    },
    enabled: !!currentOrganization?.organization_id,
  });

  const categories = documents
    ? Array.from(new Set(documents.map(doc => doc.category).filter(Boolean)))
    : [];

  const filteredDocuments = documents?.filter(doc => {
    const matchesSearch = 
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.file_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (doc.children && `${doc.children.first_name} ${doc.children.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesCategory = categoryFilter === "all" || doc.category === categoryFilter;
    
    return matchesSearch && matchesCategory;
  });

  // Calculate missing documents for each child
  const childrenWithMissingDocs = children?.map(child => {
    const childDocs = documents?.filter(doc => doc.child_id === child.id) || [];
    const uploadedCategories = childDocs.map(doc => doc.category).filter(Boolean);
    const missingCategories = REQUIRED_CATEGORIES.filter(
      cat => !uploadedCategories.includes(cat)
    );
    return {
      ...child,
      missingCategories,
      uploadedCategories: REQUIRED_CATEGORIES.filter(cat => uploadedCategories.includes(cat)),
    };
  }).filter(child => child.missingCategories.length > 0);

  const filteredMissingDocs = childrenWithMissingDocs?.filter(child => {
    const fullName = `${child.first_name} ${child.last_name}`.toLowerCase();
    return fullName.includes(missingSearchQuery.toLowerCase()) ||
      child.institution_name?.toLowerCase().includes(missingSearchQuery.toLowerCase());
  });

  const handleDownload = async (url: string, fileName: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Download failed:', error);
      window.open(url, '_blank');
    }
  };

  const handleExportToExcel = () => {
    if (!filteredDocuments || filteredDocuments.length === 0) {
      toast.error("No documents to export");
      return;
    }
    const formattedData = formatDocumentsData(filteredDocuments);
    downloadExcel(formattedData, 'documents_export', 'Documents');
    toast.success("Documents exported successfully");
  };

  const getCategoryDisplayName = (cat: string) => CATEGORY_DISPLAY_NAMES[cat] || cat;

  const handleExportMissingToExcel = () => {
    if (!filteredMissingDocs || filteredMissingDocs.length === 0) {
      toast.error("No missing documents data to export");
      return;
    }
    const formattedData = filteredMissingDocs.map(child => ({
      "Student Name": `${child.first_name} ${child.last_name}`,
      "Academic Level": child.academic_level || "N/A",
      "Institution": child.institution_name || "N/A",
      "Missing Documents": child.missingCategories.map(getCategoryDisplayName).join(", "),
      "Uploaded Documents": child.uploadedCategories.map(getCategoryDisplayName).join(", ") || "None",
    }));
    downloadExcel(formattedData, 'missing_documents_export', 'Missing Documents');
    toast.success("Missing documents exported successfully");
  };

  const totalChildrenWithDocs = children?.length || 0;
  const childrenMissingDocs = childrenWithMissingDocs?.length || 0;
  const childrenComplete = totalChildrenWithDocs - childrenMissingDocs;

  return (
    <div className="space-y-6">
      <PageHeroHeader
        title="Documents"
        description="View and manage all documents uploaded for students"
        icon={FileText}
      />

      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">All Documents</TabsTrigger>
          <TabsTrigger value="missing" className="gap-2">
            Missing Documents
            {childrenMissingDocs > 0 && (
              <Badge variant="destructive" className="ml-1">{childrenMissingDocs}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>All Documents</CardTitle>
                <CardDescription>
                  Search and filter documents across all students
                </CardDescription>
              </div>
              <Button onClick={handleExportToExcel} variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export to Excel
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by document name, file name, or student name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-full sm:w-[200px]">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Filter by category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category} value={category || ""}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : filteredDocuments && filteredDocuments.length > 0 ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Document</TableHead>
                        <TableHead>Student</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>File Type</TableHead>
                        <TableHead>Uploaded</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredDocuments.map((doc) => (
                        <TableRow key={doc.id}>
                          <TableCell>
                            <div className="flex items-start gap-2">
                              <FileText className="h-4 w-4 mt-1 text-muted-foreground flex-shrink-0" />
                              <div className="min-w-0">
                                <p className="font-medium truncate">{doc.title}</p>
                                {doc.description && (
                                  <p className="text-sm text-muted-foreground truncate">
                                    {doc.description}
                                  </p>
                                )}
                                <p className="text-xs text-muted-foreground mt-1 truncate">
                                  {doc.file_name}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {doc.children ? (
                              <span className="font-medium">
                                {doc.children.first_name} {doc.children.last_name}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">N/A</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {doc.category ? (
                              <Badge variant="outline">{doc.category}</Badge>
                            ) : (
                              <span className="text-muted-foreground text-sm">Uncategorized</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="font-mono text-xs">
                              {doc.file_type || 'Unknown'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground">
                              {format(new Date(doc.created_at), 'MMM d, yyyy')}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDownload(doc.file_url, doc.file_name)}
                            >
                              <Download className="h-4 w-4 mr-1" />
                              Download
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-lg font-medium">No documents found</p>
                  <p className="text-sm text-muted-foreground">
                    {searchQuery || categoryFilter !== "all"
                      ? "Try adjusting your search or filters"
                      : "Documents uploaded for students will appear here"}
                  </p>
                </div>
              )}

              {filteredDocuments && filteredDocuments.length > 0 && (
                <div className="flex items-center justify-between pt-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    Showing {filteredDocuments.length} of {documents?.length || 0} documents
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="missing">
          <div className="grid gap-4 md:grid-cols-3 mb-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Students</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalChildrenWithDocs}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Complete
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{childrenComplete}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  Missing Documents
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-amber-600">{childrenMissingDocs}</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Students Missing Required Documents</CardTitle>
                <CardDescription>
                  Required categories: {REQUIRED_CATEGORIES.map(getCategoryDisplayName).join(", ")}
                </CardDescription>
              </div>
              <Button onClick={handleExportMissingToExcel} variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export to Excel
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by student name or institution..."
                  value={missingSearchQuery}
                  onChange={(e) => setMissingSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {isLoading || isLoadingChildren ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : filteredMissingDocs && filteredMissingDocs.length > 0 ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Student Name</TableHead>
                        <TableHead>Academic Level</TableHead>
                        <TableHead>Institution</TableHead>
                        <TableHead>Missing Documents</TableHead>
                        <TableHead>Uploaded</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredMissingDocs.map((child) => (
                        <TableRow key={child.id}>
                          <TableCell className="font-medium">
                            {child.first_name} {child.last_name}
                          </TableCell>
                          <TableCell>
                            {child.academic_level || <span className="text-muted-foreground">N/A</span>}
                          </TableCell>
                          <TableCell>
                            {child.institution_name || <span className="text-muted-foreground">N/A</span>}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {child.missingCategories.map((cat) => (
                                <Badge key={cat} variant="destructive" className="text-xs">
                                  {getCategoryDisplayName(cat)}
                                </Badge>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {child.uploadedCategories.length > 0 ? (
                                child.uploadedCategories.map((cat) => (
                                  <Badge key={cat} variant="secondary" className="text-xs">
                                    {getCategoryDisplayName(cat)}
                                  </Badge>
                                ))
                              ) : (
                                <span className="text-muted-foreground text-sm">None</span>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
                  <p className="text-lg font-medium">All students have required documents</p>
                  <p className="text-sm text-muted-foreground">
                    Every active student has uploaded the required document categories
                  </p>
                </div>
              )}

              {filteredMissingDocs && filteredMissingDocs.length > 0 && (
                <div className="flex items-center justify-between pt-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    Showing {filteredMissingDocs.length} students with missing documents
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

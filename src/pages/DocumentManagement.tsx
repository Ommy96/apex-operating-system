import { useState, useRef, useCallback } from "react";
import { format } from "date-fns";
import {
  FileText, Upload, Search, Filter, Trash2, Download, History,
  Eye, Plus, X, FolderOpen, Shield, Clock, Tag, MoreVertical, Heart,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/hooks/useAuth";
import {
  useDocumentManagement,
  type ManagedDocument,
  type DocumentVersion,
  type DocumentAccessLog,
} from "@/hooks/useDocumentManagement";

const CATEGORIES = [
  "general", "policy", "report", "contract", "template",
  "procedure", "guideline", "form", "financial", "legal",
];

const DOCUMENT_TYPES = [
  { value: "general", label: "General" },
  { value: "progress_report", label: "Progress Report" },
  { value: "thank_you_letter", label: "Thank You Letter" },
  { value: "audit_report", label: "Audit Report" },
  { value: "program_report", label: "Program Report" },
];

function formatFileSize(bytes: number | null) {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

export default function DocumentManagement() {
  const {
    documents, isLoading, createDocument, uploadVersion,
    deleteDocument, updateDocument, fetchVersions, fetchAccessLogs,
    getDownloadUrl, logAccess,
  } = useDocumentManagement();
  const { user, isAdmin, isManagement } = useAuth();
  const canDelete = isAdmin || isManagement;

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [showUpload, setShowUpload] = useState(false);
  const [showDetail, setShowDetail] = useState<ManagedDocument | null>(null);
  const [versions, setVersions] = useState<DocumentVersion[]>([]);
  const [accessLogs, setAccessLogs] = useState<DocumentAccessLog[]>([]);
  const [showNewVersion, setShowNewVersion] = useState(false);

  // Upload form state
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadDesc, setUploadDesc] = useState("");
  const [uploadCategory, setUploadCategory] = useState("general");
  const [uploadTags, setUploadTags] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadDonorVisible, setUploadDonorVisible] = useState(false);
  const [uploadDocType, setUploadDocType] = useState("general");
  const fileRef = useRef<HTMLInputElement>(null);

  // New version state
  const [versionFile, setVersionFile] = useState<File | null>(null);
  const [versionNotes, setVersionNotes] = useState("");
  const versionFileRef = useRef<HTMLInputElement>(null);

  const filtered = documents.filter((d) => {
    const matchSearch =
      !search ||
      d.title.toLowerCase().includes(search.toLowerCase()) ||
      d.description?.toLowerCase().includes(search.toLowerCase());
    const matchCategory = categoryFilter === "all" || d.category === categoryFilter;
    return matchSearch && matchCategory;
  });

  const handleUpload = async () => {
    if (!uploadFile || !uploadTitle.trim()) return;
    await createDocument.mutateAsync({
      title: uploadTitle.trim(),
      description: uploadDesc.trim() || undefined,
      category: uploadCategory,
      tags: uploadTags ? uploadTags.split(",").map((t) => t.trim()).filter(Boolean) : [],
      file: uploadFile,
      donor_visible: uploadDonorVisible,
      document_type: uploadDocType,
    });
    setShowUpload(false);
    resetUploadForm();
  };

  const resetUploadForm = () => {
    setUploadTitle("");
    setUploadDesc("");
    setUploadCategory("general");
    setUploadTags("");
    setUploadFile(null);
    setUploadDonorVisible(false);
    setUploadDocType("general");
  };

  const openDetail = async (doc: ManagedDocument) => {
    setShowDetail(doc);
    const [v, l] = await Promise.all([
      fetchVersions(doc.id),
      fetchAccessLogs(doc.id),
    ]);
    setVersions(v);
    setAccessLogs(l);
    await logAccess(doc.id, "viewed");
  };

  const handleDownload = async (doc: ManagedDocument) => {
    if (!doc.current_file_url) return;
    const url = await getDownloadUrl(doc.current_file_url);
    window.open(url, "_blank");
    await logAccess(doc.id, "downloaded");
  };

  const handleVersionDownload = async (version: DocumentVersion) => {
    const url = await getDownloadUrl(version.file_url);
    window.open(url, "_blank");
  };

  const handleNewVersion = async () => {
    if (!versionFile || !showDetail) return;
    await uploadVersion.mutateAsync({
      documentId: showDetail.id,
      file: versionFile,
      changeNotes: versionNotes.trim() || undefined,
    });
    setShowNewVersion(false);
    setVersionFile(null);
    setVersionNotes("");
    // Refresh detail
    const v = await fetchVersions(showDetail.id);
    setVersions(v);
  };

  const getCategoryColor = (cat: string) => {
    const colors: Record<string, string> = {
      policy: "bg-purple-500/10 text-purple-700 dark:text-purple-400",
      report: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
      contract: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
      template: "bg-green-500/10 text-green-700 dark:text-green-400",
      financial: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
      legal: "bg-red-500/10 text-red-700 dark:text-red-400",
    };
    return colors[cat] || "bg-muted text-muted-foreground";
  };

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-foreground">Document Management</h1>
          <p className="text-xs md:text-sm text-muted-foreground">
            Secure file storage with version control and audit tracking
          </p>
        </div>
        <Button onClick={() => setShowUpload(true)} className="w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-2" /> Upload Document
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <FileText className="h-6 w-6 sm:h-8 sm:w-8 text-primary shrink-0" />
            <div className="min-w-0">
              <p className="text-lg sm:text-2xl font-bold">{documents.length}</p>
              <p className="text-xs text-muted-foreground">Total Documents</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Shield className="h-6 w-6 sm:h-8 sm:w-8 text-green-500 shrink-0" />
            <div className="min-w-0">
              <p className="text-lg sm:text-2xl font-bold">
                {documents.filter((d) => d.category === "policy").length}
              </p>
              <p className="text-xs text-muted-foreground">Policies</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <History className="h-8 w-8 text-blue-500" />
            <div>
              <p className="text-2xl font-bold">
                {documents.reduce((s, d) => s + d.current_version, 0)}
              </p>
              <p className="text-xs text-muted-foreground">Total Versions</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <FolderOpen className="h-8 w-8 text-amber-500" />
            <div>
              <p className="text-2xl font-bold">
                {new Set(documents.map((d) => d.category)).size}
              </p>
              <p className="text-xs text-muted-foreground">Categories</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search documents..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full sm:w-[160px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>
                {c.charAt(0).toUpperCase() + c.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Documents Table */}
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table className="min-w-[700px]">
            <TableHeader>
              <TableRow>
                <TableHead>Document</TableHead>
                <TableHead className="hidden sm:table-cell">Category</TableHead>
                <TableHead>Version</TableHead>
                <TableHead className="hidden md:table-cell">Size</TableHead>
                <TableHead className="hidden md:table-cell">Updated</TableHead>
                <TableHead className="w-[60px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No documents found
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((doc) => (
                  <TableRow
                    key={doc.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => openDetail(doc)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-primary shrink-0" />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium truncate">{doc.title}</p>
                            {(doc as any).donor_visible && (
                              <Heart className="h-3.5 w-3.5 text-primary shrink-0" />
                            )}
                          </div>
                          {doc.description && (
                            <p className="text-xs text-muted-foreground truncate max-w-[300px]">
                              {doc.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={getCategoryColor(doc.category)}>
                        {doc.category}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">v{doc.current_version}</span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatFileSize(doc.current_file_size)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(doc.updated_at), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDownload(doc); }}>
                            <Download className="h-4 w-4 mr-2" /> Download
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openDetail(doc); }}>
                            <Eye className="h-4 w-4 mr-2" /> View Details
                          </DropdownMenuItem>
                          {canDelete && (
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm("Delete this document and all versions?")) {
                                  deleteDocument.mutate(doc.id);
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4 mr-2" /> Delete
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Upload Dialog */}
      <Dialog open={showUpload} onOpenChange={setShowUpload}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
            <DialogDescription>Add a new document to your repository</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Document title *"
              value={uploadTitle}
              onChange={(e) => setUploadTitle(e.target.value)}
            />
            <Textarea
              placeholder="Description (optional)"
              value={uploadDesc}
              onChange={(e) => setUploadDesc(e.target.value)}
              rows={2}
            />
            <Select value={uploadCategory} onValueChange={setUploadCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c.charAt(0).toUpperCase() + c.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              placeholder="Tags (comma separated)"
              value={uploadTags}
              onChange={(e) => setUploadTags(e.target.value)}
            />
            <Select value={uploadDocType} onValueChange={setUploadDocType}>
              <SelectTrigger>
                <SelectValue placeholder="Document Type" />
              </SelectTrigger>
              <SelectContent>
                {DOCUMENT_TYPES.map((dt) => (
                  <SelectItem key={dt.value} value={dt.value}>
                    {dt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-2">
                <Heart className="h-4 w-4 text-primary" />
                <Label htmlFor="donor-visible" className="text-sm font-medium cursor-pointer">
                  Visible to Donors
                </Label>
              </div>
              <Switch
                id="donor-visible"
                checked={uploadDonorVisible}
                onCheckedChange={setUploadDonorVisible}
              />
            </div>
            <div
              className="border-2 border-dashed border-border/60 rounded-xl p-6 text-center cursor-pointer hover:border-primary/40 transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              <input
                ref={fileRef}
                type="file"
                className="hidden"
                onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
              />
              {uploadFile ? (
                <div className="flex items-center justify-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  <span className="text-sm font-medium">{uploadFile.name}</span>
                  <span className="text-xs text-muted-foreground">
                    ({formatFileSize(uploadFile.size)})
                  </span>
                </div>
              ) : (
                <>
                  <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Click to select a file (max 20MB)
                  </p>
                </>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowUpload(false); resetUploadForm(); }}>
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              disabled={!uploadFile || !uploadTitle.trim() || createDocument.isPending}
            >
              {createDocument.isPending ? "Uploading..." : "Upload"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Document Detail Dialog */}
      <Dialog open={!!showDetail} onOpenChange={() => setShowDetail(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto mx-4 sm:mx-auto">
          {showDetail && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  {showDetail.title}
                </DialogTitle>
                <DialogDescription>{showDetail.description || "No description"}</DialogDescription>
              </DialogHeader>

              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="secondary" className={getCategoryColor(showDetail.category)}>
                  {showDetail.category}
                </Badge>
                <Badge variant="outline">v{showDetail.current_version}</Badge>
                <Badge variant="outline" className="text-muted-foreground">
                  {formatFileSize(showDetail.current_file_size)}
                </Badge>
                {showDetail.tags?.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    <Tag className="h-3 w-3 mr-1" />
                    {tag}
                  </Badge>
                ))}
              </div>

              {/* Donor Visibility Toggle */}
              <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-2">
                  <Heart className="h-4 w-4 text-primary" />
                  <Label className="text-sm font-medium">Donor Portal Visibility</Label>
                </div>
                <Switch
                  checked={(showDetail as any).donor_visible || false}
                  onCheckedChange={(checked) => {
                    updateDocument.mutate({
                      id: showDetail.id,
                      donor_visible: checked,
                    });
                    setShowDetail({ ...showDetail, ...({ donor_visible: checked } as any) });
                  }}
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <Button size="sm" onClick={() => handleDownload(showDetail)} className="w-full sm:w-auto">
                  <Download className="h-4 w-4 mr-1" /> Download Latest
                </Button>
                <Button size="sm" variant="outline" onClick={() => setShowNewVersion(true)} className="w-full sm:w-auto">
                  <Upload className="h-4 w-4 mr-1" /> Upload New Version
                </Button>
              </div>

              <Tabs defaultValue="versions" className="mt-2">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="versions">
                    <History className="h-4 w-4 mr-1" /> Versions ({versions.length})
                  </TabsTrigger>
                  <TabsTrigger value="audit">
                    <Clock className="h-4 w-4 mr-1" /> Audit Log ({accessLogs.length})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="versions">
                  <ScrollArea className="h-[250px]">
                    <div className="space-y-2">
                      {versions.map((v) => (
                        <div
                          key={v.id}
                          className="flex items-center justify-between p-3 rounded-lg border border-border/40 bg-card"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">v{v.version_number}</span>
                              <span className="text-xs text-muted-foreground">
                                {v.file_name}
                              </span>
                            </div>
                            {v.change_notes && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {v.change_notes}
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground mt-1">
                              {format(new Date(v.created_at), "MMM d, yyyy 'at' h:mm a")}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleVersionDownload(v)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="audit">
                  <ScrollArea className="h-[250px]">
                    <div className="space-y-1">
                      {accessLogs.map((log) => (
                        <div
                          key={log.id}
                          className="flex items-center gap-3 p-2 rounded text-sm"
                        >
                          <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span className="font-medium capitalize">{log.action}</span>
                          <span className="text-xs text-muted-foreground ml-auto">
                            {format(new Date(log.created_at), "MMM d, yyyy h:mm a")}
                          </span>
                        </div>
                      ))}
                      {accessLogs.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          No activity logged yet
                        </p>
                      )}
                    </div>
                  </ScrollArea>
                </TabsContent>
              </Tabs>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* New Version Dialog */}
      <Dialog open={showNewVersion} onOpenChange={setShowNewVersion}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Upload New Version</DialogTitle>
            <DialogDescription>
              Upload a new version of "{showDetail?.title}"
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div
              className="border-2 border-dashed border-border/60 rounded-xl p-6 text-center cursor-pointer hover:border-primary/40 transition-colors"
              onClick={() => versionFileRef.current?.click()}
            >
              <input
                ref={versionFileRef}
                type="file"
                className="hidden"
                onChange={(e) => setVersionFile(e.target.files?.[0] || null)}
              />
              {versionFile ? (
                <div className="flex items-center justify-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  <span className="text-sm font-medium">{versionFile.name}</span>
                </div>
              ) : (
                <>
                  <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Select file</p>
                </>
              )}
            </div>
            <Textarea
              placeholder="What changed in this version?"
              value={versionNotes}
              onChange={(e) => setVersionNotes(e.target.value)}
              rows={2}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewVersion(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleNewVersion}
              disabled={!versionFile || uploadVersion.isPending}
            >
              {uploadVersion.isPending ? "Uploading..." : "Upload Version"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

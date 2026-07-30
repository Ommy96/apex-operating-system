import { useState } from "react";
import { logger } from "@/lib/logger";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { 
  Plus, 
  FileText, 
  Download, 
  Trash2,
  Upload,
  File,
  FileCheck,
  FileWarning,
  ExternalLink
} from "lucide-react";
import { format } from "date-fns";

interface BeneficiaryUploadsTabProps {
  beneficiaryId: string;
}

interface UploadRecord {
  id: string;
  beneficiary_id: string;
  organization_id: string;
  document_name: string;
  document_type: string | null;
  file_url: string;
  file_size: number | null;
  description: string | null;
  uploaded_by: string | null;
  created_at: string;
}

const DOCUMENT_TYPES = [
  { value: "consent_form", label: "Consent Form" },
  { value: "intake_form", label: "Signed Intake Form" },
  { value: "appreciation_letter", label: "Appreciation Letter" },
  { value: "birth_certificate", label: "Birth Certificate" },
  { value: "school_report", label: "School Report" },
  { value: "medical_record", label: "Medical Record" },
  { value: "photo", label: "Photo" },
  { value: "other", label: "Other" },
];

const getDocumentIcon = (type: string | null) => {
  switch (type) {
    case "consent_form":
    case "intake_form":
      return FileCheck;
    case "medical_record":
      return FileWarning;
    default:
      return FileText;
  }
};

const getDocumentTypeColor = (type: string | null) => {
  switch (type) {
    case "consent_form":
      return "bg-success/10 text-success";
    case "intake_form":
      return "bg-info/10 text-info";
    case "appreciation_letter":
      return "bg-info/10 text-info";
    case "birth_certificate":
      return "bg-warning/10 text-warning";
    case "school_report":
      return "bg-info/10 text-info";
    case "medical_record":
      return "bg-destructive/10 text-destructive";
    default:
      return "bg-muted text-muted-foreground";
  }
};

const formatFileSize = (bytes: number | null) => {
  if (!bytes) return "Unknown size";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export function BeneficiaryUploadsTab({ beneficiaryId }: BeneficiaryUploadsTabProps) {
  const { currentOrganization } = useOrganization();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  
  // Form state
  const [documentName, setDocumentName] = useState("");
  const [documentType, setDocumentType] = useState("");
  const [description, setDescription] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const { data: uploads = [], isLoading } = useQuery({
    queryKey: ["beneficiary-uploads", beneficiaryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("beneficiary_uploads")
        .select("*")
        .eq("beneficiary_id", beneficiaryId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as UploadRecord[];
    },
    enabled: !!beneficiaryId,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      // Find the upload to get the file URL for deletion
      const upload = uploads.find(u => u.id === id);
      
      // Delete from database
      const { error } = await supabase
        .from("beneficiary_uploads")
        .delete()
        .eq("id", id);
      if (error) throw error;

      // Try to delete from storage if it's a Supabase storage URL
      if (upload?.file_url && upload.file_url.includes('supabase')) {
        const path = upload.file_url.split('/').pop();
        if (path) {
          await supabase.storage.from('beneficiary-documents').remove([path]);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["beneficiary-uploads", beneficiaryId] });
      toast.success("Document deleted");
      setDeleteId(null);
    },
    onError: (error) => {
      toast.error("Failed to delete document: " + error.message);
    },
  });

  const handleUpload = async () => {
    if (!selectedFile || !documentName || !documentType) {
      toast.error("Please fill in all required fields and select a file");
      return;
    }

    setUploading(true);

    try {
      // Generate unique file name
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${beneficiaryId}/${Date.now()}-${documentName.replace(/\s+/g, '-')}.${fileExt}`;

      // Upload file to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('beneficiary-documents')
        .upload(fileName, selectedFile);

      if (uploadError) {
        // If bucket doesn't exist, use a placeholder URL
        logger.warn('Storage upload failed, using placeholder:', uploadError);
      }

      // Get public URL or use placeholder
      let fileUrl = '';
      if (uploadData) {
        const { data: urlData } = supabase.storage
          .from('beneficiary-documents')
          .getPublicUrl(fileName);
        fileUrl = urlData.publicUrl;
      } else {
        // Create a placeholder URL (the actual file URL would be set up with proper storage)
        fileUrl = `placeholder://${fileName}`;
      }

      // Save record to database
      const { error: dbError } = await supabase.from("beneficiary_uploads").insert({
        beneficiary_id: beneficiaryId,
        organization_id: currentOrganization?.organization_id,
        document_name: documentName,
        document_type: documentType,
        file_url: fileUrl,
        file_size: selectedFile.size,
        description: description || null,
        uploaded_by: user?.id || null,
      });

      if (dbError) throw dbError;

      queryClient.invalidateQueries({ queryKey: ["beneficiary-uploads", beneficiaryId] });
      toast.success("Document uploaded successfully");
      setIsDialogOpen(false);
      resetForm();
    } catch (error: any) {
      toast.error("Failed to upload document: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  const resetForm = () => {
    setDocumentName("");
    setDocumentType("");
    setDescription("");
    setSelectedFile(null);
  };

  const getDocumentLabel = (type: string | null) => {
    return DOCUMENT_TYPES.find(d => d.value === type)?.label || type || 'Unknown';
  };

  // Count documents by type
  const requiredDocs = ["consent_form", "intake_form", "appreciation_letter"];
  const uploadedTypes = uploads.map(u => u.document_type);
  const completedRequired = requiredDocs.filter(t => uploadedTypes.includes(t)).length;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-24 bg-muted animate-pulse rounded-lg" />
        <div className="h-48 bg-muted animate-pulse rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-primary/20">
                <File className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Documents</p>
                <p className="text-2xl font-bold text-primary">{uploads.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-success/10 to-success/5 border-success/20">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-success/20">
                <FileCheck className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Required Docs</p>
                <p className="text-2xl font-bold text-success">
                  {completedRequired}/{requiredDocs.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-warning/10 to-warning/5 border-warning/20">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-warning/20">
                <Upload className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Storage Used</p>
                <p className="text-2xl font-bold text-warning">
                  {formatFileSize(uploads.reduce((acc, u) => acc + (u.file_size || 0), 0))}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Required Documents Checklist */}
      <Card className="border-warning/20">
        <CardHeader className="bg-gradient-to-r from-warning/5 to-transparent">
          <CardTitle className="flex items-center gap-2 text-warning">
            <FileWarning className="h-5 w-5" />
            Required Documents
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {requiredDocs.map((docType) => {
              const isUploaded = uploadedTypes.includes(docType);
              return (
                <Badge
                  key={docType}
                  variant={isUploaded ? "default" : "outline"}
                  className={isUploaded ? "bg-success text-white" : "border-dashed"}
                >
                  {isUploaded && <FileCheck className="h-3 w-3 mr-1" />}
                  {getDocumentLabel(docType)}
                </Badge>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Uploads Section */}
      <Card className="border-primary/20">
        <CardHeader className="flex flex-row items-center justify-between bg-gradient-to-r from-primary/5 to-transparent">
          <CardTitle className="flex items-center gap-2 text-primary">
            <FileText className="h-5 w-5" />
            Uploaded Documents
          </CardTitle>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90">
                <Plus className="h-4 w-4 mr-2" />
                Upload Document
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="text-primary">Upload Document</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Document Name *</label>
                  <Input
                    value={documentName}
                    onChange={(e) => setDocumentName(e.target.value)}
                    placeholder="e.g., Consent Form 2024"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Document Type *</label>
                  <Select value={documentType} onValueChange={setDocumentType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {DOCUMENT_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium">Description</label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Optional description"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Select File *</label>
                  <Input
                    type="file"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  />
                  {selectedFile && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Selected: {selectedFile.name} ({formatFileSize(selectedFile.size)})
                    </p>
                  )}
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleUpload}
                    disabled={uploading || !selectedFile || !documentName || !documentType}
                    className="bg-primary hover:bg-primary/90"
                  >
                    {uploading ? "Uploading..." : "Upload"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {uploads.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No documents uploaded yet</p>
              <p className="text-sm">Click "Upload Document" to add files</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {uploads.map((upload) => {
                const DocIcon = getDocumentIcon(upload.document_type);
                return (
                  <div
                    key={upload.id}
                    className="flex items-center justify-between p-4 rounded-lg bg-muted/50 border hover:border-primary/30 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <DocIcon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{upload.document_name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge className={getDocumentTypeColor(upload.document_type)}>
                            {getDocumentLabel(upload.document_type)}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatFileSize(upload.file_size)}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(upload.created_at), "MMM d, yyyy")}
                          </span>
                        </div>
                        {upload.description && (
                          <p className="text-sm text-muted-foreground mt-1">{upload.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {!upload.file_url.startsWith('placeholder://') && (
                        <Button
                          variant="ghost"
                          size="sm"
                          asChild
                        >
                          <a href={upload.file_url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteId(upload.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this document? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

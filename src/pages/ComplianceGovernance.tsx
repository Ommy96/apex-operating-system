import { useState } from "react";
import { format } from "date-fns";
import {
  Shield, ShieldCheck, ShieldAlert, FileDown, Plus, Clock,
  UserX, Eye, CheckCircle, XCircle, AlertTriangle, Search,
  ToggleLeft, ToggleRight, Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { useCompliance } from "@/hooks/useCompliance";
import { toast } from "sonner";

const CONSENT_TYPES = ["data_collection", "data_sharing", "photo_consent", "research", "marketing", "third_party"];
const REQUEST_TYPES = ["subject_access", "data_deletion", "data_portability", "rectification", "restriction"];
const DATA_CATEGORIES = ["beneficiary_data", "financial_records", "staff_records", "medical_records", "academic_records", "activity_logs", "communications"];

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    active: "bg-green-500/10 text-green-700 dark:text-green-400",
    declined: "bg-red-500/10 text-red-700 dark:text-red-400",
    withdrawn: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
    expired: "bg-muted text-muted-foreground",
    pending: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
    in_progress: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
    completed: "bg-green-500/10 text-green-700 dark:text-green-400",
    rejected: "bg-red-500/10 text-red-700 dark:text-red-400",
  };
  return (
    <Badge variant="secondary" className={colors[status] || "bg-muted text-muted-foreground"}>
      {status.replace("_", " ")}
    </Badge>
  );
}

export default function ComplianceGovernance() {
  const {
    consents, consentsLoading,
    retentionPolicies, retentionLoading,
    accessRequests, requestsLoading,
    exports, exportsLoading,
    createConsent, withdrawConsent,
    createRetentionPolicy, toggleRetentionPolicy,
    createAccessRequest, reviewAccessRequest,
    logExport,
  } = useCompliance();
  const { isAdmin, isManagement } = useAuth();
  const canManage = isAdmin || isManagement;

  const [showConsentForm, setShowConsentForm] = useState(false);
  const [showPolicyForm, setShowPolicyForm] = useState(false);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [showReview, setShowReview] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");

  // Consent form
  const [cName, setCName] = useState("");
  const [cEmail, setCEmail] = useState("");
  const [cType, setCType] = useState("data_collection");
  const [cPurpose, setCPurpose] = useState("");
  const [cGiven, setCGiven] = useState(true);

  // Policy form
  const [pName, setPName] = useState("");
  const [pDesc, setPDesc] = useState("");
  const [pCategory, setPCategory] = useState("beneficiary_data");
  const [pDays, setPDays] = useState("365");
  const [pAction, setPAction] = useState("archive");

  // Request form
  const [rType, setRType] = useState("subject_access");
  const [rName, setRName] = useState("");
  const [rEmail, setREmail] = useState("");
  const [rReason, setRReason] = useState("");
  const [rPriority, setRPriority] = useState("normal");

  const handleCreateConsent = async () => {
    if (!cName.trim() || !cPurpose.trim()) return;
    await createConsent.mutateAsync({
      subject_name: cName.trim(),
      subject_email: cEmail.trim() || undefined,
      consent_type: cType,
      consent_purpose: cPurpose.trim(),
      consent_given: cGiven,
      consent_date: new Date().toISOString(),
    });
    setShowConsentForm(false);
    setCName(""); setCEmail(""); setCPurpose("");
  };

  const handleCreatePolicy = async () => {
    if (!pName.trim()) return;
    await createRetentionPolicy.mutateAsync({
      name: pName.trim(),
      description: pDesc.trim() || undefined,
      data_category: pCategory,
      retention_period_days: parseInt(pDays) || 365,
      action_on_expiry: pAction,
    });
    setShowPolicyForm(false);
    setPName(""); setPDesc("");
  };

  const handleCreateRequest = async () => {
    if (!rName.trim()) return;
    await createAccessRequest.mutateAsync({
      request_type: rType,
      subject_name: rName.trim(),
      subject_email: rEmail.trim() || undefined,
      reason: rReason.trim() || undefined,
      priority: rPriority,
    });
    setShowRequestForm(false);
    setRName(""); setREmail(""); setRReason("");
  };

  const handleExport = async (type: string) => {
    let data: any[] = [];
    let filename = "";
    if (type === "consent_records") {
      data = consents;
      filename = "consent_records_export.json";
    } else if (type === "access_requests") {
      data = accessRequests;
      filename = "data_access_requests_export.json";
    } else if (type === "audit_logs") {
      data = [...consents, ...accessRequests];
      filename = "compliance_audit_export.json";
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    await logExport.mutateAsync({ export_type: type, record_count: data.length });
    toast.success(`Exported ${data.length} records`);
  };

  const activeConsents = consents.filter(c => c.status === "active").length;
  const pendingRequests = accessRequests.filter(r => r.status === "pending").length;
  const activePolicies = retentionPolicies.filter(p => p.is_active).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Compliance & Governance</h1>
        <p className="text-sm text-muted-foreground">
          Data protection controls, consent tracking, and audit-ready compliance
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <ShieldCheck className="h-6 w-6 sm:h-8 sm:w-8 text-green-500 shrink-0" />
            <div className="min-w-0">
              <p className="text-lg sm:text-2xl font-bold">{activeConsents}</p>
              <p className="text-xs text-muted-foreground">Active Consents</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="h-6 w-6 sm:h-8 sm:w-8 text-amber-500 shrink-0" />
            <div className="min-w-0">
              <p className="text-lg sm:text-2xl font-bold">{pendingRequests}</p>
              <p className="text-xs text-muted-foreground">Pending Requests</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Shield className="h-6 w-6 sm:h-8 sm:w-8 text-primary shrink-0" />
            <div className="min-w-0">
              <p className="text-lg sm:text-2xl font-bold">{activePolicies}</p>
              <p className="text-xs text-muted-foreground">Active Policies</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <FileDown className="h-6 w-6 sm:h-8 sm:w-8 text-blue-500 shrink-0" />
            <div className="min-w-0">
              <p className="text-lg sm:text-2xl font-bold">{exports.length}</p>
              <p className="text-xs text-muted-foreground">Exports Generated</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="consent" className="space-y-4">
        <div className="overflow-x-auto no-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
          <TabsList className="inline-flex w-max md:w-auto md:grid md:grid-cols-4">
            <TabsTrigger value="consent" className="text-xs sm:text-sm whitespace-nowrap">Consent</TabsTrigger>
            <TabsTrigger value="retention" className="text-xs sm:text-sm whitespace-nowrap">Retention</TabsTrigger>
            <TabsTrigger value="requests" className="text-xs sm:text-sm whitespace-nowrap">Requests</TabsTrigger>
            <TabsTrigger value="exports" className="text-xs sm:text-sm whitespace-nowrap">Exports</TabsTrigger>
          </TabsList>
        </div>

        {/* Consent Tracking */}
        <TabsContent value="consent" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setShowConsentForm(true)}>
              <Plus className="h-4 w-4 mr-2" /> Record Consent
            </Button>
          </div>
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <Table className="min-w-[700px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Subject</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="hidden sm:table-cell">Purpose</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden md:table-cell">Date</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {consentsLoading ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
                  ) : consents.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No consent records</TableCell></TableRow>
                  ) : consents.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{c.subject_name}</p>
                          {c.subject_email && <p className="text-xs text-muted-foreground">{c.subject_email}</p>}
                        </div>
                      </TableCell>
                      <TableCell><Badge variant="outline">{c.consent_type.replace("_", " ")}</Badge></TableCell>
                      <TableCell className="text-sm max-w-[200px] truncate">{c.consent_purpose}</TableCell>
                      <TableCell><StatusBadge status={c.status} /></TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {c.consent_date ? format(new Date(c.consent_date), "MMM d, yyyy") : "—"}
                      </TableCell>
                      <TableCell>
                        {c.status === "active" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-amber-600"
                            onClick={() => {
                              if (confirm("Withdraw this consent?")) {
                                withdrawConsent.mutate({ id: c.id, reason: "User requested withdrawal" });
                              }
                            }}
                          >
                            Withdraw
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Retention Policies */}
        <TabsContent value="retention" className="space-y-4">
          <div className="flex justify-end">
            {canManage && (
              <Button onClick={() => setShowPolicyForm(true)}>
                <Plus className="h-4 w-4 mr-2" /> Add Policy
              </Button>
            )}
          </div>
          <div className="grid gap-4">
            {retentionLoading ? (
              <p className="text-center text-muted-foreground py-8">Loading...</p>
            ) : retentionPolicies.length === 0 ? (
              <Card><CardContent className="p-8 text-center text-muted-foreground">No retention policies configured</CardContent></Card>
            ) : retentionPolicies.map((p) => (
              <Card key={p.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">{p.name}</h3>
                        <Badge variant="outline">{p.data_category.replace("_", " ")}</Badge>
                        {p.is_active ? (
                          <Badge variant="secondary" className="bg-green-500/10 text-green-700 dark:text-green-400">Active</Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-muted text-muted-foreground">Inactive</Badge>
                        )}
                      </div>
                      {p.description && <p className="text-sm text-muted-foreground">{p.description}</p>}
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {p.retention_period_days} days retention</span>
                        <span>Action: {p.action_on_expiry}</span>
                      </div>
                    </div>
                    {canManage && (
                      <Switch
                        checked={p.is_active}
                        onCheckedChange={(checked) => toggleRetentionPolicy.mutate({ id: p.id, is_active: checked })}
                      />
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Data Access Requests */}
        <TabsContent value="requests" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setShowRequestForm(true)}>
              <Plus className="h-4 w-4 mr-2" /> New Request
            </Button>
          </div>
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <Table className="min-w-[600px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Subject</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requestsLoading ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
                  ) : accessRequests.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No data requests</TableCell></TableRow>
                  ) : accessRequests.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{r.subject_name}</p>
                          {r.subject_email && <p className="text-xs text-muted-foreground">{r.subject_email}</p>}
                        </div>
                      </TableCell>
                      <TableCell><Badge variant="outline">{r.request_type.replace("_", " ")}</Badge></TableCell>
                      <TableCell>
                        <Badge variant={r.priority === "urgent" ? "destructive" : "secondary"}>
                          {r.priority}
                        </Badge>
                      </TableCell>
                      <TableCell><StatusBadge status={r.status} /></TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {r.due_date ? format(new Date(r.due_date), "MMM d, yyyy") : "—"}
                      </TableCell>
                      <TableCell>
                        {canManage && r.status === "pending" && (
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-green-600"
                              onClick={() => reviewAccessRequest.mutate({ id: r.id, status: "in_progress" })}
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-red-600"
                              onClick={() => reviewAccessRequest.mutate({ id: r.id, status: "rejected", reviewer_notes: "Rejected by admin" })}
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                        {canManage && r.status === "in_progress" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => reviewAccessRequest.mutate({ id: r.id, status: "completed" })}
                          >
                            Complete
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Compliance Exports */}
        <TabsContent value="exports" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="cursor-pointer hover:border-primary/40 transition-colors" onClick={() => handleExport("consent_records")}>
              <CardContent className="p-6 text-center">
                <ShieldCheck className="h-10 w-10 text-green-500 mx-auto mb-3" />
                <h3 className="font-semibold">Consent Records</h3>
                <p className="text-xs text-muted-foreground mt-1">Export all consent tracking data</p>
                <Button variant="outline" size="sm" className="mt-3">
                  <FileDown className="h-4 w-4 mr-1" /> Export JSON
                </Button>
              </CardContent>
            </Card>
            <Card className="cursor-pointer hover:border-primary/40 transition-colors" onClick={() => handleExport("access_requests")}>
              <CardContent className="p-6 text-center">
                <UserX className="h-10 w-10 text-blue-500 mx-auto mb-3" />
                <h3 className="font-semibold">Data Access Requests</h3>
                <p className="text-xs text-muted-foreground mt-1">Export all SAR/deletion requests</p>
                <Button variant="outline" size="sm" className="mt-3">
                  <FileDown className="h-4 w-4 mr-1" /> Export JSON
                </Button>
              </CardContent>
            </Card>
            <Card className="cursor-pointer hover:border-primary/40 transition-colors" onClick={() => handleExport("audit_logs")}>
              <CardContent className="p-6 text-center">
                <Shield className="h-10 w-10 text-primary mx-auto mb-3" />
                <h3 className="font-semibold">Full Compliance Audit</h3>
                <p className="text-xs text-muted-foreground mt-1">Combined audit-ready export</p>
                <Button variant="outline" size="sm" className="mt-3">
                  <FileDown className="h-4 w-4 mr-1" /> Export JSON
                </Button>
              </CardContent>
            </Card>
          </div>

          {exports.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-sm">Export History</CardTitle></CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Records</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {exports.map((e) => (
                      <TableRow key={e.id}>
                        <TableCell className="capitalize">{e.export_type.replace("_", " ")}</TableCell>
                        <TableCell>{e.record_count}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(e.created_at), "MMM d, yyyy h:mm a")}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Record Consent Dialog */}
      <Dialog open={showConsentForm} onOpenChange={setShowConsentForm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Record Consent</DialogTitle>
            <DialogDescription>Track consent for data collection or processing</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input placeholder="Subject name *" value={cName} onChange={(e) => setCName(e.target.value)} />
            <Input placeholder="Email (optional)" value={cEmail} onChange={(e) => setCEmail(e.target.value)} />
            <Select value={cType} onValueChange={setCType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CONSENT_TYPES.map(t => (
                  <SelectItem key={t} value={t}>{t.replace("_", " ")}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Textarea placeholder="Purpose of consent *" value={cPurpose} onChange={(e) => setCPurpose(e.target.value)} rows={2} />
            <div className="flex items-center gap-2">
              <Switch checked={cGiven} onCheckedChange={setCGiven} />
              <span className="text-sm">{cGiven ? "Consent given" : "Consent declined"}</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConsentForm(false)}>Cancel</Button>
            <Button onClick={handleCreateConsent} disabled={!cName.trim() || !cPurpose.trim() || createConsent.isPending}>
              {createConsent.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Retention Policy Dialog */}
      <Dialog open={showPolicyForm} onOpenChange={setShowPolicyForm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Retention Policy</DialogTitle>
            <DialogDescription>Define how long data should be retained</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input placeholder="Policy name *" value={pName} onChange={(e) => setPName(e.target.value)} />
            <Textarea placeholder="Description" value={pDesc} onChange={(e) => setPDesc(e.target.value)} rows={2} />
            <Select value={pCategory} onValueChange={setPCategory}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {DATA_CATEGORIES.map(c => (
                  <SelectItem key={c} value={c}>{c.replace("_", " ")}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input type="number" placeholder="Retention days" value={pDays} onChange={(e) => setPDays(e.target.value)} />
            <Select value={pAction} onValueChange={setPAction}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="archive">Archive</SelectItem>
                <SelectItem value="anonymize">Anonymize</SelectItem>
                <SelectItem value="delete">Delete</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPolicyForm(false)}>Cancel</Button>
            <Button onClick={handleCreatePolicy} disabled={!pName.trim() || createRetentionPolicy.isPending}>
              {createRetentionPolicy.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Data Request Dialog */}
      <Dialog open={showRequestForm} onOpenChange={setShowRequestForm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New Data Request</DialogTitle>
            <DialogDescription>Submit a subject access or deletion request</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Select value={rType} onValueChange={setRType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {REQUEST_TYPES.map(t => (
                  <SelectItem key={t} value={t}>{t.replace("_", " ")}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input placeholder="Subject name *" value={rName} onChange={(e) => setRName(e.target.value)} />
            <Input placeholder="Email (optional)" value={rEmail} onChange={(e) => setREmail(e.target.value)} />
            <Textarea placeholder="Reason for request" value={rReason} onChange={(e) => setRReason(e.target.value)} rows={2} />
            <Select value={rPriority} onValueChange={setRPriority}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRequestForm(false)}>Cancel</Button>
            <Button onClick={handleCreateRequest} disabled={!rName.trim() || createAccessRequest.isPending}>
              {createAccessRequest.isPending ? "Submitting..." : "Submit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import ProgressTracker from "@/components/documents/ProgressTracker";
import StatusBadge from "@/components/documents/StatusBadge";
import ActionPanel from "@/components/documents/ActionPanel";
import {
  ArrowLeft,
  Send,
  FileText,
  ExternalLink,
  FileUp,
  Clock,
  Building2,
  User,
  DollarSign,
  Hash,
  Tag,
  Shield,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

export default function DocumentDetail() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const docId = window.location.pathname.split("/documents/")[1];
  const [currentUser, setCurrentUser] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    classification: "",
    section: "",
    particulars: "",
    source_office: "",
    requestor: "",
    amount: "",
    received_date: "",
    remarks: "",
  });

  useEffect(() => {
    base44.auth.me().then(setCurrentUser);
  }, []);

  const { data: document, isLoading } = useQuery({
    queryKey: ["document", docId],
    queryFn: async () => {
      const docs = await base44.entities.Document.filter({ id: docId });
      return docs[0];
    },
    enabled: !!docId,
  });

  const { data: actions = [] } = useQuery({
    queryKey: ["document-actions", docId],
    queryFn: () =>
      base44.entities.DocumentAction.filter({ document_id: docId }, "-created_date", 100),
    enabled: !!docId,
  });

  const { data: linkedDoc } = useQuery({
    queryKey: ["linked-doc", document?.linked_document_id],
    queryFn: async () => {
      if (!document?.linked_document_id) return null;
      const docs = await base44.entities.Document.filter({ id: document.linked_document_id });
      return docs[0];
    },
    enabled: !!document?.linked_document_id,
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["document", docId] });
    queryClient.invalidateQueries({ queryKey: ["document-actions", docId] });
    queryClient.invalidateQueries({ queryKey: ["documents"] });
  };

  useEffect(() => {
    if (!document) return;
    setEditForm({
      classification: document.classification || "",
      section: document.section || "",
      particulars: document.particulars || "",
      source_office: document.source_office || "",
      requestor: document.requestor || "",
      amount: document.amount ? String(document.amount) : "",
      received_date: document.received_date || "",
      remarks: document.remarks || "",
    });
  }, [document]);

  const handleEditChange = (field, value) => {
    setEditForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveEdit = async () => {
    await base44.entities.Document.update(document.id, {
      classification: editForm.classification,
      section: editForm.section,
      particulars: editForm.particulars,
      source_office: editForm.source_office,
      requestor: editForm.requestor,
      amount: editForm.amount ? parseFloat(editForm.amount) : undefined,
      received_date: editForm.received_date,
      remarks: editForm.remarks,
    });
    toast.success("Document updated successfully");
    setIsEditing(false);
    refresh();
  };

  const handleDelete = async () => {
    const confirmed = window.confirm("Delete this document permanently?");
    if (!confirmed) return;
    await base44.entities.Document.delete(document.id);
    toast.success("Document deleted successfully");
    navigate("/documents");
  };

  const openFile = async (fileUrl, fileLabel) => {
    if (!fileUrl) return;

    try {
      if (fileUrl.startsWith("data:")) {
        const response = await fetch(fileUrl);
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);

        const mimeType = blob.type || "";
        const shouldDownload = !(
          mimeType.startsWith("image/") ||
          mimeType === "application/pdf" ||
          mimeType.startsWith("text/")
        );

        if (shouldDownload) {
          const link = window.document.createElement("a");
          link.href = blobUrl;
          link.download = `${fileLabel}.bin`;
          link.click();
        } else {
          window.open(blobUrl, "_blank", "noopener,noreferrer");
        }

        setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
        return;
      }

      window.open(fileUrl, "_blank", "noopener,noreferrer");
    } catch (error) {
      toast.error(`Unable to open ${fileLabel.toLowerCase()}. Try uploading again.`);
    }
  };

  if (isLoading || !currentUser) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!document) {
    return (
      <div className="p-8 text-center">
        <p className="text-xl text-muted-foreground">Document not found</p>
        <Button variant="outline" onClick={() => navigate("/documents")} className="mt-4">
          Back to Documents
        </Button>
      </div>
    );
  }

  // Visibility rules:
  // - Admin can audit all
  // - MAYOR can review/sign across sections
  // - Section-scoped users can view own section OR docs they are involved in
  // - Only current holder can act (enforced in ActionPanel)
  const userRole = currentUser?.role?.toUpperCase();
  const isAdmin = userRole === "ADMIN";
  const isMayor = userRole === "MAYOR";
  const isReceiving = userRole === "RECEIVING";
  const lockedDeleteStatuses = ["For Signature", "Signed", "For Release", "Released"];
  const canDeleteDocument = isReceiving && !lockedDeleteStatuses.includes(document.status);
  const userSection = currentUser?.section?.toUpperCase();
  const docSection = document?.section?.toUpperCase();
  const isSectionScopedRole = ["COMMS", "PROCUREMENT", "MOBILIZATION", "RECORDS", "RELEASING"].includes(userRole);
  const isCurrentHolder = document.current_holder === currentUser.email;
  const isInStatusTrail = actions.some(
    (action) => action.from_user === currentUser.email || action.to_user === currentUser.email
  );
  const isSameSection = !userSection || !docSection || userSection === docSection;

  const canViewDoc = isAdmin
    ? true
    : isMayor
    ? true
    : isSectionScopedRole
    ? isSameSection || isCurrentHolder || isInStatusTrail
    : isSameSection || isCurrentHolder || isInStatusTrail;

  if (!canViewDoc) {
    return (
      <div className="p-8 text-center space-y-4">
        <Shield className="w-16 h-16 text-muted-foreground mx-auto" />
        <p className="text-xl font-semibold">Access Restricted</p>
        <p className="text-muted-foreground">
          This document belongs to the <strong>{docSection}</strong> section and is not accessible to your account.
        </p>
        <Button variant="outline" onClick={() => navigate("/documents")}>
          Back to Documents
        </Button>
      </div>
    );
  }

  const actionLogColors = {
    Created: "bg-blue-100 text-blue-700",
    Received: "bg-green-100 text-green-700",
    Forwarded: "bg-amber-100 text-amber-700",
    Returned: "bg-red-100 text-red-700",
    Signed: "bg-purple-100 text-purple-700",
    Released: "bg-teal-100 text-teal-700",
    "Memo Uploaded": "bg-indigo-100 text-indigo-700",
    "Trip Ticket Uploaded": "bg-sky-100 text-sky-700",
  };

  return (
    <div className="p-8 space-y-6 max-w-5xl mx-auto">
      {/* Back */}
      <Button variant="ghost" onClick={() => navigate("/documents")} className="text-base gap-2 -ml-2">
        <ArrowLeft className="w-5 h-5" />
        Back to Documents
      </Button>

      {/* Progress Tracker */}
      <Card className="border-2 border-primary/20">
        <CardContent className="p-6">
          <ProgressTracker status={document.status} document={document} />
        </CardContent>
      </Card>

      {/* Document Header */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2 flex-wrap">
                <Badge
                  variant="outline"
                  className="text-base px-3 py-1 font-bold text-primary border-primary"
                >
                  <Hash className="w-4 h-4 mr-1" />
                  {document.control_number}
                </Badge>
                <StatusBadge status={document.status} />
                {document.section && (
                  <Badge variant="secondary" className="text-sm px-3 py-1">
                    {document.section}
                  </Badge>
                )}
              </div>
              <CardTitle className="text-2xl mt-2">{document.particulars}</CardTitle>
              <div className="flex items-center gap-2 mt-2">
                <Tag className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">{document.classification}</span>
              </div>
            </div>
            {isReceiving && (
              <div className="flex gap-2">
                {!isEditing ? (
                  <Button variant="outline" onClick={() => setIsEditing(true)}>
                    Edit
                  </Button>
                ) : (
                  <>
                    <Button variant="outline" onClick={() => setIsEditing(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleSaveEdit}>Save</Button>
                  </>
                )}
                {canDeleteDocument && (
                  <Button variant="destructive" onClick={handleDelete}>Delete</Button>
                )}
              </div>
            )}
          </div>
        </CardHeader>
        <Separator />
        <CardContent className="pt-6">
          {isEditing && (
            <div className="mb-6 p-4 rounded-xl border bg-accent/20 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Classification</Label>
                <Select value={editForm.classification} onValueChange={(value) => handleEditChange("classification", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select classification" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Commu Letter">Commu Letter</SelectItem>
                    <SelectItem value="Purchase Request">Purchase Request</SelectItem>
                    <SelectItem value="Request Letter">Request Letter</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Section</Label>
                <Select value={editForm.section} onValueChange={(value) => handleEditChange("section", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select section" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="COMMS">COMMS</SelectItem>
                    <SelectItem value="PROCUREMENT">PROCUREMENT</SelectItem>
                    <SelectItem value="MOBILIZATION">MOBILIZATION</SelectItem>
                    <SelectItem value="GENERAL">GENERAL</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Particulars</Label>
                <Textarea value={editForm.particulars} onChange={(e) => handleEditChange("particulars", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Source Office</Label>
                <Input value={editForm.source_office} onChange={(e) => handleEditChange("source_office", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Requestor</Label>
                <Input value={editForm.requestor} onChange={(e) => handleEditChange("requestor", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Amount</Label>
                <Input type="number" step="0.01" value={editForm.amount} onChange={(e) => handleEditChange("amount", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Date Received</Label>
                <Input type="date" value={editForm.received_date} onChange={(e) => handleEditChange("received_date", e.target.value)} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Remarks</Label>
                <Textarea value={editForm.remarks} onChange={(e) => handleEditChange("remarks", e.target.value)} />
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <DetailItem icon={Building2} label="Source Office" value={document.source_office} />
            <DetailItem icon={User} label="Requestor" value={document.requestor} />
            <DetailItem
              icon={DollarSign}
              label="Amount"
              value={
                document.amount
                  ? `₱${document.amount.toLocaleString("en-PH", { minimumFractionDigits: 2 })}`
                  : null
              }
            />
            <DetailItem
              icon={Clock}
              label="Date Received"
              value={
                document.received_date
                  ? format(new Date(document.received_date), "MMMM d, yyyy")
                  : null
              }
            />
            <DetailItem icon={User} label="Current Holder" value={document.current_holder_name} />
            <DetailItem icon={Send} label="Forwarded To" value={document.forwarded_to} />
            {document.released_date && (
              <DetailItem
                icon={Clock}
                label="Date Released"
                value={format(new Date(document.released_date), "MMMM d, yyyy")}
              />
            )}
          </div>

          {document.remarks && (
            <div className="mt-6 p-4 bg-accent/50 rounded-xl">
              <p className="text-sm font-semibold text-muted-foreground mb-1">Remarks</p>
              <p className="text-base">{document.remarks}</p>
            </div>
          )}

          {document.status === "Returned" && document.return_reason && (
            <div className="mt-4 p-4 bg-red-50 border-2 border-red-200 rounded-xl">
              <p className="text-sm font-semibold text-red-600 mb-1">Reason for Return</p>
              <p className="text-base text-red-800">{document.return_reason}</p>
            </div>
          )}

          {/* File Links */}
          <div className="flex flex-wrap gap-3 mt-6">
            {document.file_url && (
              <Button
                variant="outline"
                className="h-12 text-base gap-2"
                onClick={() => openFile(document.file_url, "Document")}
              >
                <FileText className="w-5 h-5" />
                View Document
                <ExternalLink className="w-4 h-4" />
              </Button>
            )}
            {document.memo_file_url && (
              <Button
                variant="outline"
                className="h-12 text-base gap-2"
                onClick={() => openFile(document.memo_file_url, "Memorandum")}
              >
                <FileUp className="w-5 h-5" />
                View Memorandum
                <ExternalLink className="w-4 h-4" />
              </Button>
            )}
            {document.trip_ticket_file_url && (
              <Button
                variant="outline"
                className="h-12 text-base gap-2"
                onClick={() => openFile(document.trip_ticket_file_url, "Trip Ticket")}
              >
                <FileUp className="w-5 h-5" />
                View Trip Ticket
                <ExternalLink className="w-4 h-4" />
              </Button>
            )}
            {linkedDoc && (
              <Button
                variant="outline"
                className="h-12 text-base gap-2"
                onClick={() => navigate(`/documents/${linkedDoc.id}`)}
              >
                <FileText className="w-5 h-5" />
                View Linked Doc ({linkedDoc.control_number})
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Action Panel — role-aware */}
      <ActionPanel
        document={document}
        currentUser={currentUser}
        onActionDone={refresh}
      />

      {/* Activity Log */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            Activity Log
          </CardTitle>
        </CardHeader>
        <CardContent>
          {actions.length === 0 ? (
            <p className="text-muted-foreground text-center py-6">No activity recorded yet</p>
          ) : (
            <div className="space-y-4">
              {actions.map((action) => (
                <div key={action.id} className="flex gap-4 items-start">
                  <div
                    className={`px-2 py-1 rounded-lg text-xs font-bold flex-shrink-0 mt-1 ${
                      actionLogColors[action.action_type] || "bg-muted text-muted-foreground"
                    }`}
                  >
                    {action.action_type}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-base">
                      {action.new_status ? `→ ${action.new_status}` : ""}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      By{" "}
                      <span className="font-medium">
                        {action.from_user_name || action.from_user}
                      </span>
                      {action.to_user_name ? (
                        <>
                          {" "}→{" "}
                          <span className="font-medium">{action.to_user_name}</span>
                        </>
                      ) : null}
                    </p>
                    {action.notes && (
                      <p className="text-sm mt-1 text-muted-foreground">{action.notes}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {action.created_date
                        ? format(new Date(action.created_date), "MMM d, yyyy h:mm a")
                        : ""}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function DetailItem({ icon: Icon, label, value }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3">
      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
        <Icon className="w-4 h-4 text-primary" />
      </div>
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          {label}
        </p>
        <p className="text-base font-medium mt-0.5">{value}</p>
      </div>
    </div>
  );
}
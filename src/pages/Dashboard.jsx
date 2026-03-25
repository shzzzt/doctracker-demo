import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import StatusBadge from "@/components/documents/StatusBadge";
import { Inbox, Send, CheckCircle2, RotateCcw, FilePlus, FileText, Clock, FileCheck } from "lucide-react";
import { format } from "date-fns";

const RECEIVING_STATUS_CARDS = [
  { status: "Pending Receipt", icon: Clock, color: "bg-gradient-to-br from-rose-400 to-red-500" },
  { status: "Forwarded", icon: Send, color: "bg-gradient-to-br from-pink-500 to-rose-600" },
  { status: "Returned", icon: RotateCcw, color: "bg-gradient-to-br from-red-600 to-rose-700" },
  { status: "Released", icon: CheckCircle2, color: "bg-gradient-to-br from-emerald-500 to-green-600" },
];

const SECTION_HANDLER_STATUS_CARDS = [
  { status: "Forwarded", icon: Send, color: "bg-gradient-to-br from-pink-500 to-rose-600" },
  { status: "Received", icon: Inbox, color: "bg-gradient-to-br from-rose-500 to-pink-600" },
  { status: "For Signature", icon: FileCheck, color: "bg-gradient-to-br from-fuchsia-500 to-pink-700" },
  { status: "Returned", icon: RotateCcw, color: "bg-gradient-to-br from-red-600 to-rose-700" },
];

const COMMS_STATUS_CARDS = [
  { status: "Forwarded", icon: Send, color: "bg-gradient-to-br from-pink-500 to-rose-600" },
  { status: "Received", icon: Inbox, color: "bg-gradient-to-br from-rose-500 to-pink-600" },
  { status: "For Signature", icon: FileCheck, color: "bg-gradient-to-br from-fuchsia-500 to-pink-700" },
  { status: "For Release", icon: Send, color: "bg-gradient-to-br from-rose-500 to-orange-500" },
];

const RECORDS_RELEASE_STATUS_CARDS = [
  { status: "For Release", icon: Send, color: "bg-gradient-to-br from-rose-500 to-orange-500" },
  { status: "Received", icon: Inbox, color: "bg-gradient-to-br from-rose-500 to-pink-600" },
  { status: "Released", icon: CheckCircle2, color: "bg-gradient-to-br from-emerald-500 to-green-600" },
  { status: "Returned", icon: RotateCcw, color: "bg-gradient-to-br from-red-600 to-rose-700" },
];

const MAYOR_STATUS_CARDS = [
  { status: "For Signature", icon: FileCheck, color: "bg-gradient-to-br from-fuchsia-500 to-pink-700" },
  { status: "Signed", icon: FileCheck, color: "bg-gradient-to-br from-pink-600 to-rose-700" },
  { status: "For Release", icon: Send, color: "bg-gradient-to-br from-rose-500 to-orange-500" },
  { status: "Returned", icon: RotateCcw, color: "bg-gradient-to-br from-red-600 to-rose-700" },
];

const DEFAULT_STATUS_CARDS = [
  { status: "Pending Receipt", icon: Clock, color: "bg-gradient-to-br from-rose-400 to-red-500" },
  { status: "Forwarded", icon: Send, color: "bg-gradient-to-br from-pink-500 to-rose-600" },
  { status: "Received", icon: Inbox, color: "bg-gradient-to-br from-rose-500 to-pink-600" },
  { status: "For Signature", icon: FileCheck, color: "bg-gradient-to-br from-fuchsia-500 to-pink-700" },
  { status: "Signed", icon: FileCheck, color: "bg-gradient-to-br from-pink-600 to-rose-700" },
  { status: "For Release", icon: Send, color: "bg-gradient-to-br from-rose-500 to-orange-500" },
  { status: "Released", icon: CheckCircle2, color: "bg-gradient-to-br from-emerald-500 to-green-600" },
  { status: "Returned", icon: RotateCcw, color: "bg-gradient-to-br from-red-600 to-rose-700" },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setCurrentUser);
  }, []);

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ["documents"],
    queryFn: () => base44.entities.Document.list("-created_date", 200),
  });

  const { data: actions = [] } = useQuery({
    queryKey: ["dashboard-actions"],
    queryFn: () => base44.entities.DocumentAction.list("-created_date", 1000),
  });

  const userRole = currentUser?.role?.toUpperCase();
  const isReceiving = userRole === "RECEIVING";
  const isAdmin = userRole === "ADMIN";
  const roleCardMap = {
    RECEIVING: RECEIVING_STATUS_CARDS,
    PROCUREMENT: SECTION_HANDLER_STATUS_CARDS,
    MOBILIZATION: SECTION_HANDLER_STATUS_CARDS,
    COMMS: COMMS_STATUS_CARDS,
    RECORDS: RECORDS_RELEASE_STATUS_CARDS,
    RELEASING: RECORDS_RELEASE_STATUS_CARDS,
    MAYOR: MAYOR_STATUS_CARDS,
    ADMIN: DEFAULT_STATUS_CARDS,
  };
  const activeCards = roleCardMap[userRole] || DEFAULT_STATUS_CARDS;
  const canCreateDocument = isReceiving;

  const forwardedToMeDocIds = new Set(
    actions
      .filter((action) => action.action_type === "Forwarded" && action.to_user === currentUser?.email)
      .map((action) => action.document_id)
  );

  const dashboardDocs =
    isReceiving || isAdmin
      ? documents
      : documents.filter(
          (doc) =>
            doc.current_holder === currentUser?.email ||
            forwardedToMeDocIds.has(doc.id)
        );

  const getCount = (status) => dashboardDocs.filter((d) => d.status === status).length;
  const recentDocs = dashboardDocs.slice(0, 8);

  const sentFromByDocument = actions.reduce((acc, action) => {
    if (action.action_type !== "Forwarded") return acc;
    if (!acc[action.document_id]) {
      acc[action.document_id] = action.from_user_name || action.from_user || "—";
    }
    return acc;
  }, {});

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Welcome{currentUser ? `, ${currentUser.full_name}` : ""}
          </h1>
          <p className="text-rose-700/80 text-lg mt-1">Document Tracking Dashboard</p>
        </div>
        {canCreateDocument && (
          <Button
            onClick={() => navigate("/documents/new")}
            size="lg"
            className="h-14 px-8 text-lg font-semibold bg-primary hover:bg-primary/90"
          >
            <FilePlus className="w-6 h-6 mr-2" />
            Add New Transaction
          </Button>
        )}
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {activeCards.map((item) => (
          <Card
            key={item.status}
            className="cursor-pointer hover:shadow-lg transition-shadow border-2 hover:border-rose-300"
            onClick={() => navigate(`/documents?status=${item.status}`)}
          >
            <CardContent className="p-5">
              <div className={`w-12 h-12 rounded-xl ${item.color} flex items-center justify-center mb-3`}>
                <item.icon className="w-6 h-6 text-white" />
              </div>
              <p className="text-3xl font-bold">{isLoading ? "—" : getCount(item.status)}</p>
              <p className="text-sm font-medium text-muted-foreground mt-1">{item.status}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Recent Documents */}
        <Card className="border-rose-100">
          <CardHeader className="pb-3">
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <FileText className="w-5 h-5 text-rose-600" />
              Recent Documents
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentDocs.length === 0 ? (
              <p className="text-muted-foreground text-center py-8 text-base">
                No documents yet
              </p>
            ) : (
              <div className="rounded-xl border bg-card overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-rose-50/70">
                      <TableHead>Control Number</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Particular</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Forwarded To</TableHead>
                      <TableHead>Sent From</TableHead>
                      <TableHead>Date Released</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentDocs.map((doc) => (
                      <TableRow
                        key={doc.id}
                        className="cursor-pointer"
                        onClick={() => navigate(`/documents/${doc.id}`)}
                      >
                        <TableCell className="font-semibold text-primary">{doc.control_number || "—"}</TableCell>
                        <TableCell>
                          {doc.received_date ? format(new Date(doc.received_date), "MM/dd/yyyy") : "—"}
                        </TableCell>
                        <TableCell className="max-w-[260px]">
                          <p className="truncate">{doc.particulars || "—"}</p>
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={doc.status} />
                        </TableCell>
                        <TableCell>{doc.forwarded_to || "—"}</TableCell>
                        <TableCell>{sentFromByDocument[doc.id] || "—"}</TableCell>
                        <TableCell>
                          {doc.released_date ? format(new Date(doc.released_date), "MM/dd/yyyy") : "—"}
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
    </div>
  );
}
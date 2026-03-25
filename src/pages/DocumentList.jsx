import { useEffect, useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, FilePlus, Filter, ArrowLeft } from "lucide-react";
import DocumentTable from "@/components/documents/DocumentTable";

const ROLE_SECTION_SCOPE = {
  COMMS: ["COMMS"],
  PROCUREMENT: ["PROCUREMENT"],
  RELEASING: ["PROCUREMENT"],
  MOBILIZATION: ["MOBILIZATION"],
  RECORDS: ["COMMS"],
};

const PRIVILEGED_ROLES = new Set(["RECEIVING", "MAYOR", "ADMIN"]);

export default function DocumentList() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const urlParams = new URLSearchParams(window.location.search);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState(urlParams.get("status") || "all");
  const [classFilter, setClassFilter] = useState("all");
  const [monthFilter, setMonthFilter] = useState("all");
  const [selectedRequestor, setSelectedRequestor] = useState(null);

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ["documents"],
    queryFn: () => base44.entities.Document.list("-created_date", 500),
  });

  useEffect(() => {
    base44.auth.me().then(setCurrentUser);
  }, []);

  const canCreateDocument = currentUser?.role?.toUpperCase() === "RECEIVING";

  const transactions = documents.filter(
    (doc) => doc.created_by_role?.toUpperCase() === "RECEIVING" || !doc.created_by_role
  );

  const visibleTransactions = useMemo(() => {
    const role = currentUser?.role?.toUpperCase();
    if (!role) return [];
    if (PRIVILEGED_ROLES.has(role)) return transactions;

    const allowedSections = ROLE_SECTION_SCOPE[role] || [];
    return transactions.filter((doc) => allowedSections.includes(doc.section?.toUpperCase()));
  }, [transactions, currentUser]);

  const filteredDocs = useMemo(() => {
    return visibleTransactions.filter((doc) => {
      const matchSearch =
        !searchTerm ||
        doc.particulars?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.control_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.source_office?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.requestor?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatus = statusFilter === "all" || doc.status === statusFilter;
      const matchClass = classFilter === "all" || doc.classification === classFilter;
      const matchMonth =
        monthFilter === "all" ||
        (doc.received_date && new Date(doc.received_date).getMonth() === parseInt(monthFilter));
      const matchRequestor = !selectedRequestor || doc.requestor === selectedRequestor;
      return matchSearch && matchStatus && matchClass && matchMonth && matchRequestor;
    });
  }, [visibleTransactions, searchTerm, statusFilter, classFilter, monthFilter, selectedRequestor]);

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Transactions</h1>
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

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center bg-card p-4 rounded-xl border">
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-muted-foreground" />
          <span className="font-semibold text-base">Filters:</span>
        </div>
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search transactions by control no, office, or requestor name..."
            className="pl-10 h-12 text-base"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px] h-12 text-base">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="Pending Receipt">Pending Receipt</SelectItem>
            <SelectItem value="Forwarded">Forwarded</SelectItem>
            <SelectItem value="Received">Received</SelectItem>
            <SelectItem value="For Signature">For Signature</SelectItem>
            <SelectItem value="Signed">Signed</SelectItem>
            <SelectItem value="For Release">For Release</SelectItem>
            <SelectItem value="Released">Released</SelectItem>
            <SelectItem value="Returned">Returned</SelectItem>
          </SelectContent>
        </Select>
        <Select value={classFilter} onValueChange={setClassFilter}>
          <SelectTrigger className="w-[200px] h-12 text-base">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="Communication Letter">Communication Letter</SelectItem>
            <SelectItem value="Purchase Request">Purchase Request</SelectItem>
            <SelectItem value="Request Letter">Request Letter</SelectItem>
            <SelectItem value="Disbursement">Disbursement</SelectItem>
            <SelectItem value="Vouchers">Vouchers</SelectItem>
            <SelectItem value="Obligation Requests">Obligation Requests</SelectItem>
            <SelectItem value="Resolutions">Resolutions</SelectItem>
            <SelectItem value="Travel Order/Itinerary of Travel">Travel Order/Itinerary of Travel</SelectItem>
            <SelectItem value="Program of Works/Budget Cost">Program of Works/Budget Cost</SelectItem>
            <SelectItem value="Solicitation Letter">Solicitation Letter</SelectItem>
            <SelectItem value="Executive Orders">Executive Orders</SelectItem>
            <SelectItem value="Ordinances">Ordinances</SelectItem>
            <SelectItem value="Memorandums">Memorandums</SelectItem>
          </SelectContent>
        </Select>
        <Select value={monthFilter} onValueChange={setMonthFilter}>
          <SelectTrigger className="w-[160px] h-12 text-base">
            <SelectValue placeholder="All Months" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Months</SelectItem>
            <SelectItem value="0">January</SelectItem>
            <SelectItem value="1">February</SelectItem>
            <SelectItem value="2">March</SelectItem>
            <SelectItem value="3">April</SelectItem>
            <SelectItem value="4">May</SelectItem>
            <SelectItem value="5">June</SelectItem>
            <SelectItem value="6">July</SelectItem>
            <SelectItem value="7">August</SelectItem>
            <SelectItem value="8">September</SelectItem>
            <SelectItem value="9">October</SelectItem>
            <SelectItem value="10">November</SelectItem>
            <SelectItem value="11">December</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Results count */}
      {selectedRequestor ? (
        <div className="bg-primary/10 p-4 rounded-lg border border-primary/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSelectedRequestor(null)}
              className="h-8 px-2"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
            <p className="text-base font-medium">
              Transactions from <span className="font-bold text-primary">{selectedRequestor}</span>
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setSelectedRequestor(null)}
          >
            Clear
          </Button>
        </div>
      ) : (
        <p className="text-muted-foreground text-base">
          Total: <span className="font-semibold text-foreground">{filteredDocs.length}</span> transactions
        </p>
      )}

      {/* Table */}
      <DocumentTable
        documents={filteredDocs}
        isLoading={isLoading}
        onRequestorClick={setSelectedRequestor}
      />
    </div>
  );
}
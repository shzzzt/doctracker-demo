import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FilePlus, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";

const SOURCE_OFFICE_HISTORY_KEY = "docutracker_source_office_history";
const REQUESTOR_HISTORY_KEY = "docutracker_requestor_history";

const DEFAULT_SOURCE_OFFICES = [
  "CITY ADMINISTRATOR'S OFFICE",
  "HUMAN RESOURCE MANAGEMENT OFFICE",
  "SANGGUNIANG PANGLUNGSOD OFFICE",
  "CITY REGISTRAR'S OFFICE",
  "CITY BUDGET OFFICE",
  "CITY LEGAL OFFICE",
  "CITY TREASURER'S OFFICE",
  "CITY ACCOUNTING OFFICE",
  "CITY ASSESSOR'S OFFICE",
  "CITY GENERAL SERVICES OFFICE",
  "CITY HEALTH OFFICE",
  "CITY ENGINEER'S OFFICE",
  "CITY AGRICULTURE OFFICE",
  "CITY VETERINARY OFFICE",
  "CITY ENVIRONMENT AND NATURAL RESOURCES OFFICE",
  "CITY ECONOMIC ENTERPRISE OFFICE",
  "CITY SOCIAL WELFARE AND DEVELOPMENT OFFICE",
  "CITY PLANNING AND DEVELOPMENT OFFICE",
  "CITY COOPERATIVE OFFICE",
  "CITY DISASTER RISK REDUCTION AND MANAGEMENT OFFICE",
  "OFFICE OF THE BUILDING OFFICIAL",
];

const MONEY_CLASSIFICATIONS = new Set([
  "Disbursement",
  "Vouchers",
  "Obligation Requests",
  "Program of Works/Budget Cost",
  "Purchase Request",
]);

const SECTION_BY_CLASSIFICATION = {
  "Communication Letter": "COMMS",
  "Solicitation Letter": "COMMS",
  "Executive Orders": "COMMS",
  "Ordinances": "COMMS",
  "Memorandums": "COMMS",
  "Resolutions": "COMMS",
  "Request Letter": "MOBILIZATION",
  "Travel Order/Itinerary of Travel": "MOBILIZATION",
  "Purchase Request": "PROCUREMENT",
  "Disbursement": "PROCUREMENT",
  "Vouchers": "PROCUREMENT",
  "Obligation Requests": "PROCUREMENT",
  "Program of Works/Budget Cost": "PROCUREMENT",
};

export default function NewDocument() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [file, setFile] = useState(null);
  const [sourceOfficeHistory, setSourceOfficeHistory] = useState([]);
  const [requestorHistory, setRequestorHistory] = useState([]);
  const [isSourceOfficeDropdownOpen, setIsSourceOfficeDropdownOpen] = useState(false);
  const [form, setForm] = useState({
    control_number: "",
    classification: "",
    section: "COMMS",
    particulars: "",
    source_office: "",
    requestor: "",
    amount: "",
    received_date: new Date().toISOString().split("T")[0],
    remarks: "",
  });

  const { data: existingDocs = [] } = useQuery({
    queryKey: ["documents-for-control-number"],
    queryFn: () => base44.entities.Document.list("-created_date", 1000),
  });

  const handleChange = (field, value) => {
    if (field === "classification") {
      setForm((prev) => ({
        ...prev,
        classification: value,
        section: SECTION_BY_CLASSIFICATION[value] || prev.section,
        amount: MONEY_CLASSIFICATIONS.has(value) ? prev.amount : "",
      }));
      return;
    }
    if (field === "requestor") {
      setForm((prev) => ({ ...prev, requestor: toTitleCase(value) }));
      return;
    }
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  useEffect(() => {
    const nextControlNumber = generateControlNumber(form.received_date, existingDocs);
    setForm((prev) => ({ ...prev, control_number: nextControlNumber }));
  }, [form.received_date, existingDocs]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SOURCE_OFFICE_HISTORY_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      if (Array.isArray(parsed)) {
        setSourceOfficeHistory(parsed.filter((item) => typeof item === "string"));
      }
    } catch {
      setSourceOfficeHistory([]);
    }
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(REQUESTOR_HISTORY_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      if (Array.isArray(parsed)) {
        setRequestorHistory(parsed.filter((item) => typeof item === "string"));
      }
    } catch {
      setRequestorHistory([]);
    }
  }, []);

  const sourceOfficeSuggestions = Array.from(
    new Set([
      ...sourceOfficeHistory,
      ...DEFAULT_SOURCE_OFFICES,
    ].map((item) => item.trim().toUpperCase()).filter(Boolean))
  );

  const filteredSourceOfficeSuggestions = sourceOfficeSuggestions.filter((office) =>
    !form.source_office ? true : office.includes(form.source_office.toUpperCase())
  );

  const requestorSuggestions = Array.from(
    new Set(requestorHistory.map((item) => item.trim().toUpperCase()).filter(Boolean))
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.classification || !form.particulars || !form.received_date) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);

    let file_url = "";
    if (file) {
      const result = await base44.integrations.Core.UploadFile({ file });
      file_url = result.file_url;
    }

    const me = await base44.auth.me();

    const docData = {
      ...form,
      amount: form.amount ? parseFloat(form.amount) : undefined,
      file_url,
      status: "Pending Receipt",
      current_holder: me.email,
      current_holder_name: me.full_name,
      created_by: me.email,
      created_by_name: me.full_name,
      created_by_role: me.role,
    };

    const newDoc = await base44.entities.Document.create(docData);

    const normalizedSourceOffice = form.source_office.trim().toUpperCase();
    if (normalizedSourceOffice) {
      const updatedSourceOfficeHistory = Array.from(
        new Set([normalizedSourceOffice, ...sourceOfficeHistory.map((item) => item.trim().toUpperCase())])
      ).slice(0, 100);
      localStorage.setItem(SOURCE_OFFICE_HISTORY_KEY, JSON.stringify(updatedSourceOfficeHistory));
      setSourceOfficeHistory(updatedSourceOfficeHistory);
    }

    const normalizedRequestor = form.requestor.trim().toUpperCase();
    if (normalizedRequestor) {
      const updatedRequestorHistory = Array.from(
        new Set([normalizedRequestor, ...requestorHistory.map((item) => item.trim().toUpperCase())])
      ).slice(0, 100);
      localStorage.setItem(REQUESTOR_HISTORY_KEY, JSON.stringify(updatedRequestorHistory));
      setRequestorHistory(updatedRequestorHistory);
    }

    await base44.entities.DocumentAction.create({
      document_id: newDoc.id,
      action_type: "Created",
      from_user: me.email,
      from_user_name: me.full_name,
      notes: "Document received and logged into the system",
      new_status: "Pending Receipt",
    });

    toast.success("Transaction created successfully!");
    navigate(`/documents/${newDoc.id}`);
    setIsSubmitting(false);
  };

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 flex items-center gap-3">
        <FilePlus className="w-8 h-8 text-primary" />
        Add New Transaction
      </h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Transaction Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Row 1: Date */}
            <div className="space-y-2">
              <Label className="text-base font-semibold">
                Date Received <span className="text-red-500">*</span>
              </Label>
              <Input
                type="date"
                value={form.received_date}
                onChange={(e) => handleChange("received_date", e.target.value)}
                className="h-12 text-lg"
              />
            </div>

            {/* Classification + Section row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-base font-semibold">
                  Classification <span className="text-red-500">*</span>
                </Label>
                <Select value={form.classification} onValueChange={(v) => handleChange("classification", v)}>
                  <SelectTrigger className="h-12 text-base">
                    <SelectValue placeholder="Select document type..." />
                  </SelectTrigger>
                  <SelectContent>
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
              </div>
              <div className="space-y-2">
                <Label className="text-base font-semibold">
                  Section / Department <span className="text-red-500">*</span>
                </Label>
                <Select value={form.section} onValueChange={(v) => handleChange("section", v)}>
                  <SelectTrigger className="h-12 text-base">
                    <SelectValue placeholder="Select section..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="COMMS">Communications</SelectItem>
                    <SelectItem value="PROCUREMENT">Procurement</SelectItem>
                    <SelectItem value="MOBILIZATION">Mobilization</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Particulars */}
            <div className="space-y-2">
              <Label className="text-base font-semibold">
                Particulars / Subject <span className="text-red-500">*</span>
              </Label>
              <Textarea
                value={form.particulars}
                onChange={(e) => handleChange("particulars", e.target.value.toUpperCase())}
                placeholder="Describe the document..."
                className="text-base min-h-[100px] uppercase"
              />
            </div>

            {/* Source Office */}
            <div className="space-y-2">
              <Label className="text-base font-semibold">Source Office</Label>
              <div className="relative">
                <Input
                  value={form.source_office}
                  onChange={(e) => {
                    handleChange("source_office", e.target.value.toUpperCase());
                    setIsSourceOfficeDropdownOpen(true);
                  }}
                  onFocus={() => setIsSourceOfficeDropdownOpen(true)}
                  onBlur={() => setTimeout(() => setIsSourceOfficeDropdownOpen(false), 120)}
                  placeholder="TYPE OR SEARCH SOURCE OFFICE"
                  className="h-12 text-base uppercase"
                />
                {isSourceOfficeDropdownOpen && filteredSourceOfficeSuggestions.length > 0 && (
                  <div className="absolute z-20 mt-1 w-full rounded-md border bg-popover text-popover-foreground shadow-md max-h-52 overflow-y-auto">
                    {filteredSourceOfficeSuggestions.map((office) => (
                      <button
                        key={office}
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          handleChange("source_office", office);
                          setIsSourceOfficeDropdownOpen(false);
                        }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
                      >
                        {office}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Amount / Requestor + File Upload */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
              <div className="space-y-6">
                {MONEY_CLASSIFICATIONS.has(form.classification) && (
                  <div className="space-y-2">
                    <Label className="text-base font-semibold">Amount</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-base">₱</span>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.amount}
                        onChange={(e) => handleChange("amount", e.target.value)}
                        placeholder="0.00"
                        className="h-12 text-lg pl-8"
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label className="text-base font-semibold">Requestor</Label>
                  <Input
                    list="requestor-suggestions"
                    value={form.requestor}
                    onChange={(e) => handleChange("requestor", e.target.value.toUpperCase())}
                    placeholder="NAME OF REQUESTOR"
                    className="h-12 text-base uppercase"
                  />
                  <datalist id="requestor-suggestions">
                    {requestorSuggestions.map((name) => (
                      <option key={name} value={name} />
                    ))}
                  </datalist>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-base font-semibold">Upload Document Scan</Label>
                <div className="border-2 border-dashed rounded-xl p-6 text-center hover:border-primary/50 transition-colors">
                  <Upload className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
                  <Input
                    type="file"
                    onChange={(e) => setFile(e.target.files[0])}
                    className="h-12 text-base cursor-pointer"
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  />
                  <p className="text-sm text-muted-foreground mt-2">
                    Accepts PDF, DOC, JPG, PNG files
                  </p>
                </div>
              </div>
            </div>

            {/* Remarks */}
            <div className="space-y-2">
              <Label className="text-base font-semibold">Remarks (optional)</Label>
              <Textarea
                value={form.remarks}
                onChange={(e) => handleChange("remarks", e.target.value.toUpperCase())}
                placeholder="Any additional notes..."
                className="text-base uppercase"
              />
            </div>

            {/* Submit */}
            <div className="flex gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(-1)}
                className="h-14 px-8 text-lg"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="h-14 px-8 text-lg font-semibold bg-primary hover:bg-primary/90 flex-1"
              >
                {isSubmitting ? (
                  <Loader2 className="w-6 h-6 mr-2 animate-spin" />
                ) : (
                  <FilePlus className="w-6 h-6 mr-2" />
                )}
                Save Transaction
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function generateControlNumber(receivedDate, documents) {
  const [year, month, day] = (receivedDate || "").split("-");
  if (!year || !month || !day) return "";

  const prefix = `${month}${day}`;
  const suffixes = documents
    .filter((doc) => doc.received_date === receivedDate && typeof doc.control_number === "string")
    .map((doc) => doc.control_number)
    .filter((controlNo) => controlNo.startsWith(prefix) && controlNo.length >= 7)
    .map((controlNo) => Number(controlNo.slice(4)))
    .filter((value) => Number.isFinite(value));

  const nextSeq = (suffixes.length ? Math.max(...suffixes) : 0) + 1;
  return `${prefix}${String(nextSeq).padStart(3, "0")}`;
}

function toTitleCase(value) {
  return (value || "").toUpperCase();
}
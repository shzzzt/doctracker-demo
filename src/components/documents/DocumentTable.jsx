import { useNavigate } from "react-router-dom";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import StatusBadge from "./StatusBadge";
import { format } from "date-fns";
import { FileText, Eye } from "lucide-react";

export default function DocumentTable({ documents, isLoading, onRequestorClick }) {
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!documents || documents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <FileText className="w-16 h-16 mb-4 opacity-30" />
        <p className="text-lg font-medium">No documents found</p>
        <p className="text-sm">Documents will appear here once created</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-primary/5 hover:bg-primary/5">
            <TableHead className="font-bold text-sm text-foreground">REQUESTOR</TableHead>
            <TableHead className="font-bold text-sm text-foreground">DATE</TableHead>
            <TableHead className="font-bold text-sm text-foreground">PARTICULARS</TableHead>
            <TableHead className="font-bold text-sm text-foreground">OFFICE</TableHead>
            <TableHead className="font-bold text-sm text-foreground">STATUS</TableHead>
            <TableHead className="font-bold text-sm text-foreground text-center">ACTION</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {documents.map((doc) => (
            <TableRow
              key={doc.id}
              className="hover:bg-accent transition-colors text-base"
            >
              <TableCell
                onClick={() => onRequestorClick?.(doc.requestor)}
                className="font-semibold text-primary cursor-pointer hover:underline"
              >
                {doc.requestor || "—"}
              </TableCell>
              <TableCell>
                {doc.received_date ? format(new Date(doc.received_date), "MM/dd/yyyy") : "—"}
              </TableCell>
              <TableCell className="max-w-[300px]">
                <p className="truncate font-medium">{doc.particulars}</p>
                <p className="text-xs text-muted-foreground">{doc.classification}</p>
              </TableCell>
              <TableCell>{doc.source_office || "—"}</TableCell>
              <TableCell>
                <StatusBadge status={doc.status} />
              </TableCell>
              <TableCell className="text-center">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigate(`/documents/${doc.id}`)}
                  className="h-8 px-3 text-xs"
                >
                  <Eye className="w-4 h-4 mr-1" />
                  View
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
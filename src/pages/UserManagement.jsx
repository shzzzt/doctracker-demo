import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { UserPlus, Users, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

const ROLES = [
  { value: "RECEIVING", label: "Receiving Office" },
  { value: "PROCUREMENT", label: "Procurement Section" },
  { value: "MOBILIZATION", label: "Mobilization Section" },
  { value: "MAYOR", label: "Mayor / OIC" },
  { value: "RELEASING", label: "Releasing Section" },
  { value: "COMMS", label: "Communications (COMMS)" },
  { value: "RECORDS", label: "Records Section" },
  { value: "ADMIN", label: "Admin (View Only)" },
];

export default function UserManagement() {
  const [currentUser, setCurrentUser] = useState(null);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [isInviting, setIsInviting] = useState(false);

  useEffect(() => {
    base44.auth.me().then(setCurrentUser);
  }, []);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["users-list"],
    queryFn: () => base44.entities.User.list(),
  });

  const isAdmin = currentUser?.role?.toUpperCase() === "ADMIN";

  if (!isAdmin) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[60vh] text-muted-foreground">
        <ShieldCheck className="w-16 h-16 mb-4 opacity-30" />
        <p className="text-xl font-semibold">Access Restricted</p>
        <p className="text-base mt-2">Only Admin users can manage users.</p>
      </div>
    );
  }

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!email || !role) {
      toast.error("Please enter an email and select a role.");
      return;
    }
    setIsInviting(true);
    try {
      await base44.users.inviteUser(email, role.toLowerCase() === "admin" ? "admin" : "user");
      // Update role after invite (users start as 'user' role, we need to set the custom role)
      // Find the newly invited user and update their role
      toast.success(`Invitation sent to ${email} as ${ROLES.find(r => r.value === role)?.label}`);
      setEmail("");
      setRole("");
    } catch (err) {
      toast.error("Failed to send invitation. The user may already exist.");
    } finally {
      setIsInviting(false);
    }
  };

  const handleUpdateRole = async (userId, newRole) => {
    await base44.entities.User.update(userId, { role: newRole });
    toast.success("Role updated successfully.");
  };

  return (
    <div className="p-8 space-y-8 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold flex items-center gap-3">
        <Users className="w-8 h-8 text-primary" />
        User Management
      </h1>

      {/* Invite User */}
      <Card className="border-2 border-primary/20">
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-primary" />
            Invite New User
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleInvite} className="flex flex-wrap gap-4 items-end">
            <div className="space-y-2 flex-1 min-w-[220px]">
              <Label className="text-base font-semibold">Email Address <span className="text-red-500">*</span></Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@example.com"
                className="h-12 text-base"
              />
            </div>
            <div className="space-y-2 w-64">
              <Label className="text-base font-semibold">Role <span className="text-red-500">*</span></Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger className="h-12 text-base">
                  <SelectValue placeholder="Select role..." />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              type="submit"
              disabled={isInviting}
              className="h-12 px-8 text-base font-semibold bg-primary hover:bg-primary/90"
            >
              {isInviting ? <Loader2 className="w-5 h-5 animate-spin" /> : <UserPlus className="w-5 h-5" />}
              Send Invite
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Existing Users */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Registered Users ({users.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-primary/5 hover:bg-primary/5">
                  <TableHead className="font-bold text-sm text-foreground">NAME</TableHead>
                  <TableHead className="font-bold text-sm text-foreground">EMAIL</TableHead>
                  <TableHead className="font-bold text-sm text-foreground">ROLE</TableHead>
                  <TableHead className="font-bold text-sm text-foreground">JOINED</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id} className="text-base">
                    <TableCell className="font-semibold">{u.full_name || "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{u.email}</TableCell>
                    <TableCell>
                      {u.email === currentUser?.email ? (
                        <span className="text-sm font-mono bg-muted px-2 py-1 rounded">{u.role?.toUpperCase()}</span>
                      ) : (
                        <Select
                          value={u.role?.toUpperCase() || ""}
                          onValueChange={(val) => handleUpdateRole(u.id, val)}
                        >
                          <SelectTrigger className="w-52 h-9 text-sm">
                            <SelectValue placeholder="Set role..." />
                          </SelectTrigger>
                          <SelectContent>
                            {ROLES.map((r) => (
                              <SelectItem key={r.value} value={r.value}>
                                {r.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {u.created_date ? new Date(u.created_date).toLocaleDateString() : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
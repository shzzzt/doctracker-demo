import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { UserCircle, Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";

function initials(name) {
  return (name || "U")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export default function Profile() {
  const queryClient = useQueryClient();
  const [fullName, setFullName] = useState("");
  const [avatarFile, setAvatarFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const { data: currentUser } = useQuery({
    queryKey: ["current-user"],
    queryFn: () => base44.auth.me(),
  });

  useEffect(() => {
    if (!currentUser) return;
    setFullName(currentUser.full_name || "");
    setPreviewUrl(currentUser.avatar_url || "");
  }, [currentUser]);

  const handleFileChange = (file) => {
    if (!file) return;
    setAvatarFile(file);
    const localPreview = URL.createObjectURL(file);
    setPreviewUrl(localPreview);
  };

  const handleSave = async () => {
    if (!currentUser?.id) return;

    setIsSaving(true);
    try {
      let avatarUrl = currentUser.avatar_url || "";
      if (avatarFile) {
        const result = await base44.integrations.Core.UploadFile({ file: avatarFile });
        avatarUrl = result.file_url;
      }

      await base44.entities.User.update(currentUser.id, {
        full_name: fullName.trim() || currentUser.full_name,
        avatar_url: avatarUrl,
      });

      await queryClient.invalidateQueries({ queryKey: ["current-user"] });
      toast.success("Profile updated successfully");
    } catch {
      toast.error("Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentUser?.id) return;

    if (!newPassword || !confirmPassword) {
      toast.error("Please fill in new password and confirmation");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("New password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Password confirmation does not match");
      return;
    }
    if (currentUser.password && currentUser.password !== currentPassword) {
      toast.error("Current password is incorrect");
      return;
    }

    setIsChangingPassword(true);
    try {
      await base44.entities.User.update(currentUser.id, {
        password: newPassword,
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      await queryClient.invalidateQueries({ queryKey: ["current-user"] });
      toast.success("Password updated successfully");
    } catch {
      toast.error("Failed to update password");
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold flex items-center gap-2">
        <UserCircle className="w-8 h-8 text-primary" />
        My Profile
      </h1>

      <Card>
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20 border-2 border-border">
              <AvatarImage src={previewUrl} alt={fullName || "User"} />
              <AvatarFallback className="text-lg font-bold">{initials(fullName)}</AvatarFallback>
            </Avatar>
            <div className="space-y-2">
              <Label>Profile Picture</Label>
              <Input
                type="file"
                accept=".png,.jpg,.jpeg,.webp"
                onChange={(e) => handleFileChange(e.target.files?.[0])}
                className="max-w-sm"
              />
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Upload className="w-3.5 h-3.5" />
                Upload JPG, PNG, or WEBP
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={currentUser?.email || ""} readOnly />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Input value={currentUser?.role || ""} readOnly />
            </div>
            <div className="space-y-2">
              <Label>Section</Label>
              <Input value={currentUser?.section || ""} readOnly />
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={isSaving || !currentUser}>
              {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Save Profile
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Current Password</Label>
              <Input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
              />
            </div>
            <div />
            <div className="space-y-2">
              <Label>New Password</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 6 characters"
              />
            </div>
            <div className="space-y-2">
              <Label>Confirm New Password</Label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleChangePassword} disabled={isChangingPassword || !currentUser}>
              {isChangingPassword ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Update Password
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

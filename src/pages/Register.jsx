import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { UserPlus } from "lucide-react";
import { toast } from "sonner";

export default function Register() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.full_name || !form.email || !form.password || !form.confirmPassword) {
      toast.error("Please complete all required fields");
      return;
    }

    if (form.password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    if (form.password !== form.confirmPassword) {
      toast.error("Password confirmation does not match");
      return;
    }

    setIsSubmitting(true);
    try {
      const existing = await base44.entities.User.filter({ email: form.email.toLowerCase().trim() });
      if (existing.length > 0) {
        toast.error("Email is already registered");
        setIsSubmitting(false);
        return;
      }

      await base44.entities.User.create({
        full_name: form.full_name,
        email: form.email.toLowerCase().trim(),
        role: "USER",
        password: form.password,
        section: "GENERAL",
      });

      toast.success("Registration successful. Wait for admin role assignment.");
      navigate("/login");
    } catch {
      toast.error("Failed to register account");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <Card className="w-full max-w-xl">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2">
            <UserPlus className="w-6 h-6 text-primary" />
            Register Account
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input value={form.full_name} onChange={(e) => handleChange("full_name", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={(e) => handleChange("email", e.target.value)} />
            </div>
            <div className="rounded-md border bg-muted/40 p-3 text-sm text-muted-foreground">
              Role is assigned by admin after registration.
            </div>
            <div className="space-y-2">
              <Label>Password</Label>
              <Input
                type="password"
                value={form.password}
                onChange={(e) => handleChange("password", e.target.value)}
                placeholder="At least 6 characters"
              />
            </div>
            <div className="space-y-2">
              <Label>Confirm Password</Label>
              <Input
                type="password"
                value={form.confirmPassword}
                onChange={(e) => handleChange("confirmPassword", e.target.value)}
                placeholder="Re-enter password"
              />
            </div>
            <div className="flex items-center justify-between pt-2">
              <Button type="button" variant="outline" onClick={() => navigate("/login")}>Back to Login</Button>
              <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Registering..." : "Register"}</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

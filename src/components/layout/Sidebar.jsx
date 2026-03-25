import { Link, useLocation } from "react-router-dom";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { 
  LayoutDashboard, 
  FileText, 
  FilePlus, 
  LogOut,
  UserCircle,
  Users,
  Menu
} from "lucide-react";
import { base44 } from "@/api/base44Client";

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/" },
  { label: "Transactions", icon: FileText, path: "/documents" },
  { label: "Add New Transaction", icon: FilePlus, path: "/documents/new", receivingOnly: true },
  { label: "Profile", icon: UserCircle, path: "/profile" },
];

const SECTION_LABELS = {
  GENERAL: "General Office",
  COMMS: "Communication Office",
  PROCUREMENT: "Procurement Office",
  MOBILIZATION: "Mobilization Office",
};

export default function Sidebar({ className, onNavigate, isOpen, onToggle }) {
  const location = useLocation();
  const { data: currentUser } = useQuery({
    queryKey: ["current-user"],
    queryFn: () => base44.auth.me(),
  });

  const isAdmin = useMemo(() => currentUser?.role?.toUpperCase() === "ADMIN", [currentUser]);

  const userInitials = useMemo(
    () =>
      (currentUser?.full_name || "U")
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join(""),
    [currentUser]
  );

  const { data: unreadNotifications = [] } = useQuery({
    queryKey: ["unread-notifications", currentUser?.email],
    queryFn: () =>
      base44.entities.Notification.filter(
        { recipient_email: currentUser?.email, is_read: false },
        "-created_date",
        200
      ),
    enabled: !!currentUser?.email,
  });

  return (
    <aside className={cn("w-64 min-h-screen bg-gradient-to-b from-red-600 to-pink-800 text-sidebar-foreground flex flex-col shadow-xl", className)}>
      {/* Profile Header */}
      <div className="p-6 border-b border-sidebar-border">
        <div className="flex items-start gap-3">
          <Link to="/profile" onClick={onNavigate} className="flex items-start gap-3 flex-1 rounded-lg p-1 -m-1 hover:bg-white/10 transition-colors">
            <Avatar className="w-11 h-11 border border-white/30">
              <AvatarImage src={currentUser?.avatar_url} alt={currentUser?.full_name || "User"} />
              <AvatarFallback className="bg-white/20 text-white font-bold text-xs">{userInitials}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h1 className="text-sm font-bold leading-tight">{currentUser?.full_name || "User"}</h1>
              <p className="text-xs text-white/70">{SECTION_LABELS[currentUser?.section] || currentUser?.section || "Office"}</p>
            </div>
          </Link>
          {isOpen && (
            <button
              type="button"
              aria-label="Collapse sidebar"
              onClick={onToggle}
              className="mt-1 h-7 w-7 rounded-md border border-white/20 bg-white/10 hover:bg-white/20 flex items-center justify-center"
            >
              <Menu className="w-3.5 h-3.5 text-white" />
            </button>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {navItems
          .filter((item) => !item.receivingOnly || currentUser?.role?.toUpperCase() === "RECEIVING")
          .map((item) => {
          const isActive = location.pathname === item.path || 
            (item.path !== "/" && location.pathname.startsWith(item.path));
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={onNavigate}
              className={`flex items-center gap-3 px-4 py-3.5 rounded-xl text-base font-medium transition-all ${
                isActive
                  ? "bg-white text-primary shadow-md"
                  : "text-white/90 hover:bg-sidebar-accent"
              }`}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              <span className="flex-1">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Admin: User Management */}
      {isAdmin && (
        <div className="px-4 pb-2">
          <Link
            to="/users"
            onClick={onNavigate}
            className={`flex items-center gap-3 px-4 py-3.5 rounded-xl text-base font-medium transition-all ${
              location.pathname === "/users"
                ? "bg-white text-primary shadow-md"
                : "text-white/90 hover:bg-sidebar-accent"
            }`}
          >
            <Users className="w-5 h-5 flex-shrink-0" />
            <span>Manage Users</span>
          </Link>
        </div>
      )}

      {/* Logout */}
      <div className="p-4 border-t border-sidebar-border">
        <button
          onClick={() => {
            if (onNavigate) onNavigate();
            base44.auth.logout('/login');
          }}
          className="flex items-center gap-3 px-4 py-3 rounded-xl text-white/80 hover:bg-sidebar-accent hover:text-white transition-all w-full text-base font-medium"
        >
          <LogOut className="w-5 h-5" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}
import { useEffect, useState } from "react";
import { Link, Outlet } from "react-router-dom";
import { Bell, Menu } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import Sidebar from "./Sidebar";

export default function AppLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const { data: currentUser } = useQuery({
    queryKey: ["current-user"],
    queryFn: () => base44.auth.me(),
  });

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

  const quickLinks = [
    { label: "Dashboard", path: "/" },
    { label: "Transactions", path: "/documents" },
    ...(currentUser?.role?.toUpperCase() === "RECEIVING"
      ? [{ label: "Add New Transaction", path: "/documents/new" }]
      : []),
    { label: "Notifications", path: "/notifications" },
    { label: "Profile", path: "/profile" },
  ];

  useEffect(() => {
    const media = window.matchMedia("(min-width: 1024px)");
    const syncSidebarDefault = () => {
      setIsSidebarOpen(media.matches);
    };

    syncSidebarDefault();

    if (typeof media.addEventListener === "function") {
      media.addEventListener("change", syncSidebarDefault);
      return () => media.removeEventListener("change", syncSidebarDefault);
    }

    media.addListener(syncSidebarDefault);
    return () => media.removeListener(syncSidebarDefault);
  }, []);

  const handleNavigate = () => {
    if (window.innerWidth < 1024) {
      setIsSidebarOpen(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {!isSidebarOpen && (
        <button
          type="button"
          aria-label="Open sidebar"
          onClick={() => setIsSidebarOpen(true)}
          className="fixed top-4 left-4 z-50 h-8 w-8 rounded-md border bg-card shadow-sm flex items-center justify-center"
        >
          <Menu className="w-4 h-4" />
        </button>
      )}

      {isSidebarOpen && (
        <button
          type="button"
          aria-label="Close sidebar overlay"
          className="fixed inset-0 bg-black/30 z-30 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <div
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 transition-transform duration-300",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <Sidebar
          onNavigate={handleNavigate}
          className="h-full"
          isOpen={isSidebarOpen}
          onToggle={() => setIsSidebarOpen((prev) => !prev)}
        />
      </div>

      <main
        className={cn(
          "min-h-screen transition-all duration-300 flex flex-col",
          isSidebarOpen ? "lg:pl-64" : "lg:pl-0"
        )}
      >
        <div className="w-full max-w-6xl mx-auto flex-1">
          <div className="flex justify-end px-4 sm:px-6 pt-4">
            <Button asChild variant="outline" className="relative">
              <Link to="/notifications">
                <Bell className="w-4 h-4 mr-2" />
                Notifications
                {unreadNotifications.length > 0 && (
                  <span className="absolute -top-2 -right-2 min-w-5 h-5 px-1 rounded-full bg-red-600 text-white text-[10px] font-bold flex items-center justify-center">
                    {unreadNotifications.length}
                  </span>
                )}
              </Link>
            </Button>
          </div>
          <Outlet />
        </div>

        <footer className="border-t bg-background/95">
          <div className="w-full max-w-6xl mx-auto px-6 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">DocTracker</p>
              <p className="text-xs text-muted-foreground">Empowering Women Through Efficient and Inclusive Service Systems</p>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-muted-foreground mr-1">Quick Navigation:</span>
              {quickLinks.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className="px-2.5 py-1 rounded-md border hover:bg-accent transition-colors"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
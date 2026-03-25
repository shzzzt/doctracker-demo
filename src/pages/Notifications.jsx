import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell, CheckCheck } from "lucide-react";
import { format } from "date-fns";

export default function Notifications() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setCurrentUser);
  }, []);

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ["notifications", currentUser?.email],
    queryFn: () =>
      base44.entities.Notification.filter(
        { recipient_email: currentUser?.email },
        "-created_date",
        300
      ),
    enabled: !!currentUser?.email,
  });

  const unread = notifications.filter((item) => !item.is_read);

  const markAsRead = async (notificationId) => {
    await base44.entities.Notification.update(notificationId, { is_read: true, read_at: new Date().toISOString() });
    queryClient.invalidateQueries({ queryKey: ["notifications", currentUser?.email] });
    queryClient.invalidateQueries({ queryKey: ["unread-notifications", currentUser?.email] });
  };

  const markAllAsRead = async () => {
    await Promise.all(
      unread.map((item) =>
        base44.entities.Notification.update(item.id, {
          is_read: true,
          read_at: new Date().toISOString(),
        })
      )
    );
    queryClient.invalidateQueries({ queryKey: ["notifications", currentUser?.email] });
    queryClient.invalidateQueries({ queryKey: ["unread-notifications", currentUser?.email] });
  };

  return (
    <div className="p-8 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Bell className="w-8 h-8 text-primary" />
          Notifications
        </h1>
        <Button
          variant="outline"
          onClick={markAllAsRead}
          disabled={unread.length === 0}
          className="gap-2"
        >
          <CheckCheck className="w-4 h-4" />
          Mark all as read
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Inbox ({notifications.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Loading notifications...</p>
          ) : notifications.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No notifications yet</p>
          ) : (
            <div className="space-y-3">
              {notifications.map((item) => (
                <div
                  key={item.id}
                  className={`border rounded-xl p-4 cursor-pointer ${item.is_read ? "bg-card" : "bg-primary/5 border-primary/30"}`}
                  onClick={() => item.document_id && navigate(`/documents/${item.document_id}`)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-sm">{item.title}</p>
                      <p className="text-sm text-muted-foreground mt-1">{item.message}</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {item.control_number ? `${item.control_number} • ` : ""}
                        {item.created_date ? format(new Date(item.created_date), "MMM d, yyyy h:mm a") : ""}
                      </p>
                    </div>
                    {!item.is_read && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          markAsRead(item.id);
                        }}
                      >
                        Mark read
                      </Button>
                    )}
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

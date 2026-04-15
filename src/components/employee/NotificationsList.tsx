import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Bell, CheckCheck } from 'lucide-react';

interface NotificationsListProps {
  onBack: () => void;
}

const NotificationsList = ({ onBack }: NotificationsListProps) => {
  const { profileId } = useAuth();
  const queryClient = useQueryClient();

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['my-notifications', profileId],
    enabled: !!profileId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('employee_id', profileId!)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

  const markAllRead = async () => {
    if (!profileId) return;
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('employee_id', profileId)
      .eq('read', false);
    queryClient.invalidateQueries({ queryKey: ['my-notifications', profileId] });
    queryClient.invalidateQueries({ queryKey: ['unread-notifications', profileId] });
  };

  const markRead = async (id: string) => {
    await supabase.from('notifications').update({ read: true }).eq('id', id);
    queryClient.invalidateQueries({ queryKey: ['my-notifications', profileId] });
    queryClient.invalidateQueries({ queryKey: ['unread-notifications', profileId] });
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" /> Notifications
              {unreadCount > 0 && <Badge variant="destructive" className="text-xs">{unreadCount}</Badge>}
            </CardTitle>
            {unreadCount > 0 && (
              <Button variant="outline" size="sm" onClick={markAllRead}>
                <CheckCheck className="w-4 h-4 mr-1" /> Mark all read
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin h-6 w-6 border-4 border-primary border-t-transparent rounded-full" />
            </div>
          ) : notifications.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No notifications yet.</p>
          ) : (
            <div className="space-y-2">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className={`p-4 rounded-lg border transition-colors cursor-pointer ${
                    n.read ? 'border-border/50 bg-muted/10' : 'border-primary/30 bg-primary/5'
                  }`}
                  onClick={() => !n.read && markRead(n.id)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className={`text-sm font-medium ${n.read ? 'text-muted-foreground' : 'text-foreground'}`}>
                        {n.title}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">{n.message}</p>
                    </div>
                    {!n.read && <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1.5" />}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {new Date(n.created_at).toLocaleDateString('en-IN', {
                      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                    })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default NotificationsList;

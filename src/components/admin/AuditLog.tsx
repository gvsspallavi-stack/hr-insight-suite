import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, ScrollText } from 'lucide-react';

interface AuditLogProps {
  onBack: () => void;
}

const actionColors: Record<string, string> = {
  approve: 'bg-primary/10 text-primary',
  reject: 'bg-destructive/10 text-destructive',
  create: 'bg-primary/10 text-primary',
  update: 'bg-accent/10 text-accent',
  delete: 'bg-destructive/10 text-destructive',
};

const AuditLog = ({ onBack }: AuditLogProps) => {
  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['audit-log'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_log')
        .select('*, profiles!audit_log_admin_id_fkey(full_name)')
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
  });

  const getActionColor = (action: string) => {
    const key = Object.keys(actionColors).find((k) => action.toLowerCase().includes(k));
    return key ? actionColors[key] : 'bg-muted text-muted-foreground';
  };

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ScrollText className="w-5 h-5" /> Audit Log
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin h-6 w-6 border-4 border-primary border-t-transparent rounded-full" />
            </div>
          ) : logs.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No actions recorded yet.</p>
          ) : (
            <div className="space-y-2">
              {logs.map((log: any) => (
                <div key={log.id} className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors">
                  <div className="shrink-0 mt-0.5">
                    <Badge className={`text-xs ${getActionColor(log.action)}`}>{log.action}</Badge>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-foreground">
                      <span className="font-medium">{log.profiles?.full_name || 'System'}</span>
                      {' — '}
                      <span className="text-muted-foreground">{log.target_table}</span>
                    </p>
                    {log.details && Object.keys(log.details).length > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {Object.entries(log.details).map(([k, v]) => `${k}: ${v}`).join(' • ')}
                      </p>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground shrink-0">
                    {new Date(log.created_at).toLocaleDateString('en-IN', {
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

export default AuditLog;

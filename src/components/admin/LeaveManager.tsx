import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, ClipboardList, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

interface LeaveManagerProps {
  onBack: () => void;
}

const LeaveManager = ({ onBack }: LeaveManagerProps) => {
  const { profileId } = useAuth();
  const queryClient = useQueryClient();

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['all-leave-requests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leave_requests')
        .select('*, profiles!leave_requests_employee_id_fkey(full_name, department)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const handleAction = async (id: string, status: 'approved' | 'rejected', request: any) => {
    const { error } = await supabase
      .from('leave_requests')
      .update({ approval_status: status, approved_by: profileId })
      .eq('id', id);

    if (error) { toast.error(error.message); return; }

    // If approved, update leave balance
    if (status === 'approved') {
      const startDate = new Date(request.start_date);
      const endDate = new Date(request.end_date);
      if (endDate < startDate) { toast.error('Invalid dates: end date is before start date'); return; }
      const days = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1);
      const year = new Date().getFullYear(); // Always use current year for balance tracking

      // Get or create leave balance
      let { data: balance } = await supabase
        .from('leave_balances')
        .select('*')
        .eq('employee_id', request.employee_id)
        .eq('year', year)
        .single();

      if (!balance) {
        const { data: newBalance } = await supabase
          .from('leave_balances')
          .insert({ employee_id: request.employee_id, year, casual_leave_total: 12, sick_leave_total: 12, casual_leave_used: 0, sick_leave_used: 0 })
          .select()
          .single();
        balance = newBalance;
      }

      if (balance) {
        const leaveType = request.leave_type?.toLowerCase();
        let lopDays = 0;

        if (leaveType === 'sick') {
          // Sick leave: 12 days per year, use anytime
          const remaining = balance.sick_leave_total - balance.sick_leave_used;
          const usable = Math.min(days, remaining);
          lopDays = days - usable;
          await supabase.from('leave_balances').update({ sick_leave_used: balance.sick_leave_used + usable }).eq('id', balance.id);
        } else if (leaveType === 'casual') {
          // CL (Monthly Leave): 1 per month, unused carries forward
          // Total available = months elapsed so far - already used
          const currentMonth = new Date().getMonth() + 1; // 1-12
          const clAccrued = Math.min(currentMonth, balance.casual_leave_total); // max 12
          const remaining = clAccrued - balance.casual_leave_used;
          const usable = Math.min(days, Math.max(remaining, 0));
          lopDays = days - usable;
          await supabase.from('leave_balances').update({ casual_leave_used: balance.casual_leave_used + usable }).eq('id', balance.id);
        } else {
          lopDays = days;
        }

        if (lopDays > 0) {
          await supabase.from('leave_requests').update({ lop_days: lopDays }).eq('id', id);
        }
      }

      // Auto-create attendance records as 'leave' for approved dates
      const current = new Date(request.start_date);
      const end = new Date(request.end_date);
      while (current <= end) {
        const dateStr = current.toISOString().split('T')[0];
        const { data: existing } = await supabase.from('attendance').select('id').eq('employee_id', request.employee_id).eq('date', dateStr).single();
        if (existing) {
          await supabase.from('attendance').update({ status: 'leave' }).eq('id', existing.id);
        } else {
          await supabase.from('attendance').insert({ employee_id: request.employee_id, date: dateStr, status: 'leave', approval_status: 'approved' });
        }
        current.setDate(current.getDate() + 1);
      }
    }

    // Create notification for employee
    await supabase.from('notifications').insert({
      employee_id: request.employee_id,
      title: `Leave ${status.charAt(0).toUpperCase() + status.slice(1)}`,
      message: `Your ${request.leave_type} leave from ${request.start_date} to ${request.end_date} has been ${status}.`,
    });

    // Audit log
    if (profileId) {
      await supabase.from('audit_log').insert({
        admin_id: profileId,
        action: `Leave ${status}`,
        target_table: 'leave_requests',
        target_id: id,
        details: { employee_id: request.employee_id, leave_type: request.leave_type, start_date: request.start_date, end_date: request.end_date },
      });
    }

    toast.success(`Leave ${status}`);
    queryClient.invalidateQueries({ queryKey: ['all-leave-requests'] });
  };

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-warning text-warning-foreground',
      approved: 'bg-success text-success-foreground',
      rejected: 'bg-destructive text-destructive-foreground',
    };
    return <Badge className={colors[status] || 'bg-muted'}>{status.charAt(0).toUpperCase() + status.slice(1)}</Badge>;
  };

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5" /> Leave Requests
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin h-6 w-6 border-4 border-primary border-t-transparent rounded-full" />
            </div>
          ) : requests.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No leave requests.</p>
          ) : (
            <div className="space-y-3">
              {requests.map((req: any) => (
                <div key={req.id} className="p-4 rounded-lg border border-border space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-foreground">{req.profiles?.full_name || 'Unknown'}</p>
                      <p className="text-xs text-muted-foreground">{req.profiles?.department || '—'}</p>
                    </div>
                    {statusBadge(req.approval_status)}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
                    <div><span className="text-muted-foreground">Type:</span> <span className="font-medium">{req.leave_type}</span></div>
                    <div><span className="text-muted-foreground">From:</span> <span className="font-medium">{req.start_date}</span></div>
                    <div><span className="text-muted-foreground">To:</span> <span className="font-medium">{req.end_date}</span></div>
                    {req.lop_days > 0 && <div><span className="text-muted-foreground">LOP:</span> <span className="font-medium text-destructive">{req.lop_days} days</span></div>}
                  </div>
                  {req.reason && <p className="text-sm text-muted-foreground">Reason: {req.reason}</p>}
                  {req.approval_status === 'pending' && (
                    <div className="flex gap-2 pt-1">
                      <Button size="sm" className="bg-success hover:bg-success/90 text-success-foreground" onClick={() => handleAction(req.id, 'approved', req)}>
                        <Check className="w-4 h-4 mr-1" /> Approve
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => handleAction(req.id, 'rejected', req)}>
                        <X className="w-4 h-4 mr-1" /> Reject
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default LeaveManager;

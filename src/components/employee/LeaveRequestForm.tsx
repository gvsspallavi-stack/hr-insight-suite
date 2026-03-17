import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, ClipboardList, Send } from 'lucide-react';
import { toast } from 'sonner';

interface LeaveRequestFormProps {
  onBack: () => void;
}

const LeaveRequestForm = ({ onBack }: LeaveRequestFormProps) => {
  const { profileId } = useAuth();
  const queryClient = useQueryClient();
  const [leaveType, setLeaveType] = useState('casual');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const currentYear = new Date().getFullYear();

  const { data: balance } = useQuery({
    queryKey: ['my-leave-balance', profileId, currentYear],
    enabled: !!profileId,
    queryFn: async () => {
      const { data } = await supabase
        .from('leave_balances')
        .select('*')
        .eq('employee_id', profileId!)
        .eq('year', currentYear)
        .maybeSingle();
      return data;
    },
  });

  const { data: myLeaves = [] } = useQuery({
    queryKey: ['my-leaves', profileId],
    enabled: !!profileId,
    queryFn: async () => {
      const { data } = await supabase
        .from('leave_requests')
        .select('*')
        .eq('employee_id', profileId!)
        .order('created_at', { ascending: false });
      return data || [];
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileId || !startDate || !endDate) return;
    if (new Date(endDate) < new Date(startDate)) {
      toast.error('End date must be on or after start date');
      return;
    }
    setSubmitting(true);

    const { error } = await supabase.from('leave_requests').insert({
      employee_id: profileId,
      leave_type: leaveType,
      start_date: startDate,
      end_date: endDate,
      reason,
    });

    if (error) { toast.error(error.message); }
    else {
      toast.success('Leave request submitted');
      setStartDate(''); setEndDate(''); setReason('');
      queryClient.invalidateQueries({ queryKey: ['my-leaves'] });
    }
    setSubmitting(false);
  };

  const approvedCurrentYearLeaves = myLeaves.filter((leave: any) => {
    if (leave.approval_status !== 'approved') return false;
    return new Date(leave.created_at).getFullYear() === currentYear;
  });

  const getRequestedDays = (leave: any) => {
    const start = new Date(leave.start_date);
    const end = new Date(leave.end_date);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return 1;
    return Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
  };

  const fallbackSickUsed = approvedCurrentYearLeaves
    .filter((leave: any) => leave.leave_type?.toLowerCase() === 'sick')
    .reduce((total: number, leave: any) => total + getRequestedDays(leave), 0);

  const fallbackCasualUsed = approvedCurrentYearLeaves
    .filter((leave: any) => leave.leave_type?.toLowerCase() === 'casual')
    .reduce((total: number, leave: any) => total + getRequestedDays(leave), 0);

  const sickUsed = balance?.sick_leave_used ?? fallbackSickUsed;
  const casualUsed = balance?.casual_leave_used ?? fallbackCasualUsed;
  const sickTotal = balance?.sick_leave_total ?? 12;
  const casualTotal = balance?.casual_leave_total ?? 12;

  const sickRemaining = Math.max(0, sickTotal - sickUsed);
  const currentMonth = new Date().getMonth() + 1;
  const clAccrued = Math.min(currentMonth, casualTotal);
  const casualRemaining = Math.max(0, clAccrued - casualUsed);

  const statusColors: Record<string, string> = {
    pending: 'bg-warning text-warning-foreground',
    approved: 'bg-success text-success-foreground',
    rejected: 'bg-destructive text-destructive-foreground',
  };

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      {/* Leave Balance */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{casualRemaining}</p>
            <p className="text-sm text-muted-foreground">CL Remaining (Monthly)</p>
            <p className="text-xs text-muted-foreground mt-1">1/month, carries forward</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{sickRemaining}</p>
            <p className="text-sm text-muted-foreground">Sick Leave Remaining</p>
            <p className="text-xs text-muted-foreground mt-1">12/year, use anytime</p>
          </CardContent>
        </Card>
      </div>

      {/* Apply Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5" /> Apply for Leave
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label>Leave Type</Label>
                <Select value={leaveType} onValueChange={setLeaveType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="casual">CL - Monthly Leave ({casualRemaining} left)</SelectItem>
                    <SelectItem value="sick">Sick Leave ({sickRemaining} left)</SelectItem>
                    <SelectItem value="other">Other (LOP)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Start Date</Label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
              </div>
              <div className="space-y-1">
                <Label>End Date</Label>
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Reason / Purpose <span className="text-destructive">*</span></Label>
              <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Purpose of leave (required)..." required />
            </div>
            <Button type="submit" disabled={submitting}>
              <Send className="w-4 h-4 mr-1" /> Submit Request
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* My Leave History */}
      <Card>
        <CardHeader><CardTitle>My Leave History</CardTitle></CardHeader>
        <CardContent>
          {myLeaves.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">No leave requests yet.</p>
          ) : (
            <div className="space-y-2">
              {myLeaves.map((l: any) => (
                <div key={l.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
                  <div>
                    <p className="font-medium text-foreground text-sm">{l.leave_type} — {l.start_date} to {l.end_date}</p>
                    {l.reason && <p className="text-xs text-muted-foreground">{l.reason}</p>}
                  </div>
                  <Badge className={statusColors[l.approval_status] || 'bg-muted'}>
                    {l.approval_status.charAt(0).toUpperCase() + l.approval_status.slice(1)}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default LeaveRequestForm;

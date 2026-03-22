import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DateInput } from '@/components/ui/date-input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, CalendarCheck } from 'lucide-react';
import { toast } from 'sonner';

interface AttendanceManagerProps {
  onBack: () => void;
}

const statusColors: Record<string, string> = {
  present: 'bg-success text-success-foreground',
  absent: 'bg-destructive text-destructive-foreground',
  leave: 'bg-warning text-warning-foreground',
  holiday: 'bg-primary text-primary-foreground',
  'not marked': 'bg-muted text-muted-foreground',
};

const AttendanceManager = ({ onBack }: AttendanceManagerProps) => {
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [saving, setSaving] = useState(false);

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*').order('full_name');
      if (error) throw error;
      return data;
    },
  });

  const { data: holidays = [] } = useQuery({
    queryKey: ['holidays'],
    queryFn: async () => {
      const { data } = await supabase.from('holidays').select('date');
      return data?.map((h: any) => h.date) || [];
    },
  });

  const { data: attendance = [], isLoading } = useQuery({
    queryKey: ['attendance', selectedDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('date', selectedDate);
      if (error) throw error;
      return data;
    },
  });

  const { data: leaveRequests = [] } = useQuery({
    queryKey: ['leaves-for-date', selectedDate],
    queryFn: async () => {
      const { data } = await supabase
        .from('leave_requests')
        .select('employee_id')
        .eq('approval_status', 'approved')
        .lte('start_date', selectedDate)
        .gte('end_date', selectedDate);
      return data || [];
    },
  });

  const isHoliday = holidays.includes(selectedDate);
  const isSunday = new Date(selectedDate + 'T00:00:00').getDay() === 0;

  const getStatus = (empId: string) => {
    if (isHoliday || isSunday) return 'holiday';
    const leaveEmpIds = leaveRequests.map((l: any) => l.employee_id);
    if (leaveEmpIds.includes(empId)) return 'leave';
    const record = attendance.find((a: any) => a.employee_id === empId);
    return record?.status || 'not marked';
  };

  const markAttendance = async (empId: string, status: string) => {
    if (isHoliday || isSunday) return;
    setSaving(true);
    const existing = attendance.find((a: any) => a.employee_id === empId);
    if (existing) {
      await supabase.from('attendance').update({ status }).eq('id', existing.id);
    } else {
      await supabase.from('attendance').insert({ employee_id: empId, date: selectedDate, status, approval_status: 'approved' });
    }
    queryClient.invalidateQueries({ queryKey: ['attendance', selectedDate] });
    setSaving(false);
  };

  const markAllPresent = async () => {
    if (isHoliday || isSunday) { toast.error('Cannot mark attendance on holidays/Sundays'); return; }
    setSaving(true);
    const leaveEmpIds = leaveRequests.map((l: any) => l.employee_id);
    for (const emp of employees) {
      if (leaveEmpIds.includes(emp.id)) continue;
      const existing = attendance.find((a: any) => a.employee_id === emp.id);
      if (!existing) {
        await supabase.from('attendance').insert({ employee_id: emp.id, date: selectedDate, status: 'present', approval_status: 'approved' });
      }
    }
    queryClient.invalidateQueries({ queryKey: ['attendance', selectedDate] });
    toast.success('All employees marked present');
    setSaving(false);
  };

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2">
              <CalendarCheck className="w-5 h-5" /> Daily Attendance
            </CardTitle>
            <div className="flex items-center gap-2">
              <Input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="w-auto" />
              <Button size="sm" onClick={markAllPresent} disabled={saving || isHoliday || isSunday}>
                Mark All Present
              </Button>
            </div>
          </div>
          {(isHoliday || isSunday) && (
            <Badge className="bg-primary text-primary-foreground w-fit mt-2">
              {isSunday ? '🔵 Sunday — Holiday' : '🔵 Official Holiday'}
            </Badge>
          )}
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin h-6 w-6 border-4 border-primary border-t-transparent rounded-full" />
            </div>
          ) : employees.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No employees found.</p>
          ) : (
            <div className="space-y-2">
              {employees.map((emp: any) => {
                const status = getStatus(emp.id);
                return (
                  <div key={emp.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 rounded-lg border border-border gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0">
                        {emp.full_name?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <div>
                        <p className="font-medium text-foreground text-sm">{emp.full_name}</p>
                        <p className="text-xs text-muted-foreground">{emp.department || '—'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={statusColors[status] || 'bg-muted text-muted-foreground'}>
                        {status === 'not marked' ? 'Not Marked' : status.charAt(0).toUpperCase() + status.slice(1)}
                      </Badge>
                      {!isHoliday && !isSunday && status !== 'leave' && (
                        <div className="flex gap-1">
                          <Button size="sm" variant={status === 'present' ? 'default' : 'outline'} className="text-xs h-7 px-3" onClick={() => markAttendance(emp.id, 'present')}>
                            ✅ Present
                          </Button>
                          <Button size="sm" variant={status === 'absent' ? 'destructive' : 'outline'} className="text-xs h-7 px-3" onClick={() => markAttendance(emp.id, 'absent')}>
                            ❌ Absent
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AttendanceManager;

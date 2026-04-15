import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MonthInput } from '@/components/ui/month-input';
import { Button } from '@/components/ui/button';
import { ArrowLeft, BarChart3, Download } from 'lucide-react';
import { toast } from 'sonner';

interface AttendanceReportProps {
  onBack: () => void;
}

const AttendanceReport = ({ onBack }: AttendanceReportProps) => {
  const now = new Date();
  const [month, setMonth] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('id, full_name, department').order('full_name');
      return data || [];
    },
  });

  const { data: attendance = [], isLoading } = useQuery({
    queryKey: ['attendance-report', month],
    queryFn: async () => {
      const { data } = await supabase
        .from('attendance')
        .select('employee_id, status')
        .gte('date', `${month}-01`)
        .lte('date', `${month}-31`);
      return data || [];
    },
  });

  const { data: leaveData = [] } = useQuery({
    queryKey: ['leaves-report', month],
    queryFn: async () => {
      const { data } = await supabase
        .from('leave_requests')
        .select('employee_id, start_date, end_date')
        .eq('approval_status', 'approved')
        .gte('start_date', `${month}-01`)
        .lte('end_date', `${month}-31`);
      return data || [];
    },
  });

  const report = employees.map((emp: any) => {
    const empAttendance = attendance.filter((a: any) => a.employee_id === emp.id);
    const present = empAttendance.filter((a: any) => a.status === 'present').length;
    const absent = empAttendance.filter((a: any) => a.status === 'absent').length;
    const leave = empAttendance.filter((a: any) => a.status === 'leave').length;
    return { ...emp, present, absent, leave, total: present + absent + leave };
  });

  const exportCSV = () => {
    if (report.length === 0) { toast.error('No data to export'); return; }
    const rows = [['Employee', 'Department', 'Present', 'Absent', 'Leave', 'Total Days']];
    report.forEach((r) => {
      rows.push([r.full_name, r.department || '', String(r.present), String(r.absent), String(r.leave), String(r.total)]);
    });
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance-report-${month}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Report exported');
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
              <BarChart3 className="w-5 h-5" /> Monthly Attendance Report
            </CardTitle>
            <div className="flex items-center gap-2">
              <MonthInput value={month} onChange={(e) => setMonth(e.target.value)} className="w-auto" />
              <Button size="sm" variant="outline" onClick={exportCSV}>
                <Download className="w-4 h-4 mr-1" /> CSV
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin h-6 w-6 border-4 border-primary border-t-transparent rounded-full" />
            </div>
          ) : report.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No employees found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="p-2 text-muted-foreground font-medium">Employee</th>
                    <th className="p-2 text-muted-foreground font-medium">Department</th>
                    <th className="p-2 text-muted-foreground font-medium text-center">Present</th>
                    <th className="p-2 text-muted-foreground font-medium text-center">Absent</th>
                    <th className="p-2 text-muted-foreground font-medium text-center">Leave</th>
                    <th className="p-2 text-muted-foreground font-medium text-center">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {report.map((r) => (
                    <tr key={r.id} className="border-b border-border/50 hover:bg-muted/30">
                      <td className="p-2 font-medium text-foreground">{r.full_name}</td>
                      <td className="p-2 text-muted-foreground">{r.department || '—'}</td>
                      <td className="p-2 text-center font-semibold text-primary">{r.present}</td>
                      <td className="p-2 text-center font-semibold text-destructive">{r.absent}</td>
                      <td className="p-2 text-center font-semibold text-accent">{r.leave}</td>
                      <td className="p-2 text-center font-bold text-foreground">{r.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AttendanceReport;

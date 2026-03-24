import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MonthInput } from '@/components/ui/month-input';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, CalendarCheck } from 'lucide-react';

interface MyAttendanceProps {
  onBack: () => void;
}

const statusColors: Record<string, string> = {
  present: 'bg-success text-success-foreground',
  absent: 'bg-destructive text-destructive-foreground',
  leave: 'bg-warning text-warning-foreground',
  holiday: 'bg-primary text-primary-foreground',
};

const MyAttendance = ({ onBack }: MyAttendanceProps) => {
  const { profileId } = useAuth();
  const now = new Date();
  const [month, setMonth] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);

  const { data: records = [], isLoading } = useQuery({
    queryKey: ['my-attendance', profileId, month],
    enabled: !!profileId,
    queryFn: async () => {
      const { data } = await supabase
        .from('attendance')
        .select('*')
        .eq('employee_id', profileId!)
        .gte('date', `${month}-01`)
        .lte('date', `${month}-31`)
        .order('date', { ascending: false });
      return data || [];
    },
  });

  const presentCount = records.filter((r: any) => r.status === 'present').length;
  const absentCount = records.filter((r: any) => r.status === 'absent').length;
  const leaveCount = records.filter((r: any) => r.status === 'leave').length;

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-success">{presentCount}</p><p className="text-xs text-muted-foreground">Present</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-destructive">{absentCount}</p><p className="text-xs text-muted-foreground">Absent</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-warning">{leaveCount}</p><p className="text-xs text-muted-foreground">Leave</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2"><CalendarCheck className="w-5 h-5" /> My Attendance</CardTitle>
            <MonthInput value={month} onChange={(e) => setMonth(e.target.value)} className="w-auto" />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8"><div className="animate-spin h-6 w-6 border-4 border-primary border-t-transparent rounded-full" /></div>
          ) : records.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No attendance records for this month.</p>
          ) : (
            <div className="space-y-2">
              {records.map((r: any) => (
                <div key={r.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
                  <p className="text-sm font-medium text-foreground">{new Date(r.date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}</p>
                  <Badge className={statusColors[r.status] || 'bg-muted'}>{r.status.charAt(0).toUpperCase() + r.status.slice(1)}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MyAttendance;

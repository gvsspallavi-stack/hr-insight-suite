import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { CalendarCheck, ClipboardList, CalendarDays, Bell } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

const DashboardStats = () => {
  const { profileId } = useAuth();
  const currentYear = new Date().getFullYear();
  const currentMonth = `${currentYear}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;

  const { data: leaveBalance } = useQuery({
    queryKey: ['my-leave-balance', profileId, currentYear],
    enabled: !!profileId,
    queryFn: async () => {
      const { data } = await supabase
        .from('leave_balances')
        .select('*')
        .eq('employee_id', profileId!)
        .eq('year', currentYear)
        .single();
      return data;
    },
  });

  const { data: attendanceCount = 0 } = useQuery({
    queryKey: ['my-attendance-month', profileId, currentMonth],
    enabled: !!profileId,
    queryFn: async () => {
      const { count } = await supabase
        .from('attendance')
        .select('*', { count: 'exact', head: true })
        .eq('employee_id', profileId!)
        .eq('status', 'present')
        .gte('date', `${currentMonth}-01`)
        .lte('date', `${currentMonth}-31`);
      return count || 0;
    },
  });

  const { data: nextHoliday } = useQuery({
    queryKey: ['next-holiday'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const { data } = await supabase
        .from('holidays')
        .select('name, date')
        .gte('date', today)
        .order('date', { ascending: true })
        .limit(1)
        .single();
      return data;
    },
  });

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['unread-notifications', profileId],
    enabled: !!profileId,
    queryFn: async () => {
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('employee_id', profileId!)
        .eq('read', false);
      return count || 0;
    },
  });

  const casualRemaining = leaveBalance
    ? leaveBalance.casual_leave_total - leaveBalance.casual_leave_used
    : 12;
  const sickRemaining = leaveBalance
    ? leaveBalance.sick_leave_total - leaveBalance.sick_leave_used
    : 12;

  const stats = [
    {
      label: 'Present This Month',
      value: String(attendanceCount),
      icon: CalendarCheck,
      color: 'text-primary',
    },
    {
      label: 'Leave Balance',
      value: `CL: ${casualRemaining} | SL: ${sickRemaining}`,
      icon: ClipboardList,
      color: 'text-accent',
      small: true,
    },
    {
      label: 'Next Holiday',
      value: nextHoliday?.name || 'None',
      icon: CalendarDays,
      color: 'text-primary',
      sub: nextHoliday?.date
        ? new Date(nextHoliday.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
        : undefined,
    },
    {
      label: 'Notifications',
      value: unreadCount > 0 ? `${unreadCount} unread` : 'All read',
      icon: Bell,
      color: unreadCount > 0 ? 'text-destructive' : 'text-muted-foreground',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <Card key={stat.label} className="border-border/60">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center shrink-0">
              <stat.icon className={`w-6 h-6 ${stat.color}`} />
            </div>
            <div className="min-w-0">
              <p className={`font-bold text-foreground truncate ${stat.small ? 'text-sm' : 'text-xl'}`}>
                {stat.value}
              </p>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              {stat.sub && <p className="text-xs text-muted-foreground">{stat.sub}</p>}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default DashboardStats;

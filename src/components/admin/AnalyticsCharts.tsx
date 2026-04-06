import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend } from 'recharts';

const COLORS = ['hsl(152,56%,40%)', 'hsl(0,72%,51%)', 'hsl(38,92%,50%)', 'hsl(230,65%,52%)', 'hsl(220,15%,70%)'];

const AnalyticsCharts = () => {
  const currentYear = new Date().getFullYear();
  const months = Array.from({ length: 12 }, (_, i) => {
    const m = String(i + 1).padStart(2, '0');
    return `${currentYear}-${m}`;
  });

  const { data: payrollData = [] } = useQuery({
    queryKey: ['payroll-analytics', currentYear],
    queryFn: async () => {
      const { data } = await supabase
        .from('payroll')
        .select('month, net_salary, base_salary, tax_deduction')
        .gte('month', `${currentYear}-01`)
        .lte('month', `${currentYear}-12`);
      return data || [];
    },
  });

  const { data: leaveData = [] } = useQuery({
    queryKey: ['leave-analytics', currentYear],
    queryFn: async () => {
      const { data } = await supabase
        .from('leave_requests')
        .select('leave_type, approval_status, start_date')
        .gte('start_date', `${currentYear}-01-01`);
      return data || [];
    },
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('department');
      return data || [];
    },
  });

  // Payroll trend
  const payrollTrend = months.map((m) => {
    const monthLabel = new Date(`${m}-01`).toLocaleDateString('en-IN', { month: 'short' });
    const monthRecords = payrollData.filter((p: any) => p.month === m);
    const total = monthRecords.reduce((s: number, p: any) => s + Number(p.net_salary), 0);
    return { month: monthLabel, total: Math.round(total / 1000) };
  });

  // Leave breakdown
  const leaveTypes: Record<string, number> = {};
  leaveData.forEach((l: any) => {
    const type = l.leave_type || 'Other';
    leaveTypes[type] = (leaveTypes[type] || 0) + 1;
  });
  const leaveBreakdown = Object.entries(leaveTypes).map(([name, value]) => ({ name, value }));

  // Department distribution
  const deptCounts: Record<string, number> = {};
  employees.forEach((e: any) => {
    const dept = e.department || 'Unassigned';
    deptCounts[dept] = (deptCounts[dept] || 0) + 1;
  });
  const deptData = Object.entries(deptCounts).map(([name, value]) => ({ name, value }));

  // Leave status
  const statusCounts: Record<string, number> = { approved: 0, pending: 0, rejected: 0 };
  leaveData.forEach((l: any) => {
    if (statusCounts[l.approval_status] !== undefined) statusCounts[l.approval_status]++;
  });
  const leaveStatus = Object.entries(statusCounts).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value,
  }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6">
      <Card>
        <CardHeader><CardTitle className="text-sm">Payroll Trend (₹K)</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={payrollTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,15%,88%)" />
              <XAxis dataKey="month" fontSize={11} />
              <YAxis fontSize={11} />
              <Tooltip />
              <Bar dataKey="total" fill="hsl(230,65%,52%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm">Department Distribution</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={deptData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name} (${value})`} fontSize={11}>
                {deptData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm">Leave Types Breakdown</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={leaveBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name} (${value})`} fontSize={11}>
                {leaveBreakdown.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm">Leave Request Status</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={leaveStatus}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,15%,88%)" />
              <XAxis dataKey="name" fontSize={11} />
              <YAxis fontSize={11} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {leaveStatus.map((entry, i) => (
                  <Cell key={i} fill={entry.name === 'Approved' ? 'hsl(152,56%,40%)' : entry.name === 'Rejected' ? 'hsl(0,72%,51%)' : 'hsl(38,92%,50%)'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};

export default AnalyticsCharts;

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { MonthInput } from '@/components/ui/month-input';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, DollarSign, Calculator } from 'lucide-react';
import { toast } from 'sonner';

interface PayrollManagerProps {
  onBack: () => void;
}

const PayrollManager = ({ onBack }: PayrollManagerProps) => {
  const queryClient = useQueryClient();
  const now = new Date();
  const [month, setMonth] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
  const [generating, setGenerating] = useState(false);
  const [taxRate, setTaxRate] = useState(10);

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('*').order('full_name');
      return data || [];
    },
  });

  const { data: payrollRecords = [], isLoading } = useQuery({
    queryKey: ['payroll', month],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payroll')
        .select('*, profiles!payroll_employee_id_fkey(full_name, department)')
        .eq('month', month)
        .order('created_at', { ascending: false });
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

  const getWorkingDays = (yearMonth: string) => {
    const [y, m] = yearMonth.split('-').map(Number);
    const daysInMonth = new Date(y, m, 0).getDate();
    let workingDays = 0;
    const monthHolidays = holidays.filter((d: string) => d.startsWith(yearMonth));

    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(y, m - 1, d);
      const dateStr = date.toISOString().split('T')[0];
      if (date.getDay() !== 0 && !monthHolidays.includes(dateStr)) {
        workingDays++;
      }
    }
    return { workingDays, totalDays: daysInMonth, holidayCount: monthHolidays.length };
  };

  const generatePayroll = async () => {
    setGenerating(true);
    const { workingDays } = getWorkingDays(month);

    for (const emp of employees) {
      const baseSalary = Number((emp as any).base_salary) || 0;
      if (baseSalary === 0) continue;

      // Count attendance
      const { count: presentDays } = await supabase
        .from('attendance')
        .select('*', { count: 'exact', head: true })
        .eq('employee_id', emp.id)
        .eq('status', 'present')
        .gte('date', `${month}-01`)
        .lte('date', `${month}-31`);

      // Count leave days (approved)
      const { data: leaveData } = await supabase
        .from('leave_requests')
        .select('start_date, end_date, lop_days')
        .eq('employee_id', emp.id)
        .eq('approval_status', 'approved')
        .gte('start_date', `${month}-01`)
        .lte('end_date', `${month}-31`);

      let leavesTaken = 0;
      let lopDays = 0;
      (leaveData || []).forEach((l: any) => {
        const start = new Date(l.start_date);
        const end = new Date(l.end_date);
        leavesTaken += Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        lopDays += l.lop_days || 0;
      });

      const dailySalary = baseSalary / workingDays;
      const lopDeduction = lopDays * dailySalary;
      const taxDeduction = (baseSalary * taxRate) / 100;
      const netSalary = baseSalary - lopDeduction - taxDeduction;

      // Upsert payroll record
      const existing = payrollRecords.find((p: any) => p.employee_id === emp.id);
      if (existing) {
        await supabase.from('payroll').update({
          base_salary: baseSalary,
          total_working_days: workingDays,
          leaves_taken: leavesTaken,
          lop_days: lopDays,
          tax_deduction: Math.round(taxDeduction),
          net_salary: Math.round(Math.max(netSalary, 0)),
        }).eq('id', existing.id);
      } else {
        await supabase.from('payroll').insert({
          employee_id: emp.id,
          month,
          base_salary: baseSalary,
          total_working_days: workingDays,
          leaves_taken: leavesTaken,
          lop_days: lopDays,
          tax_deduction: Math.round(taxDeduction),
          net_salary: Math.round(Math.max(netSalary, 0)),
        });
      }
    }

    queryClient.invalidateQueries({ queryKey: ['payroll', month] });
    toast.success('Payroll generated successfully');
    setGenerating(false);
  };

  const { workingDays, totalDays, holidayCount } = getWorkingDays(month);

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5" /> Payroll — {month}
            </CardTitle>
            <div className="flex items-center gap-2">
              <MonthInput value={month} onChange={(e) => setMonth(e.target.value)} className="w-auto" />
              <Input type="number" value={taxRate} onChange={(e) => setTaxRate(Number(e.target.value))} className="w-20" placeholder="Tax %" min={0} max={100} />
              <Button size="sm" onClick={generatePayroll} disabled={generating}>
                <Calculator className="w-4 h-4 mr-1" /> {generating ? 'Generating...' : 'Generate'}
              </Button>
            </div>
          </div>
          <div className="flex gap-4 text-sm text-muted-foreground mt-2">
            <span>Total Days: {totalDays}</span>
            <span>Holidays: {holidayCount}</span>
            <span>Sundays: {Math.floor(totalDays / 7)}</span>
            <span className="font-semibold text-foreground">Working Days: {workingDays}</span>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin h-6 w-6 border-4 border-primary border-t-transparent rounded-full" />
            </div>
          ) : payrollRecords.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No payroll records for this month. Click "Generate" to calculate.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="p-2 text-muted-foreground font-medium">Employee</th>
                    <th className="p-2 text-muted-foreground font-medium">Base Salary</th>
                    <th className="p-2 text-muted-foreground font-medium">Working Days</th>
                    <th className="p-2 text-muted-foreground font-medium">Leaves</th>
                    <th className="p-2 text-muted-foreground font-medium">LOP</th>
                    <th className="p-2 text-muted-foreground font-medium">Tax</th>
                    <th className="p-2 text-muted-foreground font-medium">Net Salary</th>
                  </tr>
                </thead>
                <tbody>
                  {payrollRecords.map((p: any) => (
                    <tr key={p.id} className="border-b border-border/50 hover:bg-muted/30">
                      <td className="p-2">
                        <p className="font-medium text-foreground">{p.profiles?.full_name || '—'}</p>
                        <p className="text-xs text-muted-foreground">{p.profiles?.department || ''}</p>
                      </td>
                      <td className="p-2">₹{Number(p.base_salary).toLocaleString()}</td>
                      <td className="p-2">{p.total_working_days}</td>
                      <td className="p-2">{p.leaves_taken}</td>
                      <td className="p-2">{p.lop_days > 0 ? <span className="text-destructive font-medium">{p.lop_days}</span> : '0'}</td>
                      <td className="p-2">₹{Number(p.tax_deduction).toLocaleString()}</td>
                      <td className="p-2 font-bold text-foreground">₹{Number(p.net_salary).toLocaleString()}</td>
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

export default PayrollManager;

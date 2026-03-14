import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, DollarSign } from 'lucide-react';

interface MyPayslipsProps {
  onBack: () => void;
}

const MyPayslips = ({ onBack }: MyPayslipsProps) => {
  const { profileId } = useAuth();

  const { data: payslips = [], isLoading } = useQuery({
    queryKey: ['my-payslips', profileId],
    enabled: !!profileId,
    queryFn: async () => {
      const { data } = await supabase
        .from('payroll')
        .select('*')
        .eq('employee_id', profileId!)
        .order('month', { ascending: false });
      return data || [];
    },
  });

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><DollarSign className="w-5 h-5" /> My Payslips</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8"><div className="animate-spin h-6 w-6 border-4 border-primary border-t-transparent rounded-full" /></div>
          ) : payslips.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No payslips generated yet.</p>
          ) : (
            <div className="space-y-3">
              {payslips.map((p: any) => (
                <div key={p.id} className="p-4 rounded-lg border border-border space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-foreground">{p.month}</p>
                    <p className="text-lg font-bold text-foreground">₹{Number(p.net_salary).toLocaleString()}</p>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm text-muted-foreground">
                    <div>Base: ₹{Number(p.base_salary).toLocaleString()}</div>
                    <div>Working Days: {p.total_working_days}</div>
                    <div>LOP: {p.lop_days} days</div>
                    <div>Tax: ₹{Number(p.tax_deduction).toLocaleString()}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MyPayslips;

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, DollarSign, Download } from 'lucide-react';
import jsPDF from 'jspdf';

interface MyPayslipsProps {
  onBack: () => void;
}

const MyPayslips = ({ onBack }: MyPayslipsProps) => {
  const { profileId } = useAuth();

  const { data: profile } = useQuery({
    queryKey: ['my-profile', profileId],
    enabled: !!profileId,
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', profileId!)
        .single();
      return data;
    },
  });

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

  const generatePDF = (payslip: any) => {
    const doc = new jsPDF();
    const name = profile?.full_name || 'Employee';
    const dept = profile?.department || '—';
    const designation = profile?.designation || '—';
    const empEmail = profile?.email || '—';

    const baseSalary = Number(payslip.base_salary);
    const netSalary = Number(payslip.net_salary);
    const taxDeduction = Number(payslip.tax_deduction);
    const lopDays = payslip.lop_days || 0;
    const workingDays = payslip.total_working_days || 0;
    const leavesTaken = payslip.leaves_taken || 0;
    const lopDeduction = workingDays > 0 ? Math.round((baseSalary / workingDays) * lopDays) : 0;

    // Header
    doc.setFillColor(30, 58, 138); // deep blue
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('WorkSync', 15, 20);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text('Payslip — ' + payslip.month, 15, 30);

    // Employee details
    doc.setTextColor(60, 60, 60);
    doc.setFontSize(10);
    let y = 55;

    const drawRow = (label: string, value: string, rowY: number) => {
      doc.setFont('helvetica', 'bold');
      doc.text(label, 15, rowY);
      doc.setFont('helvetica', 'normal');
      doc.text(value, 70, rowY);
    };

    drawRow('Employee Name:', name, y);
    drawRow('Department:', dept, y + 7);
    drawRow('Designation:', designation, y + 14);
    drawRow('Email:', empEmail, y + 21);

    // Divider
    y = y + 30;
    doc.setDrawColor(200, 200, 200);
    doc.line(15, y, 195, y);

    // Earnings & Deductions Table Header
    y += 10;
    doc.setFillColor(240, 240, 240);
    doc.rect(15, y - 5, 180, 10, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Description', 20, y + 1);
    doc.text('Amount (₹)', 155, y + 1);

    // Earnings
    y += 12;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('Base Salary', 20, y);
    doc.text(baseSalary.toLocaleString('en-IN'), 155, y);

    // Deductions header
    y += 14;
    doc.setFillColor(240, 240, 240);
    doc.rect(15, y - 5, 180, 10, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Deductions', 20, y + 1);
    doc.text('Amount (₹)', 155, y + 1);

    y += 12;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`LOP Deduction (${lopDays} days)`, 20, y);
    doc.text(lopDeduction.toLocaleString('en-IN'), 155, y);

    y += 7;
    doc.text('Tax Deduction', 20, y);
    doc.text(taxDeduction.toLocaleString('en-IN'), 155, y);

    // Summary
    y += 14;
    doc.setDrawColor(200, 200, 200);
    doc.line(15, y, 195, y);
    y += 5;

    const summaryItems = [
      ['Total Working Days', String(workingDays)],
      ['Leaves Taken', String(leavesTaken)],
      ['LOP Days', String(lopDays)],
    ];

    doc.setFontSize(10);
    summaryItems.forEach(([label, value]) => {
      y += 7;
      doc.setFont('helvetica', 'normal');
      doc.text(label, 20, y);
      doc.text(value, 155, y);
    });

    // Net salary
    y += 14;
    doc.setFillColor(30, 58, 138);
    doc.rect(15, y - 6, 180, 12, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('Net Salary', 20, y + 2);
    doc.text('₹ ' + netSalary.toLocaleString('en-IN'), 148, y + 2);

    // Footer
    doc.setTextColor(160, 160, 160);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('This is a system-generated payslip. No signature required.', 15, 280);
    doc.text('Generated on ' + new Date().toLocaleDateString('en-IN'), 150, 280);

    doc.save(`Payslip_${payslip.month}_${name.replace(/\s+/g, '_')}.pdf`);
  };

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
                    <div className="flex items-center gap-3">
                      <p className="text-lg font-bold text-foreground">₹{Number(p.net_salary).toLocaleString()}</p>
                      <Button size="sm" variant="outline" onClick={() => generatePDF(p)}>
                        <Download className="w-4 h-4 mr-1" /> PDF
                      </Button>
                    </div>
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

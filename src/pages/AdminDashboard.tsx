import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Users, CalendarCheck, ClipboardList, DollarSign, LogOut, FolderOpen, Calendar, FileText, User, RefreshCw } from 'lucide-react';
import EmployeeList from '@/components/admin/EmployeeList';
import EmployeeForm from '@/components/admin/EmployeeForm';
import CertificateManager from '@/components/admin/CertificateManager';
import AttendanceManager from '@/components/admin/AttendanceManager';
import LeaveManager from '@/components/admin/LeaveManager';
import PayrollManager from '@/components/admin/PayrollManager';
import HolidayManager from '@/components/admin/HolidayManager';
import ResignationManager from '@/components/admin/ResignationManager';
import MyProfile from '@/components/employee/MyProfile';
import AnalyticsCharts from '@/components/admin/AnalyticsCharts';
import ThemeToggle from '@/components/ThemeToggle';
import { toast } from 'sonner';
import type { Tables } from '@/integrations/supabase/types';

type Profile = Tables<'profiles'>;
type View = 'dashboard' | 'employees' | 'add' | 'edit' | 'certificates' | 'attendance' | 'leaves' | 'payroll' | 'documents' | 'holidays' | 'resignations' | 'my-profile';

const AdminDashboard = () => {
  const { role, user, profileId, loading, signOut } = useAuth();
  const queryClient = useQueryClient();
  const [view, setView] = useState<View>('dashboard');
  const [selectedEmployee, setSelectedEmployee] = useState<Profile | null>(null);

  const today = new Date().toISOString().split('T')[0];
  const currentMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;

  const { data: employeeCount = 0 } = useQuery({
    queryKey: ['employee-count'],
    queryFn: async () => {
      const { count } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
      return count || 0;
    },
  });

  const { data: presentToday = 0 } = useQuery({
    queryKey: ['present-today', today],
    queryFn: async () => {
      const { count } = await supabase.from('attendance').select('*', { count: 'exact', head: true }).eq('date', today).eq('status', 'present');
      return count || 0;
    },
  });

  const { data: pendingLeaves = 0 } = useQuery({
    queryKey: ['pending-leaves-count'],
    queryFn: async () => {
      const { count } = await supabase.from('leave_requests').select('*', { count: 'exact', head: true }).eq('approval_status', 'pending');
      return count || 0;
    },
  });

  const { data: monthlyPayroll = 0 } = useQuery({
    queryKey: ['monthly-payroll', currentMonth],
    queryFn: async () => {
      const { data } = await supabase.from('payroll').select('net_salary').eq('month', currentMonth);
      return data?.reduce((sum: number, p: any) => sum + Number(p.net_salary), 0) || 0;
    },
  });

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (role !== 'admin') return <Navigate to="/auth" replace />;

  const stats = [
    { label: 'Total Employees', value: String(employeeCount), icon: Users, color: 'text-primary' },
    { label: 'Present Today', value: String(presentToday), icon: CalendarCheck, color: 'text-accent' },
    { label: 'Pending Leaves', value: String(pendingLeaves), icon: ClipboardList, color: 'text-warning' },
    { label: 'Monthly Payroll', value: `₹${Number(monthlyPayroll).toLocaleString()}`, icon: DollarSign, color: 'text-success' },
  ];

  const resetLeaveBalances = async () => {
    const year = new Date().getFullYear();
    const { data: existing } = await supabase.from('leave_balances').select('employee_id').eq('year', year);
    const existingIds = new Set((existing || []).map((e: any) => e.employee_id));
    const newBalances = allEmployees
      .filter((e: any) => !existingIds.has(e.id))
      .map((e: any) => ({ employee_id: e.id, year, casual_leave_used: 0, sick_leave_used: 0 }));
    if (newBalances.length > 0) {
      await supabase.from('leave_balances').insert(newBalances);
      toast.success(`Created leave balances for ${newBalances.length} employees`);
    } else {
      toast.info('All employees already have leave balances for this year');
    }
  };

  const { data: allEmployees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('id');
      return data || [];
    },
  });

  const modules = [
    { label: 'Employees', desc: 'Manage employee profiles', icon: Users, action: () => setView('employees') },
    { label: 'Attendance', desc: 'Track daily attendance', icon: CalendarCheck, action: () => setView('attendance') },
    { label: 'Leave Requests', desc: 'Approve or reject leaves', icon: ClipboardList, action: () => setView('leaves') },
    { label: 'Payroll', desc: 'Generate salary slips', icon: DollarSign, action: () => setView('payroll') },
    { label: 'Holidays', desc: 'Manage holiday calendar', icon: Calendar, action: () => setView('holidays') },
    { label: 'Documents', desc: 'Upload & manage files', icon: FolderOpen, action: () => setView('employees') },
    { label: 'Resignations', desc: 'Manage resignation requests', icon: FileText, action: () => setView('resignations') },
  ];

  const renderContent = () => {
    switch (view) {
      case 'employees':
        return (
          <EmployeeList
            onAdd={() => { setSelectedEmployee(null); setView('add'); }}
            onEdit={(emp) => { setSelectedEmployee(emp); setView('edit'); }}
            onCertificates={(emp) => { setSelectedEmployee(emp); setView('certificates'); }}
          />
        );
      case 'add':
        return <EmployeeForm onBack={() => setView('employees')} />;
      case 'edit':
        return <EmployeeForm employee={selectedEmployee} onBack={() => setView('employees')} />;
      case 'certificates':
        return selectedEmployee ? (
          <CertificateManager employee={selectedEmployee} onBack={() => setView('employees')} />
        ) : null;
      case 'attendance':
        return <AttendanceManager onBack={() => setView('dashboard')} />;
      case 'leaves':
        return <LeaveManager onBack={() => setView('dashboard')} />;
      case 'payroll':
        return <PayrollManager onBack={() => setView('dashboard')} />;
      case 'holidays':
        return <HolidayManager onBack={() => setView('dashboard')} />;
      case 'resignations':
        return <ResignationManager onBack={() => setView('dashboard')} />;
      case 'my-profile':
        return profileId ? <MyProfile profileId={profileId} onBack={() => setView('dashboard')} /> : null;
      default:
        return (
          <div className="space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {stats.map((stat) => (
                <Card key={stat.label} className="border-border/60">
                  <CardContent className="p-5 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
                      <stat.icon className={`w-6 h-6 ${stat.color}`} />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                      <p className="text-sm text-muted-foreground">{stat.label}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div>
              <h2 className="text-xl font-semibold text-foreground mb-4">Modules</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {modules.map((mod) => (
                  <Card
                    key={mod.label}
                    className="border-border/60 hover:shadow-md transition-shadow cursor-pointer group"
                    onClick={mod.action}
                  >
                    <CardContent className="p-6 flex items-start gap-4">
                      <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                        <mod.icon className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">{mod.label}</h3>
                        <p className="text-sm text-muted-foreground">{mod.desc}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-card border-b border-border shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setView('dashboard')} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <div className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
                WS
              </div>
              <div>
                <h1 className="text-lg font-bold text-foreground">WorkSync Admin</h1>
                <p className="text-xs text-muted-foreground">{user?.email?.split('@')[0]}</p>
              </div>
            </button>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setView('my-profile')}>
              <User className="w-4 h-4 mr-2" /> Profile
            </Button>
            <Button variant="outline" size="sm" onClick={signOut}>
              <LogOut className="w-4 h-4 mr-2" /> Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {renderContent()}
      </main>
    </div>
  );
};

export default AdminDashboard;

import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, CalendarCheck, FileText, DollarSign, LogOut, BarChart3, ClipboardList, FolderOpen } from 'lucide-react';

const AdminDashboard = () => {
  const { role, user, loading, signOut } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (role !== 'admin') return <Navigate to="/auth" replace />;

  const stats = [
    { label: 'Total Employees', value: '—', icon: Users, color: 'text-primary' },
    { label: 'Present Today', value: '—', icon: CalendarCheck, color: 'text-accent' },
    { label: 'Pending Leaves', value: '—', icon: ClipboardList, color: 'hsl(var(--warning))' },
    { label: 'Monthly Payroll', value: '—', icon: DollarSign, color: 'hsl(var(--success))' },
  ];

  const modules = [
    { label: 'Employees', desc: 'Manage employee profiles', icon: Users },
    { label: 'Attendance', desc: 'Track daily attendance', icon: CalendarCheck },
    { label: 'Leave Requests', desc: 'Approve or reject leaves', icon: ClipboardList },
    { label: 'Payroll', desc: 'Generate salary slips', icon: DollarSign },
    { label: 'Documents', desc: 'Upload & manage files', icon: FolderOpen },
    { label: 'Analytics', desc: 'View reports & charts', icon: BarChart3 },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card border-b border-border shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg">
              HR
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">Admin Dashboard</h1>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={signOut}>
            <LogOut className="w-4 h-4 mr-2" /> Sign Out
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <Card key={stat.label} className="border-border/60">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
                  <stat.icon className="w-6 h-6" style={{ color: stat.color.startsWith('hsl') ? stat.color : undefined }} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Modules */}
        <div>
          <h2 className="text-xl font-semibold text-foreground mb-4">Modules</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {modules.map((mod) => (
              <Card key={mod.label} className="border-border/60 hover:shadow-md transition-shadow cursor-pointer group">
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
      </main>
    </div>
  );
};

export default AdminDashboard;

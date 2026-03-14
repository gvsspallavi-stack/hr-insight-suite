import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CalendarCheck, FileText, DollarSign, LogOut, ClipboardList, FolderOpen, User } from 'lucide-react';

const EmployeeDashboard = () => {
  const { role, user, loading, signOut } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (role !== 'employee') return <Navigate to="/auth" replace />;

  const quickActions = [
    { label: 'My Attendance', desc: 'View attendance records', icon: CalendarCheck },
    { label: 'Apply Leave', desc: 'Submit leave request', icon: ClipboardList },
    { label: 'Payslips', desc: 'View salary details', icon: DollarSign },
    { label: 'My Documents', desc: 'View uploaded documents', icon: FolderOpen },
    { label: 'My Profile', desc: 'Update personal info', icon: User },
    { label: 'Resignation', desc: 'Submit resignation', icon: FileText },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card border-b border-border shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent text-accent-foreground flex items-center justify-center font-bold text-lg">
              HR
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">Employee Portal</h1>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={signOut}>
            <LogOut className="w-4 h-4 mr-2" /> Sign Out
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Welcome */}
        <Card className="bg-primary text-primary-foreground border-0">
          <CardContent className="p-6">
            <h2 className="text-2xl font-bold">Welcome back!</h2>
            <p className="text-primary-foreground/80 mt-1">Access your HR services from the portal below.</p>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div>
          <h2 className="text-xl font-semibold text-foreground mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {quickActions.map((action) => (
              <Card key={action.label} className="border-border/60 hover:shadow-md transition-shadow cursor-pointer group">
                <CardContent className="p-6 flex items-start gap-4">
                  <div className="w-11 h-11 rounded-xl bg-accent/10 text-accent flex items-center justify-center group-hover:bg-accent group-hover:text-accent-foreground transition-colors">
                    <action.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{action.label}</h3>
                    <p className="text-sm text-muted-foreground">{action.desc}</p>
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

export default EmployeeDashboard;

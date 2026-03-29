import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CalendarCheck, FileText, DollarSign, LogOut, ClipboardList, FolderOpen, User, ArrowLeft, Eye, Download } from 'lucide-react';
import MyAttendance from '@/components/employee/MyAttendance';
import LeaveRequestForm from '@/components/employee/LeaveRequestForm';
import MyPayslips from '@/components/employee/MyPayslips';
import ResignationForm from '@/components/employee/ResignationForm';
import MyProfile from '@/components/employee/MyProfile';
import { openCertificatePreview } from '@/lib/certificate-preview';

type View = 'dashboard' | 'profile' | 'certificates' | 'attendance' | 'leaves' | 'payslips' | 'resignation';

const EmployeeDashboard = () => {
  const { role, user, profileId, loading, signOut } = useAuth();
  const [view, setView] = useState<View>('dashboard');

  const { data: profile } = useQuery({
    queryKey: ['my-profile', profileId],
    enabled: !!profileId,
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', profileId!).single();
      if (error) throw error;
      return data;
    },
  });

  const { data: certificates = [] } = useQuery({
    queryKey: ['my-certificates', profileId],
    enabled: !!profileId,
    queryFn: async () => {
      const { data, error } = await supabase.from('documents').select('*').eq('employee_id', profileId!).order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (role !== 'employee') return <Navigate to="/auth" replace />;

  const handleView = async (path: string) => {
    await openCertificatePreview(path);
  };

  const handleDownload = async (path: string, docType: string) => {
    const { data, error } = await supabase.storage.from('certificates').download(path);
    if (error || !data) return;
    const url = URL.createObjectURL(data);
    const a = document.createElement('a');
    a.href = url;
    a.download = docType + '.' + path.split('.').pop();
    a.click();
    URL.revokeObjectURL(url);
  };

  const renderContent = () => {
    if (view === 'attendance') return <MyAttendance onBack={() => setView('dashboard')} />;
    if (view === 'leaves') return <LeaveRequestForm onBack={() => setView('dashboard')} />;
    if (view === 'payslips') return <MyPayslips onBack={() => setView('dashboard')} />;
    if (view === 'resignation') return <ResignationForm onBack={() => setView('dashboard')} />;
    if (view === 'profile' && profileId) return <MyProfile profileId={profileId} onBack={() => setView('dashboard')} />;

    if (view === 'certificates') {
      return (
        <div className="space-y-4">
          <button onClick={() => setView('dashboard')} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <Card>
            <CardHeader><CardTitle>My Certificates</CardTitle></CardHeader>
            <CardContent>
              {certificates.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No certificates uploaded yet.</p>
              ) : (
                <div className="space-y-2">
                  {certificates.map((cert) => (
                    <div key={cert.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-card hover:bg-muted/30 transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <FileText className="w-5 h-5 text-primary shrink-0" />
                        <div className="min-w-0">
                          <p className="font-medium text-foreground text-sm truncate">{cert.document_type}</p>
                          <p className="text-xs text-muted-foreground">{new Date(cert.created_at).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleView(cert.file_path)} title="View">
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDownload(cert.file_path, cert.document_type)} title="Download">
                          <Download className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      );
    }

    // Dashboard
    const quickActions = [
      { label: 'My Profile', desc: 'View your information', icon: User, action: () => setView('profile') },
      { label: 'My Certificates', desc: 'View uploaded certificates', icon: FolderOpen, action: () => setView('certificates') },
      { label: 'My Attendance', desc: 'View attendance records', icon: CalendarCheck, action: () => setView('attendance') },
      { label: 'Apply Leave', desc: 'Submit leave request', icon: ClipboardList, action: () => setView('leaves') },
      { label: 'Payslips', desc: 'View salary details', icon: DollarSign, action: () => setView('payslips') },
      { label: 'Resignation', desc: 'Submit resignation', icon: FileText, action: () => setView('resignation') },
    ];

    return (
      <div className="space-y-8">
        <Card className="bg-primary text-primary-foreground border-0">
          <CardContent className="p-6">
            <h2 className="text-2xl font-bold">Welcome, {profile?.full_name || 'Employee'}!</h2>
            <p className="text-primary-foreground/80 mt-1">{profile?.department ? `${profile.department} — ${profile.designation || 'Employee'}` : 'Your employee portal'}</p>
          </CardContent>
        </Card>

        <div>
          <h2 className="text-xl font-semibold text-foreground mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {quickActions.map((action) => (
              <Card key={action.label} className="border-border/60 hover:shadow-md transition-shadow cursor-pointer group" onClick={action.action}>
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
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-card border-b border-border shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setView('dashboard')} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <div className="w-10 h-10 rounded-xl bg-accent text-accent-foreground flex items-center justify-center font-bold text-sm">WS</div>
              <div>
                <h1 className="text-lg font-bold text-foreground">WorkSync Employee</h1>
                <p className="text-xs text-muted-foreground">{user?.email?.split('@')[0]}</p>
              </div>
            </button>
          </div>
          <Button variant="outline" size="sm" onClick={signOut}>
            <LogOut className="w-4 h-4 mr-2" /> Sign Out
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {renderContent()}
      </main>
    </div>
  );
};

export default EmployeeDashboard;

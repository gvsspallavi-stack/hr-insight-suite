import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Shield, User, LogIn, UserPlus, ArrowLeft, KeyRound } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

type AppRole = 'admin' | 'employee';
type View = 'select' | 'login' | 'signup' | 'forgot';

const Auth = () => {
  const { session, role, loading, signIn, signUp } = useAuth();
  const [view, setView] = useState<View>('select');
  const [selectedRole, setSelectedRole] = useState<AppRole>('employee');
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [forgotId, setForgotId] = useState('');

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (session && role) {
    return <Navigate to={role === 'admin' ? '/admin' : '/employee'} replace />;
  }

  const toSignupEmail = (id: string) => {
    const normalized = id.trim().toLowerCase();
    return normalized.includes('@') ? normalized : `${normalized}@worksync.app`;
  };

  const loginEmailCandidates = (id: string) => {
    const normalized = id.trim().toLowerCase();
    if (normalized.includes('@')) return [normalized];
    return [`${normalized}@worksync.app`, `${normalized}@worksync.com`];
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    let lastError: { message: string } | null = null;
    for (const email of loginEmailCandidates(userId)) {
      const { error } = await signIn(email, password);
      if (!error) {
        toast.success('Logged in successfully!');
        setSubmitting(false);
        return;
      }
      lastError = error;
    }

    toast.error(lastError?.message || 'Invalid login credentials');
    setSubmitting(false);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await signUp(toSignupEmail(userId), password, fullName, selectedRole);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Account created successfully! You can now sign in.');
    }
    setSubmitting(false);
  };

  const selectRole = (r: AppRole) => {
    setSelectedRole(r);
    setView('login');
    setUserId('');
    setPassword('');
    setFullName('');
  };

  // Role selection screen
  if (view === 'select') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="w-full max-w-lg space-y-8 text-center">
          <div className="space-y-3">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-primary text-primary-foreground mb-2">
              <Shield className="w-10 h-10" />
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-foreground">WorkSync</h1>
            <p className="text-muted-foreground text-lg">Employee & Workforce Management</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
            <button
              onClick={() => selectRole('employee')}
              className="flex flex-col items-center gap-4 p-8 rounded-2xl border-2 border-border bg-card hover:border-accent hover:shadow-lg transition-all group"
            >
              <div className="w-16 h-16 rounded-2xl bg-accent/10 text-accent flex items-center justify-center group-hover:bg-accent group-hover:text-accent-foreground transition-colors">
                <User className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">Employee Login</h2>
                <p className="text-sm text-muted-foreground mt-1">Access your portal</p>
              </div>
            </button>

            <button
              onClick={() => selectRole('admin')}
              className="flex flex-col items-center gap-4 p-8 rounded-2xl border-2 border-border bg-card hover:border-primary hover:shadow-lg transition-all group"
            >
              <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                <Shield className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">Admin Login</h2>
                <p className="text-sm text-muted-foreground mt-1">Manage workforce</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isAdmin = selectedRole === 'admin';
  const isSignup = view === 'signup';

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Back button */}
        <button
          onClick={() => setView('select')}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to role selection
        </button>

        {/* Brand */}
        <div className="text-center space-y-2">
          <div className={`inline-flex items-center justify-center w-14 h-14 rounded-2xl ${isAdmin ? 'bg-primary text-primary-foreground' : 'bg-accent text-accent-foreground'}`}>
            {isAdmin ? <Shield className="w-7 h-7" /> : <User className="w-7 h-7" />}
          </div>
          <h1 className="text-2xl font-bold text-foreground">
            {isAdmin ? 'Admin' : 'Employee'} {isSignup ? 'Sign Up' : 'Login'}
          </h1>
          <p className="text-muted-foreground">WorkSync</p>
        </div>

        <Card className="shadow-lg border-border/60">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-lg">
              {isSignup ? 'Create your account' : 'Sign in to continue'}
            </CardTitle>
            <CardDescription>
              {isSignup
                ? `Register as ${isAdmin ? 'an admin' : 'an employee'}`
                : `Enter your ${isAdmin ? 'Admin' : 'Employee'} ID and password`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={isSignup ? handleSignup : handleLogin} className="space-y-4">
              {isSignup && (
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="John Doe"
                    required
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="userId">{isAdmin ? 'Admin ID' : 'Employee ID'}</Label>
                <Input
                  id="userId"
                  type="text"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  placeholder={isAdmin ? 'admin01' : 'emp001'}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={6}
                    autoComplete="off"
                  />
              </div>
              <Button
                type="submit"
                className={`w-full ${!isAdmin ? 'bg-accent hover:bg-accent/90 text-accent-foreground' : ''}`}
                size="lg"
                disabled={submitting}
              >
                {submitting ? (
                  <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
                ) : isSignup ? (
                  <><UserPlus className="w-4 h-4 mr-2" /> Create Account</>
                ) : (
                  <><LogIn className="w-4 h-4 mr-2" /> Sign In</>
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => setView(isSignup ? 'login' : 'signup')}
                className={`text-sm font-medium hover:underline ${isAdmin ? 'text-primary' : 'text-accent'}`}
              >
                {isSignup ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;

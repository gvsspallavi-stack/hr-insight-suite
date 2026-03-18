import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { ArrowLeft, Save, Check, ChevronsUpDown } from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import type { Tables } from '@/integrations/supabase/types';

const DEFAULT_DESIGNATIONS = [
  'Professor',
  'Associate Professor',
  'Assistant Professor',
  'Head of Department',
  'Principal',
  'Director',
  'Lecturer',
  'Senior Lecturer',
  'Lab Assistant',
  'Software Engineer',
  'Senior Software Engineer',
  'Manager',
  'Senior Manager',
  'Team Lead',
  'HR Executive',
  'Accountant',
  'Administrative Officer',
  'Clerk',
  'Librarian',
  'Physical Director',
];

type Profile = Tables<'profiles'>;

interface EmployeeFormProps {
  employee?: Profile | null;
  onBack: () => void;
}

const EmployeeForm = ({ employee, onBack }: EmployeeFormProps) => {
  const queryClient = useQueryClient();
  const isEditing = !!employee;
  const [designationOpen, setDesignationOpen] = useState(false);

  // Fetch existing designations from profiles to merge with defaults
  const { data: existingDesignations } = useQuery({
    queryKey: ['designations'],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('designation')
        .not('designation', 'is', null)
        .not('designation', 'eq', '');
      const unique = new Set(data?.map((p) => p.designation!).filter(Boolean) || []);
      DEFAULT_DESIGNATIONS.forEach((d) => unique.add(d));
      return Array.from(unique).sort();
    },
  });

  const [form, setForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    department: '',
    designation: '',
    employment_type: 'full-time',
    joining_date: '',
    base_salary: '',
  });
  const [password, setPassword] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (employee) {
      setForm({
        full_name: employee.full_name || '',
        email: employee.email || '',
        phone: employee.phone || '',
        department: employee.department || '',
        designation: employee.designation || '',
        employment_type: employee.employment_type || 'full-time',
        joining_date: employee.joining_date || '',
        base_salary: String((employee as any).base_salary || ''),
      });
    }
  }, [employee]);

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (isEditing) {
        // Update existing profile
        const { error } = await supabase
          .from('profiles')
          .update({
            full_name: form.full_name,
            email: form.email,
            phone: form.phone,
            department: form.department,
            designation: form.designation,
            employment_type: form.employment_type,
            joining_date: form.joining_date || null,
            base_salary: Number(form.base_salary) || 0,
          } as any)
          .eq('id', employee.id);

        if (error) throw error;
        toast.success('Employee updated successfully!');
      } else {
        // Create new user via signup
        if (!employeeId || !password) {
          toast.error('Employee ID and password are required');
          setSaving(false);
          return;
        }

        const email = `${employeeId.trim().toLowerCase()}@worksync.app`;
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: form.full_name, role: 'employee' },
            emailRedirectTo: window.location.origin,
          },
        });

        if (signUpError) throw signUpError;

        if (signUpData.user) {
          // Retry a few times to wait for trigger
          let profile = null;
          for (let i = 0; i < 5; i++) {
            await new Promise((r) => setTimeout(r, 1000));
            const { data } = await supabase
              .from('profiles')
              .select('id')
              .eq('user_id', signUpData.user.id)
              .single();
            if (data) { profile = data; break; }
          }

          if (profile) {
            const { error: updateError } = await supabase
              .from('profiles')
              .update({
                full_name: form.full_name,
                email: form.email || email,
                phone: form.phone,
                department: form.department,
                designation: form.designation,
                employment_type: form.employment_type,
                joining_date: form.joining_date || null,
                base_salary: Number(form.base_salary) || 0,
              } as any)
              .eq('id', profile.id);
            if (updateError) console.error('Profile update error:', updateError);

            // Create leave balance for current year
            await supabase.from('leave_balances').insert({
              employee_id: profile.id,
              year: new Date().getFullYear(),
            } as any).single();
          } else {
            console.error('Profile not found after signup');
          }
        }

        toast.success(`Employee "${form.full_name}" created with ID: ${employeeId}`);
      }

      queryClient.invalidateQueries({ queryKey: ['employees'] });
      onBack();
    } catch (err: any) {
      toast.error(err.message || 'Something went wrong');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Employees
      </button>

      <Card>
        <CardHeader>
          <CardTitle>{isEditing ? 'Edit Employee' : 'Add New Employee'}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isEditing && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-lg bg-muted/50 border border-border">
                <div className="space-y-2">
                  <Label htmlFor="employeeId">Employee ID *</Label>
                  <Input
                    id="employeeId"
                    value={employeeId}
                    onChange={(e) => setEmployeeId(e.target.value)}
                    placeholder="emp001"
                    required
                  />
                  <p className="text-xs text-muted-foreground">This will be used for login</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password *</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min 6 characters"
                    required
                    minLength={6}
                    autoComplete="new-password"
                    data-lpignore="true"
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">Full Name *</Label>
                <Input id="full_name" value={form.full_name} onChange={(e) => handleChange('full_name', e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={form.email} onChange={(e) => handleChange('email', e.target.value)} placeholder="personal@email.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" value={form.phone} onChange={(e) => { const val = e.target.value.replace(/\D/g, '').slice(0, 10); handleChange('phone', val); }} placeholder="9876543210" maxLength={10} inputMode="numeric" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="department">Department</Label>
                <Input id="department" value={form.department} onChange={(e) => handleChange('department', e.target.value)} placeholder="Engineering" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="designation">Designation</Label>
                <Input id="designation" value={form.designation} onChange={(e) => handleChange('designation', e.target.value)} placeholder="Software Engineer" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="employment_type">Employment Type</Label>
                <Select value={form.employment_type} onValueChange={(v) => handleChange('employment_type', v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full-time">Full Time</SelectItem>
                    <SelectItem value="part-time">Part Time</SelectItem>
                    <SelectItem value="contract">Contract</SelectItem>
                    <SelectItem value="intern">Intern</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="joining_date">Joining Date</Label>
                <Input id="joining_date" type="date" value={form.joining_date} onChange={(e) => handleChange('joining_date', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="base_salary">Monthly Salary (₹)</Label>
                <Input id="base_salary" type="number" value={form.base_salary} onChange={(e) => handleChange('base_salary', e.target.value)} placeholder="e.g. 50000" min={0} />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
                ) : (
                  <><Save className="w-4 h-4 mr-1" /> {isEditing ? 'Update' : 'Create Employee'}</>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default EmployeeForm;

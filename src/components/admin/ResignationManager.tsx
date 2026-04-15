import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, FileText, Check, X } from 'lucide-react';
import { toast } from 'sonner';

interface ResignationManagerProps {
  onBack: () => void;
}

const statusColors: Record<string, string> = {
  pending: 'bg-warning text-warning-foreground',
  approved: 'bg-success text-success-foreground',
  rejected: 'bg-destructive text-destructive-foreground',
};

const ResignationManager = ({ onBack }: ResignationManagerProps) => {
  const queryClient = useQueryClient();

  const { data: resignations = [], isLoading } = useQuery({
    queryKey: ['all-resignations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('resignations')
        .select('*, profiles!resignations_employee_id_fkey(full_name, department, designation)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const handleApproval = async (id: string, field: 'hod_approval' | 'principal_approval' | 'director_approval', status: 'approved' | 'rejected') => {
    const updateData: { 
      hod_approval?: string; 
      principal_approval?: string; 
      director_approval?: string; 
      final_status?: string;
    } = { [field]: status };

    // Check if all stages are approved to set final_status
    const resignation = resignations.find((r: any) => r.id === id);
    if (resignation && status === 'approved') {
      const stages = { 
        hod_approval: resignation.hod_approval, 
        principal_approval: resignation.principal_approval, 
        director_approval: resignation.director_approval, 
        [field]: status 
      };
      if (stages.hod_approval === 'approved' && stages.principal_approval === 'approved' && stages.director_approval === 'approved') {
        updateData.final_status = 'approved';
      }
    }
    if (status === 'rejected') {
      updateData.final_status = 'rejected';
    }

    const { error } = await supabase.from('resignations').update(updateData).eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success(`${field.replace('_approval', '').toUpperCase()} ${status}`);
    queryClient.invalidateQueries({ queryKey: ['all-resignations'] });
  };

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" /> Resignation Requests
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin h-6 w-6 border-4 border-primary border-t-transparent rounded-full" />
            </div>
          ) : resignations.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No resignation requests.</p>
          ) : (
            <div className="space-y-4">
              {resignations.map((res: any) => (
                <div key={res.id} className="p-4 rounded-lg border border-border space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-foreground">{res.profiles?.full_name || 'Unknown'}</p>
                      <p className="text-xs text-muted-foreground">{res.profiles?.department || '—'} • {res.profiles?.designation || '—'}</p>
                      <p className="text-xs text-muted-foreground mt-1">Submitted: {new Date(res.created_at).toLocaleDateString()}</p>
                    </div>
                    <Badge className={statusColors[res.final_status || 'pending']}>
                      {(res.final_status || 'Pending').charAt(0).toUpperCase() + (res.final_status || 'pending').slice(1)}
                    </Badge>
                  </div>

                  {res.resignation_letter && (
                    <div className="p-3 rounded-lg bg-muted/50 border border-border">
                      <p className="text-xs text-muted-foreground mb-1">Resignation Letter</p>
                      <p className="text-sm text-foreground whitespace-pre-wrap">{res.resignation_letter}</p>
                    </div>
                  )}

                  {/* Approval chain */}
                  <div className="grid grid-cols-3 gap-3">
                    {([
                      { label: 'HOD', field: 'hod_approval' as const, status: res.hod_approval },
                      { label: 'Principal', field: 'principal_approval' as const, status: res.principal_approval },
                      { label: 'Director', field: 'director_approval' as const, status: res.director_approval },
                    ] as const).map((step) => (
                      <div key={step.label} className="text-center p-3 rounded-lg border border-border space-y-2">
                        <p className="text-xs text-muted-foreground font-medium">{step.label}</p>
                        <Badge className={statusColors[step.status || 'pending'] + ' text-xs'}>
                          {(step.status || 'Pending').charAt(0).toUpperCase() + (step.status || 'pending').slice(1)}
                        </Badge>
                        {(step.status === 'pending' || !step.status) && res.final_status !== 'rejected' && (
                          <div className="flex gap-1 justify-center">
                            <Button size="sm" className="bg-success hover:bg-success/90 text-success-foreground h-7 text-xs" onClick={() => handleApproval(res.id, step.field, 'approved')}>
                              <Check className="w-3 h-3" />
                            </Button>
                            <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={() => handleApproval(res.id, step.field, 'rejected')}>
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
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

export default ResignationManager;

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, FileText, Send } from 'lucide-react';
import { toast } from 'sonner';

interface ResignationFormProps {
  onBack: () => void;
}

const statusColors: Record<string, string> = {
  pending: 'bg-warning text-warning-foreground',
  approved: 'bg-success text-success-foreground',
  rejected: 'bg-destructive text-destructive-foreground',
};

const ResignationForm = ({ onBack }: ResignationFormProps) => {
  const { profileId } = useAuth();
  const queryClient = useQueryClient();
  const [letter, setLetter] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { data: resignation, isLoading } = useQuery({
    queryKey: ['my-resignation', profileId],
    enabled: !!profileId,
    queryFn: async () => {
      const { data } = await supabase
        .from('resignations')
        .select('*')
        .eq('employee_id', profileId!)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileId || !letter.trim()) return;
    setSubmitting(true);

    const { error } = await supabase.from('resignations').insert({
      employee_id: profileId,
      resignation_letter: letter,
    });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Resignation submitted successfully');
      setLetter('');
      queryClient.invalidateQueries({ queryKey: ['my-resignation'] });
    }
    setSubmitting(false);
  };

  const hasActiveResignation = resignation && resignation.final_status === 'pending';

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      {/* Existing resignation status */}
      {resignation && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="w-5 h-5" /> Resignation Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Overall Status</span>
              <Badge className={statusColors[resignation.final_status || 'pending']}>
                {(resignation.final_status || 'Pending').charAt(0).toUpperCase() + (resignation.final_status || 'pending').slice(1)}
              </Badge>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'HOD', status: resignation.hod_approval },
                { label: 'Principal', status: resignation.principal_approval },
                { label: 'Director', status: resignation.director_approval },
              ].map((step) => (
                <div key={step.label} className="text-center p-3 rounded-lg border border-border">
                  <p className="text-xs text-muted-foreground mb-1">{step.label}</p>
                  <Badge className={statusColors[step.status || 'pending'] + ' text-xs'}>
                    {(step.status || 'Pending').charAt(0).toUpperCase() + (step.status || 'pending').slice(1)}
                  </Badge>
                </div>
              ))}
            </div>
            {resignation.resignation_letter && (
              <div className="p-3 rounded-lg bg-muted/50 border border-border">
                <p className="text-xs text-muted-foreground mb-1">Your Letter</p>
                <p className="text-sm text-foreground whitespace-pre-wrap">{resignation.resignation_letter}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Submit form - only if no active resignation */}
      {!hasActiveResignation && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" /> Submit Resignation
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin h-6 w-6 border-4 border-primary border-t-transparent rounded-full" />
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-foreground">
                    Resignation Letter <span className="text-destructive">*</span>
                  </label>
                  <Textarea
                    value={letter}
                    onChange={(e) => setLetter(e.target.value)}
                    placeholder="Write your resignation letter here..."
                    rows={6}
                    required
                  />
                </div>
                <Button type="submit" variant="destructive" disabled={submitting}>
                  <Send className="w-4 h-4 mr-1" /> {submitting ? 'Submitting...' : 'Submit Resignation'}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ResignationForm;

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Plus, Trash2, Calendar } from 'lucide-react';
import { toast } from 'sonner';

interface HolidayManagerProps {
  onBack: () => void;
}

const HolidayManager = ({ onBack }: HolidayManagerProps) => {
  const queryClient = useQueryClient();
  const [date, setDate] = useState('');
  const [name, setName] = useState('');
  const [adding, setAdding] = useState(false);

  const { data: holidays = [], isLoading } = useQuery({
    queryKey: ['holidays'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('holidays')
        .select('*')
        .order('date', { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !name) return;
    setAdding(true);
    const { error } = await supabase.from('holidays').insert({ date, name });
    if (error) {
      toast.error(error.message.includes('duplicate') ? 'Holiday already exists for this date' : error.message);
    } else {
      toast.success('Holiday added');
      setDate('');
      setName('');
      queryClient.invalidateQueries({ queryKey: ['holidays'] });
    }
    setAdding(false);
  };

  const handleDelete = async (id: string) => {
    await supabase.from('holidays').delete().eq('id', id);
    queryClient.invalidateQueries({ queryKey: ['holidays'] });
    toast.success('Holiday removed');
  };

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" /> Holiday Calendar
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="flex-1 space-y-1">
              <Label htmlFor="hol-date">Date</Label>
              <Input id="hol-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            </div>
            <div className="flex-1 space-y-1">
              <Label htmlFor="hol-name">Holiday Name</Label>
              <Input id="hol-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Republic Day" required />
            </div>
            <div className="flex items-end">
              <Button type="submit" disabled={adding} size="sm">
                <Plus className="w-4 h-4 mr-1" /> Add
              </Button>
            </div>
          </form>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin h-6 w-6 border-4 border-primary border-t-transparent rounded-full" />
            </div>
          ) : holidays.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No holidays added yet.</p>
          ) : (
            <div className="space-y-2">
              {holidays.map((h: any) => (
                <div key={h.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-card hover:bg-muted/30 transition-colors">
                  <div>
                    <p className="font-medium text-foreground">{h.name}</p>
                    <p className="text-sm text-muted-foreground">{new Date(h.date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(h.id)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default HolidayManager;

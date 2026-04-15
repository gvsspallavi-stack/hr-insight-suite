import { useState, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Upload, Download, FileUp } from 'lucide-react';
import { toast } from 'sonner';

interface BulkAttendanceUploadProps {
  onBack: () => void;
}

const BulkAttendanceUpload = ({ onBack }: BulkAttendanceUploadProps) => {
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<{ name: string; date: string; status: string }[]>([]);

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('id, full_name').order('full_name');
      return data || [];
    },
  });

  const downloadTemplate = () => {
    const rows = [['Employee Name', 'Date (YYYY-MM-DD)', 'Status (present/absent/leave)']];
    employees.forEach((emp: any) => {
      const today = new Date().toISOString().split('T')[0];
      rows.push([emp.full_name, today, 'present']);
    });
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'attendance-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n').filter((l) => l.trim());
      const rows = lines.slice(1).map((line) => {
        const cols = line.split(',').map((c) => c.replace(/"/g, '').trim());
        return { name: cols[0], date: cols[1], status: cols[2]?.toLowerCase() };
      }).filter((r) => r.name && r.date && r.status);
      setPreview(rows);
    };
    reader.readAsText(file);
  };

  const handleUpload = async () => {
    if (preview.length === 0) { toast.error('No data to upload'); return; }
    setUploading(true);

    let success = 0;
    let failed = 0;

    for (const row of preview) {
      const emp = employees.find((e: any) =>
        e.full_name.toLowerCase() === row.name.toLowerCase()
      );
      if (!emp) { failed++; continue; }

      const validStatuses = ['present', 'absent', 'leave'];
      if (!validStatuses.includes(row.status)) { failed++; continue; }

      const { data: existing } = await supabase
        .from('attendance')
        .select('id')
        .eq('employee_id', emp.id)
        .eq('date', row.date)
        .single();

      if (existing) {
        await supabase.from('attendance').update({ status: row.status }).eq('id', existing.id);
      } else {
        await supabase.from('attendance').insert({
          employee_id: emp.id,
          date: row.date,
          status: row.status,
          approval_status: 'approved',
        });
      }
      success++;
    }

    queryClient.invalidateQueries({ queryKey: ['attendance'] });
    toast.success(`Uploaded: ${success} records. ${failed > 0 ? `Failed: ${failed}` : ''}`);
    setPreview([]);
    if (fileRef.current) fileRef.current.value = '';
    setUploading(false);
  };

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileUp className="w-5 h-5" /> Bulk Attendance Upload
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="p-4 rounded-lg bg-muted/50 border border-border space-y-3">
            <p className="text-sm text-muted-foreground">
              Download the template CSV, fill in attendance data, then upload it back.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={downloadTemplate}>
                <Download className="w-4 h-4 mr-1" /> Download Template
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            <input
              ref={fileRef}
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 file:cursor-pointer"
            />

            {preview.length > 0 && (
              <>
                <div className="overflow-x-auto max-h-64 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left sticky top-0 bg-card">
                        <th className="p-2 text-muted-foreground font-medium">Employee</th>
                        <th className="p-2 text-muted-foreground font-medium">Date</th>
                        <th className="p-2 text-muted-foreground font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.map((r, i) => (
                        <tr key={i} className="border-b border-border/50">
                          <td className="p-2 text-foreground">{r.name}</td>
                          <td className="p-2 text-foreground">{r.date}</td>
                          <td className="p-2 text-foreground capitalize">{r.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-sm text-muted-foreground">{preview.length} records to upload</p>
                <Button onClick={handleUpload} disabled={uploading}>
                  <Upload className="w-4 h-4 mr-1" /> {uploading ? 'Uploading...' : 'Upload Attendance'}
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BulkAttendanceUpload;

import { useState, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Upload, FileText, Trash2, Download, Eye } from 'lucide-react';
import { toast } from 'sonner';
import type { Tables } from '@/integrations/supabase/types';

type Profile = Tables<'profiles'>;

interface CertificateManagerProps {
  employee: Profile;
  onBack: () => void;
}

const CertificateManager = ({ employee, onBack }: CertificateManagerProps) => {
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [docType, setDocType] = useState('');

  const { data: certificates = [], isLoading } = useQuery({
    queryKey: ['certificates', employee.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('employee_id', employee.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const handleUpload = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file || !docType) {
      toast.error('Please select a file and enter a document type');
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${employee.id}/${Date.now()}_${docType.replace(/\s+/g, '_')}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('certificates')
        .upload(path, file);

      if (uploadError) throw uploadError;

      // Save reference in documents table
      const { error: dbError } = await supabase.from('documents').insert({
        employee_id: employee.id,
        document_type: docType,
        file_path: path,
      });

      if (dbError) throw dbError;

      toast.success('Certificate uploaded!');
      setDocType('');
      if (fileRef.current) fileRef.current.value = '';
      queryClient.invalidateQueries({ queryKey: ['certificates', employee.id] });
    } catch (err: any) {
      toast.error(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string, filePath: string) => {
    if (!confirm('Delete this certificate?')) return;
    await supabase.storage.from('certificates').remove([filePath]);
    await supabase.from('documents').delete().eq('id', id);
    queryClient.invalidateQueries({ queryKey: ['certificates', employee.id] });
    toast.success('Certificate deleted');
  };

  const getPublicUrl = (path: string) => {
    const { data } = supabase.storage.from('certificates').getPublicUrl(path);
    return data.publicUrl;
  };

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Employees
      </button>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
              {employee.full_name?.charAt(0)?.toUpperCase()}
            </div>
            Certificates — {employee.full_name}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Upload section */}
          <div className="p-4 rounded-lg bg-muted/50 border border-border space-y-3">
            <h3 className="font-medium text-foreground text-sm">Upload New Certificate</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
              <div className="space-y-1">
                <Label htmlFor="docType" className="text-xs">Document Type</Label>
                <Input
                  id="docType"
                  value={docType}
                  onChange={(e) => setDocType(e.target.value)}
                  placeholder="e.g. 10th Certificate, Degree"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="file" className="text-xs">File</Label>
                <Input id="file" type="file" ref={fileRef} accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" />
              </div>
              <Button onClick={handleUpload} disabled={uploading} className="h-10">
                {uploading ? (
                  <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
                ) : (
                  <><Upload className="w-4 h-4 mr-1" /> Upload</>
                )}
              </Button>
            </div>
          </div>

          {/* List of certificates */}
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin h-6 w-6 border-4 border-primary border-t-transparent rounded-full" />
            </div>
          ) : certificates.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No certificates uploaded yet.</p>
          ) : (
            <div className="space-y-2">
              {certificates.map((cert) => (
                <div
                  key={cert.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-border bg-card hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <FileText className="w-5 h-5 text-primary shrink-0" />
                    <div className="min-w-0">
                      <p className="font-medium text-foreground text-sm truncate">{cert.document_type}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(cert.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" asChild title="View">
                      <a href={getPublicUrl(cert.file_path)} target="_blank" rel="noopener noreferrer">
                        <Eye className="w-4 h-4" />
                      </a>
                    </Button>
                    <Button variant="ghost" size="icon" asChild title="Download">
                      <a href={getPublicUrl(cert.file_path)} download>
                        <Download className="w-4 h-4" />
                      </a>
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(cert.id, cert.file_path)} title="Delete">
                      <Trash2 className="w-4 h-4 text-destructive" />
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
};

export default CertificateManager;

import { useState, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowLeft, Camera, Pencil, Save, X, User } from 'lucide-react';
import { toast } from 'sonner';

interface MyProfileProps {
  profileId: string;
  onBack: () => void;
}

const MyProfile = ({ profileId, onBack }: MyProfileProps) => {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editing, setEditing] = useState(false);
  const [phone, setPhone] = useState('');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const { data: profile, isLoading } = useQuery({
    queryKey: ['my-profile', profileId],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', profileId).single();
      if (error) throw error;
      setPhone(data.phone || '');
      return data;
    },
  });

  const getPhotoUrl = (path: string | null) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    const { data } = supabase.storage.from('profile-photos').getPublicUrl(path);
    return data.publicUrl;
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }

    setUploading(true);
    const ext = file.name.split('.').pop();
    const filePath = `${profileId}/photo.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('profile-photos')
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      toast.error('Failed to upload photo');
      setUploading(false);
      return;
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ profile_photo: filePath })
      .eq('id', profileId);

    if (updateError) {
      toast.error('Failed to update profile');
    } else {
      toast.success('Profile photo updated');
      queryClient.invalidateQueries({ queryKey: ['my-profile', profileId] });
    }
    setUploading(false);
  };

  const handleSavePhone = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({ phone })
      .eq('id', profileId);

    if (error) {
      toast.error('Failed to update phone');
    } else {
      toast.success('Phone number updated');
      setEditing(false);
      queryClient.invalidateQueries({ queryKey: ['my-profile', profileId] });
    }
    setSaving(false);
  };

  if (isLoading || !profile) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin h-6 w-6 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const initials = profile.full_name
    ?.split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'U';

  const photoUrl = getPhotoUrl(profile.profile_photo);

  const infoFields = [
    { label: 'Email', value: profile.email },
    { label: 'Department', value: profile.department },
    { label: 'Designation', value: profile.designation },
    { label: 'Employment Type', value: profile.employment_type },
    { label: 'Joining Date', value: profile.joining_date ? new Date(profile.joining_date).toLocaleDateString('en-IN') : null },
    { label: 'Base Salary', value: profile.base_salary ? `₹${Number(profile.base_salary).toLocaleString()}` : null },
  ];

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" /> My Profile
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Photo & Name Section */}
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="relative group">
              <Avatar className="w-24 h-24 text-2xl border-2 border-border">
                <AvatarImage src={photoUrl || undefined} alt={profile.full_name} />
                <AvatarFallback className="bg-primary/10 text-primary text-xl font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
              >
                <Camera className="w-6 h-6 text-white" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoUpload}
              />
            </div>
            <div className="text-center sm:text-left">
              <h2 className="text-2xl font-bold text-foreground">{profile.full_name}</h2>
              <p className="text-muted-foreground">{profile.designation || 'Employee'}</p>
              <p className="text-sm text-muted-foreground">{profile.department || ''}</p>
              {uploading && <p className="text-xs text-primary mt-1">Uploading photo...</p>}
            </div>
          </div>

          {/* Phone Section (Editable) */}
          <div className="p-4 rounded-lg border border-border bg-muted/20">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Phone Number</p>
              {!editing ? (
                <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
                  <Pencil className="w-3 h-3 mr-1" /> Edit
                </Button>
              ) : (
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => { setEditing(false); setPhone(profile.phone || ''); }}>
                    <X className="w-3 h-3 mr-1" /> Cancel
                  </Button>
                  <Button size="sm" onClick={handleSavePhone} disabled={saving}>
                    <Save className="w-3 h-3 mr-1" /> {saving ? 'Saving...' : 'Save'}
                  </Button>
                </div>
              )}
            </div>
            {editing ? (
              <Input
                value={phone}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                  setPhone(val);
                }}
                placeholder="9876543210"
                maxLength={10}
                inputMode="numeric"
                className="max-w-xs"
              />
            ) : (
              <p className="text-foreground font-medium">{profile.phone || '—'}</p>
            )}
          </div>

          {/* Read-only Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {infoFields.map((f) => (
              <div key={f.label} className="space-y-1 p-3 rounded-lg bg-muted/10">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{f.label}</p>
                <p className="text-foreground font-medium">{f.value || '—'}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MyProfile;

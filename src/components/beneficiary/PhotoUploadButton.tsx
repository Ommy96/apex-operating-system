import { useRef, useState } from 'react';
import { Camera, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface Props {
  beneficiaryId: string;
  organizationId: string;
  onUploaded: (url: string) => void;
}

export function PhotoUploadButton({ beneficiaryId, organizationId, onUploaded }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handle = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `${organizationId}/${beneficiaryId}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('beneficiary-photos').upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage.from('beneficiary-photos').getPublicUrl(path);
      const { error: updErr } = await supabase.from('beneficiaries').update({ photo_url: publicUrl }).eq('id', beneficiaryId);
      if (updErr) throw updErr;
      onUploaded(publicUrl);
      toast({ title: 'Photo updated' });
    } catch (err: any) {
      toast({ title: 'Upload failed', description: err.message, variant: 'destructive' });
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handle} />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center border-2 border-card shadow-md hover:bg-primary/90 transition disabled:opacity-50"
        aria-label="Change photo"
      >
        {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
      </button>
    </>
  );
}
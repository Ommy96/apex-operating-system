import { useRef, useState } from 'react';
import { Camera, Loader2, Link2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { PHOTO_BUCKET, isValidExternalImageUrl } from '@/lib/photoUrl';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface Props {
  beneficiaryId: string;
  organizationId: string;
  onUploaded: (value: string) => void;
}

export function PhotoUploadButton({ beneficiaryId, organizationId, onUploaded }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [urlOpen, setUrlOpen] = useState(false);
  const [urlValue, setUrlValue] = useState('');
  const [urlError, setUrlError] = useState<string | null>(null);

  const persist = async (value: string) => {
    const { error } = await supabase
      .from('beneficiaries')
      .update({ photo_url: value })
      .eq('id', beneficiaryId);
    if (error) throw error;
    onUploaded(value);
  };

  const handle = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      if (!file.type.startsWith('image/')) throw new Error('Please choose an image file');
      if (file.size > 5 * 1024 * 1024) throw new Error('Image must be 5MB or smaller');

      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
      // Org-prefixed path — storage RLS scopes objects by organisation.
      const path = `${organizationId}/${beneficiaryId}-${Date.now()}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from(PHOTO_BUCKET)
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;

      // Store the PATH, not a public URL — the bucket is private and reads are signed.
      await persist(path);
      toast({ title: 'Photo updated' });
    } catch (err: any) {
      toast({ title: 'Upload failed', description: err.message, variant: 'destructive' });
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const saveUrl = async () => {
    const v = urlValue.trim();
    if (!isValidExternalImageUrl(v)) {
      setUrlError('Enter a full image address starting with https://');
      return;
    }
    setUrlError(null);
    setUploading(true);
    try {
      await persist(v);
      toast({ title: 'Photo link saved' });
      setUrlOpen(false);
      setUrlValue('');
    } catch (err: any) {
      toast({ title: 'Could not save link', description: err.message, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handle} />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            disabled={uploading}
            className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center border-2 border-card shadow-md hover:bg-primary/90 transition disabled:opacity-50"
            aria-label="Change photo"
          >
            {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => inputRef.current?.click()}>
            <Camera className="h-4 w-4 mr-2" /> Upload a photo
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setUrlOpen(true)}>
            <Link2 className="h-4 w-4 mr-2" /> Use an image link
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={urlOpen} onOpenChange={setUrlOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Use an image link</DialogTitle>
            <DialogDescription>
              Paste a direct link to an image. It is displayed as-is and never proxied.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Input
              value={urlValue}
              onChange={(e) => setUrlValue(e.target.value)}
              placeholder="https://example.org/photo.jpg"
            />
            {urlError && <p className="text-xs text-destructive">{urlError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUrlOpen(false)}>Cancel</Button>
            <Button onClick={saveUrl} disabled={uploading}>
              {uploading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Save link
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

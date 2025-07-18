import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { DialogClose } from '@/components/ui/dialog';

interface DocumentLinkFormProps {
  childId: string;
  onSuccess: () => void;
}

export function DocumentLinkForm({ childId, onSuccess }: DocumentLinkFormProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title || !fileUrl || !category) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from('documents')
        .insert({
          child_id: childId,
          title,
          description,
          category,
          file_url: fileUrl,
          file_name: title,
          file_type: 'link',
          uploaded_by: (await supabase.auth.getUser()).data.user?.id
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Document link added successfully",
      });

      onSuccess();
      
      // Reset form
      setTitle('');
      setDescription('');
      setCategory('');
      setFileUrl('');
    } catch (error) {
      console.error('Error adding document link:', error);
      toast({
        title: "Error",
        description: "Failed to add document link",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="title">Title *</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter document title"
          required
        />
      </div>

      <div>
        <Label htmlFor="category">Category *</Label>
        <Select value={category} onValueChange={setCategory} required>
          <SelectTrigger>
            <SelectValue placeholder="Select document category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="profile">Profile</SelectItem>
            <SelectItem value="consent_form">Consent Form</SelectItem>
            <SelectItem value="follow_up">Follow-up Form</SelectItem>
            <SelectItem value="intake_form">Intake Form</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="fileUrl">Document Link *</Label>
        <Input
          id="fileUrl"
          type="url"
          value={fileUrl}
          onChange={(e) => setFileUrl(e.target.value)}
          placeholder="https://example.com/document.pdf"
          required
        />
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Enter document description (optional)"
          rows={3}
        />
      </div>

      <div className="flex justify-end space-x-2">
        <DialogClose asChild>
          <Button type="button" variant="outline">Cancel</Button>
        </DialogClose>
        <Button type="submit" disabled={loading}>
          {loading ? 'Adding...' : 'Add Link'}
        </Button>
      </div>
    </form>
  );
}
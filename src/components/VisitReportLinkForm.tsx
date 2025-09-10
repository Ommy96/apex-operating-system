import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { DialogClose } from '@/components/ui/dialog';

interface VisitReportLinkFormProps {
  childId: string;
  onSuccess: () => void;
}

export function VisitReportLinkForm({ childId, onSuccess }: VisitReportLinkFormProps) {
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
        description: "Visit report link added successfully",
      });

      onSuccess();
      
      // Reset form
      setTitle('');
      setDescription('');
      setCategory('');
      setFileUrl('');
    } catch (error) {
      console.error('Error adding visit report link:', error);
      toast({
        title: "Error",
        description: "Failed to add visit report link",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="title">Report Title *</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter report title"
          required
        />
      </div>

      <div>
        <Label htmlFor="category">Visit Type *</Label>
        <Select value={category} onValueChange={setCategory} required>
          <SelectTrigger>
            <SelectValue placeholder="Select visit type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="home_visit_report">Home Visit Report</SelectItem>
            <SelectItem value="school_visit_report">School Visit Report</SelectItem>
            <SelectItem value="medical_visit_report">Medical Visit Report</SelectItem>
            <SelectItem value="follow_up_visit_report">Follow-up Visit Report</SelectItem>
            <SelectItem value="other_visit_report">Other Visit Report</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="fileUrl">Report Link *</Label>
        <Input
          id="fileUrl"
          type="url"
          value={fileUrl}
          onChange={(e) => setFileUrl(e.target.value)}
          placeholder="https://example.com/visit-report.pdf"
          required
        />
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Enter report description (optional)"
          rows={3}
        />
      </div>

      <div className="flex justify-end space-x-2">
        <DialogClose asChild>
          <Button type="button" variant="outline">Cancel</Button>
        </DialogClose>
        <Button type="submit" disabled={loading}>
          {loading ? 'Adding...' : 'Add Report Link'}
        </Button>
      </div>
    </form>
  );
}
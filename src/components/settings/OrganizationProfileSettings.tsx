import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, Mail, Phone, Globe, MapPin, Save, Loader2, Upload } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useOrganization } from '@/hooks/useOrganization';
import { usePermissions } from '@/hooks/usePermissions';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export function OrganizationProfileSettings() {
  const { currentOrganization, refreshOrganization } = useOrganization();
  const { can, isSuperAdmin } = usePermissions();
  const queryClient = useQueryClient();
  const isAdmin = can.manageSettings || isSuperAdmin;

  const { data: organization, isLoading } = useQuery({
    queryKey: ['organization-details', currentOrganization?.organization_id],
    queryFn: async () => {
      if (!currentOrganization?.organization_id) return null;
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', currentOrganization.organization_id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!currentOrganization?.organization_id,
  });

  const [form, setForm] = useState({
    name: '', email: '', phone: '', address: '', country: '', website: '', description: '', registration_number: '', base_currency: 'KES',
  });

  useEffect(() => {
    if (organization) {
      setForm({
        name: organization.name || '',
        email: organization.email || '',
        phone: organization.phone || '',
        address: organization.address || '',
        country: organization.country || '',
        website: organization.website || '',
        description: organization.description || '',
        registration_number: organization.registration_number || '',
        base_currency: (organization as any).base_currency || 'KES',
      });
    }
  }, [organization]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!currentOrganization?.organization_id) throw new Error('No organization');
      const { error } = await supabase
        .from('organizations')
        .update({ ...form, updated_at: new Date().toISOString() })
        .eq('id', currentOrganization.organization_id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Saved', description: 'Organization profile updated' });
      queryClient.invalidateQueries({ queryKey: ['organization-details'] });
      refreshOrganization();
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  const fields = [
    { id: 'name', label: 'Organization Name', icon: Building2, placeholder: 'Enter organization name' },
    { id: 'email', label: 'Contact Email', icon: Mail, placeholder: 'contact@org.com', type: 'email' },
    { id: 'phone', label: 'Phone Number', icon: Phone, placeholder: '+254 xxx xxx xxx' },
    { id: 'website', label: 'Website', icon: Globe, placeholder: 'https://www.org.com' },
    { id: 'country', label: 'Country', icon: Globe, placeholder: 'Kenya' },
    { id: 'registration_number', label: 'Registration Number', icon: Building2, placeholder: 'ORG-12345' },
    { id: 'base_currency', label: 'Base Currency', icon: Globe, placeholder: 'KES' },
  ];

  return (
    <div className="space-y-6">
      <Card className="border shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Basic Information</CardTitle>
          <CardDescription>Core details about your organization</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-5 md:grid-cols-2">
            {fields.map(field => (
              <div key={field.id} className="space-y-2">
                <Label htmlFor={field.id} className="text-sm font-medium flex items-center gap-2">
                  <field.icon className="h-4 w-4 text-muted-foreground" />
                  {field.label}
                </Label>
                <Input
                  id={field.id}
                  type={field.type || 'text'}
                  value={(form as any)[field.id] || ''}
                  onChange={(e) => setForm(prev => ({ ...prev, [field.id]: e.target.value }))}
                  placeholder={field.placeholder}
                  disabled={!isAdmin}
                />
              </div>
            ))}
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" /> Address
            </Label>
            <Textarea value={form.address} onChange={(e) => setForm(prev => ({ ...prev, address: e.target.value }))} placeholder="Organization address" rows={2} disabled={!isAdmin} />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">Description</Label>
            <Textarea value={form.description} onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))} placeholder="Brief description" rows={3} disabled={!isAdmin} />
          </div>
          {isAdmin && (
            <div className="flex justify-end pt-2">
              <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="gap-2">
                {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save Changes
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

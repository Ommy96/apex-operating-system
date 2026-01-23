import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Bus, ShoppingCart, HeartHandshake, Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface ServicesTabProps {
  child: any;
  isAdmin: boolean;
  onRefresh: () => void;
}

export function ServicesTab({ child, isAdmin, onRefresh }: ServicesTabProps) {
  const [receivesTransport, setReceivesTransport] = useState(child.receives_transport || false);
  const [receivesShopping, setReceivesShopping] = useState(child.receives_shopping || false);
  const [receivesHbc, setReceivesHbc] = useState(child.receives_hbc || false);
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleToggle = (service: 'transport' | 'shopping' | 'hbc', value: boolean) => {
    if (service === 'transport') setReceivesTransport(value);
    if (service === 'shopping') setReceivesShopping(value);
    if (service === 'hbc') setReceivesHbc(value);
    setHasChanges(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('children')
        .update({
          receives_transport: receivesTransport,
          receives_shopping: receivesShopping,
          receives_hbc: receivesHbc,
        })
        .eq('id', child.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Services updated successfully",
      });
      setHasChanges(false);
      onRefresh();
    } catch (error) {
      console.error('Error updating services:', error);
      toast({
        title: "Error",
        description: "Failed to update services",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const services = [
    {
      id: 'transport',
      label: 'School Transport',
      description: 'Child receives transportation support to and from school',
      icon: Bus,
      value: receivesTransport,
      colorClass: 'from-blue-500/10 to-cyan-500/10 border-blue-200',
      iconColorClass: 'text-blue-500 bg-blue-500/10',
    },
    {
      id: 'shopping',
      label: 'Shopping Support',
      description: 'Child receives shopping support for school supplies and essentials',
      icon: ShoppingCart,
      value: receivesShopping,
      colorClass: 'from-emerald-500/10 to-green-500/10 border-emerald-200',
      iconColorClass: 'text-emerald-500 bg-emerald-500/10',
    },
    {
      id: 'hbc',
      label: 'Home-Based Care',
      description: 'Child receives home-based care support and regular check-ins',
      icon: HeartHandshake,
      value: receivesHbc,
      colorClass: 'from-purple-500/10 to-pink-500/10 border-purple-200',
      iconColorClass: 'text-purple-500 bg-purple-500/10',
    },
  ];

  const activeServicesCount = [receivesTransport, receivesShopping, receivesHbc].filter(Boolean).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-xl font-bold">Support Services</h3>
          <p className="text-muted-foreground text-sm">
            {activeServicesCount} active service{activeServicesCount !== 1 ? 's' : ''}
          </p>
        </div>
        {isAdmin && hasChanges && (
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Changes
          </Button>
        )}
      </div>

      <div className="grid gap-4">
        {services.map((service) => {
          const Icon = service.icon;
          return (
            <Card 
              key={service.id} 
              className={`border bg-gradient-to-r ${service.colorClass} shadow-md transition-all ${
                service.value ? 'ring-2 ring-accent/50' : ''
              }`}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-xl ${service.iconColorClass}`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        {service.label}
                        {service.value && (
                          <Badge className="bg-success/90 text-success-foreground text-xs">
                            Active
                          </Badge>
                        )}
                      </CardTitle>
                      <CardDescription className="text-sm">
                        {service.description}
                      </CardDescription>
                    </div>
                  </div>
                  {isAdmin ? (
                    <Switch
                      checked={service.value}
                      onCheckedChange={(checked) => handleToggle(service.id as any, checked)}
                    />
                  ) : (
                    <Badge variant={service.value ? "default" : "secondary"}>
                      {service.value ? 'Yes' : 'No'}
                    </Badge>
                  )}
                </div>
              </CardHeader>
            </Card>
          );
        })}
      </div>

      {/* Service Summary */}
      <Card className="bg-secondary/30 border-dashed">
        <CardContent className="pt-6">
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-2">Service Summary</p>
            <div className="flex justify-center gap-4 flex-wrap">
              {services.map((service) => {
                const Icon = service.icon;
                return (
                  <div 
                    key={service.id}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
                      service.value 
                        ? 'bg-accent/20 text-accent-foreground' 
                        : 'bg-muted/50 text-muted-foreground'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="text-sm font-medium">{service.label}</span>
                    {service.value ? (
                      <Badge className="bg-success text-success-foreground text-xs">✓</Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs">—</Badge>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

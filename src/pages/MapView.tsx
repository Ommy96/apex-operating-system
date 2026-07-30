import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useOrganization } from '@/hooks/useOrganization';
import { BeneficiaryMap } from '@/components/maps/BeneficiaryMap';
import { ProjectCoverageMap } from '@/components/maps/ProjectCoverageMap';
import { MapPin, FolderKanban, Navigation } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';

export default function MapView() {
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.organization_id;

  const { data: checkIns = [] } = useQuery({
    queryKey: ['field-checkins-map', orgId],
    queryFn: async () => {
      const { data } = await supabase
        .from('field_check_ins')
        .select('id, latitude, longitude, check_in_time, notes, profiles(full_name)')
        .eq('organization_id', orgId!)
        .order('check_in_time', { ascending: false })
        .limit(200);
      return data || [];
    },
    enabled: !!orgId,
  });

  if (!orgId) return null;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Map View</h1>
        <p className="text-sm text-muted-foreground">Geographic overview of beneficiaries, projects and field activities</p>
      </div>

      <Tabs defaultValue="beneficiaries">
        <TabsList>
          <TabsTrigger value="beneficiaries" className="gap-1.5"><MapPin className="h-4 w-4" /> Beneficiaries</TabsTrigger>
          <TabsTrigger value="projects" className="gap-1.5"><FolderKanban className="h-4 w-4" /> Projects</TabsTrigger>
          <TabsTrigger value="checkins" className="gap-1.5"><Navigation className="h-4 w-4" /> Field Check-ins</TabsTrigger>
        </TabsList>

        <TabsContent value="beneficiaries"><BeneficiaryMap orgId={orgId} /></TabsContent>
        <TabsContent value="projects"><ProjectCoverageMap orgId={orgId} /></TabsContent>
        <TabsContent value="checkins">
          <div className="space-y-3">
            <Badge variant="secondary">{checkIns.length} check-ins</Badge>
            <FieldCheckInsMap checkIns={checkIns} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function FieldCheckInsMap({ checkIns }: { checkIns: any[] }) {
  const token = import.meta.env.VITE_MAPBOX_TOKEN;
  const [MapModule, setMapModule] = useState<any>(null);

  if (!token) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-16 text-center">
          <AlertTriangle className="h-10 w-10 mx-auto mb-3 text-warning" />
          <h3 className="font-medium mb-1">Map unavailable</h3>
          <p className="text-sm text-muted-foreground">Configure VITE_MAPBOX_TOKEN to enable maps.</p>
        </CardContent>
      </Card>
    );
  }

  import('react-map-gl/mapbox').then(mod => { if (!MapModule) setMapModule(mod); });

  if (!MapModule) return <div className="h-[calc(100vh-200px)] bg-muted animate-pulse rounded-lg" />;

  const { default: MapGL, Marker } = MapModule;
  const validCheckins = checkIns.filter((c: any) => c.latitude && c.longitude);

  return (
    <div className="h-[calc(100vh-200px)] rounded-lg overflow-hidden border">
      <MapGL
        initialViewState={{ latitude: 0.0236, longitude: 37.9062, zoom: 6 }}
        mapStyle="mapbox://styles/mapbox/light-v11"
        mapboxAccessToken={token}
        style={{ width: '100%', height: '100%' }}
      >
        {validCheckins.map((c: any) => (
          <Marker key={c.id} latitude={Number(c.latitude)} longitude={Number(c.longitude)}>
            <div className="w-2.5 h-2.5 rounded-full bg-success border border-white shadow" title={new Date(c.check_in_time).toLocaleString()} />
          </Marker>
        ))}
      </MapGL>
    </div>
  );
}

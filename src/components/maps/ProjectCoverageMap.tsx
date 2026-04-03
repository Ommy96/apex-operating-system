import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';

interface ProjectCoverageMapProps {
  orgId: string;
}

export function ProjectCoverageMap({ orgId }: ProjectCoverageMapProps) {
  const token = import.meta.env.VITE_MAPBOX_TOKEN;

  const { data: projects = [] } = useQuery({
    queryKey: ['project-map-data', orgId],
    queryFn: async () => {
      const { data } = await supabase
        .from('projects')
        .select('id, name, status, location, latitude, longitude')
        .eq('organization_id', orgId)
        .is('deleted_at', null);
      return data || [];
    },
    enabled: !!orgId,
  });

  const mappedCount = projects.filter((p: any) => p.latitude && p.longitude).length;

  if (!token) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-16 text-center">
          <AlertTriangle className="h-10 w-10 mx-auto mb-3 text-amber-500" />
          <h3 className="font-medium mb-1">Map unavailable</h3>
          <p className="text-sm text-muted-foreground">Configure VITE_MAPBOX_TOKEN to enable maps.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <Badge variant="secondary">{mappedCount} projects mapped</Badge>
      <ProjectMapRenderer token={token} projects={projects} />
    </div>
  );
}

function ProjectMapRenderer({ token, projects }: { token: string; projects: any[] }) {
  const [MapModule, setMapModule] = useState<any>(null);
  useMemo(() => { import('react-map-gl').then(mod => setMapModule(mod)); }, []);
  if (!MapModule) return <div className="h-[calc(100vh-200px)] bg-muted animate-pulse rounded-lg" />;
  const { default: MapGL, Marker, Popup } = MapModule;
  return <ProjectMapInner MapGL={MapGL} Marker={Marker} Popup={Popup} token={token} projects={projects} />;
}

function ProjectMapInner({ MapGL, Marker, Popup, token, projects }: any) {
  const [popup, setPopup] = useState<any>(null);
  const markers = projects.filter((p: any) => p.latitude && p.longitude);

  return (
    <div className="h-[calc(100vh-200px)] rounded-lg overflow-hidden border">
      <MapGL
        initialViewState={{ latitude: 0.0236, longitude: 37.9062, zoom: 6 }}
        mapStyle="mapbox://styles/mapbox/light-v11"
        mapboxAccessToken={token}
        style={{ width: '100%', height: '100%' }}
      >
        {markers.map((p: any) => (
          <Marker key={p.id} latitude={Number(p.latitude)} longitude={Number(p.longitude)}
            onClick={(e: any) => { e.originalEvent?.stopPropagation(); setPopup(p); }}>
            <div className="w-4 h-4 rounded-sm bg-blue-600 border-2 border-white shadow-md cursor-pointer rotate-45" />
          </Marker>
        ))}
        {popup && (
          <Popup latitude={Number(popup.latitude)} longitude={Number(popup.longitude)} onClose={() => setPopup(null)} anchor="bottom">
            <div className="text-sm">
              <p className="font-medium">{popup.name}</p>
              <p className="text-xs text-muted-foreground">{popup.status} · {popup.location || 'No location'}</p>
            </div>
          </Popup>
        )}
      </MapGL>
    </div>
  );
}

export default ProjectCoverageMap;

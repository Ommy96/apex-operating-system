import { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AlertTriangle, Layers, MapPin } from 'lucide-react';

const KENYA_CENTROIDS: Record<string, [number, number]> = {
  'Mombasa': [-4.0435, 39.6682], 'Kwale': [-4.1737, 39.4521], 'Kilifi': [-3.5107, 39.9093],
  'Tana River': [-1.7782, 40.0076], 'Lamu': [-2.2686, 40.9020], 'Taita Taveta': [-3.3160, 38.4850],
  'Garissa': [-0.4532, 39.6461], 'Wajir': [1.7471, 40.0573], 'Mandera': [3.9373, 41.8569],
  'Marsabit': [2.3284, 37.9905], 'Isiolo': [0.3546, 37.5822], 'Meru': [0.0480, 37.6557],
  'Tharaka Nithi': [-0.3071, 37.8440], 'Embu': [-0.5389, 37.4596], 'Kitui': [-1.3681, 38.0106],
  'Machakos': [-1.5177, 37.2634], 'Makueni': [-2.2587, 37.8936], 'Nyandarua': [-0.1804, 36.5232],
  'Nyeri': [-0.4197, 36.9510], 'Kirinyaga': [-0.6591, 37.2829], "Murang'a": [-0.7839, 37.0400],
  'Kiambu': [-1.1714, 36.8356], 'Turkana': [3.1122, 35.5978], 'West Pokot': [1.6219, 35.1119],
  'Samburu': [1.2152, 36.9541], 'Trans Nzoia': [1.0567, 35.0062], 'Uasin Gishu': [0.5143, 35.2698],
  'Elgeyo Marakwet': [0.6748, 35.5084], 'Nandi': [0.1836, 35.1269], 'Baringo': [0.6554, 35.9868],
  'Laikipia': [0.3606, 36.7819], 'Nakuru': [-0.2827, 36.0667], 'Narok': [-1.1040, 35.8685],
  'Kajiado': [-2.0981, 36.7820], 'Kericho': [-0.3692, 35.2863], 'Bomet': [-0.7813, 35.3420],
  'Kakamega': [0.2827, 34.7519], 'Vihiga': [0.0834, 34.7234], 'Bungoma': [0.5635, 34.5607],
  'Busia': [0.4608, 34.1115], 'Siaya': [-0.0617, 34.2422], 'Kisumu': [-0.0917, 34.7680],
  'Homa Bay': [-0.5273, 34.4571], 'Migori': [-1.0635, 34.4731], 'Kisii': [-0.6813, 34.7660],
  'Nyamira': [-0.5633, 34.9345], 'Nairobi': [-1.2921, 36.8219],
};

interface BeneficiaryMapProps {
  orgId: string;
}

export function BeneficiaryMap({ orgId }: BeneficiaryMapProps) {
  const token = import.meta.env.VITE_MAPBOX_TOKEN;
  const [useCluster, setUseCluster] = useState(true);

  const { data: beneficiaries = [], isLoading } = useQuery({
    queryKey: ['beneficiary-map-data', orgId],
    queryFn: async () => {
      const { data } = await supabase
        .from('beneficiaries')
        .select('id, display_name, county, sub_county, latitude, longitude')
        .eq('organization_id', orgId)
        .is('deleted_at', null);
      return data || [];
    },
    enabled: !!orgId,
  });

  const mappedCount = useMemo(() =>
    beneficiaries.filter((b: any) => b.latitude || b.county).length,
    [beneficiaries]
  );

  if (!token) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-16 text-center">
          <AlertTriangle className="h-10 w-10 mx-auto mb-3 text-warning" />
          <h3 className="font-medium mb-1">Map unavailable</h3>
          <p className="text-sm text-muted-foreground">Configure VITE_MAPBOX_TOKEN in your environment to enable maps.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Badge variant="secondary">{mappedCount} beneficiaries mapped</Badge>
        <Button
          variant="outline"
          size="sm"
          className="ml-auto gap-1.5 h-7 text-xs"
          onClick={() => setUseCluster(!useCluster)}
          aria-label={useCluster ? 'Switch to individual view' : 'Switch to cluster view'}
        >
          {useCluster ? <Layers className="h-3 w-3" /> : <MapPin className="h-3 w-3" />}
          {useCluster ? 'Cluster view' : 'Individual view'}
        </Button>
      </div>
      <MapboxRenderer token={token} beneficiaries={beneficiaries} useCluster={useCluster} />
    </div>
  );
}

function MapboxRenderer({ token, beneficiaries, useCluster }: { token: string; beneficiaries: any[]; useCluster: boolean }) {
  const [MapModule, setMapModule] = useState<any>(null);

  useMemo(() => {
    import('react-map-gl/mapbox').then(mod => setMapModule(mod));
  }, []);

  if (!MapModule) return <div className="h-[calc(100vh-200px)] bg-muted animate-pulse rounded-lg" />;

  const { default: MapGL, Marker, Popup, Source, Layer } = MapModule;
  return <MapInner MapGL={MapGL} Marker={Marker} Popup={Popup} Source={Source} Layer={Layer} token={token} beneficiaries={beneficiaries} useCluster={useCluster} />;
}

function MapInner({ MapGL, Marker, Popup, Source, Layer, token, beneficiaries, useCluster }: any) {
  const [popup, setPopup] = useState<any>(null);
  const [mapRef, setMapRef] = useState<any>(null);

  const markers = useMemo(() => {
    return beneficiaries
      .map((b: any) => {
        if (b.latitude && b.longitude) {
          return { ...b, lat: Number(b.latitude), lng: Number(b.longitude) };
        }
        if (b.county) {
          const coords = KENYA_CENTROIDS[b.county];
          if (coords) return { ...b, lat: coords[0], lng: coords[1] };
        }
        return null;
      })
      .filter(Boolean);
  }, [beneficiaries]);

  const geojson = useMemo(() => ({
    type: 'FeatureCollection' as const,
    features: markers.map((m: any) => ({
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [m.lng, m.lat] },
      properties: { id: m.id, display_name: m.display_name, county: m.county || '', sub_county: m.sub_county || '' },
    })),
  }), [markers]);

  const handleClusterClick = useCallback((e: any) => {
    if (!mapRef) return;
    const features = e.features;
    if (!features || features.length === 0) return;
    const feature = features[0];
    if (feature.properties?.cluster) {
      const clusterId = feature.properties.cluster_id;
      const source = mapRef.getSource('beneficiaries-cluster');
      if (source && source.getClusterExpansionZoom) {
        source.getClusterExpansionZoom(clusterId, (err: any, zoom: number) => {
          if (!err) {
            mapRef.easeTo({ center: feature.geometry.coordinates, zoom: Math.min(zoom, 14), duration: 500 });
          }
        });
      }
    } else {
      setPopup({
        lat: feature.geometry.coordinates[1],
        lng: feature.geometry.coordinates[0],
        display_name: feature.properties.display_name,
        county: feature.properties.county,
        sub_county: feature.properties.sub_county,
      });
    }
  }, [mapRef]);

  const clusterLayer = {
    id: 'clusters',
    type: 'circle',
    source: 'beneficiaries-cluster',
    filter: ['has', 'point_count'],
    paint: {
      'circle-color': ['step', ['get', 'point_count'], '#14b8a6', 10, '#0d9488', 50, '#0f766e'],
      'circle-radius': ['step', ['get', 'point_count'], 18, 10, 24, 50, 32],
      'circle-opacity': 0.85,
    },
  };

  const clusterCountLayer = {
    id: 'cluster-count',
    type: 'symbol',
    source: 'beneficiaries-cluster',
    filter: ['has', 'point_count'],
    layout: {
      'text-field': '{point_count_abbreviated}',
      'text-size': 12,
    },
    paint: { 'text-color': '#ffffff' },
  };

  const unclusteredLayer = {
    id: 'unclustered-point',
    type: 'circle',
    source: 'beneficiaries-cluster',
    filter: ['!', ['has', 'point_count']],
    paint: {
      'circle-color': '#14b8a6',
      'circle-radius': 5,
      'circle-stroke-width': 2,
      'circle-stroke-color': '#ffffff',
    },
  };

  return (
    <div className="h-[calc(100vh-200px)] rounded-lg overflow-hidden border">
      <MapGL
        ref={(r: any) => setMapRef(r?.getMap?.() || null)}
        initialViewState={{ latitude: 0.0236, longitude: 37.9062, zoom: 6 }}
        mapStyle="mapbox://styles/mapbox/light-v11"
        mapboxAccessToken={token}
        style={{ width: '100%', height: '100%' }}
        interactiveLayerIds={useCluster ? ['clusters', 'unclustered-point'] : []}
        onClick={useCluster ? handleClusterClick : undefined}
      >
        {useCluster ? (
          <Source id="beneficiaries-cluster" type="geojson" data={geojson} cluster={true} clusterMaxZoom={12} clusterRadius={50}>
            <Layer {...clusterLayer} />
            <Layer {...clusterCountLayer} />
            <Layer {...unclusteredLayer} />
          </Source>
        ) : (
          markers.map((m: any) => (
            <Marker key={m.id} latitude={m.lat} longitude={m.lng} onClick={(e: any) => { e.originalEvent?.stopPropagation(); setPopup(m); }}>
              <div className="w-3 h-3 rounded-full bg-primary border-2 border-white shadow-md cursor-pointer" />
            </Marker>
          ))
        )}
        {popup && (
          <Popup latitude={popup.lat} longitude={popup.lng} onClose={() => setPopup(null)} closeOnClick={false} anchor="bottom">
            <div className="text-sm">
              <p className="font-medium">{popup.display_name}</p>
              <p className="text-muted-foreground text-xs">{popup.county}{popup.sub_county ? `, ${popup.sub_county}` : ''}</p>
            </div>
          </Popup>
        )}
      </MapGL>
    </div>
  );
}

export default BeneficiaryMap;

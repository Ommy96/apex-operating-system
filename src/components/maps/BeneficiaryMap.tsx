import { useState, useMemo, useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Layers, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { usePermissions } from '@/hooks/usePermissions';
import { useVulnerabilityMap } from '@/hooks/useVulnerabilityMap';
import { ColdZoneList } from './ColdZoneList';
import type { MapArea } from '../../../supabase/functions/_shared/vulnerabilityMap';
import { HIGH_CONCENTRATION, MEDIUM_CONCENTRATION } from '../../../supabase/functions/_shared/vulnerabilityMap';

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
  const [vulnerability, setVulnerability] = useState(false);
  const { can } = usePermissions();
  const coverage = useVulnerabilityMap(orgId, vulnerability);
  const showVulnerability = vulnerability && coverage.access.data === true;

  const { data: beneficiaries = [], isLoading } = useQuery({
    queryKey: ['beneficiary-map-data', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('beneficiaries')
        .select('id, display_name, county, sub_county, latitude, longitude')
        .eq('organization_id', orgId)
        .is('deleted_at', null);
      if (error) { toast.error(error.message); throw error; }
      return data || [];
    },
    enabled: !!orgId && !vulnerability,
  });

  const mappedCount = useMemo(() =>
    beneficiaries.filter((b: any) => b.latitude || b.county).length,
    [beneficiaries]
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {coverage.access.data && <div className="flex items-center gap-2"><Switch id="vulnerability-layer" checked={vulnerability} onCheckedChange={setVulnerability} /><Label htmlFor="vulnerability-layer">Vulnerability & visit coverage</Label></div>}
        {!vulnerability && <Badge variant="secondary">{mappedCount} beneficiaries mapped</Badge>}
        {!vulnerability && <Button
          variant="outline"
          size="sm"
          className="ml-auto gap-1.5 h-7 text-xs"
          onClick={() => setUseCluster(!useCluster)}
          aria-label={useCluster ? 'Switch to individual view' : 'Switch to cluster view'}
        >
          {useCluster ? <Layers className="h-3 w-3" /> : <MapPin className="h-3 w-3" />}
          {useCluster ? 'Cluster view' : 'Individual view'}
        </Button>}
      </div>
      {showVulnerability && <div className="flex flex-wrap gap-4 text-xs text-muted-foreground" aria-label="High and critical need legend"><span className="flex items-center gap-1"><i className="map-need-low h-3 w-3 rounded-full" /> Less than 25%</span><span className="flex items-center gap-1"><i className="map-need-medium h-3 w-3 rounded-full" /> 25–49%</span><span className="flex items-center gap-1"><i className="map-need-high h-3 w-3 rounded-full" /> 50% or more</span></div>}
      <div className={showVulnerability ? 'grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]' : ''}>
        {!token ? <div className="border border-dashed py-16 text-center"><AlertTriangle className="h-10 w-10 mx-auto mb-3 text-warning" /><h3 className="font-medium">Map unavailable</h3></div> : (showVulnerability ? coverage.map.isLoading : isLoading) ? <Skeleton className="h-[calc(100vh-200px)]" /> : <MapboxRenderer token={token} beneficiaries={vulnerability ? [] : beneficiaries} useCluster={useCluster} areas={showVulnerability ? coverage.map.data?.areas : undefined} />}
        {showVulnerability && <ColdZoneList data={coverage.map.data} loading={coverage.map.isLoading} canManage={can.manageSettings} saving={coverage.saveGap.isPending} onSave={days => coverage.saveGap.mutate(days)} />}
      </div>
      {showVulnerability && coverage.map.error && <p role="alert" className="text-sm text-destructive">{coverage.map.error.message}</p>}
    </div>
  );
}

function MapboxRenderer({ token, beneficiaries, useCluster, areas }: { token: string; beneficiaries: any[]; useCluster: boolean; areas?: MapArea[] }) {
  const [MapModule, setMapModule] = useState<any>(null);

  useEffect(() => {
    import('react-map-gl/mapbox').then(mod => setMapModule(mod));
  }, []);

  if (!MapModule) return <Skeleton className="h-[calc(100vh-200px)] rounded-lg" />;

  const { default: MapGL, Marker, Popup, Source, Layer } = MapModule;
  return <MapInner key={areas ? 'coverage' : 'beneficiaries'} MapGL={MapGL} Marker={Marker} Popup={Popup} Source={Source} Layer={Layer} token={token} beneficiaries={beneficiaries} useCluster={useCluster} areas={areas} />;
}

function MapInner({ MapGL, Marker, Popup, Source, Layer, token, beneficiaries, useCluster, areas }: any) {
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
        interactiveLayerIds={!areas && useCluster ? ['clusters', 'unclustered-point'] : []}
        onClick={!areas && useCluster ? handleClusterClick : undefined}
      >
        {areas ? areas.filter((a: MapArea) => !a.suppressed && a.centroid && a.high_share != null).map((a: MapArea) => {
          if (!a.centroid) return null;
          const tone = (a.high_share ?? 0) >= HIGH_CONCENTRATION ? 'map-need-high' : (a.high_share ?? 0) >= MEDIUM_CONCENTRATION ? 'map-need-medium' : 'map-need-low';
          return <Marker key={`${a.county}:${a.area_kind}:${a.area}`} longitude={a.centroid[0]} latitude={a.centroid[1]}><div className="flex flex-col items-center gap-1"><span className={`${tone} h-8 w-8 rounded-full border-2`} aria-hidden="true" /><span className="rounded bg-background px-2 py-1 text-xs font-medium text-foreground shadow-sm capitalize">{a.area} · {Math.round((a.high_share ?? 0) * 100)}%</span></div></Marker>;
        }) : useCluster ? (
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

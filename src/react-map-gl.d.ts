declare module 'react-map-gl/mapbox' {
  import { ComponentType, ReactNode } from 'react';
  
  interface MapProps {
    initialViewState?: any;
    mapStyle?: string;
    mapboxAccessToken?: string;
    style?: React.CSSProperties;
    children?: ReactNode;
    interactiveLayerIds?: string[];
    onClick?: (e: any) => void;
    onMouseEnter?: (e: any) => void;
    onMouseLeave?: (e: any) => void;
    ref?: any;
    [key: string]: any;
  }
  interface MarkerProps {
    latitude: number;
    longitude: number;
    onClick?: (e: any) => void;
    children?: ReactNode;
    [key: string]: any;
  }
  interface PopupProps {
    latitude: number;
    longitude: number;
    onClose?: () => void;
    closeOnClick?: boolean;
    anchor?: string;
    children?: ReactNode;
    [key: string]: any;
  }
  interface SourceProps {
    id: string;
    type: string;
    data?: any;
    cluster?: boolean;
    clusterMaxZoom?: number;
    clusterRadius?: number;
    children?: ReactNode;
    [key: string]: any;
  }
  interface LayerProps {
    id: string;
    type: string;
    source?: string;
    filter?: any[];
    layout?: Record<string, any>;
    paint?: Record<string, any>;
    [key: string]: any;
  }

  const Map: ComponentType<MapProps>;
  export const Marker: ComponentType<MarkerProps>;
  export const Popup: ComponentType<PopupProps>;
  export const Source: ComponentType<SourceProps>;
  export const Layer: ComponentType<LayerProps>;
  export default Map;
}

declare module 'mapbox-gl' {
  const mapboxgl: any;
  export default mapboxgl;
}

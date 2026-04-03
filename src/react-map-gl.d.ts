declare module 'react-map-gl/mapbox' {
  import { ComponentType, ReactNode } from 'react';
  
  interface MapProps {
    initialViewState?: any;
    mapStyle?: string;
    mapboxAccessToken?: string;
    style?: React.CSSProperties;
    children?: ReactNode;
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

  const Map: ComponentType<MapProps>;
  export const Marker: ComponentType<MarkerProps>;
  export const Popup: ComponentType<PopupProps>;
  export default Map;
}

declare module 'mapbox-gl' {
  const mapboxgl: any;
  export default mapboxgl;
}

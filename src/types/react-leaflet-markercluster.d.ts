declare module "@changey/react-leaflet-markercluster" {
  import { ComponentType, ReactNode } from "react";
  import { MarkerClusterGroupOptions } from "leaflet";
  import { MarkerCluster } from "leaflet.markercluster";

  interface MarkerCluster {
    getChildCount(): number;
    getAllChildMarkers(): Marker[];
    getBounds(): LatLngBounds;
  }

  interface MarkerClusterGroupProps extends MarkerClusterGroupOptions {
    children?: ReactNode;
    chunkedLoading?: boolean;
    iconCreateFunction?: (cluster: MarkerCluster) => DivIcon | null;
    maxClusterRadius?: number;
    spiderfyOnMaxZoom?: boolean;
    showCoverageOnHover?: boolean;
    zoomToBoundsOnClick?: boolean;
  }

  const MarkerClusterGroup: ComponentType<MarkerClusterGroupProps>;
  export default MarkerClusterGroup;
}

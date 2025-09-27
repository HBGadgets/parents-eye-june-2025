declare module "@changey/react-leaflet-markercluster" {
  import { ComponentType, ReactNode } from "react";
  import { MarkerClusterGroupOptions } from "leaflet";

  interface MarkerClusterGroupProps extends MarkerClusterGroupOptions {
    children?: ReactNode;
    chunkedLoading?: boolean;
    iconCreateFunction?: (cluster: any) => any;
    maxClusterRadius?: number;
    spiderfyOnMaxZoom?: boolean;
    showCoverageOnHover?: boolean;
    zoomToBoundsOnClick?: boolean;
  }

  const MarkerClusterGroup: ComponentType<MarkerClusterGroupProps>;
  export default MarkerClusterGroup;
}

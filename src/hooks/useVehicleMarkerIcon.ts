import { useMemo } from "react";
import L from "leaflet";
import { VehicleStatus } from "./useVehicleStatus";

interface UseVehicleMarkerIconProps {
  status: VehicleStatus;
  markerSize?: number;
  statusImageMap?: Record<VehicleStatus, string>;
}

const defaultStatusImageMap: Record<VehicleStatus, string> = {
  running: "/bus/top-view/green-top.svg",
  idle: "/bus/top-view/yellow-top.svg",
  stopped: "/bus/top-view/red-top.svg",
  inactive: "/bus/top-view/gray-top.svg",
  overspeeding: "/bus/top-view/orange-top.svg",
  noData: "/bus/top-view/blue-top.svg",
};

export const useVehicleMarkerIcon = ({
  status,
  markerSize = 100,
  statusImageMap = defaultStatusImageMap,
}: UseVehicleMarkerIconProps) => {
  const imageUrl = useMemo(() => {
    return statusImageMap[status] || statusImageMap.inactive;
  }, [status, statusImageMap]);

  const icon = useMemo(() => {
    return L.divIcon({
      html: `
        <div class="single-vehicle-marker-container">
          <img 
            src="${imageUrl}" 
            class="vehicle-marker-img"
            style="
              width: ${markerSize}px;
              height: ${markerSize}px;
              transform-origin: center center;
              filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
            " 
            alt="Vehicle marker"
          />
        </div>
      `,
      className: "custom-single-vehicle-marker",
      iconSize: [markerSize, markerSize],
      iconAnchor: [markerSize / 2, markerSize / 2],
      popupAnchor: [0, -20],
    });
  }, [imageUrl, markerSize]);

  return { icon, imageUrl };
};

import { useMemo } from "react";
import L from "leaflet";
import { VehicleStatus } from "./useVehicleStatus";

interface UseVehicleMarkerIconProps {
  status: VehicleStatus;
  markerSize?: number;
  statusImageMap?: Record<VehicleStatus, string>;
}

const defaultStatusImageMap: Record<VehicleStatus, string> = {
  running: "/BUS/top-view/green.svg",
  idle: "/BUS/top-view/yellow.svg",
  stopped: "/BUS/top-view/red.svg",
  inactive: "/BUS/top-view/gray.svg",
  offline: "/BUS/top-view/brown.png",
  overspeeding: "/BUS/top-view/orange.svg",
  overspeed: "/BUS/top-view/orange.svg",
  new: "/BUS/top-view/blue.svg",
  noData: "/BUS/top-view/blue.svg",
};

export const useVehicleMarkerIcon = ({
  status,
  markerSize = 100,
  statusImageMap = defaultStatusImageMap,
}: UseVehicleMarkerIconProps) => {
  const imageUrl = useMemo(() => {
    const rawStatus = (status || "").toLowerCase();
    if (rawStatus.includes("overspeed")) {
      return (
        statusImageMap.overspeed ||
        statusImageMap.overspeeding ||
        "/BUS/top-view/orange.svg"
      );
    }
    return statusImageMap[status] || statusImageMap.new || "/BUS/top-view/blue.svg";
  }, [status, statusImageMap]);

  const icon = useMemo(() => {
    return L.divIcon({
      html: `
        <div class="single-vehicle-marker-container">
          <img 
            src="${imageUrl}" 
            onerror="if(!this.dataset.tried){this.dataset.tried='1';if(this.src.endsWith('.svg')){this.src=this.src.replace(/\\.svg$/,'.png')}else if(this.src.endsWith('.png')){this.src=this.src.replace(/\\.png$/,'.svg')}}"
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

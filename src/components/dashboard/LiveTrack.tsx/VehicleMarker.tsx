import React, { useRef, useCallback } from "react";
import { Marker, Popup } from "react-leaflet";
import { VehiclePopupContent } from "./VehiclePopupContent";
import L from "leaflet";
import { useVehicleStatus } from "@/hooks/useVehicleStatus";
import { useVehicleMarkerIcon } from "@/hooks/useVehicleMarkerIcon";
import { useMarkerRotation } from "@/hooks/useMarkerRotation";
import { VehicleData } from "./single-device-livetrack";

interface VehicleMarkerProps {
  vehicle: VehicleData;
  onClick?: (vehicle: VehicleData) => void;
  markerSize?: number;
  popupMaxWidth?: number;
  popupMaxHeight?: number;
  statusImageMap?: Record<string, string>;
}

const createBleTagIcon = (battery?: number, status?: string) => {
  const isOnline = status === "active" || status === "running";
  const arrowColor = isOnline ? "#2563eb" : "#64748b";

  return L.divIcon({
    className: "custom-ble-tag-pin",
    html: `
      <div style="position: relative; width: 36px; height: 44px; display: flex; flex-direction: column; align-items: center; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3)); cursor: pointer;">
        <div style="
          position: relative;
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <img 
            src="/geotag-icon/crtag.png" 
            alt="GeoTag"
            style="width: 36px; height: 36px; object-fit: contain; display: block;"
          />
        </div>
        <div style="
          width: 0;
          height: 0;
          border-left: 5px solid transparent;
          border-right: 5px solid transparent;
          border-top: 7px solid ${arrowColor};
          margin-top: -1px;
        "></div>
      </div>
    `,
    iconSize: [36, 44],
    iconAnchor: [18, 42],
    popupAnchor: [0, -42],
  });
};

export const VehicleMarker: React.FC<VehicleMarkerProps> = React.memo(
  ({
    vehicle,
    onClick,
    markerSize = 100,
    popupMaxWidth = 290,
    popupMaxHeight = 300,
    statusImageMap,
  }) => {
    const markerRef = useRef<L.Marker | null>(null);

    const isBle =
      vehicle.category === "BLE" ||
      vehicle.category === "GeoTag" ||
      Boolean((vehicle as any).rawBleDevice) ||
      String(vehicle.name || "").startsWith("GeoTag");

    // Calculate vehicle status
    const vehicleStatus = useVehicleStatus({
      speed: vehicle.speed,
      speedLimit: vehicle.speedLimit,
      lastUpdate: vehicle.lastUpdate,
      latitude: vehicle.latitude,
      longitude: vehicle.longitude,
      attributes: vehicle.attributes,
      category: vehicle.category,
    });

    // Get marker icon
    const { icon: busIcon, imageUrl } = useVehicleMarkerIcon({
      status: vehicleStatus,
      markerSize,
      statusImageMap,
    });

    const markerIcon = React.useMemo(() => {
      if (isBle) {
        const bat =
          (vehicle as any).batteryLevel ??
          (vehicle as any).rawBleDevice?.battery ??
          100;
        return createBleTagIcon(bat, vehicle.status);
      }
      return busIcon;
    }, [isBle, vehicle, busIcon]);

    const lat = Number(vehicle.latitude);
    const lng = Number(vehicle.longitude);
    const validPos: [number, number] = [
      !isNaN(lat) ? lat : 0,
      !isNaN(lng) ? lng : 0,
    ];

    // Handle marker rotation and position only for vehicles with compass bearing
    useMarkerRotation(
      markerRef,
      isBle ? 0 : validPos[0],
      isBle ? 0 : validPos[1],
      isBle ? 0 : vehicle.course,
      imageUrl,
      markerIcon,
      !isBle
    );

    // For BLE devices, keep marker position updated directly without 10s rotation delay
    React.useEffect(() => {
      if (isBle && markerRef.current && (validPos[0] !== 0 || validPos[1] !== 0)) {
        markerRef.current.setLatLng(validPos);
      }
    }, [isBle, validPos[0], validPos[1]]);

    const handleClick = useCallback(() => {
      onClick?.(vehicle);
    }, [vehicle, onClick]);

    return (
      <Marker
        ref={markerRef}
        position={validPos}
        icon={markerIcon}
        eventHandlers={{
          click: handleClick,
        }}
      >
        <Popup
          maxWidth={popupMaxWidth}
          className="vehicle-popup"
          maxHeight={popupMaxHeight}
        >
          <VehiclePopupContent
            vehicle={vehicle}
            vehicleStatus={vehicleStatus}
          />
        </Popup>
      </Marker>
    );
  }
);

VehicleMarker.displayName = "VehicleMarker";

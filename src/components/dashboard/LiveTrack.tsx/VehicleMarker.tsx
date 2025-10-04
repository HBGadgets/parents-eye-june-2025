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

    // Calculate vehicle status
    const vehicleStatus = useVehicleStatus({
      speed: vehicle.speed,
      speedLimit: vehicle.speedLimit,
      lastUpdate: vehicle.lastUpdate,
      latitude: vehicle.latitude,
      longitude: vehicle.longitude,
      attributes: vehicle.attributes,
    });

    // Get marker icon
    const { icon: busIcon, imageUrl } = useVehicleMarkerIcon({
      status: vehicleStatus,
      markerSize,
      statusImageMap,
    });

    // Handle marker rotation and position
    useMarkerRotation(
      markerRef,
      vehicle.latitude,
      vehicle.longitude,
      vehicle.course,
      imageUrl,
      busIcon
    );

    const handleClick = useCallback(() => {
      onClick?.(vehicle);
    }, [vehicle, onClick]);

    return (
      <Marker
        ref={markerRef}
        position={[vehicle.latitude, vehicle.longitude]}
        icon={busIcon}
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

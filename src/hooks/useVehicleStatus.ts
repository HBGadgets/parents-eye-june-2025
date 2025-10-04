import { useMemo } from "react";

interface VehicleAttributes {
  charge: boolean;
  ignition: boolean;
  motion: boolean;
  sat: number;
  distance: number;
  totalDistance: number;
  todayDistance: number;
}

interface UseVehicleStatusProps {
  speed: number;
  speedLimit: string;
  lastUpdate: string;
  latitude: number;
  longitude: number;
  attributes: VehicleAttributes;
}

export type VehicleStatus =
  | "running"
  | "idle"
  | "stopped"
  | "inactive"
  | "overspeeding"
  | "noData";

export const useVehicleStatus = ({
  speed,
  speedLimit,
  lastUpdate,
  latitude,
  longitude,
  attributes,
}: UseVehicleStatusProps): VehicleStatus => {
  return useMemo(() => {
    // Check if vehicle has no data
    if (latitude === 0 && longitude === 0) return "noData";

    // Check if vehicle is inactive
    const lastUpdateTime = new Date(lastUpdate).getTime();
    const currentTime = new Date().getTime();
    const timeDifference = currentTime - lastUpdateTime;
    const thirtyFiveHoursInMs = 35 * 60 * 60 * 1000;

    if (timeDifference > thirtyFiveHoursInMs) return "inactive";

    // Check for overspeeding
    const parsedSpeedLimit = parseFloat(speedLimit) || 60;
    if (speed > parsedSpeedLimit) return "overspeeding";

    // Determine status based on ignition and speed
    const { ignition } = attributes;

    if (ignition === true) {
      if (speed > 5 && speed < parsedSpeedLimit) {
        return "running";
      } else {
        return "idle";
      }
    } else if (ignition === false) {
      return "stopped";
    }

    return "noData";
  }, [speed, speedLimit, lastUpdate, latitude, longitude, attributes]);
};

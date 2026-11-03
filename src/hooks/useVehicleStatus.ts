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
  category: string;
  deviceCategory: string;
}

export type VehicleStatus =
  | "running"
  | "idle"
  | "stopped"
  | "inactive"
  | "offline"
  | "overspeeding"
  | "overspeed"
  | "new"
  | "noData";

export const useVehicleStatus = ({
  speed,
  speedLimit,
  lastUpdate,
  latitude,
  longitude,
  attributes,
  category,
}: UseVehicleStatusProps): VehicleStatus => {
  return useMemo(() => {
    if (latitude === 0 && longitude === 0) return "noData";

    const lastUpdateTime = new Date(lastUpdate).getTime();
    const currentTime = new Date().getTime();
    const timeDifference = currentTime - lastUpdateTime;
    const thirtyFiveHoursInMs = 35 * 60 * 60 * 1000;

    const rawCat = (category || "").toLowerCase();
    if (rawCat === "new" || rawCat.includes("new")) return "new";
    if (rawCat === "inactive" || rawCat.includes("inact") || timeDifference > thirtyFiveHoursInMs) return "inactive";
    if (rawCat === "offline") return "offline";

    const parsedSpeedLimit = parseFloat(speedLimit) || 60;
    if (speed > parsedSpeedLimit || rawCat.includes("overspeed")) return "overspeeding";

    const validStatuses: VehicleStatus[] = [
      "running",
      "idle",
      "stopped",
      "inactive",
      "offline",
      "overspeeding",
      "overspeed",
      "new",
      "noData",
    ];
    if (validStatuses.includes(rawCat as VehicleStatus)) {
      return rawCat as VehicleStatus;
    }

    return "noData";
  }, [speed, speedLimit, lastUpdate, latitude, longitude, category]);
};
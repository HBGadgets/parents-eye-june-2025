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
  | "overspeeding"
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

    if (category === "inactive") return "inactive";
    if (timeDifference > thirtyFiveHoursInMs) return "inactive";

    const parsedSpeedLimit = parseFloat(speedLimit) || 60;
    if (speed > parsedSpeedLimit) return "overspeeding";

    const runningConditions = [
      speed > 5,
      attributes.motion === true,
      attributes.ignition === true,
    ];

    const idleConditions = [
      speed < 5,
      attributes.motion === false,
      attributes.ignition === true,
    ];

    const stoppedConditions = [
      speed < 5,
      attributes.motion === false,
      attributes.ignition === false,
    ];

    // Order matters for ties — running > idle > stopped
    const scores: Record<VehicleStatus, number> = {
      running: runningConditions.filter(Boolean).length,
      idle: idleConditions.filter(Boolean).length,
      stopped: stoppedConditions.filter(Boolean).length,
      inactive: 0,
      overspeeding: 0,
      noData: 0,
    };

    const winner = (
      Object.entries(scores) as [VehicleStatus, number][]
    ).reduce((a, b) => (b[1] > a[1] ? b : a));

    if (winner[1] >= 2) return winner[0];

    return "noData";
  }, [speed, speedLimit, lastUpdate, latitude, longitude, attributes]);
};
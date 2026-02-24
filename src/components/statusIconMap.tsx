type VehicleStatus = "Ignition On" | "Ignition Off" | "Idle" | "Overspeed";

export interface StatusIconConfig {
  src: string;
  label: string;
}

export const statusIconMap: Record<VehicleStatus, StatusIconConfig> = {
  "Ignition On": {
    src: "/status/ignitionOn.svg",
    label: "Vehicle Running",
  },
  "Ignition Off": {
    src: "/status/ignitionOff.svg",
    label: "Vehicle Stopped",
  },
  Idle: {
    src: "/status/idle.svg",
    label: "Vehicle Idle",
  },
  Overspeed: {
    src: "/status/overspeed.svg",
    label: "Vehicle Overspeed",
  },
};

export const VALID_VEHICLE_CATEGORIES = [
  "BUS"
];

export const getValidDeviceCategory = (category?: string): string => {
  if (!category) return "BUS";
  const normalizedCategory = category.toUpperCase();
  return VALID_VEHICLE_CATEGORIES.includes(normalizedCategory)
    ? normalizedCategory
    : "BUS";
};

export const NOTIFICATION_OPTIONS = [
  { key: "geofence", label: "Geofence" },
  { key: "eta", label: "ETA" },
  { key: "vehicleStatus", label: "Vehicle Status" },
  { key: "overspeed", label: "Overspeed" },
  { key: "sos", label: "SOS" },
  { key: "busWiseTrip", label: "Bus Wise Trip" },
] as const;

export type NotificationKey = (typeof NOTIFICATION_OPTIONS)[number]["key"];

export type NotificationPayload = Record<NotificationKey, boolean>;

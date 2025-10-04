// Device data structure based on your backend
export interface DeviceData {
  speed: number;
  longitude: number;
  latitude: number;
  course: number;
  deviceId: number;
  imei: string;
  attributes: {
    charge: boolean;
    ignition: boolean;
    motion: boolean;
    sat: number;
    distance: number;
    totalDistance: number;
    todayDistance: number;
  };
  batteryLevel: number;
  gsmSignal: number;
  category: string;
  status: string;
  lastUpdate: string;
  name: string;
  TD: number;
  mileage: string;
  speedLimit: string;
  fuelConsumption: string;
  matchesSearch: boolean;
  total: number;
}

// Filter options for device queries
export interface DeviceFilters {
  page: number;
  limit: number;
  filter: "all" | "running" | "idle" | "stopped" | "inactive" | "new";
  searchTerm: string;
}

// Response structure from all-device-data event
export interface AllDeviceResponse {
  filteredData: DeviceData[];
  page: number;
  pageLimit: number;
  pageCount: number;
  total: number;
  runningCount: number;
  overspeedCount: number;
  idleCount: number;
  stoppedCount: number;
  inactiveCount: number;
  newCount: number;
  remainingCount: number;
  totalCountCheck: number;
}

// Socket event interfaces for type safety
export interface ServerToClientEvents {
  "all-device-data": (data: AllDeviceResponse) => void;
  "single-device-data": (data: DeviceData) => void;
  "shared device data": (data: DeviceData) => void;
  "auth-success": () => void;
  error: (error: { message: string; details?: string }) => void;
  connect: () => void;
  disconnect: (reason: string) => void;
}

export interface ClientToServerEvents {
  credentials: (credentials: { username: string; password: string }) => void;
  "get-all-devices": (filters: DeviceFilters) => void;
  "shared device token": (token: string) => void;
}

// Credentials interface
export interface Credentials {
  username: string;
  password: string;
}

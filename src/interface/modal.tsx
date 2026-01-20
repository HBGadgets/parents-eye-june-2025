import { uniqueId } from "lodash";

export interface School {
  _id: string;
  schoolName: string;
  username: string;
  password: string;
  email: string;
  schoolMobile: string;
  // fullAccess: boolean;
  role: string;
  createdAt: string;
}

export interface Branch {
  _id: string;
  branchName: string;
  schoolId: {
    _id: string;
    schoolName: string;
  };
  mobileNo: string;
  username: string;
  fullAccess: boolean;
  password: string;
  email: string;
  role: string;
  subscriptionExpirationDate: string;
  createdAt: string;
}

export interface Device {
  _id: string;
  name: string;
  uniqueId: string;
  sim: string;
  speed: string;
  average: string;
  driverObjId: Driver;
  model: Model;
  category: Category;
  deviceId: string;
  routeObjId: Route;
  parkingMode: string;
  toeingMode: string;
  keyFeature: string;
  TD: number;
  TDTime: string;
  schoolId: School;
  branchId: Branch;
  createdAt: string;
  updatedAt: string;
  subscriptionEndDate: string;
}

export interface GetDeviceResponse {
  total: number;
  page: number;
  limit: number;
  devices: Device[];
}

export interface Geofence {
  _id: string;
  geofenceName: string;
  area: {
    center: [number, number];
    radius: number;
  };
  address: string;
  pickupTime?: string;
  dropTime?: string;
  schoolId?: string;
  branchId?: string;
  routeObjId?: string;
  route?: Route;
  school?: School;
  branch?: Branch;
  createdAt: string;
}

export interface GetGeofenceResponse {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  data: Geofence[];
  startPointGeoId: Geofence;
  endPointGeoId: Geofence;
}

export interface Parent {
  _id: string;
  parentName: string;
  mobileNo: string;
  email: string;
  username: string;
  password: string;
  schoolId?: School;
  branchId?: Branch;
  isActive?: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface GetParentsResponse {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  data: Parent[];
}

export interface Driver {
  isApproved: boolean;
  _id: string;
  driverName: string;
  username: string;
  password: string;
  email: string;
  mobileNo: string;
  schoolId: School;
  branchId: Branch;
  routeObjId: Route;
  deviceObjId: Device;
  role: string;
  createdAt: string;
  updatedAt: string;
}

export interface GetDriverResponse {
  page: number;
  limit: number;
  sortBy: string;
  sortOrder: string;
  totalCount: number;
  totalPages: number;
  data: Driver[];
}

export interface Supervisor {
  status: boolean;
  _id: string;
  supervisorName: string;
  username: string;
  password: string;
  email: string;
  mobileNo: string;
  schoolId: School;
  branchId: Branch;
  routeObjId: Route;
  deviceObjId: Device;
  createdAt: string;
}

export interface GetSupervisorResponse {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
  data: Supervisor[];
}

export interface Route {
  _id: string;
  routeNumber: string;
  deviceObjId: Device;
  schoolId: School;
  branchId: Branch;
  startPointGeoId: Geofence;
  endPointGeoId: Geofence;
  routeCompletionTime: number;
  createdAt: string;
}

export interface BranchGroup {
  _id: string;
  branchGroupName: string;
  schoolId: School;
  AssignedBranch: Branch[];
  phoneNo: string;
  username: string;
  password: string;
  email: string;
  role: string;
  fcmToken: string;
}

// Define the structure of a LeaveRequest
export interface LeaveRequest {
  _id: string;
  childId: Student;
  parentId: Parent;
  schoolId: School;
  branchId: Branch;
  startDate: string;
  endDate: string;
  reason: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface Model {
  _id: string;
  modelName: string;
  createdAt: string;
  updatedAt: string;
  __v: number;
}

export interface GetModelsResponse {
  data: Model[];
}

export interface Category {
  _id: string;
  categoryName: string;
  createdAt: string;
  updatedAt: string;
  __v: number;
}

export interface GetCategoriesResponse {
  data: Category[];
}

export interface Route {
  _id: string;
  routeNumber: string;
  deviceObjId: Device;
  schoolId: School;
  branchId: Branch;
  createdAt: string;
}

export interface GetRoutesResponse {
  success: boolean;
  total: number;
  page: number;
  limit: number;
  data: Route[];
}

export interface Student {
  _id: string;
  childName: string;
  className: string;
  section: string;
  DOB: Date;
  age: number;
  gender: string;
  rollNumber: string;
  pickupGeoId: Geofence;
  dropGeoId: Geofence;
  routeObjId: Route;
  parentId: Parent;
  schoolId: School;
  branchId: Branch;
  statusOfRegister: string;
  createdAt: string;
}

export interface GetStudentsResponse {
  total: number;
  page: number;
  limit: number;
  children: Student[];
}

export interface LiveTrack {
  speed?: DoubleRange;
  longitude?: DoubleRange;
  latitude?: DoubleRange;
  course?: number;
  deviceId?: number;
  uniqueId?: number;
  attribute?: {
    charge?: boolean;
    ignition?: boolean;
    motion?: boolean;
    sat?: number;
    distance?: number;
    totalDistance?: DoubleRange;
    todayDistance?: DoubleRange;
  };
  noOfStudents?: number;
  noOfStops?: number;
  gsmSignal?: number;
  batteryLevel?: number;
  category?: string;
  status?: string;
  lastUpdate?: string;
  name?: string;
  fuelConsumption?: DoubleRange;
}

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface StatusReport {
  uniqueId: string;
  name: string;
  vehicleStatus: string;
  time: string;
  startDateTime: string;
  endDateTime: string;
  startLocation: string;
  startCoordinate: Coordinates;
  endLocation: string;
  endCoordinate: Coordinates;
  distance: number;
  maxSpeed: number;
  avgSpeed: number;
}

export interface GetStatusReportResponse {
  total: number;
  page: number;
  limit: number;
  data: StatusReport[];
}

export interface StopReport {
  uniqueId: string;
  vehicleStatus: string;
  name: string;
  time: string;
  arrivalTime: string;
  departureTime: string;
  startLocation: string;
  startCoordinates: string;
  endLocation: string;
  endCoordinates: string;
  distance: number;
  latitude: number;
  longitude: number;
}

export interface GetStopReportResponse {
  total: number;
  page: number;
  limit: number;
  data: StopReport[];
}

export interface IdleReport {
  uniqueId: string;
  vehicleStatus: string;
  name: string;
  time: string;
  startDateTime: string;
  endDateTime: string;
  startLocation: string;
  startCoordinates: string;
  endLocation: string;
  endCoordinates: string;
  distance: number;
  maxSpeed: number;
  avgSpeed: number;
}

export interface GetIdleReportResponse {
  total: number;
  page: number;
  limit: number;
  data: IdleReport[];
}

export interface Distance {
  uniqueId: string;
  name: string;
  distance: number;
  createdAt: string;
  totalDistance: number;
}

export interface Events {
  eventType: string;
  eventTime: string;
  geofenceAddress?: string;
  latitude?: number;
  longitude?: number;
}

export interface AlertsAndEventsReport {
  uniqueId: string;
  name: string;
  deviceName: string;
  eventArray?: Events[];
}

export interface GetAlertsAndEventsReportResponse {
  total?: number;
  page?: number;
  limit?: number;
  data: AlertsAndEventsReport[];
}

export interface GeofenceAlerts {
  uniqueId: string;
  name: string;
  geofenceName: string;
  location: string;
  coordinate: string;
  inTime: string;
  outTime: string;
  haltTime: string;
  createdAt: string;
}

export interface GetGeofenceAlertsResponse {
  total: number;
  page: number;
  limit: number;
  data: GeofenceAlerts[];
}

export interface TripReport {
  uniqueId: string;
  name: string;
  startTime: string;
  endTime: string;
  duration: string;
  maxSpeed: string;
  avgSpeed: string;
  distance: string;
  totalDistance: string;
  startCoordinates: string;
  startAddress: string;
  endCoordinates: string;
  endAddress: string;
}

export interface GetTripReportResponse {
  total: number;
  page: number;
  limit: number;
  data: TripReport[];
}

export interface DayWiseTrips {
  date: string;
  uniqueId: string;
  startTime: string;
  endTime: string;
  maxSpeed: string;
  avgSpeed: string;
  distance: string;
  runningTime: string;
  idleTime: string;
  stopTime: string;
  workingHours: string;
  overspeedTime: string;
  startLatitude: string;
  startLongitude: string;
  startAddress: string;
  endLatitude: string;
  endLongitude: string;
  endAddress: string;
}

export interface TravelSummaryReport {
  uniqueId: string;
  name: string;
  duration: string;
  maxSpeed: string;
  avgSpeed: string;
  distance: string;
  running: string;
  idle: string;
  stop: string;
  stopped: string;
  overspeed: string;
  workingHours: string;
  startLat: number;
  startLong: number;
  endLat: number;
  endLong: number;
  startCoordinates: string;
  startAddress: string;
  endCoordinates: string;
  endAddress: string;
  dayWiseTrips: DayWiseTrips[];
}

export interface GeofenceListResponse {
  total: number;
  data: Geofence[];
}

export interface TimelineEvent {
  _id: string;
  geofenceId: string;
  eventType: "ENTER" | "EXIT";
  createdAt: string;
  geofence: {
    geofenceName: string;
  };
}

export interface RouteInfo {
  routeCompletionTime: string | null;
  startPointGeoId: string | null;
  endPointObjId: string | null;
}

export interface TimelineResponse {
  success: boolean;
  message: string;
  timeline: TimelineEvent[];
  route: RouteInfo;
}

export interface BusStopWithStatus extends Geofence {
  hasArrived: boolean;
  arrivedAt?: string;
  isCurrent: boolean;
  enteredAt?: string;
  exitedAt?: string;
  __type?: "START" | "NORMAL" | "END";
}

export interface Distance {
  uniqueId: string;
  distance: number;
  totalDistance: number;
}

export interface SubscriptionExpiration {
  branchName: Branch;
  mobileNo: number;
  schoolName: string;
  remainingDays: number;
  subscriptionExpirationDate: string;
}

export interface GetSubscriptionExpirationResponse {
  count: number;
  data: SubscriptionExpiration[];
}

export interface RouteShiftRow {
  shift: "pickup" | "drop";
  startEnterTime?: string;
  endEnterTime?: string;
  durationMinutes: number;
  date: string;
}

export interface RouteReport {
  uniqueId: string;
  routeNumber: string;
  startPointName?: string;
  endPointName?: string;
  startPointAddress?: string;
  endPointAddress?: string;
  driverName?: Driver;
  lateCompletionCount?: number;
  startPointArea?: { center: [number, number]; radius: number };
  deviceName: string;
  routeCompletionTime: string;
  shift: RouteShiftRow[];
}

export interface PickupAndDrop {
  _id: string;
  pickup: boolean;
  drop: boolean;
  pickupTime: string;
  dropTime: string;
  createdAt: string;
  child: Student;
  school: School;
  branch: Branch;
}

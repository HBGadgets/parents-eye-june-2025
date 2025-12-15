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
  driver: Driver;
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
  supervisorMobile: string;
  schoolId: School;
  branchId: Branch;
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
  gsmSignal?: number;
  batteryLevel?: number;
  category?: string;
  status?: string;
  lastUpdate?: string;
  name?: string;
  fuelConsumption?: DoubleRange;
}

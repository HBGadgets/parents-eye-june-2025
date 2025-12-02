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
  parkingMode: boolean;
  toeingMode: boolean;
  keyFeature: boolean;
  TD: number;
  TDTime: string;
  _id: string;
  name: string;
  uniqueId: string;
  sim: string;
  speed: string;
  average: string;
  driver: string | null;
  model: string;
  category: string;
  deviceId: string;
  routeNo: string;
  status: string;
  lastUpdate: string;
  schoolId: {
    _id: string;
    schoolName: string;
  };
  branchId: {
    _id: string;
    branchName: string;
  };
  createdAt: string;
  updatedAt: string;
  __v?: number; // optional if not always provided
}

export interface DeviceResponse {
  total: number;
  page: number;
  limit: number;
  devices: Device[];
}

export interface Geofence {
  _id: string;
  geofenceName: string;
  area: {
    center: number[];
    radius: number;
  };
  pickupTime?: string;
  dropTime?: string;
  schoolId?: string | School;
  branchId?: string | Branch;
  parentId?: string | Parent;
  routeObjId?: string | Route;
  createdAt: string;
  updatedAt: string;
}

export interface Parent {
  _id: string;
  parentName: string;
  mobileNo: string;
  email: string;
  username: string;
  password: string;
  schoolId?: {
    _id: string;
    schoolName: string;
  };
  branchId?: {
    _id: string;
    branchName: string;
  };
  isActive?: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface Driver {
  isApproved: boolean;
  _id: string;
  driverName: string;
  username: string;
  password: string;
  email: string;
  driverMobile: string;
  schoolId: School;
  branchId: Branch;
  deviceObjId: Device;
  role: string;
  createdAt: string;
  updatedAt: string;
}
export interface Supervisor {
  isApproved: boolean;
  _id: string;
  supervisorName: string;
  username: string;
  password: string;
  email: string;
  supervisorMobile: string;
  schoolId: School;
  branchId: Branch;
  deviceObjId: Device;

  role: string;
  createdAt: string;
  updatedAt: string;
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
  age: number;
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

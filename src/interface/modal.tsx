export interface Student {
  total: number;
  page: number;
  limit: number;
  _id: string;
  childName: string;
  className: string;
  section: string;
  DOB: string;
  age: number;
  gender: string;
  geofenceId: {
    _id: string;
    name: string;
    busStopTime: string;
  };
  deviceId: {
    _id: string;
    name: string;
    routeNo: string;
  };
  assignDevice: boolean;
  parentId: {
    _id: string;
    parentName: string;
    mobileNo: string;
    username: string;
    password: string;
  };
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
}

export interface School {
  _id: string;
  schoolName: string;
  username: string;
  password: string;
  email: string;
  schoolMobile: string;
  fullAccess: boolean;
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
  password: string;
  email: string;
  role: string;
  createdAt: string;
}

export interface Device {
  _id: string;
  name: string;
  uniqueId: string;
  sim: string;
  speed: string;
  average: string;
  Driver: string;
  geofences: string[];
  model: string;
  category: string;
  installationdate: string;
  subStart: string;
  expirationdate: string;
  extenddate: string;
  inactiveDate: string;
  modifiedDate: string;
  deviceId: string;
  routeNo: string;
  positionId: string;
  status: string;
  lastUpdate: string;
  TD: number;
  TDTime: string;
  schoolId: string | null;
  branchId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Geofence {
  _id: string;
  name: string;
  area: string;
  busStopTime: string;
  isCrossed: boolean;
  deviceName: string;
  schoolId: string | null;
  branchId: string | null;
  parentId: string | null;
}

export interface Parent {
  _id: string;
  parentName: string;
  username: string;
  password: string;
  email: string;
  schoolMobile: string;
  fullAccess: boolean;
  schoolId: string | null;
  branchId: string | null;
  contactNo: string;
  role: string;
}

export interface Driver {
  isApproved: boolean;
  _id: string;
  driverName: string;
  username: string;
  password: string;
  email: string;
  driverMobile: string;
  schoolId: string | null;
  branchId: string | null;
  role: string;
  createdAt: string;
  updatedAt: string;
}

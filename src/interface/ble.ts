export interface BleLastLocation {
  lat: number;
  lng: number;
  address?: string;
  reportedTime?: string;
  locationTime?: string;
  accuracy?: number;
  confidence?: number;
}

export interface BleSchoolInfo {
  _id: string;
  schoolName?: string;
  email?: string;
}

export interface BleBranchInfo {
  _id: string;
  branchName?: string;
  mobileNo?: string;
}

export interface BleSupervisorInfo {
  _id: string;
  supervisorName?: string;
  mobileNo?: string;
}

export interface BleChildInfo {
  _id: string;
  childName?: string;
  className?: string;
  rollNumber?: string;
  section?: string;
}

export interface BleDevice {
  _id: string;
  name: string;
  uniqueId: string;
  sn: string;
  mac?: string;
  uuid?: string;
  model?: string;
  category?: string;
  status?: string;
  battery?: number;
  batteryStatus?: string;
  lastLocation?: BleLastLocation;
  lastUpdate?: string;
  subscriptionEndDate?: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
  schoolId?: BleSchoolInfo | string;
  branchId?: BleBranchInfo | string;
  supervisorId?: BleSupervisorInfo | string;
  childId?: BleChildInfo | string;
}

export interface GetBleDevicesResponse {
  success: boolean;
  total: number;
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: string;
  devices: BleDevice[];
}

export interface BleDevicesQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  deviceName?: string;
  schoolId?: string;
  branchId?: string;
  supervisorId?: string;
  childId?: string;
  isAssigned?: boolean;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface Student {
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
    userName: string;
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

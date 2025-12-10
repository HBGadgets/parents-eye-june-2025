import api from "@/lib/axios";

export const dropdownService = {
  getSchools: () => api.get("school/dropdown"),

  getBranches: (schoolId?: string) =>
    api.get("branch/dropdown", {
      params: schoolId ? { schoolId } : {},
    }),

  getDevices: (branchId?: string) =>
    api.get("/device/dropdown", {
      params: branchId ? { branchId } : {},
    }),

  getRoutes: (branchId?: string) =>
    api.get("/route/dropdown", {
      params: branchId ? { branchId } : {},
    }),

  getParents: (params: {
    branchId: string;
    page?: number;
    limit?: number;
    search?: string;
  }) =>
    api.get("/parent/dropdown", {
      params,
    }),

  getGeofence: (params: {
    routeObjId: string;
    page?: number;
    limit?: number;
    search?: string;
  }) =>
    api.get("/geofence/dropdown", {
      params,
    }),

  getCategory: () => api.get("/category/dropdown"),

  getModel: () => api.get("/model/dropdown"),

  getDriver: (params: {
    branchId: string;
    page?: number;
    limit?: number;
    search?: string;
  }) => api.get("/driver/dropdown", { params }),
};

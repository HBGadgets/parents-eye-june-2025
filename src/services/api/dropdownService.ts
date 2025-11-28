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
};

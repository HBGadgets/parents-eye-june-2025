import api from "@/lib/axios";
import { UserAccessPermissions } from "@/store/authStore";

export interface ToggleAccessPayload {
  category: "master" | "school" | "users" | "reports";
  feature: string;
  value: boolean;
}

export const accessService = {
  // 🏫 School Permissions
  updateSchoolAccess: async (schoolId: string, access: UserAccessPermissions) => {
    const res = await api.put(`/school/accessgrant/${schoolId}`, { access });
    return res.data;
  },

  getSchoolAccess: async (schoolId: string) => {
    const res = await api.get(`/school/access/${schoolId}`);
    return res.data;
  },

  // 🏢 Branch Permissions
  updateBranchAccess: async (branchId: string, access: UserAccessPermissions) => {
    const res = await api.put(`/branch/accessgrant/${branchId}`, { access });
    return res.data;
  },

  getBranchAccess: async (branchId: string) => {
    const res = await api.get(`/branch/access/${branchId}`);
    return res.data;
  },

  // 👥 BranchGroup Permissions
  updateBranchGroupAccess: async (branchGroupId: string, access: UserAccessPermissions) => {
    const res = await api.put(`/branchGroup/accessgrant/${branchGroupId}`, { access });
    return res.data;
  },

  getBranchGroupAccess: async (branchGroupId: string) => {
    const res = await api.get(`/branchGroup/access/${branchGroupId}`);
    return res.data;
  },

  // 🔘 Toggle single module feature one-by-one
  toggleFeatureAccess: async (
    type: "school" | "branch" | "branchGroup",
    id: string,
    payload: ToggleAccessPayload
  ) => {
    const res = await api.patch(`/access/${type}/${id}/toggle`, payload);
    return res.data;
  },
};

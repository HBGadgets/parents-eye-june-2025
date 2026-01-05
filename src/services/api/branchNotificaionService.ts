import api from "@/lib/axios";
import { update } from "lodash";

export const branchNotificaionService = {
  getBranchNotifications: async (params: Record<string, any>): Promise<any> => {
    const res = await api.get("branch/notification-assigned", { params });
    return res.data;
  },

  assignBranchNotification: async (branchId: string, payload: any) => {
    const res = await api.post(
      `branch/assign-notification/${branchId}`,
      payload
    );
    return res.data;
  },

  updateBranchNotification: async (branchId: string, payload: any) => {
    const res = await api.put(
      `branch/assign-notification/${branchId}`,
      payload
    );
    return res.data;
  },

  deleteBranchNotification: async (branchId: string) => {
    const res = await api.delete(`branch/assign-notification/${branchId}`);
    return res.data;
  },
};

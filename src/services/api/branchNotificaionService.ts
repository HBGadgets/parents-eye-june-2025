import api from "@/lib/axios";

export const branchNotificaionService = {
  getBranchNotifications: async (branchId: string): Promise<any> => {
    const res = await api.get(`branch/notification-assigned/${branchId}`);
    return res.data;
  },

  assignBranchNotification: async (branchId: string, payload: any) => {
    const res = await api.post(
      `branch/notification-assigned/${branchId}`,
      payload
    );
    return res.data;
  },

  updateBranchNotification: async (branchId: string, payload: any) => {
    const res = await api.put(
      `branch/notification-assigned/${branchId}`,
      payload
    );
    return res.data;
  },

  deleteBranchNotification: async (branchId: string) => {
    const res = await api.delete(`branch/notification-assigned/${branchId}`);
    return res.data;
  },
};

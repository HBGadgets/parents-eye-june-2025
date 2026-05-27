import api from "@/lib/axios";

export interface SendNotificationPayload {
  branchId: string;
  schoolId?: string;
  title: string;
  message: string;
}

export const notificationService = {
  sendParentNotification: async (payload: SendNotificationPayload) => {
    const response = await api.post("/branch/parents/send-notification", payload);
    return response.data;
  },

  getNotificationHistory: async (params?: Record<string, any>) => {
    const response = await api.get("/branch/parents/send-notification", { params });
    return response.data;
  },
};

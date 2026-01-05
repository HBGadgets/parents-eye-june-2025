import api from "@/lib/axios";

export const driverService = {
  getDriver: async (params: Record<string, any>) => {
    const res = await api.get("/driver", { params });
    return res.data;
  },

  createDriver: async (payload: any) => {
    const res = await api.post("/driver", payload);
    return res.data;
  },

  updateDriver: async (id: string, payload: any) => {
    const res = await api.put(`/driver/${id}`, payload);
    return res.data;
  },

  deleteDriverById: async (id: string) => {
    const res = await api.delete(`/driver/${id}`);
    return res.data;
  },

  driverApprove: async (id: string, isApproved: string) => {
    const res = await api.post(`/driver/approve/${id}`, {
      isApproved,
    });
    return res.data;
  },

  checkAlreadyAssign: async (routeObjId: string) => {
    const res = await api.get(`/driver/already-assign-check/${routeObjId}`);
    return res.data;
  },
};

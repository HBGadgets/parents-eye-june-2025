import api from "@/lib/axios";
import { GetDeviceResponse } from "@/interface/modal";

export const deviceApiService = {
  getDevices: async (
    params: Record<string, any>
  ): Promise<GetDeviceResponse> => {
    const res = await api.get("/device", { params });
    return res.data;
  },

  createDevice: async (payload: any) => {
    const res = await api.post("/device", payload);
    return res.data;
  },

  updateDevice: async (id: string, payload: any) => {
    const res = await api.put(`/device/${id}`, payload);
    return res.data;
  },

  deleteDeviceById: async (id: string) => {
    const res = await api.delete(`/device/${id}`);
    return res.data;
  },

  deleteDevice: async (ids: string[]) => {
    const res = await api.delete(`/device`, {
      data: { ids },
    });
    return res.data;
  },
};

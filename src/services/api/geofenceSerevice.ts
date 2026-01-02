import api from "@/lib/axios";
import { GetGeofenceResponse } from "@/interface/modal";

export const geofenceService = {
  getGeofence: async (
    params: Record<string, any>
  ): Promise<GetGeofenceResponse> => {
    const res = await api.get<GetGeofenceResponse>("/geofence", { params });
    return res.data;
  },

  getGeofenceByUniqueId: async (params: Record<string, any>) => {
    const res = await api.get<GetGeofenceResponse>(`/geofence/timeline`, {
      params,
    });
    return res.data;
  },

  createGeofence: async (payload: any) => {
    const res = await api.post("/geofence", payload);
    return res.data;
  },

  updateGeofence: async (id: string, payload: any) => {
    const res = await api.put(`/geofence/${id}`, payload);
    return res.data;
  },

  deleteGeofence: async (id: string[]) => {
    const res = await api.delete(`/geofence`, { data: { ids: id } });
    return res.data;
  },
};

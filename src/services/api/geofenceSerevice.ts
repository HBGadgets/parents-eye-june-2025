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
    if (
      !params?.uniqueId ||
      String(params.uniqueId) === "undefined" ||
      String(params.uniqueId) === "null"
    ) {
      return {
        total: 0,
        page: 1,
        limit: 0,
        totalPages: 0,
        data: [],
        startPointGeoId: null as any,
        endPointGeoId: null as any,
      };
    }
    try {
      const res = await api.get<GetGeofenceResponse>(`/geofence/timeline`, {
        params,
      });
      return res.data;
    } catch (err: any) {
      if (err?.response?.status === 404) {
        return {
          total: 0,
          page: 1,
          limit: 0,
          totalPages: 0,
          data: [],
          startPointGeoId: null as any,
          endPointGeoId: null as any,
        };
      }
      throw err;
    }
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

  getStopChildren: async (geofenceId: string | number) => {
    try {
      const res = await api.get(`/stop-children/${geofenceId}`);
      return res.data;
    } catch (err: any) {
      if (err?.response?.status === 404) {
        return {
          success: true,
          geoId: String(geofenceId),
          pickupCount: 0,
          dropCount: 0,
          pickupChildren: [],
          dropChildren: [],
        };
      }
      throw err;
    }
  },
};

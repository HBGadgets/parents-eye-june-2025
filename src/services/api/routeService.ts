import api from "@/lib/axios";
import { GetRoutesResponse } from "@/interface/modal";

export const routeService = {
  getRoutes: async (
    params: Record<string, any>
  ): Promise<GetRoutesResponse> => {
    const res = await api.get("/route", { params });
    return res.data;
  },

  createRoute: async (payload: any) => {
    const res = await api.post("/route", payload);
    return res.data;
  },

  updateRoute: async (id: string, payload: any) => {
    const res = await api.put(`/route/${id}`, payload);
    return res.data;
  },

  deleteRoute: async (id: string) => {
    const res = await api.delete(`/route/${id}`);
    return res.data;
  },
};

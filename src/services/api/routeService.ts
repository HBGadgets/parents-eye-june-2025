import api from "@/lib/axios";
import { GetRoutesResponse } from "@/interface/modal";

interface CheckAlreadyAssign {
  assigned: boolean;
  message: string;
}

export const routeService = {
  getRoutes: async (
    params: Record<string, any>
  ): Promise<GetRoutesResponse> => {
    const res = await api.get("/route", { params });
    return res.data;
  },

  exportExcel: async (params: Record<string, any>): Promise<Blob> => {
    const res = await api.get("/route/export/excel", {
      params,
      responseType: "blob",
    });
    return res.data;
  },

  exportPdf: async (params: Record<string, any>): Promise<Blob> => {
    const res = await api.get("/route/export/pdf", {
      params,
      responseType: "blob",
    });
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

  checkAlreadyAssign: async (id: string) => {
    const res = await api.get(`/route/already-assign-check/${id}`);
    return res.data;
  },
};

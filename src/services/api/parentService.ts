import api from "@/lib/axios";
import { GetParentsResponse } from "@/interface/modal";

export const parentService = {
  getParents: async (
    params: Record<string, any>
  ): Promise<GetParentsResponse> => {
    const response = await api.get<GetParentsResponse>("/parent", { params });
    return response.data;
  },

  createParent: async (payload: any) => {
    const response = await api.post("/parent", payload);
    return response.data;
  },

  updateParent: async (id: string, payload: any) => {
    const response = await api.put(`/parent/${id}`, payload);
    return response.data;
  },

  // deleteParent: async (ids: string[]) => {
  //   const response = await api.delete(`/parent`, { data: { ids } });
  //   return response.data;
  // },
  deleteParent: async (id: string) => {
    const response = await api.delete(`/parent/${id}`);
    return response.data;
  },
};

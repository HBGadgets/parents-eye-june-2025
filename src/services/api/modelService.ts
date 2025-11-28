import api from "@/lib/axios";

export const modelService = {
  getModels: async () => {
    const res = await api.get("/model");
    return res.data;
  },

  createModel: async (payload: { modelName: string }) => {
    const res = await api.post("/model", payload);
    return res.data;
  },

  updateModel: async (id: string, payload: { modelName: string }) => {
    const res = await api.put(`/model/${id}`, payload);
    return res.data;
  },

  deleteModel: async (id: string) => {
    const res = await api.delete(`/model/${id}`);
    return res.data;
  },
};

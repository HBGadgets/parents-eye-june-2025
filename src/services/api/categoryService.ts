import api from "@/lib/axios";

export const categoryService = {
  getCategories: async () => {
    const res = await api.get("/category");
    return res.data;
  },

  createCategory: async (payload: { categoryName: string }) => {
    const res = await api.post("/category", payload);
    return res.data;
  },

  updateCategory: async (id: string, payload: { categoryName: string }) => {
    const res = await api.put(`/category/${id}`, payload);
    return res.data;
  },

  deleteCategory: async (id: string) => {
    const res = await api.delete(`/category/${id}`);
    return res.data;
  },
};

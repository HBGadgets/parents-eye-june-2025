import api from "@/lib/axios";
import { GetStudentsResponse } from "@/interface/modal";

export const studentService = {
  getStudents: async (
    params: Record<string, any>
  ): Promise<GetStudentsResponse> => {
    const res = await api.get("/child", { params });
    return res.data;
  },

  createStudent: async (payload: any) => {
    const res = await api.post("/child", payload);
    return res.data;
  },

  updateStudent: async (id: string, payload: any) => {
    const res = await api.put(`/child/${id}`, payload);
    return res.data;
  },

  deleteStudent: async (ids: string[]) => {
    const res = await api.delete("/child", {
      data: { ids },
    });
    return res.data;
  },
};

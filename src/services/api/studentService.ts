import api from "@/lib/axios";
import { GetStudentsResponse } from "@/interface/modal";

export const studentService = {
  getStudents: async (
    params: Record<string, any>
  ): Promise<GetStudentsResponse> => {
    const res = await api.get("/child", { params });
    return res.data;
  },

  exportExcel: async (params: Record<string, any>): Promise<Blob> => {
    const res = await api.get("/child/export/excel", {
      params,
      responseType: "blob",
    });
    return res.data;
  },

  exportPDF: async (params: Record<string, any>): Promise<Blob> => {
    const res = await api.get("/child/export/pdf", {
      params,
      responseType: "blob",
    });
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

  approveStudent: async (id: string, statusOfRegister: string) => {
    const res = await api.put(`/child/approve/${id}`, {
      statusOfRegister,
    });
    return res.data;
  },
};

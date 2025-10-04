import axios from "@/lib/axios";

export const api = {
  get: async <T = unknown>(url: string, params?: object): Promise<T> => {
    const response = await axios.get<T>(url, { params });
    return response.data;
  },

  post: async <T = unknown>(url: string, data?: object): Promise<T> => {
    const response = await axios.post<T>(url, data);
    return response.data;
  },

  put: async <T = unknown>(url: string, data?: object): Promise<T> => {
    const response = await axios.put<T>(url, data);
    return response.data;
  },

  patch: async <T = unknown>(url: string, data?: object): Promise<T> => {
    const response = await axios.patch<T>(url, data);
    return response.data;
  },

  delete: async <T = unknown>(url: string, params?: object): Promise<T> => {
    const response = await axios.delete<T>(url, { params });
    return response.data;
  },

  mulDelete: async <T = unknown>(
    url: string,
    data: { ids: string[] }
  ): Promise<T> => {
    const response = await axios.delete<T>(url, { data }); // 👈 force request body
    return response.data;
  },
};

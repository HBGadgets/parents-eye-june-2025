import axios from "@/lib/axios";

export const api = {
  get: async <T = any>(url: string, params?: object): Promise<T> => {
    const response = await axios.get<T>(url, { params });
    return response.data;
  },

  post: async <T = any>(url: string, data?: object): Promise<T> => {
    const response = await axios.post<T>(url, data);
    return response.data;
  },

  put: async <T = any>(url: string, data?: object): Promise<T> => {
    const response = await axios.put<T>(url, data);
    return response.data;
  },

  patch: async <T = any>(url: string, data?: object): Promise<T> => {
    const response = await axios.patch<T>(url, data);
    return response.data;
  },

  delete: async <T = any>(url: string, params?: object): Promise<T> => {
    const response = await axios.delete<T>(url, { params });
    return response.data;
  },

  mulDelete: async <T = any>(url: string, data?: object): Promise<T> => {
    const response = await axios.delete<T>(url, data);
    return response.data;
  },
};

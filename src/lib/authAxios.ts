import axios from "axios";
import Cookies from "js-cookie";

const authAxios = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL + "/auth",
  headers: {
    "Content-Type": "application/json",
  },
});

authAxios.interceptors.request.use(
  (config) => {
    const token = Cookies.get("token") || (typeof window !== "undefined" ? localStorage.getItem("token") : null);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default authAxios;

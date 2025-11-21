import axios from "axios";
import Cookies from "js-cookie";

const fileUploadAxios = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL + "/api",
  headers: { "Content-Type": "multipart/form-data" },
});

fileUploadAxios.interceptors.request.use((config) => {
  const token = Cookies.get("token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export default fileUploadAxios;

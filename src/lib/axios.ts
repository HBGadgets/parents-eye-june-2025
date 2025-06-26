import axios from "axios";
import Cookies from "js-cookie";

const axiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL + "/api",
  headers: {
    "Content-Type": "application/json",
  },
});

axiosInstance.interceptors.request.use(
  (config) => {
    const token = Cookies.get("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // You can log out the user or redirect to login page
      console.warn("Unauthorized. Redirecting to login...");
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;

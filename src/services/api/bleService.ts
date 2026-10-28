import axios from "axios";
import Cookies from "js-cookie";
import {
  GetBleDevicesResponse,
  BleDevicesQueryParams,
} from "@/interface/ble";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_BLE_API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use(
  (config) => {
    const token =
      Cookies.get("token") ||
      (typeof window !== "undefined" ? localStorage.getItem("token") : null);

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    } else {
      delete config.headers.Authorization;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export const bleService = {
  getBleDevices: async (
    params?: BleDevicesQueryParams
  ): Promise<GetBleDevicesResponse> => {
    const res: any = await api.get("/api/ble-devices", { params });
    return res?.devices ? res : (res?.data ?? res);
  },

  getLiveAll: async (params?: Record<string, any>) => {
    const res: any = await api.get("/api/ble-devices/live-all", { params });
    return res?.devices ? res : (res?.data ?? res);
  },

  getLiveDevice: async (identifier: string) => {
    const res: any = await api.get(`/api/ble-devices/live/${identifier}`);
    return res?.device ? res : (res?.data ?? res);
  },

  getDeviceHistory: async (
    identifier: string,
    params?: { days?: number; beginTime?: number; endTime?: number }
  ) => {
    const res: any = await api.get(
      `/api/ble-devices/${encodeURIComponent(identifier)}/history`,
      { params }
    );
    return res?.history ? res : (res?.data ?? res);
  },

  updateBleDeviceAssignment: async (
    id: string,
    payload: {
      name?: string;
      schoolId?: string | null;
      branchId?: string | null;
      supervisorId?: string | null;
      childId?: string | null;
      subscriptionEndDate?: string | null;
      status?: string;
    }
  ) => {
    const res: any = await api.put(
      `/api/ble-devices/${encodeURIComponent(id)}/assign`,
      payload
    );
    return res?.data ?? res;
  },
};

export default bleService;

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
    deviceIdOrIdentifier: string,
    params?: {
      days?: number;
      beginTime?: number;
      endTime?: number;
      from?: string;
      to?: string;
      startLocationTime?: string;
      endLocationTime?: string;
      [key: string]: any;
    }
  ) => {
    const rawTarget = String(deviceIdOrIdentifier || "").trim();
    if (!rawTarget) {
      throw new Error("No device identifier provided for history");
    }

    // Format startLocationTime and endLocationTime in 'YYYY-MM-DD HH:mm:ss' (Local selection)
    const formatToLocalLocationTime = (dateOrStr?: string | Date | number): string => {
      if (!dateOrStr) return "";
      const d = new Date(dateOrStr);
      if (isNaN(d.getTime())) return "";
      const YYYY = d.getFullYear();
      const MM = String(d.getMonth() + 1).padStart(2, "0");
      const DD = String(d.getDate()).padStart(2, "0");
      const HH = String(d.getHours()).padStart(2, "0");
      const mm = String(d.getMinutes()).padStart(2, "0");
      const ss = String(d.getSeconds()).padStart(2, "0");
      return `${YYYY}-${MM}-${DD} ${HH}:${mm}:${ss}`;
    };

    const queryParams: Record<string, any> = {
      startLocationTime:
        params?.startLocationTime || formatToLocalLocationTime(params?.from),
      endLocationTime:
        params?.endLocationTime || formatToLocalLocationTime(params?.to),
    };

    // Endpoints in order of precedence:
    // 1. /api/devices/:id/history (standard GeoTag history endpoint)
    // 2. /devices/:id/history
    // 3. /api/ble-devices/:id/history
    const endpointsToTry = [
      `/api/devices/${encodeURIComponent(rawTarget)}/history`,
      `/devices/${encodeURIComponent(rawTarget)}/history`,
      `/api/ble-devices/${encodeURIComponent(rawTarget)}/history`,
    ];

    let lastError: any = null;
    for (const endpoint of endpointsToTry) {
      try {
        console.log(`[bleService] Calling GeoTag history endpoint: ${endpoint}`, queryParams);
        const res: any = await api.get(endpoint, { params: queryParams });
        return res?.history ? res : (res?.data ?? res);
      } catch (err: any) {
        lastError = err;
        if (err?.response?.status !== 404) {
          throw err;
        }
      }
    }

    // If 404 with rawTarget and rawTarget is not a numeric deviceId, check if deviceId can be resolved
    try {
      const bleDevicesRes: any = await bleService.getBleDevices({ limit: 1000 });
      const list: any[] =
        (Array.isArray(bleDevicesRes?.devices) && bleDevicesRes.devices) ||
        (Array.isArray(bleDevicesRes?.data?.devices) && bleDevicesRes.data.devices) ||
        (Array.isArray(bleDevicesRes?.data) && bleDevicesRes.data) ||
        (Array.isArray(bleDevicesRes) && bleDevicesRes) ||
        [];

      const match = list.find((d: any) => {
        const dId = d?.deviceId != null ? String(d.deviceId).trim() : "";
        const dSn = d?.sn != null ? String(d.sn).trim() : "";
        const dUid = d?.uniqueId != null ? String(d.uniqueId).trim() : "";
        const target = rawTarget.toLowerCase();
        return dId === rawTarget || dSn.toLowerCase() === target || dUid.toLowerCase() === target;
      });

      const altId = match
        ? rawTarget === String(match.deviceId)
          ? match.sn
          : match.deviceId != null
          ? String(match.deviceId)
          : null
        : null;

      if (altId && altId !== rawTarget) {
        for (const endpoint of [
          `/api/devices/${encodeURIComponent(altId)}/history`,
          `/devices/${encodeURIComponent(altId)}/history`,
        ]) {
          try {
            console.log(`[bleService] Fallback calling GeoTag history with alt ID: ${endpoint}`, queryParams);
            const res: any = await api.get(endpoint, { params: queryParams });
            return res?.history ? res : (res?.data ?? res);
          } catch {
            // continue
          }
        }
      }
    } catch (e) {
      // ignore lookup error
    }

    throw lastError;
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

  syncBleDevices: async () => {
    const res: any = await api.get("/api/ble-devices/sync");
    return res?.data ?? res;
  },
};

export default bleService;
